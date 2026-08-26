import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";
import { GROWSURF_AGENT_INDEX_URI } from "../src/growsurf/resources.js";

const connectResourceClient = async (env: Parameters<typeof createGrowSurfMcpServer>[0]["env"] = {}) => {
  const server = createGrowSurfMcpServer({ env });
  const client = new Client({ name: "resource-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
};

describe("GrowSurf MCP resources", () => {
  it("lists and reads a useful public resource without credentials", async () => {
    const { client, server } = await connectResourceClient();

    try {
      const listed = await client.listResources();
      expect(listed.resources).toEqual([
        expect.objectContaining({
          uri: GROWSURF_AGENT_INDEX_URI,
          name: "GrowSurf Agent and Developer Index",
          mimeType: "text/markdown",
        }),
      ]);

      const read = await client.readResource({ uri: GROWSURF_AGENT_INDEX_URI });
      expect(read.contents).toEqual([
        expect.objectContaining({
          uri: GROWSURF_AGENT_INDEX_URI,
          mimeType: "text/markdown",
          text: expect.stringContaining("https://growsurf.com/openapi.json"),
        }),
      ]);
      expect(read.contents[0]?.text).toContain("https://growsurf.com/arazzo.yaml");
      expect(read.contents[0]?.text).toContain("MCP server");
      expect(read.contents[0]?.text).toContain("https://growsurf.com/sitemap.xml");
      expect(read.contents[0]?.text).toContain("npx -y @growsurfteam/growsurf-mcp");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("lists the campaign resource only when its required credentials exist", async () => {
    const { client, server } = await connectResourceClient({
      GROWSURF_API_KEY: "api_key",
      GROWSURF_CAMPAIGN_ID: "program_id",
    });

    try {
      const listed = await client.listResources();
      expect(listed.resources.map(({ uri }) => uri)).toEqual([
        GROWSURF_AGENT_INDEX_URI,
        "growsurf://campaign",
      ]);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
