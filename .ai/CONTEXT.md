# GrowSurf MCP - AI Context

This repo owns the public GrowSurf Model Context Protocol server package `@growsurfteam/growsurf-mcp`.

> **This is a public, open-source repository.** Everything here is world-readable. Do not add internal-facing content — see `.ai/rules.md` → "This Repo Is Public".

## What This Repo Does

- Exposes MCP tools and guidance for integrating GrowSurf referral and affiliate programs.
- Exports `createGrowSurfMcpServer` so hosted MCP runtimes can embed the same server without starting the stdio CLI.
- Implements public GrowSurf API client helpers and customer-facing integration snippets.
- Builds TypeScript from `src/` into `dist/` for the published package.
- Lists MCP prompts with short names like `set_rewards` and `read_analytics` because clients already namespace them by server (for example `/growsurf:set_rewards`). Legacy `growsurf_*` prompt aliases may still resolve for compatibility, but should not be listed to clients.

## Key Files

| File | Purpose |
| --- | --- |
| `src/index.ts` | MCP server entry point |
| `src/growsurf/client.ts` | GrowSurf API client helpers |
| `src/growsurf/mobileSdkGuide.ts` | Mobile SDK guidance surfaced through MCP |
| `src/growsurf/apiLibrarySnippets.ts` | API/library install and usage snippets |
| `src/growsurf/participantAuth.ts` | Participant token/auth guidance |
| `src/growsurf/webhooks.ts` | Webhook guidance |
| `test/` | Vitest coverage for MCP behavior and snippets |
| `README.md` | Public package documentation |

## Verification

- `npm run test` runs Vitest.
- `npm run typecheck` runs TypeScript without emit.
- `npm run build` rebuilds `dist/`.

## Staying In Sync With The Public API

The tools, snippets, and guidance this server exposes must match the public GrowSurf REST API and the published GrowSurf documentation. When the public API adds or changes an endpoint, request/response field, SDK install snippet, mobile SDK behavior, participant-token guidance, or a documented example, update the matching MCP tool metadata, schemas, and snippets here to keep them accurate.

Reference the public GrowSurf API documentation and SDKs as the contract. This package is self-contained: it does not import runtime code from any other repository.
