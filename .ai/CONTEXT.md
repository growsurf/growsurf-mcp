# GrowSurf MCP - AI Context

This repo owns the public GrowSurf Model Context Protocol server package `@growsurfteam/growsurf-mcp`.

> **This is a public, open-source repository.** Everything here is world-readable. Do not add internal-facing content — see `.ai/rules.md` → "This Repo Is Public".

## What This Repo Does

- Exposes MCP tools and guidance for integrating GrowSurf referral and affiliate programs.
- Exports `createGrowSurfMcpServer` so hosted MCP runtimes can embed the same server without starting the stdio CLI.
- Implements public GrowSurf API client helpers and customer-facing integration snippets.
- Keeps returning-participant mobile sign-in inside the built-in GrowSurf Window. The emailed link opens the hosted web portal; native app sessions use participant tokens created by the customer's backend.
- Publishes standard MCP safety annotations for every tool. Scoped business writes remain available; API-key rotation remains a client helper but is intentionally not an MCP tool.
- Exposes a deliberately curated subset of the REST API. Affiliate application review, affiliate invites, commissions, and payout records stay REST-only and are intentionally not MCP tools; payout destinations are the exception, with `growsurf_get_participant_payout_destination` and `growsurf_request_participant_payout_destination_confirmation` shipping as MCP tools. Program settings those features rely on — such as the affiliate enrollment fields in `CAMPAIGN_OPTIONS` — are still readable and writable through the campaign options tools.
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
| `src/growsurf/outputSchemas.ts` | JSON Schema output schemas for tools returning structured JSON |
| `src/toolAuthorization.ts` | Credential types, scopes, and per-tool authorization metadata |
| `src/growsurf/installKit.ts` | Install-kit renderers for agent-driven GrowSurf installation |
| `src/growsurf/secretDenyList.ts` | Deny-list of sensitive file patterns agents must never surface |
| `test/` | Vitest coverage for MCP behavior and snippets |
| `README.md` | Public package documentation |

## Verification

- `npm run test` runs Vitest.
- `npm run typecheck` runs TypeScript without emit.
- `npm run build` rebuilds `dist/`.

## Staying In Sync With The Public API

The tools, snippets, and guidance this server exposes must match the public GrowSurf REST API and the published GrowSurf documentation. When the public API adds or changes an endpoint, request/response field, SDK install snippet, mobile SDK behavior, participant-token guidance, or a documented example, update the matching MCP tool metadata, schemas, and snippets here to keep them accurate.

Reference the public GrowSurf API documentation and SDKs as the contract. This package is self-contained: it does not import runtime code from any other repository.
