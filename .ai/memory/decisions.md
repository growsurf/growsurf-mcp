# Decisions

## 2026-07-01 - Campaign + program-reward tools are flat, id-agnostic where the endpoint is

The 7 new campaign/reward endpoints were exposed as flat `growsurf_*` tools (no nested resource) because MCP tools are a flat registry and this server exposes no participant-reward tools today, so there is no `reward` namespace to collide with (the SDK-side `campaign.reward` vs new `campaign.rewards` distinction does not apply here). `growsurf_create_campaign` intentionally does NOT require `GROWSURF_CAMPAIGN_ID` — it POSTs to `/campaigns` and never reads the id — so it uses a dedicated `requireGrowSurfApiKey` helper; the other 6 endpoints are campaign-scoped and keep requiring `GROWSURF_CAMPAIGN_ID` via `requireGrowSurfClient`, matching `growsurf_get_campaign`. Program-reward CRUD uses the plural REST path `/campaign/{id}/rewards[/{rewardId}]`; `deleteCampaignReward` returns `{ id, success }`. As with the 2026-06-28 delayed-trigger work, these were NOT added to `apiLibrarySnippets.ts` (official per-language packages, deferred until regenerated).

## 2026-06-28 - Delayed referral trigger + cancel are exposed at the REST-client/MCP-tool layer, not in the generated-library snippets

The new `delayInDays` (1-90) body option on `POST .../ref` and the new `DELETE .../ref` cancel endpoint were added where this server actually owns and can verify the representation: the raw REST client (`src/growsurf/client.ts`) and the MCP tools/schemas (`src/index.ts`, plus README). They were intentionally NOT added to the per-language snippets in `src/growsurf/apiLibrarySnippets.ts`, which demonstrate the official `growsurf-{typescript,python,php,ruby,java}` packages at pinned versions. That file's established pattern is to fall back to raw REST when a capability is not yet in the generated libraries ("until the REST API libraries are regenerated from the updated OpenAPI spec"); asserting `delayInDays`/`cancelDelayedReferral` library method+param signatures we cannot verify would be inventing structure and risks documenting non-existent methods in a published package. Re-add to the snippets once the libraries are regenerated from the updated spec.

## 2026-05-29 - Mobile SDK guide documents the no-participantId API at 0.3.0

The mobile SDK guide now documents the Mobile SDK 0.3.0 public API, which drops the redundant `participantId` argument from every participant-scoped method (identity is derived from the participant JWT). `MOBILE_SDK_GUIDANCE_VERSION` is bumped to `0.3.0` in lockstep with the iOS/Android SDK releases, and the version mentions in `src/index.ts` track it.

The REST API tools in this server (`growsurf_trigger_referral`, `growsurf_record_sale`, and the snippet/client helpers in `apiLibrarySnippets.ts` / `client.ts`) intentionally keep their `participantId` arguments: they call the GrowSurf REST API, which still addresses the participant by id in the URL path, and are unrelated to the mobile SDK's JWT identity model.

The MCP server's own package version (`package.json`) was left at `0.2.1`. The guide version tracks the published mobile SDK version, which is a separate concept from this package's own release version; bumping the npm package is a distinct release decision and was out of scope for this change.

## 2026-05-24 - MCP repo uses website-style `.ai` workflow

MCP work should start by reading `.ai/CONTEXT.md`, `.ai/rules.md`, and current memory. Meaningful MCP, public guidance, contract, proof, or workflow changes should update `.ai/memory/progress.md`; durable decisions should be recorded in `.ai/memory/decisions.md`.
