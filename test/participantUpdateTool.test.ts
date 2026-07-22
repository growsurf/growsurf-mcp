import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";

const originalFetch = globalThis.fetch;

describe("participant update MCP tool", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("does not expose or accept PayPal email updates", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    const server = createGrowSurfMcpServer({
      env: {
        GROWSURF_API_KEY: "api_key",
        GROWSURF_CAMPAIGN_ID: "abc123",
      },
    });
    const client = new Client({ name: "participant-update-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const tools = await client.listTools();
      const updateTool = tools.tools.find((candidate) => candidate.name === "growsurf_update_participant");

      expect(updateTool?.inputSchema.properties).not.toHaveProperty("paypalEmail");

      const result = await client.callTool({
        name: "growsurf_update_participant",
        arguments: {
          participantId: "part_1",
          paypalEmail: "richard@piedpiper.com",
        },
      });

      expect(result.isError).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await server.close();
    }
  });
});
