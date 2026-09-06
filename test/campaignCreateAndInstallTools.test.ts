import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrowSurfMcpServer, type ProgramDesignAdvice } from "../src/index.js";

const originalFetch = globalThis.fetch;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const connect = async () => {
  const server = createGrowSurfMcpServer({
    env: {
      GROWSURF_API_KEY: "api_key",
      GROWSURF_CAMPAIGN_ID: "abc123",
    },
  });
  const client = new Client({ name: "campaign-create-install-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { server, client };
};

const textOf = (result: { content?: unknown }): string => {
  const content = Array.isArray(result.content) ? result.content : [];
  return content
    .map((item) => (item && typeof item === "object" && "text" in item ? String((item as { text: unknown }).text) : ""))
    .join("\n");
};

const bodyOf = (call: unknown[]): Record<string, unknown> =>
  JSON.parse(String((call[1] as { body?: unknown }).body)) as Record<string, unknown>;

describe("server instructions", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // The ask-first and never-invent-a-reward-amount rules used to live only in the GrowSurf prompts,
  // which a host reads only when someone picks one. They have to reach every session at connect.
  it("reach the client at connection time, not only through a prompt", async () => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;

    const { server, client } = await connect();
    try {
      const instructions = client.getInstructions() ?? "";

      expect(instructions).toContain("goal");
      expect(instructions).toContain("Never choose a reward or commission amount yourself");
      expect(instructions).toContain("Share URL");
    } finally {
      await client.close();
      await server.close();
    }
  });
});

describe("growsurf_create_campaign goal", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("sends the program goal through to the create request", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "camp_1" }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { server, client } = await connect();
    try {
      const result = await client.callTool({
        name: "growsurf_create_campaign",
        arguments: { type: "REFERRAL", goal: "B2C_SUBSCRIPTIONS" },
      });

      expect(result.isError).toBeFalsy();
      expect(bodyOf(fetchMock.mock.calls[0]!).goal).toBe("B2C_SUBSCRIPTIONS");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("advertises the same goal values it accepts", async () => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;

    const { server, client } = await connect();
    try {
      const tools = await client.listTools();
      const createTool = tools.tools.find((candidate) => candidate.name === "growsurf_create_campaign");
      const goal = (createTool?.inputSchema.properties as { goal?: { enum?: string[] } } | undefined)?.goal;

      expect(goal?.enum).toContain("B2B_SAAS_SELF_SERVICE");
      expect(goal?.enum).toContain("WAITLIST");

      const rejected = await client.callTool({
        name: "growsurf_create_campaign",
        arguments: { type: "REFERRAL", goal: "NOT_A_GOAL" },
      });
      expect(rejected.isError).toBe(true);
    } finally {
      await client.close();
      await server.close();
    }
  });
});

describe("advisor configuration plan", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // Proposed configuration is a public contract: both client output paths must receive the
  // same valid tool calls, and requesting a draft must never execute those calls.
  it("returns the same validated plan in structured output and Markdown without API writes", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { server, client } = await connect();
    try {
      await client.listTools();
      for (const input of [
        {},
        { programType: "AFFILIATE", industry: "saas_ai", goal: "paid_conversions" },
        { industry: "other", goal: "signups", qualifyingAction: "Complete a paid appointment" },
      ]) {
        const result = await client.callTool({ name: "growsurf_program_design_advisor", arguments: input });
        expect(result.isError, textOf(result)).toBeFalsy();
        const advice = result.structuredContent as unknown as ProgramDesignAdvice;
        expect(advice.configurationPlan.length).toBeGreaterThan(0);
        expect(advice.decisions.unresolved.length).toBeGreaterThan(0);
        const text = textOf(result);
        const jsonDocuments = [...text.matchAll(/```json\n([\s\S]*?)\n```/g)].map((match) => JSON.parse(match[1]!));
        expect(jsonDocuments).toContainEqual(advice.configurationPlan);
        expect(advice.markdown).toBe(text);
      }
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await server.close();
    }
  });
});

describe("growsurf_update_campaign_installation share URL guard", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("refuses to replace a Share URL the customer already set", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ shareUrl: "https://piedpiper.com", allowedUrls: [] }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { server, client } = await connect();
    try {
      const result = await client.callTool({
        name: "growsurf_update_campaign_installation",
        arguments: { fields: { shareUrl: "http://localhost:3000" } },
      });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("https://piedpiper.com");
      // The read happened; the write did not.
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0]![1] && (fetchMock.mock.calls[0]![1] as { method?: string }).method)).toBe("GET");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("replaces the Share URL once the caller confirms it", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ shareUrl: "https://piedpiper.com", allowedUrls: [] }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { server, client } = await connect();
    try {
      const result = await client.callTool({
        name: "growsurf_update_campaign_installation",
        arguments: { fields: { shareUrl: "https://piedpiper.io" }, replaceExistingShareUrl: true },
      });

      expect(result.isError).toBeFalsy();
      expect(bodyOf(fetchMock.mock.calls[0]!).shareUrl).toBe("https://piedpiper.io");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("still patches when the caller may write the tab but not read it", async () => {
    const fetchMock = vi.fn(async (_url: unknown, init?: { method?: string }) =>
      init?.method === "GET"
        ? jsonResponse({ name: "NotAuthorizedError", message: "Insufficient scope." }, 403)
        : jsonResponse({ shareUrl: "http://localhost:3000" }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { server, client } = await connect();
    try {
      const result = await client.callTool({
        name: "growsurf_update_campaign_installation",
        arguments: { fields: { shareUrl: "http://localhost:3000" } },
      });

      expect(result.isError).toBeFalsy();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("adds an allowed origin without reading or touching the Share URL", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ shareUrl: "https://piedpiper.com", allowedUrls: ["https://piedpiper.com"] }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { server, client } = await connect();
    try {
      const result = await client.callTool({
        name: "growsurf_update_campaign_installation",
        arguments: { fields: { allowedUrls: ["https://piedpiper.com", "http://localhost:3000"] } },
      });

      expect(result.isError).toBeFalsy();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(bodyOf(fetchMock.mock.calls[0]!)).not.toHaveProperty("shareUrl");
    } finally {
      await client.close();
      await server.close();
    }
  });
});
