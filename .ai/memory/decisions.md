# Decisions

## 2026-05-29 - Mobile SDK guide documents the no-participantId API at 0.3.0

The mobile SDK guide now documents the Mobile SDK 0.3.0 public API, which drops the redundant `participantId` argument from every participant-scoped method (identity is derived from the participant JWT). `MOBILE_SDK_GUIDANCE_VERSION` is bumped to `0.3.0` in lockstep with the iOS/Android SDK releases, and the version mentions in `src/index.ts` track it.

The REST API tools in this server (`growsurf_trigger_referral`, `growsurf_record_sale`, and the snippet/client helpers in `apiLibrarySnippets.ts` / `client.ts`) intentionally keep their `participantId` arguments: they call the GrowSurf REST API, which still addresses the participant by id in the URL path, and are unrelated to the mobile SDK's JWT identity model.

The MCP server's own package version (`package.json`) was left at `0.2.1`. The guide version tracks the published mobile SDK version, which is a separate concept from this package's own release version; bumping the npm package is a distinct release decision and was out of scope for this change.

## 2026-05-24 - MCP repo uses website-style `.ai` workflow

MCP work should start by reading `.ai/CONTEXT.md`, `.ai/rules.md`, and current memory. Meaningful MCP, public guidance, contract, proof, or workflow changes should update `.ai/memory/progress.md`; durable decisions should be recorded in `.ai/memory/decisions.md`.
