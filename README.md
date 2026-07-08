# GrowSurf MCP Server

An **open-source Model Context Protocol (MCP) server** that helps developers implement **GrowSurf referral and affiliate programs** using guided steps and safe REST API wrappers.

- Learn more about GrowSurf at https://growsurf.com
- Learn more about this MCP server at https://docs.growsurf.com/getting-started#mcp

## Who is this for

This MCP server is for:

- Developers using MCP-compatible tools (Cursor, Claude Code, Codex, Antigravity)
- Teams that want guided, AI-assisted GrowSurf integrations

This MCP server is NOT for:

- ChatGPT web users (ChatGPT does not support local MCP servers at this time)

## What you get

- **Guided Integration**:
  - Universal Code install
  - Native iOS/Android SDK implementation guidance
  - Native GrowSurf Window guidance
  - Signup flow
  - Qualifying action flow
  - Affiliate sale / transaction tracking
  - Webhooks
- **Happy‑Path REST API Wrappers**:
  - Create an account and get an API key (no API key required; the key unlocks after email verification), plus get/update account, rotate API key, and request/resend verification
  - Get campaign
  - Get campaign analytics (totals, plus an optional per-period time-series and optional previous-period, status-count, and rate enrichments)
  - Create, update, and clone programs (campaigns)
  - List, create, update, and delete campaign rewards
  - List, create, update, delete, and test program webhooks
  - Add participant
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
- A GrowSurf **API key** and **campaign (program) ID** for API-calling tools
- Static guidance/snippet tools can run without credentials
- Exception: `growsurf_create_account` needs **no** API key — it creates a new account and returns one. Account-level tools (`growsurf_get_account`, `growsurf_update_account`, `growsurf_rotate_api_key`, verification) need the API key but **not** a campaign ID

## Supported MCP Hosts

The GrowSurf MCP server works with any MCP‑compatible host that supports local (stdio) MCP servers, including (but not limited to):

- Cursor
- Claude Code (CLI-based)
- Antigravity
- ChatGPT Codex (CLI-based)

### Cursor

1. Open Cursor.
2. In the top menu, click **File > Preferences > Cursor Settings**.
3. In the Cursor Settings panel, open **Tools & MCP**.
4. Click **Add Custom MCP**.
5. In the `mcp.json` file, add the following:

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

Open your terminal and install the server directly into Claude Code:

```bash
claude mcp add @growsurfteam/growsurf-mcp -- \
  -e GROWSURF_API_KEY=your_api_key \
  -e GROWSURF_CAMPAIGN_ID=your_campaign_id
```


### Antigravity

1. Open Antigravity.
2. Click the **…** menu in the panel to the right and select **MCP Store**.
3. Click **Manage MCP Servers > View raw config**.
4. In the `mcp_config.json` file, add the following:

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

### Option 1: Configure via `config.toml`

Create or edit the `~/.codex/config.toml` file by adding the following:

```toml
[mcp_servers.growsurf]
command = "npx"
args = ["-y", "@growsurfteam/growsurf-mcp"]

[mcp_servers.growsurf.env]
GROWSURF_API_KEY = "YOUR_API_KEY"
GROWSURF_CAMPAIGN_ID = "YOUR_CAMPAIGN_ID"
```

### Option 2: Configure via Codex CLI

```bash
codex mcp add growsurf \
  --env GROWSURF_API_KEY=YOUR_API_KEY \
  --env GROWSURF_CAMPAIGN_ID=YOUR_CAMPAIGN_ID \
  -- npx -y @growsurfteam/growsurf-mcp
```


## Configuration

Set the following environment variables when running the MCP server:

- `GROWSURF_API_KEY` (optional for startup; required for API-calling tools)
- `GROWSURF_CAMPAIGN_ID` (optional for startup; required for API-calling tools)
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
  JavaScript SDK, GrowSurf window, and embeddable examples.

- `growsurf_embeddable_element_snippet`
  HTML snippet for a specific GrowSurf embeddable element.

- `growsurf_grsf_config_snippet`
  `<head>` snippet for configuring `window.grsfConfig` and participant auto-auth.

### Account

- `growsurf_create_account`
  Create a brand-new GrowSurf account and get an API key back. The **only** tool that does not require `GROWSURF_API_KEY` to be configured. The returned key is locked (`403` `EMAIL_NOT_VERIFIED_ERROR`) until the account's email is verified — have the owner click the emailed verification link, then retry. The key is rotated on the owner's first dashboard sign-in. Creating an account agrees, on the account holder's behalf, to GrowSurf's [Terms of Service](https://growsurf.com/terms) and [Privacy Policy](https://growsurf.com/privacy).

- `growsurf_get_account`
  Fetch the account that owns the API key (profile and GrowSurf-team verification state).

- `growsurf_update_account`
  Update your account profile (`firstName`, `lastName`, `company`).

- `growsurf_rotate_api_key`
  Generate a new API key and immediately revoke the current one.

- `growsurf_request_account_verification`
  Request GrowSurf-team verification (required before a program can email participants).

- `growsurf_resend_verification_email`
  Resend the email-verification email to the account's address.

### API & Tracking

- `growsurf_get_campaign`
  Fetch campaign configuration.

- `growsurf_get_campaign_analytics`
  Fetch program analytics (totals, plus an optional per-period `series` via `interval`, and optional `previousPeriod`/`statusCounts`/`rates` enrichments via `include`).

- `growsurf_create_campaign`
  Create a new program (campaign) with type-appropriate defaults and optional inline rewards (only needs `GROWSURF_API_KEY`, not `GROWSURF_CAMPAIGN_ID`).

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

### Retry Behavior

If a webhook cannot be delivered, GrowSurf retries it for several days using exponential backoff. Because of this, duplicate deliveries are possible and must be handled safely by your server.

### Webhook Security & Idempotency

GrowSurf signs webhook deliveries when the webhook has a `secret` configured: each delivery includes a `GrowSurf-Signature` HMAC header computed with that secret (the secret is write-only and never returned). To securely use webhooks, we recommend the following:

- Set a `secret` on the webhook and verify the `GrowSurf-Signature` header on receipt
- Validate the payload shape and expected event type
- Deduplicate webhook events using an idempotency key, since deliveries may be retried

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
