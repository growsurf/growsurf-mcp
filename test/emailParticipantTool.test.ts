import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";

const originalFetch = globalThis.fetch;

describe("growsurf_email_participant", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("advertises and enforces exactly one email mode", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ accepted: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" },
    });
    const client = new Client({ name: "email-participant-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const tools = await client.listTools();
      const tool = tools.tools.find((candidate) => candidate.name === "growsurf_email_participant");
      const allOf = tool?.inputSchema.allOf as Array<Record<string, unknown>> | undefined;
      expect(allOf?.some((requirement) => "oneOf" in requirement)).toBe(true);

      const invalid = await client.callTool({
        name: "growsurf_email_participant",
        arguments: {
          participantEmail: "person@example.com",
          emailType: "welcomeNonReferred",
          subject: "Hello",
          body: "<p>Hello</p>",
        },
      });

      expect(invalid.isError).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();

      const template = await client.callTool({
        name: "growsurf_email_participant",
        arguments: {
          participantEmail: "person@example.com",
          emailType: "welcomeNonReferred",
        },
      });
      const freeForm = await client.callTool({
        name: "growsurf_email_participant",
        arguments: {
          participantEmail: "person@example.com",
          subject: "Hello",
          body: "<p>Hello</p>",
        },
      });

      expect(template.isError).not.toBe(true);
      expect(freeForm.isError).not.toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
