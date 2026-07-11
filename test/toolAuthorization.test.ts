import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CREDENTIAL_TYPES,
  createGrowSurfMcpServer,
  filterToolsForCredential,
  HOSTED_MCP_REQUESTED_SCOPES,
  MACHINE_SCOPES,
  TOOL_AUTHORIZATION_MANIFEST,
  TOOL_RISK_META_KEY,
  TOOL_RISK_TIERS,
} from "../src/index.js";

const env = {
  GROWSURF_API_KEY: "api_key",
  GROWSURF_CAMPAIGN_ID: "campaign_id",
};

const originalFetch = globalThis.fetch;

const listTools = async (
  options: Parameters<typeof createGrowSurfMcpServer>[0] = { env },
) => {
  const server = createGrowSurfMcpServer(options);
  const client = new Client({ name: "authorization-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const result = await client.listTools();
    return result.tools;
  } finally {
    await client.close();
    await server.close();
  }
};

const listToolNames = async (
  options: Parameters<typeof createGrowSurfMcpServer>[0] = { env },
): Promise<string[]> => (await listTools(options)).map((tool) => tool.name);

describe("MCP tool authorization", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("keeps every listed tool represented in the canonical manifest", async () => {
    const listedToolNames = await listToolNames();

    expect([...listedToolNames].sort()).toEqual(Object.keys(TOOL_AUTHORIZATION_MANIFEST).sort());
  });

  it("keeps credential rotation in the REST client instead of exposing it as an MCP tool", async () => {
    const listedToolNames = await listToolNames();

    expect(listedToolNames).not.toContain("growsurf_rotate_api_key");
    expect(TOOL_AUTHORIZATION_MANIFEST).not.toHaveProperty("growsurf_rotate_api_key");

    const server = createGrowSurfMcpServer({ env });
    const client = new Client({ name: "rotation-policy-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const result = await client.callTool({ name: "growsurf_rotate_api_key", arguments: {} });
      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: "Unknown tool: growsurf_rotate_api_key" },
      ]);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("derives the hosted OAuth request scope union from OAuth-compatible tools", () => {
    expect(MACHINE_SCOPES).not.toHaveProperty("API_KEY_ROTATE");
    expect(HOSTED_MCP_REQUESTED_SCOPES).toEqual([
      "account:read",
      "account:write",
      "program:read",
      "program:write",
      "participant:read",
      "participant:write",
      "participant:delete",
      "reward:write",
      "analytics:read",
    ]);
    expect(HOSTED_MCP_REQUESTED_SCOPES).not.toContain("api_key:rotate");
    expect(HOSTED_MCP_REQUESTED_SCOPES).not.toContain("program:delete");
    expect(HOSTED_MCP_REQUESTED_SCOPES).not.toContain("reward:read");
    expect(HOSTED_MCP_REQUESTED_SCOPES).not.toContain("reward:delete");
    expect(HOSTED_MCP_REQUESTED_SCOPES).not.toContain("reward:fulfill");
  });

  it("does not make analytics tools depend on unrelated program or participant scopes", () => {
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_get_campaign_analytics.scopes).toEqual([
      "analytics:read",
    ]);
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_get_participant_analytics.scopes).toEqual([
      "analytics:read",
    ]);
  });

  it("publishes standard safety annotations and one control-plane risk tier for every tool", async () => {
    const tools = await listTools();
    const byName = new Map(tools.map((tool) => [tool.name, tool]));

    for (const tool of tools) {
      expect(tool.annotations, tool.name).toEqual(expect.objectContaining({
        readOnlyHint: expect.any(Boolean),
        destructiveHint: expect.any(Boolean),
        idempotentHint: expect.any(Boolean),
        openWorldHint: expect.any(Boolean),
      }));
      expect(TOOL_AUTHORIZATION_MANIFEST[tool.name as keyof typeof TOOL_AUTHORIZATION_MANIFEST].riskTier)
        .toMatch(/^(READ|CONTENT|DESTRUCTIVE|MONEY)$/);
      expect(tool._meta?.[TOOL_RISK_META_KEY], tool.name)
        .toBe(TOOL_AUTHORIZATION_MANIFEST[tool.name as keyof typeof TOOL_AUTHORIZATION_MANIFEST].riskTier);
    }

    expect(byName.get("growsurf_get_campaign")?.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
    });
    expect(byName.get("growsurf_create_campaign")?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
    });
    expect(byName.get("growsurf_create_account")?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
    expect(byName.get("growsurf_capture_referral_flow_screenshots")?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    });
    expect(byName.get("growsurf_update_campaign")?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
    });
    expect(byName.get("growsurf_bulk_delete_participants")?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
    });
    expect(byName.get("growsurf_email_participant")?.annotations).toMatchObject({
      openWorldHint: true,
    });
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_bulk_delete_participants.riskTier)
      .toBe(TOOL_RISK_TIERS.DESTRUCTIVE);
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_delete_campaign_webhook.riskTier)
      .toBe(TOOL_RISK_TIERS.DESTRUCTIVE);
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_cancel_delayed_referral.riskTier)
      .toBe(TOOL_RISK_TIERS.DESTRUCTIVE);
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_create_campaign_reward.riskTier)
      .toBe(TOOL_RISK_TIERS.MONEY);
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_update_campaign_reward.riskTier)
      .toBe(TOOL_RISK_TIERS.MONEY);
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_delete_campaign_reward.riskTier)
      .toBe(TOOL_RISK_TIERS.MONEY);
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_trigger_referral.riskTier).toBe(TOOL_RISK_TIERS.MONEY);
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_record_sale.riskTier).toBe(TOOL_RISK_TIERS.MONEY);
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_refund_transaction.riskTier).toBe(TOOL_RISK_TIERS.MONEY);
  });

  it.each(["growsurf_record_sale", "growsurf_refund_transaction"])(
    "advertises both participant and transaction identifier requirements for %s",
    async (toolName) => {
      const tool = (await listTools()).find((candidate) => candidate.name === toolName);
      const allOf = (tool?.inputSchema as { allOf?: Array<{ anyOf?: unknown[] }> } | undefined)?.allOf;

      expect(allOf).toHaveLength(2);
      expect(allOf?.[0]?.anyOf).toEqual([
        { required: ["participantId"] },
        { required: ["participantEmail"] },
      ]);
      expect(allOf?.[1]?.anyOf).toEqual([
        { required: ["externalId"] },
        { required: ["transactionId"] },
        { required: ["orderId"] },
        { required: ["paymentId"] },
        { required: ["invoiceId"] },
        { required: ["paymentIntentId"] },
        { required: ["chargeId"] },
      ]);
    },
  );

  it("filters tools by scopes and credential type while retaining unrestricted tools", () => {
    const tools = [
      { name: "growsurf_integration_guide" },
      { name: "growsurf_create_account" },
      { name: "growsurf_get_campaign" },
      { name: "growsurf_update_campaign" },
      { name: "growsurf_rotate_api_key" },
      { name: "unknown_future_tool" },
    ];

    expect(
      filterToolsForCredential(tools, {
        credentialType: CREDENTIAL_TYPES.MCP_OAUTH,
        scopes: ["program:read", "api_key:rotate"],
      }).map((tool) => tool.name),
    ).toEqual(["growsurf_integration_guide", "growsurf_create_account", "growsurf_get_campaign"]);

    for (const credentialType of [CREDENTIAL_TYPES.TEAM_API_KEY, CREDENTIAL_TYPES.LEGACY_API_KEY]) {
      expect(
        filterToolsForCredential(tools, {
          credentialType,
          scopes: ["api_key:rotate"],
        }).map((tool) => tool.name),
      ).toEqual(["growsurf_integration_guide", "growsurf_create_account"]);
    }

    expect(filterToolsForCredential(tools, null).map((tool) => tool.name)).toEqual([
      "growsurf_integration_guide",
      "growsurf_create_account",
    ]);
  });

  it("filters tools/list when a resolver is present and stays backward compatible without one", async () => {
    const unfiltered = await listToolNames({ env });
    const filtered = await listToolNames({
      env,
      resolveCredentialContext: async () => ({
        credentialType: CREDENTIAL_TYPES.MCP_OAUTH,
        scopes: ["program:read"],
      }),
    });

    expect(unfiltered).not.toContain("growsurf_rotate_api_key");
    expect(unfiltered).toContain("growsurf_update_campaign");
    expect(filtered).toContain("growsurf_integration_guide");
    expect(filtered).toContain("growsurf_create_account");
    expect(filtered).toContain("growsurf_get_campaign");
    expect(filtered).not.toContain("growsurf_update_campaign");
    expect(filtered).not.toContain("growsurf_rotate_api_key");
  });

  it("leaves tools/call authorization to the REST API", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "account_id" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const server = createGrowSurfMcpServer({
      env,
      resolveCredentialContext: async () => ({
        credentialType: CREDENTIAL_TYPES.MCP_OAUTH,
        scopes: ["program:read"],
      }),
    });
    const client = new Client({ name: "authorization-call-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const listedTools = await client.listTools();
      expect(listedTools.tools.map((tool) => tool.name)).not.toContain("growsurf_get_account");

      const result = await client.callTool({ name: "growsurf_get_account", arguments: {} });
      expect(result.isError).not.toBe(true);
      expect(fetchMock).toHaveBeenCalledOnce();
    } finally {
      await client.close();
      await server.close();
    }
  });
});
