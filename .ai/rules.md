# AI Rules for growsurf-mcp

> Behavioral instructions for any AI tool working in this repo. Read `.ai/CONTEXT.md` first.

## This Repo Is Public

`growsurf-mcp` is a public, open-source repository. Everything committed here — code, docs, and these `.ai/` files — is world-readable.

**Never commit internal-facing content.** Before adding or editing anything in this repo, including these `.ai/` files, make sure it contains none of the following:

- References or file paths to GrowSurf's private repositories (the API, dashboard app, docs, website, SDK, or SDK-generation repos) or to any local machine paths.
- Names of third-party backend services that power a GrowSurf feature behind the scenes (image hosting, tax filing, payout rails, and similar). Integrations a customer connects themselves — such as Stripe, PayPal, and Tango Card gift cards — are fine to name.
- Internal implementation mechanics: queue/job/retry phrasing, cache/TTL details, anti-abuse mechanics, internal service or class names.
- Internal engineering history, cross-repo coordination notes, release/publish process details, staging or database specifics, employee or maintainer names, or anything else meaningful only to the GrowSurf team.

Anything the GrowSurf team needs to track that is not safe to publish belongs in an internal repository, not here. This repo's `.ai/` describes only what an outside contributor needs to work on the public package.

## Session Start Rules

- Always read `.ai/CONTEXT.md` and this file before making changes.
- Check installed skills before non-trivial work, especially MCP, TypeScript, API docs, SDK guidance, and testing tasks.
- Keep changes inside this repo. This package is self-contained and does not import runtime code from any other repository.

## Staying In Sync With The Public API

- Keep MCP tool descriptions, schemas, and snippets aligned with the public GrowSurf REST API and the published GrowSurf documentation.
- Keep scoped business actions available, including destructive actions, and publish standard MCP safety annotations plus `_meta["growsurf/riskTier"]` (`READ`, `CONTENT`, `DESTRUCTIVE`, or `MONEY`) for every tool. These are host-facing hints, not server-side approval enforcement. Credential rotation is a direct REST/SDK/dashboard operation, not an MCP tool.
- Advertised JSON schemas must express every runtime cross-field requirement. When runtime validation requires one of several identifiers, keep that `anyOf`/`allOf` requirement in `tools/list` too.
- When a public API field, mobile SDK install snippet, participant-token handoff, or webhook behavior changes in the public contract, update the matching MCP tool metadata and snippets in the same work session when practical.
- When a new GrowSurf mobile SDK version is published, bump the mobile SDK version literal everywhere this repo hardcodes it:
  - `src/growsurf/mobileSdkGuide.ts` — constant `MOBILE_SDK_GUIDANCE_VERSION`.
  - `src/index.ts` — inline `iOS/Android SDK X.Y.Z` references in the capabilities overview and the `growsurf_mobile_sdk_guide` tool description. The `Server({ version })` argument is read from `package.json` (this MCP server's own version) and is NOT the mobile SDK version — do not point it at the mobile SDK literal.
  - `test/mobileSdkGuide.test.ts` — version assertions and test names that embed the version.

## Writing Style For User-Facing Copy

Applies to anything an MCP consumer reads: tool names/descriptions, guidance text, snippets, and the README.

- **Avoid redundant names in namespaced MCP UI.** MCP clients often show prompts/tools under the server namespace, e.g. `/growsurf:<name>`. For any new user-facing command or prompt name that will be listed in that UI, use short verb-object names like `list_participants` or `get_participant`, not `growsurf_list_participants`. If a raw MCP tool identifier must stay `growsurf_*` for compatibility with the existing public tool set, add or preserve a short user-facing prompt, alias, or label so users do not see `/growsurf:growsurf_*`.
- Before writing or editing that copy, load the `human-writing` skill if available. It covers the AI-generated patterns to avoid (buzzwords, hedging, robotic lists, generic transitions) and the human patterns to use (specifics, active voice, short plain sentences).
- Em dashes: use rarely. Prefer a comma, a period, parentheses, or a restructured sentence. Prose peppered with em dashes reads as AI-written.
- Bold: reserve for the one thing per section a reader must not miss. Do not bold every key term; heavy bolding is an AI tell and makes nothing stand out.
- **Backtick all code in descriptions.** Field and param names, enum values, path/query params, HTTP status codes, and template tokens (`{{firstName}}`) go in backticks so MCP clients and the README render them as inline code. Verify enum values and field names against the public API contract, not just an existing string.
- **Never describe internal mechanics on this public surface.** Tool and field descriptions state the contract and the behavior a consumer can observe or act on, never how GrowSurf implements it. Cut queue/job phrasing, cache/TTL details, the names of backend services that power a feature, and anti-abuse mechanics. Preserve any consumer-visible consequence. (See "This Repo Is Public" above.)
- Do not mass-rewrite existing tool text for style; apply this to new copy and to text you are already changing.

## Verification And Handoff

- Run the narrowest relevant checks when practical: `npm run test`, `npm run typecheck`, or `npm run build`.
- For customer-facing snippet changes, inspect the rendered README/tool text or tests that assert it.
- Say what was verified and what was not.
