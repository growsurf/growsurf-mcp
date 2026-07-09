import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createGrowSurfMcpServer } from "../src/index.js";

const originalFetch = globalThis.fetch;

describe("referral-flow screenshot MCP tool", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("is discoverable without arbitrary screenshot target inputs", async () => {
    const server = createGrowSurfMcpServer({ env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "env_campaign" } });
    const client = new Client({ name: "test-client", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const tools = await client.listTools();
      const tool = tools.tools.find((candidate) => candidate.name === "growsurf_capture_referral_flow_screenshots");

      expect(tool).toBeDefined();
      expect(tool?.description).toContain("explicitly asks for screenshots");
      expect(tool?.description).toContain("does not accept arbitrary URLs, HTML, JavaScript, or external screenshot targets");
      expect(tool?.inputSchema).toMatchObject({
        type: "object",
        additionalProperties: false,
        properties: {
          campaignId: expect.objectContaining({ type: "string" }),
        },
      });
      expect(Object.keys((tool?.inputSchema.properties ?? {}) as Record<string, unknown>).sort()).toEqual(["campaignId"]);
    } finally {
      await client.close();
    }
  });

  it("calls the MCP screenshot endpoint for the selected campaign", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({
        generatedAt: "2026-07-09T00:00:00.000Z",
        expiresAt: "2026-07-09T00:15:00.000Z",
        screenshots: [
          { view: "referrer", url: "https://signed.example.com/referrer.jpg" },
          { view: "referredFriend", url: "https://signed.example.com/friend.jpg" },
        ],
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const server = createGrowSurfMcpServer({
      env: {
        GROWSURF_API_KEY: "api_key",
        GROWSURF_CAMPAIGN_ID: "env_campaign",
        GROWSURF_API_BASE_URL: "https://api.example.com/v2",
      },
    });
    const client = new Client({ name: "test-client", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const result = await client.callTool({
        name: "growsurf_capture_referral_flow_screenshots",
        arguments: { campaignId: "selected_campaign" },
      });

      expect(result.content[0]?.type).toBe("text");
      expect(result.content[0] && "text" in result.content[0] ? result.content[0].text : "").toContain("referrer.jpg");
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/api/v2/mcp/campaign/selected_campaign/referral-flow-screenshots",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ Authorization: "Bearer api_key" }),
        }),
      );
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.body).toBeUndefined();
    } finally {
      await client.close();
    }
  });
});
