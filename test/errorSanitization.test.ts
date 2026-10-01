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

  it("rejects a read-only sender address before writing and accepts a partial sender-name update", async () => {
    const fetchMock = vi.fn(async () => Response.json({ settings: { sender: { fromName: "Pied Piper" } } }));
    globalThis.fetch = fetchMock as typeof fetch;
    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" },
    });
    const client = new Client({ name: "email-config-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const invalid = await client.callTool({
        name: "growsurf_update_campaign_emails",
        arguments: { fields: { settings: { sender: { fromEmail: "sender@piedpiper.com", fromName: "Pied Piper" } } } },
      });
      expect(invalid.isError).toBe(true);
      expect(JSON.parse((invalid.content[0] as { text: string }).text)).toMatchObject({
        code: "INVALID_TOOL_INPUT",
        errors: [expect.objectContaining({ field: "fields.settings.sender.fromEmail" })],
      });
      expect(fetchMock).not.toHaveBeenCalled();

      const fields = { settings: { sender: { fromName: "Pied Piper" } } };
      const valid = await client.callTool({ name: "growsurf_update_campaign_emails", arguments: { fields } });
      expect(valid.isError).not.toBe(true);
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
        "https://api.growsurf.com/v2/campaign/abc123/emails",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify(fields) }),
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it.each([
    ["growsurf_get_campaign_analytics", {}, "https://api.growsurf.com/v2/campaign/abc123/analytics"],
    [
      "growsurf_get_participant_analytics",
      { participantId: "part_123" },
      "https://api.growsurf.com/v2/campaign/abc123/participant/part_123/analytics",
    ],
  ] as const)("requires paired dates for %s before sending a REST request", async (name, baseArguments, path) => {
    const fetchMock = vi.fn(async () => Response.json({}));
    globalThis.fetch = fetchMock as typeof fetch;
    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" },
    });
    const client = new Client({ name: "analytics-range-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      await client.listTools();

      const missingEnd = await client.callTool({
        name,
        arguments: { ...baseArguments, startDate: 1 },
      });
      expect(missingEnd.isError).toBe(true);
      expect(JSON.parse((missingEnd.content[0] as { text: string }).text)).toMatchObject({
        code: "INVALID_TOOL_INPUT",
        errors: [expect.objectContaining({ field: "endDate" })],
      });
      expect(fetchMock).not.toHaveBeenCalled();

      const missingStart = await client.callTool({
        name,
        arguments: { ...baseArguments, endDate: 2 },
      });
      expect(missingStart.isError).toBe(true);
      expect(JSON.parse((missingStart.content[0] as { text: string }).text)).toMatchObject({
        code: "INVALID_TOOL_INPUT",
        errors: [expect.objectContaining({ field: "startDate" })],
      });
      expect(fetchMock).not.toHaveBeenCalled();

      const valid = await client.callTool({
        name,
        arguments: { ...baseArguments, startDate: 1, endDate: 2 },
      });
      expect(valid.isError).not.toBe(true);
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${path}?startDate=1&endDate=2`, expect.anything());
    } finally {
      await client.close();
      await server.close();
    }
  });

  it.each([
    ["growsurf_create_campaign_reward", { type: "SINGLE_SIDED" }, "POST"],
    ["growsurf_update_campaign_reward", { campaignRewardId: "crew_123" }, "PATCH"],
  ])("accepts nullable reward content fields on %s", async (name, target, method) => {
    const fields = {
      referralDescription: null, imageUrl: null, nextMilestonePrefix: null,
      nextMilestoneSuffix: null, couponCode: null, referralCouponCode: null,
    };
    const fetchMock = vi.fn(async () => Response.json({ id: "crew_123", ...fields }));
    globalThis.fetch = fetchMock as typeof fetch;
    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" },
    });
    const client = new Client({ name: "reward-config-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const result = await client.callTool({ name, arguments: { ...target, ...fields } });
      expect(result.isError).not.toBe(true);
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
        `https://api.growsurf.com/v2/campaign/abc123/reward-configs${method === "PATCH" ? "/crew_123" : ""}`,
        expect.objectContaining({ method, body: JSON.stringify({ ...(method === "POST" ? target : {}), ...fields }) }),
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

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
  // The hosted MCP server runs on Cloudflare Workers, which refuse `eval` and `new Function`. A
  // validator that compiles each schema into a function throws there on the first tool call while
  // `tools/list` keeps working, so nothing catches it before customers do.
  it("validates tool input without dynamic code generation", async () => {
    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" },
    });
    const client = new Client({ name: "no-codegen-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const realFunction = globalThis.Function;
    const denyCodeGeneration = () => {
      throw new EvalError("Code generation from strings disallowed for this context");
    };

    try {
      const { tools } = await client.listTools();
      expect(tools.length).toBeGreaterThan(0);

      globalThis.Function = new Proxy(realFunction, {
        construct: denyCodeGeneration,
        apply: denyCodeGeneration,
      });

      for (const tool of tools) {
        const guard = createToolInputGuard(tool.inputSchema);
        expect(() => guard({ unexpectedField: true }), `${tool.name} must reject without codegen`).toThrow();
      }
    } finally {
      globalThis.Function = realFunction;
      await client.close();
      await server.close();
    }
  });
});
