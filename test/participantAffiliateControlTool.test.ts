import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";

const originalFetch = globalThis.fetch;

describe("participant affiliate-control MCP tools", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("exposes and forwards affiliate controls for participant and mobile-token writes", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "part_1",
          email: "affiliate@example.com",
          isAffiliate: true,
          affiliateStatus: "APPROVED",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const server = createGrowSurfMcpServer({
      env: {
        GROWSURF_API_KEY: "api_key",
        GROWSURF_CAMPAIGN_ID: "abc123",
      },
    });
    const client = new Client({ name: "participant-affiliate-control-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const tools = await client.listTools();
      const addTool = tools.tools.find((candidate) => candidate.name === "growsurf_add_participant");
      const updateTool = tools.tools.find((candidate) => candidate.name === "growsurf_update_participant");
      const mobileTokenTool = tools.tools.find(
        (candidate) => candidate.name === "growsurf_create_mobile_participant_token",
      );

      expect(addTool?.inputSchema.properties).toHaveProperty("isAffiliate");
      expect(updateTool?.inputSchema.properties).toHaveProperty("affiliateStatus");
      expect(updateTool?.inputSchema.properties).not.toHaveProperty("isAffiliate");
      expect(mobileTokenTool?.inputSchema.properties).toHaveProperty("isAffiliate");
      expect(addTool?.description).toContain("trusted direct enrollment");
      expect(addTool?.description).toContain("public application");
      expect(mobileTokenTool?.description).toContain("trusted direct enrollment");
      expect(mobileTokenTool?.description).toContain("public application");

      await client.callTool({
        name: "growsurf_add_participant",
        arguments: {
          email: "affiliate@example.com",
          referredBy: "referrer-1",
          isAffiliate: true,
        },
      });
      await client.callTool({
        name: "growsurf_update_participant",
        arguments: {
          participantId: "part_1",
          affiliateStatus: "APPROVED",
        },
      });
      await client.callTool({
        name: "growsurf_create_mobile_participant_token",
        arguments: {
          email: "mobile-affiliate@example.com",
          isAffiliate: true,
        },
      });

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "https://api.growsurf.com/v2/campaign/abc123/participant",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "affiliate@example.com",
            isAffiliate: true,
            referredBy: "referrer-1",
          }),
        }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "https://api.growsurf.com/v2/campaign/abc123/participant/part_1",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ affiliateStatus: "APPROVED" }),
        }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        "https://api.growsurf.com/v2/campaign/abc123/mobile-participant-token",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "mobile-affiliate@example.com",
            isAffiliate: true,
          }),
        }),
      );
    } finally {
      await client.close();
      await server.close();
    }
  });
});
