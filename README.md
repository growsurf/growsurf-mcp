# GrowSurf MCP Server

An **MCP (Model Context Protocol) server** that helps developers implement **GrowSurf referral and affiliate programs** using guided steps and safe, happy‑path REST API wrappers.

* Learn more about GrowSurf: [https://growsurf.com](https://growsurf.com)
* Learn more about this MCP server: [https://docs.growsurf.com/getting-started#mcp](https://docs.growsurf.com/getting-started#mcp)

---

## Who is this for

This MCP server is for:

* Developers using **MCP‑compatible tools** (Cursor, Claude Code, OpenAI Codex, Antigravity)
* Teams that want **guided, AI‑assisted GrowSurf integrations** with guardrails

This MCP server is **NOT** for:

* **ChatGPT web users** (ChatGPT web does not support running local MCP servers)

---

## What you get

### Guided Integration

* Universal Code installation
* Signup flow integration
* Qualifying action flow
* Affiliate sale / transaction tracking
* Webhook handling guidance

### Happy‑Path REST API Wrappers

* Get campaign
* Add participant
* Trigger a referral on qualify action (for **Sign Up + Qualifying Action** programs)
* Record affiliate sale / transaction

### Helpers

* Compute participant auto‑auth HMAC hash
* Normalize webhook payloads
* Generate best‑effort idempotency keys for webhook deduplication

---

## Requirements

* **Node.js 22+**
* A GrowSurf **API key** and **campaign (program) ID**

---

## Supported MCP Hosts

The GrowSurf MCP server works with any MCP‑compatible host that supports **local (stdio) MCP servers**, including:

* Cursor
* Claude Code (CLI)
* OpenAI Codex
* Antigravity

---

## Setup by Host

### Cursor

1. Open **Cursor**.
2. In the top menu, click **File > Preferences > Cursor Settings**.
3. Open **Tools & MCP**.
4. Click **+ New MCP Server**.
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

---

### Claude Code (CLI‑based)

Install the server directly into Claude Code:

```bash
claude mcp add @growsurfteam/growsurf-mcp -- \
  -e GROWSURF_API_KEY=your_api_key \
  -e GROWSURF_CAMPAIGN_ID=your_campaign_id
```

---

### ChatGPT

GrowSurf provides a **local MCP server** that helps developers implement referral and affiliate programs using guided integration steps and ready‑to‑use tools.

At this time, GrowSurf MCP is designed for **MCP‑compatible developer tools that support local (stdio) MCP servers**, such as Cursor and CLI‑based agents. ChatGPT web does not support running local MCP servers.

---

### Antigravity

1. Open **Antigravity Editor**.
2. Click the **“…”** menu in the right‑hand panel and select **MCP Store**.
3. Click **Manage MCP Servers > View raw config**.
4. In `mcp_config.json`, add:

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

---

### OpenAI Codex

Codex does **not** use JSON-based MCP configuration files. MCP servers are configured via `~/.codex/config.toml` or through the Codex CLI.

#### Option 1: Configure via `config.toml`

Create or edit:

```
~/.codex/config.toml
```

Add:

```toml
[mcp_servers.growsurf]
command = "npx"
args = ["-y", "@growsurfteam/growsurf-mcp"]

[mcp_servers.growsurf.env]
GROWSURF_API_KEY = "YOUR_API_KEY"
GROWSURF_CAMPAIGN_ID = "YOUR_CAMPAIGN_ID"
```

#### Option 2: Configure via Codex CLI

```bash
codex mcp add growsurf \
  --env GROWSURF_API_KEY=YOUR_API_KEY \
  --env GROWSURF_CAMPAIGN_ID=YOUR_CAMPAIGN_ID \
  -- npx -y @growsurfteam/growsurf-mcp
```

---

## Configuration

Set the following environment variables when running the MCP server:

* `GROWSURF_API_KEY` (required)
* `GROWSURF_CAMPAIGN_ID` (required)
* `GROWSURF_PARTICIPANT_AUTH_SECRET` (optional; used by the hash helper)
* `GROWSURF_WEBHOOK_TOKEN` (optional; used for your own webhook URL token scheme)

---

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

---

## MCP Tools

### Guided Integration

* `growsurf_integration_guide`
  Step‑by‑step guidance for implementing a GrowSurf referral or affiliate program.

### Client & UI Snippets

* `growsurf_client_snippets`
  JavaScript SDK, GrowSurf window, and embeddable examples.

* `growsurf_embeddable_element_snippet`
  HTML snippet for a specific GrowSurf embeddable.

* `growsurf_grsf_config_snippet`
  `<head>` snippet for configuring `window.grsfConfig` and participant auto‑auth.

### API & Tracking

* `growsurf_get_campaign`
  Fetch campaign configuration.

* `growsurf_add_participant`
  Add a participant during signup.

* `growsurf_trigger_referral`
  Trigger referral for **Sign up + Qualifying Action** programs only.

* `growsurf_record_sale`
  Record affiliate sales or transactions.

### Helpers

* `growsurf_participant_auth_hash`
  Generate participant auto‑auth HMAC hashes.

* `growsurf_webhook_normalize`
  Normalize webhook payloads and generate idempotency keys.

---

## Webhooks

GrowSurf webhooks notify your server when key referral or affiliate events occur:

* A new participant is added to a program (referral and affiliate programs)
* A participant unlocks a reward (referral programs only)
* A participant’s fraud status changes (referral and affiliate programs)
* A new affiliate commission is generated (affiliate programs only)
* An affiliate commission is adjusted (affiliate programs only)
* An affiliate payout is issued (affiliate programs only)
* A program ends (referral and affiliate programs)

### Retry Behavior

GrowSurf delivers webhooks using a persistent queue with retry logic. If a webhook cannot be delivered, it will be retried for several days using exponential backoff.

Because of this, **duplicate deliveries are possible** and must be handled safely by your server.

### Webhook Security & Idempotency

GrowSurf does not currently publish signed webhook headers or a built‑in signature verification scheme. To securely use webhooks, we recommend:

* Including a random, unguessable token in your webhook URL (path or query string) and validating it
* Validating payload shape and expected event type
* Deduplicating webhook events using an idempotency key

The GrowSurf MCP server provides a helper tool (`growsurf_webhook_normalize`) that normalizes webhook payloads and generates a best‑effort idempotency key to simplify safe webhook processing.

---

## Development & Testing

```bash
npm run dev
npm test
```

---

## Additional Resources

* JavaScript SDK reference: [https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference)
* REST API reference: [https://docs.growsurf.com/developer-tools/rest-api/api-reference](https://docs.growsurf.com/developer-tools/rest-api/api-reference)


