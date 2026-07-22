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

  it("advertises optional email analytics on campaign and participant responses", () => {
    const campaign = TOOL_OUTPUT_SCHEMAS.growsurf_get_campaign_analytics;
    const participant = TOOL_OUTPUT_SCHEMAS.growsurf_get_participant_analytics;

    expect(campaign.properties).toHaveProperty("email");
    expect(participant.properties).toHaveProperty("email");
    expect((campaign.properties?.series as { items?: { properties?: object } }).items?.properties).toHaveProperty(
      "email",
    );
    expect((participant.properties?.series as { items?: { properties?: object } }).items?.properties).toHaveProperty(
      "email",
    );
  });

  it("advertises every participant sign-in field on the campaign Design response", () => {
    const design = TOOL_OUTPUT_SCHEMAS.growsurf_get_campaign_design;
    const login = design.properties?.login as { properties?: Record<string, unknown> };

    expect(Object.keys(login.properties ?? {})).toEqual([
      "heading",
      "description",
      "fieldLabel",
      "fieldPlaceholder",
      "buttonText",
      "successHeading",
      "successBody",
      "resendPrompt",
      "resend",
      "resent",
      "invalidEmail",
      "cooldown",
      "serverError",
      "invalidLink",
    ]);
  });

  it("advertises payout-destination confirmation page copy on the campaign Design response", () => {
    const design = TOOL_OUTPUT_SCHEMAS.growsurf_get_campaign_design;
    const confirmation = design.properties?.payoutDestinationConfirmation as {
      properties?: Record<string, { type?: unknown; maxLength?: number; properties?: Record<string, unknown> }>;
    };

    expect(Object.keys(confirmation.properties ?? {})).toEqual([
      "headline",
      "description",
      "emailLabel",
      "emailPlaceholder",
      "emailAgainLabel",
      "emailAgainPlaceholder",
      "legalNameLabel",
      "legalNamePlaceholder",
      "legalTypeLabel",
      "legalTypeIndividual",
      "legalTypeBusiness",
      "button",
      "success",
      "claimPending",
      "errorMessages",
    ]);

    const expectedLengths = {
      headline: 255,
      description: 500,
      emailLabel: 255,
      emailPlaceholder: 255,
      emailAgainLabel: 255,
      emailAgainPlaceholder: 255,
      legalNameLabel: 255,
      legalNamePlaceholder: 255,
      legalTypeLabel: 255,
      legalTypeIndividual: 255,
      legalTypeBusiness: 255,
      button: 255,
      success: 500,
      claimPending: 500,
    };
    for (const [field, maxLength] of Object.entries(expectedLengths)) {
      expect(confirmation.properties?.[field]).toMatchObject({ type: ["string", "null"], maxLength });
    }

    const errors = confirmation.properties?.errorMessages.properties as Record<
      string,
      { type?: unknown; maxLength?: number; description?: string }
    >;
    expect(Object.keys(errors)).toEqual([
      "invalidEmail",
      "emailMismatch",
      "tokenExpired",
      "tokenUsed",
      "alreadyConfirmed",
      "generic",
    ]);
    for (const error of Object.values(errors)) {
      expect(error).toMatchObject({ type: ["string", "null"], maxLength: 255 });
    }
    expect(design.description).toMatch(/omitted when no confirmation fields are stored/i);
    expect(errors.generic.description).toMatch(/provider-neutral/i);
  });

  it("advertises every payout-readiness email on the campaign Emails response", () => {
    const emails = TOOL_OUTPUT_SCHEMAS.growsurf_get_campaign_emails;
    const templates = emails.properties as Record<string, { description?: string }>;

    // The payout destination confirmation gates whether a participant can be paid, so an agent
    // reading this response has to be told the template exists and which providers it covers.
    expect(templates).toHaveProperty("payoutDestinationConfirmation");
    expect(templates.payoutDestinationConfirmation.description).toMatch(/PayPal/);
    expect(templates.payoutDestinationConfirmation.description).toMatch(/Wise/);
    expect(templates.payoutDestinationConfirmation.description).toMatch(/\{\{payoutDestinationConfirmationLink\}\}/);
    expect(templates).toHaveProperty("payoutDestinationChanged");
    expect(templates.payoutDestinationChanged.description).toMatch(/\{\{payoutDestinationMaskedEmail\}\}/);
  });

  it("no longer advertises the retired PayPal email confirmation template", async () => {
    const emails = TOOL_OUTPUT_SCHEMAS.growsurf_get_campaign_emails;
    const templates = emails.properties as Record<string, unknown>;

    // The template is not customizable anymore. Payout confirmation copy lives on
    // `payoutDestinationConfirmation`, so nothing on this surface may point agents at the old key.
    expect(templates).not.toHaveProperty("paypalEmailConfirmation");
    expect(templates).toHaveProperty("payoutDestinationConfirmation");

    const client = await connectClient();
    try {
      const tools = await client.listTools();
      const advertised = JSON.stringify(tools.tools);
      expect(advertised).not.toMatch(/paypalEmailConfirmation/i);
      expect(advertised).not.toMatch(/PayPal confirm/i);
    } finally {
      await client.close();
    }
  });

  it("advertises editable affiliate invite and application-status emails", () => {
    const emails = TOOL_OUTPUT_SCHEMAS.growsurf_get_campaign_emails;
    const templates = emails.properties as Record<string, { description?: string }>;

    expect(templates).toHaveProperty("inviteAffiliate");
    expect(templates.inviteAffiliate.description).toMatch(/\{\{affiliateInviteLink\}\}/);
    expect(templates.inviteAffiliate.description).toMatch(/Promotional/);
    expect(templates.inviteAffiliate.description).toMatch(/toggle can be changed/);
    expect(templates.settings.description).toMatch(/unsubscribeAffiliateInvite/);
    expect(templates).toHaveProperty("affiliateApplicationStatusLink");
    expect(templates.affiliateApplicationStatusLink.description).toMatch(/\{\{applicationStatusLink\}\}/);
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
