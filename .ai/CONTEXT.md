# GrowSurf MCP - AI Context

This repo owns the public GrowSurf Model Context Protocol server package `@growsurfteam/growsurf-mcp`.

## What This Repo Does

- Exposes MCP tools and guidance for integrating GrowSurf referral and affiliate programs.
- Implements public GrowSurf API client helpers and customer-facing integration snippets.
- Builds TypeScript from `src/` into `dist/` for the published package.

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

## Cross-Repo Contract Sync

When API endpoints, request/response fields, SDK install snippets, mobile SDK behavior, participant-token guidance, or public docs examples change, check sibling repos:

- `../growsurf-api`
- `../growsurf-app`
- `../growsurf-docs`
- `../growsurf-website`
- `../growsurf-ios-sdk`
- `../growsurf-android-sdk`

Do not import runtime code from sibling repos. Cross-repo references in `.ai` files and docs are coordination notes only.
