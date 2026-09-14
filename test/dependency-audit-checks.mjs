import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateAudit, validatePolicy, validateProjectCoverage } from '../scripts/dependency-audit.mjs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const today = '2026-09-13';
const advisory = 'GHSA-aaaa-bbbb-cccc';
const exception = { project: '.', advisory, package: 'example', version: '1.0.0', owner: 'Maintainers',
  expires: '2026-12-12', reason: 'Test mitigation', evidence: ['package.json'] };
const lock = { packages: { 'node_modules/example': { version: '1.0.0', dev: true } } };
function report(severity = 'high') {
  return { auditReportVersion: 2, metadata: { vulnerabilities: {
    info: 0, low: 0, moderate: 0, high: 0, critical: 0, [severity]: 1, total: 1,
  } }, vulnerabilities: { example: { name: 'example', severity, nodes: ['node_modules/example'],
    via: [{ name: 'example', title: 'Test advisory', url: `https://github.com/advisories/${advisory}`, severity }],
  } } };
}
const evaluate = (value, entries = [], project = '.', tree = lock) => evaluateAudit(value, tree, entries, project, today);

test('high and critical development findings block; moderate findings remain visible', () => {
  for (const severity of ['high', 'critical']) assert.equal(evaluate(report(severity))[0].status, 'blocking');
  assert.equal(evaluate(report('moderate'))[0].status, 'notice');
});

test('a valid advisory exception remains visible with its supporting evidence', () => {
  const finding = evaluate(report(), [exception])[0];
  assert.equal(finding.status, 'excepted');
  assert.deepEqual(finding.exceptions[0].evidence, ['package.json']);
});

test('exceptions cannot cover a different advisory, version, project, or package', () => {
  for (const changed of [{ advisory: 'GHSA-dddd-eeee-ffff' }, { version: '1.0.1' }, { project: 'nested' }, { package: 'other' }]) {
    assert.equal(evaluate(report(), [{ ...exception, ...changed }])[0].status, 'blocking');
  }
});

test('a second installed version is not covered by the first version exception', () => {
  const value = report();
  value.vulnerabilities.example.nodes.push('node_modules/parent/node_modules/example');
  const tree = { packages: { ...lock.packages, 'node_modules/parent/node_modules/example': { version: '1.0.1' } } };
  assert.equal(evaluate(value, [exception], '.', tree)[0].status, 'blocking');
});

test('an excepted package still blocks a newly reported advisory', () => {
  const value = report();
  value.vulnerabilities.example.via.push({ ...value.vulnerabilities.example.via[0], url: 'https://github.com/advisories/GHSA-dddd-eeee-ffff' });
  assert.deepEqual(evaluate(value, [exception]).map(f => f.status), ['excepted', 'blocking']);
});

test('transitive propagation resolves to the advisory without hiding another finding', () => {
  const value = report();
  value.vulnerabilities.parent = { name: 'parent', severity: 'high', via: ['example'], nodes: ['node_modules/parent'] };
  value.metadata.vulnerabilities.high++;
  value.metadata.vulnerabilities.total++;
  const tree = { packages: { ...lock.packages, 'node_modules/parent': { version: '2.0.0' } } };
  assert.equal(evaluate(value, [exception], '.', tree)[0].status, 'excepted');
  value.vulnerabilities.parent.via = ['missing'];
  assert.throws(() => evaluate(value, [], '.', tree), /Missing transitive/);
});

test('expired exceptions fail policy checks even when their advisory is absent', () => {
  const policy = { version: 1, projects: ['.'], exceptions: [{ ...exception, expires: today }] };
  assert.match(validatePolicy(policy, root, today)[0], /Expired exception/);
  assert.equal(evaluate(report(), policy.exceptions)[0].status, 'blocking');
});

test('missing evidence, malformed dates, and duplicate exceptions fail validation', () => {
  for (const entries of [[{ ...exception, evidence: ['does-not-exist.md'] }], [{ ...exception, expires: '2026-02-30' }], [exception, exception]]) {
    assert.throws(() => validatePolicy({ version: 1, projects: ['.'], exceptions: entries }, root, today));
  }
});

test('registry errors and malformed or inconsistent reports cannot pass', () => {
  for (const value of [{}, { error: { code: 'E500' } }, { ...report(), auditReportVersion: 1 }, { ...report(), vulnerabilities: {} }]) {
    assert.throws(() => evaluate(value));
  }
  const value = report();
  value.vulnerabilities.example.via = [];
  assert.throws(() => evaluate(value));
});

