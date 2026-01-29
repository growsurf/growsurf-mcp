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
  - Signup flow
  - Qualifying action flow
  - Affiliate sale / transaction tracking
  - Webhooks
- **Happy‑Path REST API Wrappers**:
  - Get campaign
  - Add participant
  - Trigger referral credit (for referral programs)
  - Record affiliate sale/transaction (for affiliate programs)
- **Helpers**:
  - Compute participant auto-auth HMAC hash
  - Normalize webhook payloads
  - Generate best‑effort idempotency keys for webhook deduplication

## Requirements

- Node.js 22+
- A GrowSurf **API key** and **campaign (program) ID**

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
4. Click **+ Add New MCP Server**.
5. Set the following:

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
4. In `mcp_config.json`, add the following:

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

Create or edit file `~/.codex/config.toml` by adding the following:

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

### Guided Integration

- `growsurf_integration_guide`  
  Step-by-step guidance for implementing a GrowSurf referral or affiliate program.

### Client & UI Snippets

- `growsurf_client_snippets`  
  JavaScript SDK, GrowSurf window, and embeddable examples.

- `growsurf_embeddable_element_snippet`  
  HTML snippet for a specific GrowSurf embeddable element.

- `growsurf_grsf_config_snippet`  
  `<head>` snippet for configuring `window.grsfConfig` and participant auto-auth.

### API & Tracking

- `growsurf_get_campaign`  
  Fetch campaign configuration.

- `growsurf_add_participant`  
  Add a participant (or referred participant) during signup.

- `growsurf_trigger_referral`  
  Trigger referral (for referral programs only).

- `growsurf_record_sale`  
  Record affiliate sales or transactions (for affiliate programs only).

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

GrowSurf delivers webhooks using a persistent queue with retry logic. If a webhook cannot be delivered, it will be retried for several days using exponential backoff. Because of this, duplicate deliveries are possible and must be handled safely by your server.

### Webhook Security & Idempotency

GrowSurf does not currently publish signed webhook headers or a built-in signature verification scheme. To securely use webhooks, we recommend the following:  

- Include a random, unguessable token in your webhook URL (path or query string) and validate it on receipt    
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
- Getting Started with GrowSurf: https://docs.growsurf.com/getting-started

The GrowSurf MCP server helps GrowSurf customers implement referral programs and affiliate programs quickly.
