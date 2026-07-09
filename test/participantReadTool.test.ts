import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";

const originalFetch = globalThis.fetch;

describe("participant read MCP tools", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("exposes and calls participant list/get tools on the documented REST paths", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/participants?")) {
        return new Response(
          JSON.stringify({
            participants: [{ id: "part_1", email: "richard@piedpiper.com" }],
            limit: 50,
            nextId: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ id: "part_1", email: "richard@piedpiper.com" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const server = createGrowSurfMcpServer({
      env: {
        GROWSURF_API_KEY: "api_key",
        GROWSURF_CAMPAIGN_ID: "abc123",
      },
    });
    const client = new Client({ name: "tool-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const tools = await client.listTools();
      const listTool = tools.tools.find((candidate) => candidate.name === "growsurf_list_participants");
      const getTool = tools.tools.find((candidate) => candidate.name === "growsurf_get_participant");

      expect(listTool?.inputSchema.properties).toHaveProperty("campaignId");
      expect(listTool?.inputSchema.properties).toHaveProperty("nextId");
      expect(getTool?.inputSchema.properties).toHaveProperty("campaignId");
      expect(getTool?.inputSchema.properties).toHaveProperty("participantEmail");

      const listResult = await client.callTool({
        name: "growsurf_list_participants",
        arguments: { limit: 50, nextId: "part_0" },
      });
      const listText = listResult.content[0]?.type === "text" ? listResult.content[0].text : "";
      expect(listText).toContain("richard@piedpiper.com");

      const getResult = await client.callTool({
        name: "growsurf_get_participant",
        arguments: { participantEmail: "richard@piedpiper.com" },
      });
      const getText = getResult.content[0]?.type === "text" ? getResult.content[0].text : "";
      expect(getText).toContain("part_1");

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "https://api.growsurf.com/v2/campaign/abc123/participants?limit=50&nextId=part_0",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ Authorization: "Bearer api_key" }),
        }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "https://api.growsurf.com/v2/campaign/abc123/participant/richard%40piedpiper.com",
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
