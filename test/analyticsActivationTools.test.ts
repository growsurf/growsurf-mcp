import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";
import { TOOL_OUTPUT_SCHEMAS } from "../src/growsurf/outputSchemas.js";
import { TOOL_AUTHORIZATION_MANIFEST } from "../src/toolAuthorization.js";

const originalFetch = globalThis.fetch;

describe("activation and engagement analytics MCP tools", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("calls the three curated REST analytics contracts with exact query parameters", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ state: "UNAVAILABLE", reason: "COVERAGE_UNAVAILABLE" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;
    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "program-1" },
    });
    const client = new Client({ name: "analytics-activation-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const tools = await client.listTools();
      const activationTool = tools.tools.find(
        (candidate) => candidate.name === "growsurf_get_campaign_activation_analytics",
      );

      expect(activationTool?.inputSchema.properties).toMatchObject({
        cohortFrom: { type: "integer" },
        cohortTo: { type: "integer" },
        cohortInterval: { enum: ["day", "week", "month"] },
        observationWindowDays: { enum: [7, 30] },
        timezone: { type: "string" },
      });

      await client.callTool({
        name: "growsurf_get_campaign_analytics",
        arguments: {
          include: "engagement",
          interval: "week",
          days: 30,
          timezone: "America/Los_Angeles",
          platform: "IOS",
        },
      });
      await client.callTool({
        name: "growsurf_get_campaign_activation_analytics",
        arguments: {
          cohortFrom: 1767225600000,
          cohortTo: 1767830400000,
          cohortInterval: "week",
          observationWindowDays: 30,
          timezone: "America/Los_Angeles",
        },
      });
      await client.callTool({
        name: "growsurf_get_participant_analytics",
        arguments: {
          participantEmail: "ada@example.com",
          include: "activation,series",
          interval: "day",
          days: 30,
        },
      });

      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        "https://api.growsurf.com/v2/campaign/program-1/analytics?interval=week&include=engagement&days=30&timezone=America%2FLos_Angeles&platform=IOS",
        "https://api.growsurf.com/v2/campaign/program-1/analytics/activation?cohortFrom=1767225600000&cohortTo=1767830400000&cohortInterval=week&observationWindowDays=30&timezone=America%2FLos_Angeles",
        "https://api.growsurf.com/v2/campaign/program-1/participant/ada%40example.com/analytics?include=activation%2Cseries&interval=day&days=30",
      ]);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("requires activation cohort bounds together", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "program-1" },
    });
    const client = new Client({ name: "analytics-bounds-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const result = await client.callTool({
        name: "growsurf_get_campaign_activation_analytics",
        arguments: { cohortFrom: 1767225600000 },
      });

      expect(result.isError).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("advertises covered analytics and never publishes obsolete portal names", () => {
    const campaign = TOOL_OUTPUT_SCHEMAS.growsurf_get_campaign_analytics;
    const activation = TOOL_OUTPUT_SCHEMAS.growsurf_get_campaign_activation_analytics;
    const participant = TOOL_OUTPUT_SCHEMAS.growsurf_get_participant_analytics;
    const participantSeries = participant.properties?.series as {
      items?: { properties?: Record<string, unknown> };
    };
    const advertised = JSON.stringify({ campaign, activation, participant });

    expect(campaign.properties).toHaveProperty("engagement");
    expect(activation.properties).toHaveProperty("coverageStartAt");
    expect(activation.properties).toHaveProperty("aggregate");
    expect(activation.properties).toHaveProperty("cohorts");
    expect(advertised).toContain("PORTAL_VIEWED");
    expect(advertised).toContain("CREDITED_REFERRAL");
    expect(participant.properties).toHaveProperty("activation");
    expect(participantSeries.items?.properties).toHaveProperty("portalViews");
    expect(participantSeries.items?.properties).toHaveProperty("shareActions");
    expect(advertised).toContain("firstPortalViewedAt");
    expect(advertised).toContain("firstShareChannel");
    expect(advertised).toContain("COVERAGE_UNAVAILABLE");
    expect(advertised).toMatch(/does not mean.*never/i);
    expect(advertised).not.toMatch(/portalOpenedAt|firstWindowOpenedAt|WINDOW_OPEN/);
  });

  it("keeps every curated analytics tool on analytics:read", () => {
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_get_campaign_analytics.scopes).toEqual(["analytics:read"]);
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_get_campaign_activation_analytics.scopes).toEqual([
      "analytics:read",
    ]);
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_get_participant_analytics.scopes).toEqual(["analytics:read"]);
  });
});
