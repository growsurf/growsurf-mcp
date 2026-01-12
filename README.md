# GrowSurf MCP Server

An **open-source Model Context Protocol (MCP) server** that helps you implement **GrowSurf referral programs and affiliate programs** using guided tools plus happy-path REST API wrappers.

- Learn more about GrowSurf at https://growsurf.com
- Learn more about this MCP server at https://docs.growsurf.com/getting-started#mcp

## What you get

- **Guided integration plan** (Universal Code install, signup flow, qualifying action flow, affiliate sale tracking, webhooks)
- **Happy-path REST tools**:
  - Get campaign
  - Add participant
  - Trigger referral credit (for “Sign up + Qualifying Action” programs)
  - Record affiliate sale/transaction
- **Helpers**:
  - Compute participant auto-auth HMAC hash
  - Normalize webhook payloads + generate a best-effort idempotency key

## Requirements

- Node.js 22+
- A GrowSurf **API key** and **campaign (program) ID**

## Usage with AI Tools

You can use this MCP server with any MCP-compatible AI host.

### Cursor

1. Open **Cursor Settings**.
2. Go to **Features** > **MCP**.
3. Click **+ Add New MCP Server**.
4. Set the following:

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

### Claude Code

Install the server directly into Claude Code:

```bash
claude mcp add @growsurfteam/growsurf-mcp -- \
  -e GROWSURF_API_KEY=your_api_key \
  -e GROWSURF_CAMPAIGN_ID=your_campaign_id
```

### ChatGPT (Desktop App)

1. Open **Settings** in the ChatGPT Desktop app.
2. Navigate to **Connected Apps** > **MCP**.
3. Click **Add**.
4. Configure with:
   - **Command**: `npx @growsurfteam/growsurf-mcp`
   - **Env Vars**: `GROWSURF_API_KEY`, `GROWSURF_CAMPAIGN_ID`

### Antigravity & ChatGPT Codex

For tools like **Antigravity** or **ChatGPT Codex**, follow their specific MCP configuration UI or config file (usually `mcp_config.json` or similar) using the following stdio configuration:

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

## Configuration

Set these environment variables:

- `GROWSURF_API_KEY` (required)
- `GROWSURF_CAMPAIGN_ID` (required)
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

- `growsurf_integration_guide`
- `growsurf_client_snippets` (JS SDK + window + embeddables snippets)
- `growsurf_embeddable_element_snippet` (HTML for a specific embeddable)
- `growsurf_grsf_config_snippet` (head snippet for `window.grsfConfig` auto-auth)
- `growsurf_get_campaign`
- `growsurf_add_participant`
- `growsurf_trigger_referral`
- `growsurf_record_sale`
- `growsurf_participant_auth_hash`
- `growsurf_webhook_normalize`

## Notes on webhook security

GrowSurf’s public docs do not specify signed webhook headers. The simplest secure pattern is to:

- Put a random token in the webhook URL (path or querystring) and validate it
- Validate payload shape + dedupe using an idempotency key (because deliveries can be retried)

## Development

```bash
npm run dev
npm test
```

The GrowSurf MCP server helps GrowSurf customers implement referral programs and affiliate programs.

Read developer docs at the following:

- Getting Started: https://docs.growsurf.com/getting-started
- JavaScript SDK reference: https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference
- REST API reference: https://docs.growsurf.com/developer-tools/rest-api/api-reference
