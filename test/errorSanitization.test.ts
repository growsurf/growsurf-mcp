import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";

const originalFetch = globalThis.fetch;

describe("MCP tool error sanitization", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("keeps public API error fields without exposing downstream stack or source locations", async () => {
    const internalSourceLocation =
      "/workspace/node_modules/@growsurfteam/growsurf-mcp/dist/index.js:2155:51";
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          name: "BadRequestError",
          code: "BAD_REQUEST_ERROR",
          message: "Invalid request.",
          status: 400,
          supportUrl: "https://app.growsurf.com/settings#contact_support",
          errors: [
            {
              field: "email",
              code: "INVALID_EMAIL",
              message: "Invalid email address.",
              source: internalSourceLocation,
              line: 2155,
            },
          ],
          stack: `BadRequestError: Invalid request.\n    at handleTool (${internalSourceLocation})`,
          path: internalSourceLocation,
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      ),
    ) as typeof fetch;

    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "campaign_id" },
    });
    const client = new Client({ name: "error-sanitization-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const result = await client.callTool({ name: "growsurf_get_team", arguments: {} });
      const text = (result.content[0] as { type: "text"; text: string }).text;

      expect(result.isError).toBe(true);
      expect(JSON.parse(text)).toEqual({
        name: "BadRequestError",
        code: "BAD_REQUEST_ERROR",
        message: "Invalid request.",
        status: 400,
        supportUrl: "https://app.growsurf.com/settings#contact_support",
        errors: [
          {
            field: "email",
            code: "INVALID_EMAIL",
            message: "Invalid email address.",
          },
        ],
      });
      expect(text).not.toContain(internalSourceLocation);
      expect(text).not.toContain("stack");
      expect(text).not.toContain("source");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("redacts source locations embedded in a downstream error message", async () => {
    const internalSourceLocation = "file:///srv/app/dist/index.js:2155:51";
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          name: "InternalServerError",
          code: "INTERNAL_SERVER_ERROR",
          message: `Request failed at ${internalSourceLocation}`,
          status: 500,
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      ),
    ) as typeof fetch;

    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "campaign_id" },
    });
    const client = new Client({ name: "error-redaction-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const result = await client.callTool({ name: "growsurf_get_team", arguments: {} });
      const text = (result.content[0] as { type: "text"; text: string }).text;

      expect(result.isError).toBe(true);
      expect(text).toContain("Request failed at [internal source location]");
      expect(text).not.toContain(internalSourceLocation);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
