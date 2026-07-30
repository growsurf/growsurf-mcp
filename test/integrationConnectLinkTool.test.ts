import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";

describe("growsurf_get_integration_connect_link", () => {
  it("advertises and returns Wise as affiliate-only", async () => {
    const server = createGrowSurfMcpServer({
      env: { GROWSURF_CAMPAIGN_ID: "abc123" },
    });
    const client = new Client({ name: "integration-link-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
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
        url: "https://app.growsurf.com/editor/abc123/options/integrations?integration=wisecom",
      });
    } finally {
      await client.close();
      await server.close();
    }
  });
});
