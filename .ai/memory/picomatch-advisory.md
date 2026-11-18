# Picomatch advisory exception

Last Updated: 2026-11-18

## Decision — 2026-11-18

Kevin authorized reviewing reachability and adding justified temporary exceptions in this chat ("Yes go"). Accept only GHSA-fc5q-39xc-vjpf for picomatch 4.0.7, project `.`, until **2026-12-18**. This is temporary risk acceptance, not a dependency patch. No audit threshold changes; new versions and other advisories remain blocking under the existing evaluator.

## Source evidence and trust boundary

Every picomatch installation is development-only in the lockfile, through tinyglobby, Vite and Vitest. No MCP runtime matcher import was found in src/. Reviewed files: package-lock.json; package.json. The lockfile is authoritative for installed versions and dev flags; local dependency source supplies caller evidence. Git lockfile history and existing .ai decisions were reviewed. The vulnerable input is an attacker-supplied repeated extglob pattern, not merely a filename or text being matched. Reviewed callers take patterns from trusted repository/build configuration. CI must run only trusted repository configuration; this exception does not make hostile pull-request build code safe.

## Required controls and reopen triggers

- Do not expose picomatch, micromatch, workspace-discovery or Vite glob-pattern inputs to HTTP requests, MCP tool arguments, customer settings, imported user content or uploaded package manifests.
- Keep build/test/lint configuration developer-controlled. Do not serve a Vite dev server to customers.
- Review this exception before adding a runtime matcher, importing a build-only entrypoint at runtime, changing callers or packaging, accepting external workspace/glob configuration, or changing picomatch versions. The exception does not establish safety for those changes.
- Review the upstream advisory for a patch before expiry; remove the exception when a patched dependency replaces it. Do not extend it silently.

## Proof boundary

Verified — Local, targeted: lockfile classification and source caller inspection. Deployment-gate results are recorded in the dependency-sweep report. Not verified — Deployed: installed artifacts and runtime reachability. Full suites Not verified. No availability payload was run against an application or shared service.

Primary advisory: https://github.com/advisories/GHSA-fc5q-39xc-vjpf (affected <=4.0.7; no patched release listed at review).