test('an unknown advisory format or missing lock entry fails closed', () => {
  const value = report();
  value.vulnerabilities.example.via[0].url = 'https://example.com/unknown';
  assert.throws(() => evaluate(value), /Unknown advisory/);
  assert.throws(() => evaluate(report(), [], '.', { packages: {} }), /Missing locked version/);
});


test('every repository lockfile must be covered, including the root and new nested projects', () => {
  assert.doesNotThrow(() => validateProjectCoverage(['.', 'nested'], ['package-lock.json', 'nested/package-lock.json']));
  for (const projects of [['.'], ['nested'], ['.', 'unknown']]) {
    assert.throws(() => validateProjectCoverage(projects, ['package-lock.json', 'nested/package-lock.json']), /every repository/);
  }
  assert.throws(() => validateProjectCoverage(['.'], []), /every repository/);
});

test('severity totals cannot hide high findings behind lower-severity report entries', () => {
  const value = report('moderate');
  value.metadata.vulnerabilities.moderate = 0;
  value.metadata.vulnerabilities.high = 1;
  assert.throws(() => evaluate(value), /severity counts/);
});

test('CLI fails on process errors, bad JSON, and stale locks without exposing npm diagnostics', () => {
  // Disposable files stay in OS scratch; never modify the checked-in policy or lockfile.
  const scratch = mkdtempSync(resolve(tmpdir(), 'dependency-audit-check-'));
  mkdirSync(resolve(scratch, 'scripts'));
  mkdirSync(resolve(scratch, 'bin'));
  copyFileSync(resolve(root, 'scripts/dependency-audit.mjs'), resolve(scratch, 'scripts/dependency-audit.mjs'));
  writeFileSync(resolve(scratch, 'package.json'), JSON.stringify({ name: 'audit-fixture' }));
  writeFileSync(resolve(scratch, 'package-lock.json'), JSON.stringify({ packages: { '': {} } }));
  writeFileSync(resolve(scratch, '.audit-exceptions.json'), JSON.stringify({ version: 1, projects: ['.'], exceptions: [] }));
  const empty = { auditReportVersion: 2, vulnerabilities: {}, metadata: { vulnerabilities: {
    info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0,
  } } };
  const gitPath = resolve(scratch, 'bin/git');
  writeFileSync(gitPath, '#!/usr/bin/env node\n' + `process.stdout.write(${JSON.stringify("package-lock.json\0")});\n`);
  chmodSync(gitPath, 0o755);
  const environment = { ...process.env, PATH: `${resolve(scratch, 'bin')}:${process.env.PATH}` };
  const npmPath = resolve(scratch, 'bin/npm');
  for (const [code, stdout, passes] of [[0, JSON.stringify(empty), true], [2, JSON.stringify(empty), false],
    [1, JSON.stringify(empty), false], [0, 'not JSON', false], [0, '{"error":{"code":"E500"}}', false]]) {
    writeFileSync(npmPath, '#!/usr/bin/env node\n' +
      `process.stderr.write('PRIVATE_NPM_DIAGNOSTIC');process.stdout.write(${JSON.stringify(stdout)});process.exit(${code});\n`);
    chmodSync(npmPath, 0o755);
    const child = spawnSync(process.execPath, [resolve(scratch, 'scripts/dependency-audit.mjs')], {
      encoding: 'utf8', env: environment,
    });
    assert.equal(child.status, passes ? 0 : 1);
    const summary = readFileSync(resolve(scratch, 'audit-reports/summary.json'), 'utf8');
    assert.equal(JSON.parse(summary).passed, passes);
    assert.doesNotMatch(summary + child.stdout + child.stderr, /PRIVATE_NPM_DIAGNOSTIC/);
  }
  writeFileSync(resolve(scratch, 'package.json'), JSON.stringify({ dependencies: { example: '^2.0.0' } }));
  const child = spawnSync(process.execPath, [resolve(scratch, 'scripts/dependency-audit.mjs')], { encoding: 'utf8', env: environment });
  assert.equal(child.status, 1);
  assert.match(readFileSync(resolve(scratch, 'audit-reports/summary.json'), 'utf8'), /Manifest\/lockfile mismatch/);
  writeFileSync(gitPath, '#!/usr/bin/env node\nprocess.exit(128);\n');
  const failedInventory = spawnSync(process.execPath, [resolve(scratch, 'scripts/dependency-audit.mjs')], {
    encoding: 'utf8', env: environment,
  });
  assert.equal(failedInventory.status, 1);
  assert.match(readFileSync(resolve(scratch, 'audit-reports/summary.json'), 'utf8'), /Cannot inventory/);

});
