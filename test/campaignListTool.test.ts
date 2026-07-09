import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";

const originalFetch = globalThis.fetch;

describe("campaign list MCP tool", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("exposes and calls growsurf_list_campaigns without a campaign id", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ campaigns: [{ id: "abc123", name: "Referral Program" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const server = createGrowSurfMcpServer({
      env: {
        GROWSURF_API_KEY: "api_key",
      },
    });
    const client = new Client({ name: "tool-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const tools = await client.listTools();
      const tool = tools.tools.find((candidate) => candidate.name === "growsurf_list_campaigns");
      expect(tool).toBeDefined();
      expect(tool?.inputSchema.properties).not.toHaveProperty("campaignId");

      const result = await client.callTool({ name: "growsurf_list_campaigns", arguments: {} });
      const text = result.content[0]?.type === "text" ? result.content[0].text : "";

      expect(text).toContain("Referral Program");
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.growsurf.com/v2/campaigns",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ Authorization: "Bearer api_key" }),
        }),
      );
    } finally {
      await client.close();
      await server.close();
    }
  });
});
