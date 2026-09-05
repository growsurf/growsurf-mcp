import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";
import { createToolInputGuard } from "../src/toolInputValidation.js";

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

describe("rejected tool input", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("names the field and the reason instead of a bare failure", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" },
    });
    const client = new Client({ name: "input-validation-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const result = await client.callTool({
        name: "growsurf_add_participant",
        arguments: { campaignId: "abc123", email: "no" },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0]!.text;
      expect(text).not.toBe("Request failed.");
      // A JSON object, so the hosted transport's error formatter can read it as one.
      const parsed = JSON.parse(text) as { code?: string; errors?: Array<{ field?: string }> };
      expect(parsed.code).toBe("INVALID_TOOL_INPUT");
      expect(parsed.errors?.[0]?.field).toBe("email");
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await server.close();
    }
  });

  it.each([
    ["growsurf_trigger_referral", { participantId: "participant_1", delayInDays: 0 }, "delayInDays"],
    ["growsurf_trigger_referral", { participantId: "participant_1", delayInDays: -1 }, "delayInDays"],
    ["growsurf_trigger_referral", { participantId: "participant_1", delayInDays: 91 }, "delayInDays"],
    ["growsurf_update_campaign", { currencyISO: "ZZZZ" }, "currencyISO"],
    ["growsurf_get_campaign", { campaignId: 123 }, "campaignId"],
    ["growsurf_list_campaigns", { unexpectedField: true }, "unexpectedField"],
  ] as const)("rejects invalid %s input and identifies %s", async (toolName, args, expectedField) => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" },
    });
    const client = new Client({ name: "input-contract-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const result = await client.callTool({ name: toolName, arguments: args });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0]!.text;
      expect(text).not.toBe("Request failed.");
      const parsed = JSON.parse(text) as {
        code?: string;
        status?: number;
        errors?: Array<{ field?: string }>;
      };
      expect(parsed.code).toBe("INVALID_TOOL_INPUT");
      expect(parsed.status).toBe(400);
      expect(parsed.errors?.some((error) => error.field === expectedField)).toBe(true);
      if (expectedField === "delayInDays") {
        expect(text).toContain("between 1 and 90");
      }
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("rejects undeclared input fields for every listed tool", async () => {
    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" },
    });
    const client = new Client({ name: "input-catalog-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const { tools } = await client.listTools();
      expect(tools.length).toBeGreaterThan(0);

      for (const tool of tools) {
        let thrown: unknown;
        try {
          createToolInputGuard(tool.inputSchema)({ unexpectedField: true });
        } catch (error) {
          thrown = error;
        }
        expect(thrown, `${tool.name} must reject undeclared fields`).toMatchObject({
          code: "INVALID_TOOL_INPUT",
          status: 400,
          errors: [{ field: "unexpectedField", code: "unrecognized_key" }],
        });
      }
    } finally {
      await client.close();
      await server.close();
    }
  }, 20_000);

  it("accepts an empty string on the optional participant fields, like the REST endpoint", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "part_1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" },
    });
    const client = new Client({ name: "empty-string-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const result = await client.callTool({
        name: "growsurf_add_participant",
        arguments: {
          campaignId: "abc123",
          email: "richard@piedpiper.com",
          firstName: "",
          lastName: "",
          referredBy: "",
          ipAddress: "",
          fingerprint: "",
          mobileInstanceId: "",
        },
      });

      expect(result.isError).toBeFalsy();
      const body = JSON.parse(String((fetchMock.mock.calls[0]![1] as { body?: unknown }).body)) as Record<string, unknown>;
      expect(body.firstName).toBe("");
      expect(body.mobileInstanceId).toBe("");
    } finally {
      await client.close();
      await server.close();
    }
  });
});
