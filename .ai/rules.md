# AI Rules for growsurf-mcp

> Behavioral instructions for any AI tool working in this repo. Read `.ai/CONTEXT.md` first.

## Session Start Rules

- Always read `.ai/CONTEXT.md` and this file before making changes.
- Read `.ai/memory/progress.md` **on demand** — pull it when the task needs recent MCP/package history, not routinely at session start (it is a large, unbounded dated log; `.ai/CONTEXT.md` carries the durable current-state facts).
- Check installed skills before non-trivial work, especially MCP, TypeScript, API docs, SDK guidance, and testing tasks.
- Treat `/Users/kevinyun/Coding/growsurf` as a multi-repo parent. Keep MCP-owned changes inside this repo unless a sibling repo explicitly owns the surface being updated.

## Public Guidance Sync

- Keep MCP guidance aligned with `growsurf-api` contracts, `growsurf-docs` examples, `growsurf-app` install snippets, and native mobile SDK behavior.
- When public API fields, mobile SDK install snippets, participant-token handoff guidance, or webhook behavior changes, update MCP tool metadata/snippets in the same work session when practical.
- When `growsurf-{ios,android}-sdk-distribution` ships a new release, bump the mobile SDK version literal in every place that hardcodes it:
  - `src/growsurf/mobileSdkGuide.ts` — constant `MOBILE_SDK_GUIDANCE_VERSION`.
  - `src/index.ts` — inline `iOS/Android SDK X.Y.Z` references in the capabilities overview and the `growsurf_mobile_sdk_guide` tool description. The `Server({ version })` argument is read from `package.json` (the MCP server's own version) and is not the mobile SDK version — do not point it at the mobile SDK literal.
  - `test/mobileSdkGuide.test.ts` — version assertions and `it("renders SDK X.Y.Z ...")` / `it("emits released public SDK X.Y.Z ...")` test names.
  - Source of truth: the latest tag at `https://github.com/growsurf/growsurf-{ios,android}-sdk-distribution/releases`.
- Do not add private `.ai` files to public distribution repos unless explicitly requested.

## Writing Style For User-Facing Copy

Applies to anything an MCP consumer reads: tool names/descriptions, guidance text, snippets, and the README.

- Before writing or editing that copy, load the `human-writing` skill (`~/.agents/skills/human-writing/SKILL.md`). It covers the AI-generated patterns to avoid (buzzwords, hedging, robotic lists, generic transitions) and the human patterns to use (specifics, active voice, short plain sentences).
- Two house rules the skill does not spell out, from Kevin (2026-07-07):
  - Em dashes: use rarely. Prefer a comma, a period, parentheses, or a restructured sentence. Prose peppered with em dashes reads as AI-written.
  - Bold: reserve for the one thing per section a reader must not miss. Do not bold every key term; heavy bolding is an AI tell and makes nothing stand out.
- **Backtick all code in descriptions.** Field and param names, enum values (e.g. the `emailType` values `goalAchieved` / `commissionGenerated`), path/query params, HTTP status codes, and template tokens (`{{firstName}}`) go in backticks so MCP clients and the README render them as inline code. Verify enum values and field names against the runtime source of truth (the `growsurf-api` validators/constants), not just an existing string.
- **Never describe internal mechanics on this public surface.** Tool and field descriptions state the contract and the behavior a consumer can observe or act on, never how GrowSurf implements it. Cut queue/job phrasing (`queued`, "in the background", "retries until successful"), cache/TTL details, backend vendor names that power a feature (Cloudinary, TaxBandits, XTRM; integrations the user connects themselves, such as Stripe, PayPal, and Tango Card gift cards, are fine to name), and anti-abuse mechanics. Preserve any consumer-visible consequence. This mirrors `growsurf-api/.ai/rules.md` ("Writing Style For User-Facing Copy And Docs"), which names growsurf-mcp as an in-scope surface and is the source of truth. Keep this copy in step.
- Do not mass-rewrite existing tool text for style; apply this to new copy and to text you are already changing.

## Verification And Handoff

- Run the narrowest relevant checks when practical: `npm run test`, `npm run typecheck`, or `npm run build`.
- For customer-facing snippet changes, inspect the rendered README/tool text or tests that assert it.
- Say what was verified and what was not.

## Maintaining `.ai/`

- Update `.ai/memory/progress.md` after meaningful MCP, public guidance, contract, proof, or workflow changes.
- Update `.ai/memory/decisions.md` when the user establishes a durable rule or when a future-facing decision is made.
- Keep newest entries at the top.
