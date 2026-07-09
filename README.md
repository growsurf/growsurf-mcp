# GrowSurf MCP Server

[![npm version](https://img.shields.io/npm/v/@growsurfteam/growsurf-mcp)](https://www.npmjs.com/package/@growsurfteam/growsurf-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@growsurfteam/growsurf-mcp)](https://www.npmjs.com/package/@growsurfteam/growsurf-mcp)
[![license](https://img.shields.io/npm/l/@growsurfteam/growsurf-mcp)](./LICENSE)
[![node](https://img.shields.io/node/v/@growsurfteam/growsurf-mcp)](https://nodejs.org)

An **open-source Model Context Protocol (MCP) server** that helps developers implement **GrowSurf referral and affiliate programs** using guided steps and safe REST API wrappers.

Connect it to an AI agent and, in plain language, the agent can create a referral or affiliate program, configure rewards, install tracking, add and manage participants, and read analytics, all backed by the GrowSurf REST API.

- Learn more about GrowSurf at https://growsurf.com
- Learn more about this MCP server at https://docs.growsurf.com/build-with-ai

## Who is this for

This MCP server is for:

- Developers using MCP-compatible tools (Claude Code, ChatGPT Codex, Cursor, Antigravity, and other MCP clients)
- Teams that want guided, AI-assisted GrowSurf integrations

This MCP server is NOT for:

- ChatGPT web users (ChatGPT does not support local MCP servers at this time)
- Claude.ai browser users unless they are using GrowSurf's hosted remote MCP connector

## What you get

- **Guided Integration**:
  - Universal Code install
  - Native iOS/Android SDK implementation guidance
  - Native GrowSurf Window guidance
  - Signup flow
  - Qualifying action flow
  - Affiliate sale / transaction tracking
  - Webhooks
- **Agent Recipes**:
  - MCP prompts for creating referral programs, creating affiliate programs, embedding the widget, listing and fetching programs and participants, configuring rewards, wiring webhooks, and reading analytics
  - Installable Agent Skill bundle at `skills/growsurf-agent-toolkit`
  - Steering to review starter Design, Emails, Options, Installation, rewards, and GrowSurf Window content before patching
  - One-shot program-creation eval prompts and acceptance checks for starter content and configuration review
- **Happy‑Path REST API Wrappers**:
  - Create an account and get an API key (no API key required; the key unlocks after email verification), plus get/update account, rotate API key, and request/resend verification
  - List and get campaigns
  - Get campaign analytics (totals, plus an optional per-period time-series and optional previous-period, status-count, and rate enrichments)
  - Create, update, and clone programs (campaigns)
  - List, create, update, and delete campaign rewards
  - Get/update Design, Emails, Options, and Installation config
  - Capture temporary GrowSurf preview screenshots when the user explicitly asks for visual proof
  - List, create, update, delete, and test program webhooks
  - List, get, and add participants
  - Update a participant, email a participant, and get a participant's analytics and activity logs
  - Trigger referral credit (for referral programs), with optional delayed award (1-90 days)
  - Cancel a pending delayed referral trigger (for referral programs)
  - Record affiliate sale/transaction (for affiliate programs)
  - Create mobile participant tokens for signed-in native app users
- **Official API Library Snippets**:
  - TypeScript
  - Python
  - PHP
  - Ruby
  - Java
- **Helpers**:
  - Compute participant auto-auth HMAC hash
  - Normalize webhook payloads
  - Generate best‑effort idempotency keys for webhook deduplication

## Requirements

- Node.js 22+
- A GrowSurf account for hosted OAuth
- A GrowSurf **API key** for local stdio setup or manual API-key remote setup. A scoped key works as long as it has access to the tools and programs you want the agent to use.
- A **campaign (program) ID** for campaign-scoped tools. Set `GROWSURF_CAMPAIGN_ID` as the default, pass a `campaignId` argument to target a specific program, or call `growsurf_list_campaigns` to find available programs. For a newly created program, pass the `id` returned by `growsurf_create_campaign` to the other tools.
- Static guidance/snippet tools can run without credentials
- Exception: `growsurf_create_account` needs **no** API key — it creates a new account and returns an API key. Account-level tools (`growsurf_get_account`, `growsurf_update_account`, `growsurf_rotate_api_key`, verification) need the API key but **not** a campaign ID

## Supported MCP Hosts

The recommended path is GrowSurf's hosted OAuth endpoint at `https://mcp.growsurf.com` when your host supports remote Streamable HTTP with OAuth. Use the local `npx` server when your host needs a stdio process or manual API-key setup.

The GrowSurf MCP server works with MCP-compatible hosts including:

- Cursor
- Claude Code (CLI-based)
- Antigravity
- ChatGPT Codex (CLI-based)

### Cursor

1. Open Cursor.
2. In the top menu, click **File > Preferences > Cursor Settings**.
3. In the Cursor Settings panel, open **Tools & MCP**.
4. Click **Add Custom MCP**.
5. Recommended: in the `mcp.json` file, add the hosted OAuth endpoint:

```json
{
  "mcpServers": {
    "growsurf": {
      "url": "https://mcp.growsurf.com"
    }
  }
}
```

For local stdio instead, use:

```json
{
  "mcpServers": {
    "growsurf": {
      "command": "npx",
      "args": ["-y", "@growsurfteam/growsurf-mcp"],
      "env": {
        "GROWSURF_API_KEY": "YOUR_API_KEY",
        "GROWSURF_CAMPAIGN_ID": "YOUR_CAMPAIGN_ID"
      }
    }
  }
}
```

### Claude Code (CLI-based)

Open your terminal and connect Claude Code to the hosted OAuth endpoint:

```bash
claude mcp add -t http growsurf https://mcp.growsurf.com
claude mcp login growsurf
```

For local stdio instead, install the server directly into Claude Code:

```bash
claude mcp add growsurf \
  -e GROWSURF_API_KEY=your_api_key \
  -e GROWSURF_CAMPAIGN_ID=your_campaign_id \
  -- npx -y @growsurfteam/growsurf-mcp
```


### Antigravity

1. Open Antigravity.
2. Click the **…** menu in the panel to the right and select **MCP Store**.
3. Click **Manage MCP Servers > View raw config**.
4. Recommended: in the `mcp_config.json` file, add the hosted OAuth endpoint:

```json
{
  "mcpServers": {
    "growsurf": {
      "serverUrl": "https://mcp.growsurf.com"
    }
  }
}
```

For local stdio instead, use:

```json
{
  "mcpServers": {
    "growsurf": {
      "command": "npx",
      "args": ["-y", "@growsurfteam/growsurf-mcp"],
      "env": {
        "GROWSURF_API_KEY": "YOUR_API_KEY",
        "GROWSURF_CAMPAIGN_ID": "YOUR_CAMPAIGN_ID"
      }
    }
  }
}
```

### ChatGPT Codex

Recommended: connect Codex to the hosted OAuth endpoint:

```bash
codex mcp add growsurf --url https://mcp.growsurf.com
codex mcp login growsurf
```

Or create or edit `~/.codex/config.toml`:

```toml
[mcp_servers.growsurf]
url = "https://mcp.growsurf.com"
```

For local stdio instead, add the following:

```toml
[mcp_servers.growsurf]
command = "npx"
args = ["-y", "@growsurfteam/growsurf-mcp"]

[mcp_servers.growsurf.env]
GROWSURF_API_KEY = "YOUR_API_KEY"
GROWSURF_CAMPAIGN_ID = "YOUR_CAMPAIGN_ID"
```

Or configure local stdio from the CLI:

```bash
codex mcp add growsurf \
  --env GROWSURF_API_KEY=YOUR_API_KEY \
  --env GROWSURF_CAMPAIGN_ID=YOUR_CAMPAIGN_ID \
  -- npx -y @growsurfteam/growsurf-mcp
```


## Configuration

Set the following environment variables when running the MCP server:

- `GROWSURF_API_KEY` (optional for startup; required for API-calling tools. Use a key with the scopes and program access those tools need)
- `GROWSURF_CAMPAIGN_ID` (optional; the default program for campaign-scoped tools. A tool's `campaignId` argument overrides it, so a single server can operate on any of your programs)
- `GROWSURF_API_BASE_URL` (optional; defaults to `https://api.growsurf.com/v2`. Useful for local or hosted MCP gateways that should call a different GrowSurf API origin)
- `GROWSURF_PARTICIPANT_AUTH_SECRET` (optional; used by the hash helper)
- `GROWSURF_WEBHOOK_TOKEN` (optional; used for your own webhook URL token scheme)


## Run with npx

After publishing this package, customers can run:

```bash
npx @growsurfteam/growsurf-mcp
```

For local development in this repo:

```bash
npm install
npm run build
node dist/index.js
```

## MCP tools

### Guided Integration

- `growsurf_integration_guide`
  Step-by-step guidance for implementing a GrowSurf referral or affiliate program.

- `growsurf_mobile_sdk_guide`
  Native iOS/Android SDK guidance for attribution, `shareUrl`, `trackShare`, and the native GrowSurf Window.

- `growsurf_api_library_snippets`
  Official REST API library snippets for TypeScript, Python, PHP, Ruby, and Java.

- `growsurf_get_integration_connect_link`
  Get a dashboard link that opens a specific integration's connect panel (Stripe, PayPal, Tango Card, Mailchimp, and many more). Hand it to the user when they want to connect one. Connecting happens in the dashboard, not through the API.

### Client & UI Snippets

- `growsurf_client_snippets`
  JavaScript SDK, GrowSurf Window, and embeddable examples. Includes a reminder to use a frontend design workflow when placing or styling embeddable UI.

- `growsurf_embeddable_element_snippet`
  HTML snippet for a specific GrowSurf embeddable element.

- `growsurf_grsf_config_snippet`
  `<head>` snippet for configuring `window.grsfConfig` and participant auto-auth.

### Account

- `growsurf_create_account`
  Create a brand-new GrowSurf account and get an API key back. The **only** tool that does not require `GROWSURF_API_KEY` to be configured. The returned key is shown once and locked (`403` `EMAIL_NOT_VERIFIED_ERROR`) until the account's email is verified — have the owner click the emailed verification link, then retry. The key is rotated on the owner's first dashboard sign-in. Creating an account agrees, on the account holder's behalf, to GrowSurf's [Terms of Service](https://growsurf.com/terms) and [Privacy Policy](https://growsurf.com/privacy).

- `growsurf_get_account`
  Fetch the account that owns the API key (profile and GrowSurf-team verification state).

- `growsurf_update_account`
  Update your account profile (`firstName`, `lastName`, `company`).

- `growsurf_rotate_api_key`
  Generate a new API key for the current key. The key used for the request stops working as soon as the response returns, so update `GROWSURF_API_KEY` with the new value.

- `growsurf_request_account_verification`
  Request GrowSurf-team verification (required before a program can email participants).

- `growsurf_resend_verification_email`
  Resend the email-verification email to the account's address.

### API & Tracking

- `growsurf_get_campaign`
  Fetch campaign configuration.

- `growsurf_list_campaigns`
  List programs available to your account. Use this to find a `campaignId` before calling campaign-scoped tools.

- `growsurf_get_campaign_analytics`
  Fetch program analytics (totals, plus an optional per-period `series` via `interval`, and optional `previousPeriod`/`statusCounts`/`rates` enrichments via `include`).

- `growsurf_create_campaign`
  Create a new program (campaign) with type-appropriate starter content and optional inline rewards (only needs `GROWSURF_API_KEY`, not `GROWSURF_CAMPAIGN_ID`). Review the seeded Design, Emails, Options, Installation, rewards, and GrowSurf Window content before patching.

- `growsurf_agent_program_creation_eval`
  Generate one-shot program-creation eval prompts and acceptance checks for starter content, conservative rewards, configuration review, frontend install proof, and clean public copy.

- `growsurf_update_campaign`
  Update the program's identity and lifecycle: name, company branding, and status (only the fields you send are changed).

- `growsurf_clone_campaign`
  Clone the program into a new `DRAFT` program (integrations and credentials are not copied).

- `growsurf_list_campaign_rewards`
  List the program's configured rewards.

- `growsurf_create_campaign_reward`
  Create a campaign reward.

- `growsurf_update_campaign_reward`
  Update a campaign reward by its reward key.

- `growsurf_delete_campaign_reward`
  Delete a campaign reward by its reward key.

- `growsurf_get_campaign_design` / `growsurf_update_campaign_design`
  Read or patch the Program Editor Design tab config.

- `growsurf_get_campaign_emails` / `growsurf_update_campaign_emails`
  Read or patch the Program Editor Emails tab config.

- `growsurf_get_campaign_options` / `growsurf_update_campaign_options`
  Read or patch the Program Editor Options tab config.

- `growsurf_get_campaign_installation` / `growsurf_update_campaign_installation`
  Read or patch the Program Editor Installation tab config.

- `growsurf_capture_referral_flow_screenshots`
  Capture temporary GrowSurf preview screenshots for the current program after the user explicitly asks for visual proof. This returns the controlled referrer Window and referred-friend experience; use browser automation instead to prove the user's installed site.

- `growsurf_list_campaign_webhooks`
  List the program's webhooks (secrets are never returned).

- `growsurf_create_campaign_webhook`
  Add a webhook to the program (with events and a write-only signing secret).

- `growsurf_update_campaign_webhook`
  Update a webhook by id (`primary` for the program's primary webhook).

- `growsurf_delete_campaign_webhook`
  Remove a webhook by id.

- `growsurf_test_campaign_webhook`
  Send a live test event to a webhook using its stored URL and secret.

- `growsurf_add_participant`
  Add a participant (or referred participant) during signup.

- `growsurf_list_participants`
  List participants in the current program, paginated by `nextId`. Use this to find a participant ID before calling participant-scoped tools.

- `growsurf_get_participant`
  Fetch one participant by GrowSurf participant ID or email address.

- `growsurf_update_participant`
  Update a participant by ID or email (including `notes` and `paypalEmail`).

- `growsurf_bulk_delete_participants`
  Permanently delete up to 200 participants (by ID and/or email, mixed lists allowed) in one request, with per-row `DELETED`/`NOT_FOUND`/`DUPLICATE`/`ERROR` results. Irreversible — removes the participants' referrals, rewards, commissions, and payout records.

- `growsurf_email_participant`
  Email a participant using a configured template or a free-form subject/body.

- `growsurf_get_participant_analytics`
  Fetch a single participant's analytics (engagement, ranks, shares, affiliate money metrics), plus an optional per-period `series` of their own activity via `include=series` (`interval`/`days`/`startDate`/`endDate`).

- `growsurf_get_participant_activity_logs`
  List a participant's activity logs (offset/limit paginated).

- `growsurf_trigger_referral`
  Trigger referral (for referral programs only). Optionally pass `delayInDays` (1-90) to hold the credit for N days before awarding it (e.g. to cover a refund window).

- `growsurf_cancel_delayed_referral`
  Cancel a pending delayed referral trigger before the delay elapses (e.g. on refund/cancellation).

- `growsurf_record_sale`
  Record affiliate sales or transactions (for affiliate programs only).

- `growsurf_refund_transaction`
  Record an amendment (refund, partial refund, or chargeback) against a recorded transaction; reverses or adjusts the referrer's commission (for affiliate programs only). The inverse of `growsurf_record_sale`.

- `growsurf_create_mobile_participant_token`
  Create or fetch a participant, then create a participant-scoped mobile SDK token for a signed-in mobile user.

### Helpers

- `growsurf_participant_auth_hash`
  Generate participant auto-auth HMAC hashes (to authenicate participants automatically).

- `growsurf_webhook_normalize`
  Normalize webhook payloads and generate idempotency keys (to deduplicate webhook deliveries).

## Webhooks

GrowSurf webhooks notify your server when important referral or affiliate events occur, such as when new objects like participants, referrals, rewards, or transactions are created. Here are common use-cases:

- Fulfill rewards automatically
- Maintain internal points or credit systems
- Sync participant and referral data into your database

### Duplicate Delivery Handling

Webhook handlers should be idempotent because the same event can arrive more than once. Store an idempotency key before changing anything in your system.

### Webhook Security & Idempotency

GrowSurf signs webhook deliveries when the webhook has a `secret` configured: each delivery includes a `GrowSurf-Signature` HMAC header computed with that secret (the secret is write-only and never returned). To securely use webhooks, we recommend the following:

- Set a `secret` on the webhook and verify the `GrowSurf-Signature` header on receipt
- Validate the payload shape and expected event type
- Deduplicate webhook events using an idempotency key, because the same event can arrive more than once

The GrowSurf MCP server provides a helper tool (`growsurf_webhook_normalize` ) that normalizes webhook payloads and generates a best-effort idempotency key to simplify safe webhook processing.

## Development and Testing

```bash
npm run dev
npm test
```

## Additional Resources

Read developer docs at the following:

- JavaScript SDK reference: https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference
- REST API reference: https://docs.growsurf.com/developer-tools/rest-api/api-reference
- REST API libraries: https://docs.growsurf.com/developer-tools/rest-api/api-libraries
- Native mobile guide: https://docs.growsurf.com/getting-started-for-native-mobile
- iOS SDK: https://docs.growsurf.com/developer-tools/ios-sdk
- Android SDK: https://docs.growsurf.com/developer-tools/android-sdk
- Getting Started with GrowSurf: https://docs.growsurf.com/getting-started

The GrowSurf MCP server helps GrowSurf customers implement referral programs and affiliate programs quickly.
