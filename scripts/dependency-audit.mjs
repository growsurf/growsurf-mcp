import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { log, error } from 'node:console';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS = ['info', 'low', 'moderate', 'high', 'critical'];
const GHSA = /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/;
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

export function validatePolicy(policy, root = ROOT, today = new Date().toISOString().slice(0, 10)) {
  requireValue(policy?.version === 1 && Array.isArray(policy.projects) && policy.projects.length > 0
    && Array.isArray(policy.exceptions), 'Invalid audit policy');
  requireValue(new Set(policy.projects).size === policy.projects.length, 'Duplicate audit project');
  for (const project of policy.projects) {
    requireValue(nonempty(project) && !isAbsolute(project) && !project.split('/').includes('..'), 'Invalid project path');
    requireValue(existsSync(resolve(root, project, 'package-lock.json')), `Missing lockfile: ${project}`);
  }
  const keys = new Set();
  const errors = [];
  for (const entry of policy.exceptions) {
    requireValue(entry && policy.projects.includes(entry.project) && GHSA.test(entry.advisory)
      && nonempty(entry.package) && /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(entry.version)
      && nonempty(entry.owner) && nonempty(entry.reason)
      && Array.isArray(entry.evidence) && entry.evidence.length > 0, 'Invalid advisory exception');
    const expiry = new Date(`${entry.expires}T00:00:00.000Z`);
    requireValue(/^\d{4}-\d{2}-\d{2}$/.test(entry.expires) && !Number.isNaN(expiry.valueOf())
      && expiry.toISOString().slice(0, 10) === entry.expires, 'Invalid exception expiry');
    const key = [entry.project, entry.advisory, entry.package, entry.version].join('|');
    requireValue(!keys.has(key), `Duplicate exception: ${key}`);
    keys.add(key);
    for (const evidence of entry.evidence) {
      requireValue(nonempty(evidence), 'Missing evidence path');
      const path = evidence.split('#')[0];
      requireValue(path && !isAbsolute(path) && !relative(root, resolve(root, path)).startsWith('..')
        && existsSync(resolve(root, path)), `Missing exception evidence: ${evidence}`);
    }
    if (entry.expires <= today) errors.push(`Expired exception: ${key} (${entry.expires})`);
  }
  return errors;
}

export function validateProjectCoverage(projects, lockfiles) {
  // Git's inventory includes new, non-ignored lockfiles without walking node_modules or build output.
  const expected = new Set(lockfiles.map(file => dirname(file)));
  const configured = new Set(projects.map(project => relative(ROOT, resolve(ROOT, project)) || '.'));
  requireValue(expected.has('.') && expected.size === configured.size
    && [...expected].every(project => configured.has(project)),
  'Audit projects must match every repository package-lock.json; update .audit-exceptions.json');
}

export function evaluateAudit(report, lock, exceptions, project, today = new Date().toISOString().slice(0, 10)) {
  requireValue(report?.auditReportVersion === 2 && !report.error && report.vulnerabilities
    && typeof report.vulnerabilities === 'object' && !Array.isArray(report.vulnerabilities)
    && report.metadata?.vulnerabilities && lock?.packages, 'Invalid npm audit report or lockfile');
  const vulnerabilities = report.vulnerabilities;
  const counts = report.metadata.vulnerabilities;
  requireValue([...LEVELS, 'total'].every(level => Number.isInteger(counts[level]) && counts[level] >= 0)
    && LEVELS.reduce((sum, level) => sum + counts[level], 0) === counts.total
    && Object.keys(vulnerabilities).length === counts.total, 'Inconsistent npm audit counts');
  requireValue(LEVELS.every(level => Object.values(vulnerabilities).filter(value => value?.severity === level).length === counts[level]),
    'Inconsistent npm audit severity counts');
  const findings = [];
  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    requireValue(vulnerability.name === name && LEVELS.includes(vulnerability.severity)
      && Array.isArray(vulnerability.via) && vulnerability.via.length > 0
      && Array.isArray(vulnerability.nodes) && vulnerability.nodes.length > 0, `Invalid vulnerability: ${name}`);
    const versions = [...new Set(vulnerability.nodes.map(node => {
      requireValue(nonempty(lock.packages[node]?.version), `Missing locked version: ${node}`);
      return lock.packages[node].version;
    }))];
    for (const via of vulnerability.via) {
      if (typeof via === 'string') {
        requireValue(Object.hasOwn(vulnerabilities, via), `Missing transitive advisory: ${via}`);
        continue;
      }
      requireValue(via && via.name === name && LEVELS.includes(via.severity) && nonempty(via.title)
        && typeof via.url === 'string', `Invalid advisory: ${name}`);
      const advisory = via.url.replace('https://github.com/advisories/', '');
      requireValue(GHSA.test(advisory) && via.url === `https://github.com/advisories/${advisory}`, `Unknown advisory URL: ${name}`);
      // Match every installed version. A new version or advisory never inherits an exception.
      const matches = versions.map(version => exceptions.find(entry => entry.project === project
        && entry.advisory === advisory && entry.package === name && entry.version === version && entry.expires > today));
      const exempt = matches.every(Boolean);
      findings.push({ project, package: name, versions, advisory, severity: via.severity, title: via.title,
        status: exempt ? 'excepted' : LEVELS.indexOf(via.severity) >= 3 ? 'blocking' : 'notice',
        ...(exempt ? { exceptions: matches } : {}) });
    }
  }
  // npm also reports parent packages as meta-vulnerabilities. Resolve them to their
  // advisories so an exception covers propagation, but never a second advisory.
  function roots(name, seen = new Set()) {
    if (seen.has(name)) return [];
    const next = new Set([...seen, name]);
    return vulnerabilities[name].via.flatMap(via => typeof via === 'string' ? roots(via, next) : [via]);
  }
  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    const sources = roots(name);
    requireValue(sources.length > 0, `Unresolved advisory chain: ${name}`);
    requireValue(LEVELS.indexOf(vulnerability.severity) <= Math.max(...sources.map(via => LEVELS.indexOf(via.severity))),
      `Unexplained severity: ${name}`);
  }
  return findings;
}

