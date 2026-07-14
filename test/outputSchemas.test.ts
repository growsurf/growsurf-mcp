import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TOOL_OUTPUT_SCHEMAS } from "../src/growsurf/outputSchemas.js";
import { createGrowSurfMcpServer } from "../src/index.js";

const originalFetch = globalThis.fetch;

// Tools whose output is a markdown document rather than a REST response body. They still declare
// an output schema, so their results must carry the same document as `structuredContent.markdown`.
const MARKDOWN_TOOLS = [
  "growsurf_integration_guide",
  "growsurf_agent_program_creation_eval",
  "growsurf_mobile_sdk_guide",
  "growsurf_api_library_snippets",
  "growsurf_client_snippets",
  "growsurf_embeddable_element_snippet",
  "growsurf_grsf_config_snippet",
];

const MARKDOWN_TOOL_ARGS: Record<string, Record<string, unknown>> = {
  growsurf_embeddable_element_snippet: { element: "form" },
};

const connectClient = async () => {
  const server = createGrowSurfMcpServer({
    env: {
      GROWSURF_API_KEY: "api_key",
      GROWSURF_CAMPAIGN_ID: "abc123",
    },
  });
  const client = new Client({ name: "output-schema-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
};

describe("tool output schemas", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("advertises an output schema for every listed tool", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();

    for (const tool of tools) {
      expect(tool.outputSchema, `${tool.name} must advertise an outputSchema`).toMatchObject({ type: "object" });
    }
    // A new tool has to land in the schema map too, or this fails.
    for (const name of Object.keys(TOOL_OUTPUT_SCHEMAS)) {
      expect(
        tools.some((tool) => tool.name === name),
        `schema map entry ${name} is not a listed tool`,
      ).toBe(true);
    }
    expect(Object.keys(TOOL_OUTPUT_SCHEMAS).length).toBe(tools.length);
  });

  it("returns the markdown document as structuredContent for every guidance tool", async () => {
    const client = await connectClient();
    // Arms the SDK client's structured-output validation against each advertised schema.
    await client.listTools();

    for (const name of MARKDOWN_TOOLS) {
      const result = await client.callTool({ name, arguments: MARKDOWN_TOOL_ARGS[name] ?? {} });
      expect(result.isError, `${name} should succeed`).toBeFalsy();

      const text = Array.isArray(result.content) && result.content[0]?.type === "text" ? result.content[0].text : "";
      expect(text.length, `${name} should return a document`).toBeGreaterThan(0);
      // The text block stays raw markdown, and structuredContent repeats it for the schema.
      expect(result.structuredContent, `${name} should carry structuredContent`).toEqual({ markdown: text });
    }
  });

  it("returns the participant auth hash as structuredContent", async () => {
    const client = await connectClient();
    await client.listTools();

    const result = await client.callTool({
      name: "growsurf_participant_auth_hash",
      arguments: { email: "richard@piedpiper.com", participantAuthSecret: "shhh" },
    });

    expect(result.isError).toBeFalsy();
    const text = Array.isArray(result.content) && result.content[0]?.type === "text" ? result.content[0].text : "";
    expect(text).toMatch(/^[a-f0-9]{64}$/);
    expect(result.structuredContent).toEqual({ hash: text });
  });

  it("keeps every output schema drift-tolerant (no required lists, no closed objects)", () => {
    const walk = (node: unknown, path: string): void => {
      if (Array.isArray(node)) {
        node.forEach((entry, index) => walk(entry, `${path}[${index}]`));
        return;
      }
      if (!node || typeof node !== "object") return;
      const record = node as Record<string, unknown>;
      expect(record.required, `${path} must not declare required`).toBeUndefined();
      expect(record.additionalProperties, `${path} must not close the object`).not.toBe(false);
      for (const [key, value] of Object.entries(record)) walk(value, `${path}.${key}`);
    };
    for (const [name, schema] of Object.entries(TOOL_OUTPUT_SCHEMAS)) walk(schema, name);
  });

  it("returns structuredContent matching the JSON text for REST-backed tools", async () => {
    const participant = {
      id: "part_1",
      email: "richard@piedpiper.com",
      firstName: "Richard",
      referralCount: 2,
      monthlyReferralCount: 1,
      rank: 5,
      monthlyRank: 2,
      shareUrl: "https://piedpiper.com?grsf=richard-part1",
      referralStatus: "CREDIT_AWARDED",
      rewards: [{ id: "prew_1", rewardId: "crew_1", status: "FULFILLED" }],
      metadata: { company: "Pied Piper" },
      payoutSettings: { requiredActions: [] },
    };
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    ) as typeof fetch;

    const client = await connectClient();
    // Listing tools first arms the SDK client's built-in structured-output validation, so this
    // call also proves the result conforms to the advertised schema.
    await client.listTools();
    const result = await client.callTool({
      name: "growsurf_get_participant",
      arguments: { participantEmail: "richard@piedpiper.com" },
    });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual(participant);
    const text = Array.isArray(result.content) && result.content[0]?.type === "text" ? result.content[0].text : "";
    expect(JSON.parse(text)).toEqual(participant);
  });

  it("returns structuredContent on both webhook_normalize outcomes", async () => {
    const client = await connectClient();
    await client.listTools();

    const valid = await client.callTool({
      name: "growsurf_webhook_normalize",
      arguments: { payload: { event: "NEW_PARTICIPANT_ADDED", createdAt: 1719792000000, data: { id: "part_1" } } },
    });
    expect(valid.isError).toBeFalsy();
    expect(valid.structuredContent).toMatchObject({ ok: true, envelope: { event: "NEW_PARTICIPANT_ADDED" } });

    const invalid = await client.callTool({
      name: "growsurf_webhook_normalize",
      arguments: { payload: { event: "NEW_PARTICIPANT_ADDED" } },
    });
    expect(invalid.isError).toBeFalsy();
    expect(invalid.structuredContent).toMatchObject({ ok: false });
  });
});
