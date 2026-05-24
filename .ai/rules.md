# AI Rules for growsurf-mcp

> Behavioral instructions for any AI tool working in this repo. Read `.ai/CONTEXT.md` first.

## Session Start Rules

- Always read `.ai/CONTEXT.md` and this file before making changes.
- Read `.ai/memory/progress.md` when it exists to understand current MCP/package state.
- Check installed skills before non-trivial work, especially MCP, TypeScript, API docs, SDK guidance, and testing tasks.
- Treat `/Users/kevinyun/Coding/growsurf` as a multi-repo parent. Keep MCP-owned changes inside this repo unless a sibling repo explicitly owns the surface being updated.

## Public Guidance Sync

- Keep MCP guidance aligned with `growsurf-api` contracts, `growsurf-docs` examples, `growsurf-app` install snippets, and native mobile SDK behavior.
- When public API fields, mobile SDK install snippets, participant-token handoff guidance, or webhook behavior changes, update MCP tool metadata/snippets in the same work session when practical.
- Do not add private `.ai` files to public distribution repos unless explicitly requested.

## Verification And Handoff

- Run the narrowest relevant checks when practical: `npm run test`, `npm run typecheck`, or `npm run build`.
- For customer-facing snippet changes, inspect the rendered README/tool text or tests that assert it.
- Say what was verified and what was not.

## Maintaining `.ai/`

- Update `.ai/memory/progress.md` after meaningful MCP, public guidance, contract, proof, or workflow changes.
- Update `.ai/memory/decisions.md` when the user establishes a durable rule or when a future-facing decision is made.
- Keep newest entries at the top.
