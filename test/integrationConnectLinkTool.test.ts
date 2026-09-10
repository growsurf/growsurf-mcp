import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";

const originalFetch = globalThis.fetch;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const connect = async (env: Record<string, string>) => {
  const server = createGrowSurfMcpServer({ env });
  const client = new Client({ name: "integration-link-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
};

describe("growsurf_get_integration_connect_link", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("advertises and returns Wise as affiliate-only, with its current state", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        integrations: [
          {
            id: "wisecom",
            name: "Wise",
            connected: false,
            enabled: false,
            autoDisabled: false,
            connectUrl: "https://staging.growsurf.com/editor/abc123/options/integrations?integration=wisecom",
          },
        ],
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const { client, close } = await connect({ GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" });
    try {
      const tools = await client.listTools();
      const tool = tools.tools.find(
        (candidate) => candidate.name === "growsurf_get_integration_connect_link",
      );
      const integration = tool?.inputSchema.properties?.integration as { enum?: string[] } | undefined;
      expect(integration?.enum).toContain("wisecom");
      expect(tool?.outputSchema?.properties).toHaveProperty("affiliateOnly");

      const result = await client.callTool({
        name: "growsurf_get_integration_connect_link",
        arguments: { integration: "wisecom" },
      });

      expect(result.structuredContent).toMatchObject({
        integration: "wisecom",
        label: "Wise",
        category: "Payouts & gift cards",
        referralOnly: false,
        affiliateOnly: true,
        connected: false,
        enabled: false,
        autoDisabled: false,
        // The server's own link wins, so a staging or local API never hands back a production URL.
        url: "https://staging.growsurf.com/editor/abc123/options/integrations?integration=wisecom",
      });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.growsurf.com/v2/campaign/abc123/integrations",
        expect.objectContaining({ method: "GET" }),
      );
    } finally {
      await close();
    }
  });

  it("reports an already-connected integration instead of only handing over a link", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({
        integrations: [{ id: "stripe", name: "Stripe", connected: true, enabled: true, autoDisabled: false }],
      }),
    ) as typeof fetch;

    const { client, close } = await connect({ GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" });
    try {
      const result = await client.callTool({
        name: "growsurf_get_integration_connect_link",
        arguments: { integration: "stripe" },
      });
      expect(result.structuredContent).toMatchObject({ connected: true, enabled: true });
      expect(result.structuredContent).toHaveProperty("note", expect.stringContaining("already connected"));
    } finally {
      await close();
    }
  });

  it("surfaces the API's 404 instead of returning a link for a program that does not exist", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ code: "CampaignNotFound", message: "Campaign not found" }, 404),
    ) as typeof fetch;

    const { client, close } = await connect({ GROWSURF_API_KEY: "api_key" });
    try {
      const result = await client.callTool({
        name: "growsurf_get_integration_connect_link",
        arguments: { integration: "stripe", campaignId: "does-not-exist" },
      });
      expect(result.isError).toBe(true);
      const text = result.content[0]?.type === "text" ? result.content[0].text : "";
      expect(text).toContain("CampaignNotFound");
      expect(text).not.toContain("app.growsurf.com/editor");
    } finally {
      await close();
    }
  });

  // This tool answered offline before it started verifying the program, and connecting an
  // integration is a dashboard step either way. A token that cannot read the integration list must
  // still get the link rather than nothing.
  it.each([
    ["a token without program:read", 403, { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" }],
    ["an unavailable API", 503, { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" }],
    ["no API key at all", 401, { GROWSURF_CAMPAIGN_ID: "abc123" }],
  ])("still returns an unverified link for %s", async (_label, status, env) => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ code: "InsufficientScope", message: "Denied" }, status),
    ) as typeof fetch;

    const { client, close } = await connect(env);
    try {
      const result = await client.callTool({
        name: "growsurf_get_integration_connect_link",
        arguments: { integration: "stripe" },
      });

      expect(result.isError).toBeFalsy();
      expect(result.structuredContent).toMatchObject({
        integration: "stripe",
        programVerified: false,
        url: "https://app.growsurf.com/editor/abc123/options/integrations?integration=stripe",
      });
      expect(result.structuredContent).toHaveProperty("note", expect.stringContaining("could not be read"));
      // Unknown state must stay absent. Reporting `false` would read as "not connected" and send
      // the user to connect an integration that may already be working.
      expect(result.structuredContent).not.toHaveProperty("connected");
      expect(result.structuredContent).not.toHaveProperty("enabled");
      expect(result.structuredContent).not.toHaveProperty("autoDisabled");
    } finally {
      await close();
    }
  });

  it("refuses an integration the program type has no card for", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({
        integrations: [{ id: "stripe", name: "Stripe", connected: false, enabled: false, autoDisabled: false }],
      }),
    ) as typeof fetch;

    const { client, close } = await connect({ GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" });
    try {
      const result = await client.callTool({
        name: "growsurf_get_integration_connect_link",
        arguments: { integration: "wisecom" },
      });
      expect(result.isError).toBe(true);
      const text = result.content[0]?.type === "text" ? result.content[0].text : "";
      expect(text).toContain("affiliate programs only");
    } finally {
      await close();
    }
  });
});