export function main() {
  const output = resolve(ROOT, 'audit-reports');
  mkdirSync(output, { recursive: true });
  const result = { scannedAt: new Date().toISOString(), findings: [], errors: [] };
  try {
    const policy = readJson(resolve(ROOT, '.audit-exceptions.json'));
    result.errors.push(...validatePolicy(policy));
    const inventory = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z',
      '--', 'package-lock.json', ':(glob)**/package-lock.json'], {
      cwd: ROOT, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024,
    });
    requireValue(!inventory.error && !inventory.signal && inventory.status === 0, 'Cannot inventory repository lockfiles');
    validateProjectCoverage(policy.projects, inventory.stdout.split('\0').filter(Boolean));
    for (const [index, project] of policy.projects.entries()) {
      try {
        const manifest = readJson(resolve(ROOT, project, 'package.json'));
        const lock = readJson(resolve(ROOT, project, 'package-lock.json'));
        for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
          const normalize = value => JSON.stringify(Object.entries(value || {}).sort(([a], [b]) => a.localeCompare(b)));
          requireValue(normalize(manifest[field]) === normalize(lock.packages?.['']?.[field]), `Manifest/lockfile mismatch: ${project} ${field}`);
        }
        // The lockfile is the input. Never install packages or run lifecycle scripts.
        const scan = spawnSync('npm', ['audit', '--package-lock-only', '--include=dev', '--include=optional',
          '--include=peer', '--ignore-scripts', '--json', '--audit-level=low', '--registry=https://registry.npmjs.org',
          '--fetch-retries=0', '--fetch-timeout=45000'], {
          cwd: resolve(ROOT, project), encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024,
        });
        requireValue(!scan.error && !scan.signal && [0, 1].includes(scan.status), `npm audit failed: ${project}`);
        const report = JSON.parse(scan.stdout);
        const findings = evaluateAudit(report, lock, policy.exceptions, project);
        requireValue(scan.status !== 1 || report.metadata.vulnerabilities.total > 0, `npm audit failed without findings: ${project}`);
        // Only valid advisory reports are saved; raw npm errors can contain registry credentials.
        writeFileSync(resolve(output, `npm-audit-${index}.json`), JSON.stringify({ project, ...report }, null, 2) + '\n');
        result.findings.push(...findings);
      } catch (err) {
        result.errors.push(`${project}: ${err instanceof SyntaxError ? 'Invalid npm audit JSON' : err.message}`);
      }
    }
  } catch (err) {
    result.errors.push(err instanceof SyntaxError ? 'Invalid audit policy JSON' : err.message);
  }
  result.passed = result.errors.length === 0 && !result.findings.some(finding => finding.status === 'blocking');
  writeFileSync(resolve(output, 'summary.json'), JSON.stringify(result, null, 2) + '\n');
  for (const finding of result.findings) log(`${finding.status.toUpperCase()} ${finding.project} ${finding.package}@${finding.versions.join(',')} ${finding.severity} ${finding.advisory}`);
  for (const message of result.errors) error(message);
  log(`Dependency audit: ${result.passed ? 'PASS' : 'FAIL'}; report: audit-reports/summary.json`);
  process.exitCode = result.passed ? 0 : 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
