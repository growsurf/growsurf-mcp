# Dependency audits

Run `npm run audit:dependencies` from this repo. Node 22+, npm 10+, and Git are required.
The runner reads package-lock.json and scans all dependency types against the public npm registry.
It does not install, update, or fix packages. Audit sends package names and versions to npm.

High/critical advisories without a valid exception, expired exceptions, invalid policy/report data,
manifest/lockfile dependency mismatches, and scan failures return a nonzero exit code.
Lower-severity findings and accepted exceptions stay visible in `audit-reports/summary.json`.
Valid raw npm reports are kept alongside it; raw npm error output is deliberately not published.
Reports are ignored by Git. An audit covers known npm advisories, not vendored/CDN code or private
Git package source. It is not evidence that every dependency is safe.

## Exceptions

`.audit-exceptions.json` is the machine-readable policy. Every exception matches one project,
GHSA advisory, package, and exact installed version. It requires an owner, reason, existing evidence
file(s), and an expiry date. Expiry takes effect at 00:00 UTC on that date, even if the finding is
absent. Review existing evidence before renewal; do not auto-renew or exempt an entire package.
The `projects` list must match every repository package lockfile. The runner checks Git's tracked
and new non-ignored lockfiles and fails if a project is missing or the inventory cannot be read.

A dependency change needs a current lockfile. If an advisory is manually mitigated, keep its
mitigation checks in CI. A passing exception does not mean the upstream package is patched.

Focused runner checks: `node --test test/dependency-audit-checks.mjs`. These test the audit security boundary only;
application test suites are separate. Do not use automatic `npm audit fix --force`.

## Activation

The `Dependency audit` workflow runs on every pull request, deployment-branch pushes, weekly,
and on manual dispatch. Scheduled runs use the default branch. It uploads reports even on failure.
After the configuration is merged, require the `dependency-audit` job in branch protection/rulesets.
YAML alone does not make a check required.

Dependabot config groups weekly minor/patch version updates. Review and merge updates manually.
Enable Dependabot security updates and alerts in repository settings if not already enabled;
version-update configuration alone does not prove those settings are active.

## Application verification

Full application suite (separate from this targeted check): `npm test`. Targeted audit checks do not
verify application behavior or cross-suite interference.
