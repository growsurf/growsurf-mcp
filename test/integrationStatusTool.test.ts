import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";

const originalFetch = globalThis.fetch;

describe("growsurf_list_integrations", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("reports each integration's connected, enabled, and auto-disabled state", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          integrations: [
            { id: "mailchimp", name: "Mailchimp", connected: true, enabled: true, autoDisabled: false },
            { id: "klaviyo", name: "Klaviyo", connected: true, enabled: false, autoDisabled: true },
            { id: "slack", name: "Slack", connected: false, enabled: false, autoDisabled: false },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" },
    });
    const client = new Client({ name: "integration-status-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const tools = await client.listTools();
      const tool = tools.tools.find((candidate) => candidate.name === "growsurf_list_integrations");
      expect(tool).toBeDefined();
      // Campaign-scoped: an agent must be able to target a program it just created.
      expect(tool?.inputSchema.properties).toHaveProperty("campaignId");
      expect(tool?.outputSchema?.properties).toHaveProperty("integrations");

      const result = await client.callTool({ name: "growsurf_list_integrations", arguments: {} });
      expect(result.structuredContent).toMatchObject({
        integrations: [
          { id: "mailchimp", connected: true, enabled: true },
          { id: "klaviyo", connected: true, enabled: false, autoDisabled: true },
          { id: "slack", connected: false, enabled: false },
        ],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.growsurf.com/v2/campaign/abc123/integrations",
        expect.objectContaining({ method: "GET" }),
      );
    } finally {
      await client.close();
      await server.close();
    }
  });
});
