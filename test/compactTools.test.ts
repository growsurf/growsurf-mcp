import { Script } from "node:vm";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrowSurfMcpServer, CREDENTIAL_TYPES, TOOL_AUTHORIZATION_MANIFEST } from "../src/index.js";
import { createToolInputGuard } from "../src/toolInputValidation.js";

const sessions: Array<{ client: Client; server: ReturnType<typeof createGrowSurfMcpServer> }> = [];
async function connect(options: Parameters<typeof createGrowSurfMcpServer>[0] = {}) {
  const server = createGrowSurfMcpServer({ env: { GROWSURF_API_KEY: "test", GROWSURF_CAMPAIGN_ID: "abc123" }, toolSurface: "compact", ...options });
  const client = new Client({ name: "compact-contract", version: "1" });
  sessions.push({ client, server });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(s), client.connect(c)]);
  const { tools } = await client.listTools();
  return { client, tools };
}
afterEach(async () => {
  for (const { client, server } of sessions.splice(0)) { await client.close(); await server.close(); }
  vi.unstubAllGlobals();
});

describe("compact connection public contract", () => {
  it("keeps existing discovery as the default and preserves retained action contracts", async () => {
    const { tools: full } = await connect({ toolSurface: "full" });
    const { tools: implicit } = await connect({ toolSurface: undefined });
    const { tools: compact } = await connect();
    expect(implicit).toEqual(full);
    expect(full).toHaveLength(63);
    expect(compact).toHaveLength(32);
    expect(new Set(compact.map(tool => tool.name)).size).toBe(compact.length);
    for (const tool of compact) {
      expect(tool.outputSchema).toMatchObject({ type: "object" });
      const original = full.find(candidate => candidate.name === tool.name);
      if (!original) continue;
      expect(tool.annotations).toEqual(original.annotations);
      expect(tool._meta).toEqual(original._meta);
    }
    expect(compact.some(tool => tool.name === "growsurf_record_sale")).toBe(true);
    expect(compact.some(tool => tool.name === "growsurf_bulk_delete_participants")).toBe(true);
    expect(compact.some(tool => tool.name === "growsurf_update_campaign_options")).toBe(false);
  });

  it("retains each settings target's scopes and safety hints on its read or write group", () => {
    for (const verb of ["get", "update"]) for (const section of ["design", "emails", "options", "installation"]) {
      const manifest = TOOL_AUTHORIZATION_MANIFEST as Record<string, unknown>;
      expect(manifest[`growsurf_${verb}_program_settings`]).toEqual(manifest[`growsurf_${verb}_campaign_${section}`]);
    }
  });

  it("routes all static guidance topics and validates structured output with the MCP client", async () => {
    const { client } = await connect();
    for (const topic of ["integration", "program_creation_checks", "mobile_sdk", "api_libraries", "browser", "embeddable_element", "participant_auto_auth"]) {
      const result = await client.callTool({ name: "growsurf_get_guidance", arguments: { topic, input: topic === "embeddable_element" ? { element: "form" } : {} } });
      expect(result.isError, topic).toBeFalsy();
      expect(result.structuredContent?.markdown, topic).toEqual((result.content as Array<{ text: string }>)[0]?.text);
      expect(String(result.structuredContent?.markdown).length).toBeGreaterThan(100);
    }
  });

  it("preserves participant values and emits valid auto-auth JavaScript", async () => {
    const { client } = await connect();
    const email = "growsurf_get_campaign_options@example.com";
    const hash = "a".repeat(64);
    const result = await client.callTool({ name: "growsurf_get_guidance", arguments: {
      topic: "participant_auto_auth", input: { enableParticipantAutoAuth: true, email, hash },
    } });
    expect(result.isError).toBeFalsy();
    const markdown = String(result.structuredContent?.markdown);
    const script = markdown.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1];
    expect(script).toBeDefined();
    expect(() => new Script(script!)).not.toThrow();
    const config = script!.match(/window\.grsfConfig = (\{[\s\S]*?\});/)?.[1];
    expect(new Script(`(${config})`).runInNewContext()).toEqual({ email, hash });
  });

  it("preserves prompt and troubleshooting inputs while translating authored tool references", async () => {
    const { client } = await connect();
    const companyName = "growsurf_get_campaign_options";
    const prompt = await client.getPrompt({ name: "create_affiliate_program", arguments: { companyName } });
    const text = JSON.stringify(prompt);
    expect(text).toContain(companyName);
    expect(text).toContain("growsurf_get_program_settings");
    const participantEmail = "growsurf_get_campaign_options@example.com";
    const result = await client.callTool({ name: "growsurf_troubleshoot_referral_tracking", arguments: { symptom: "referral_not_credited", participantEmail } });
    expect(result.isError).toBeFalsy();
    expect(String(result.structuredContent?.markdown)).toContain(participantEmail);
    expect(String(result.structuredContent?.markdown)).toContain("growsurf_get_program_settings");
  });

  it("uses the selected settings path and preserves REST data without rewriting tool-like text", async () => {
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url, init) => {
      requests.push({ url: String(url), method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : null });
      return Response.json({ label: "growsurf_get_campaign_options", autoFulfillRewards: false });
    }));
    const { client } = await connect();
    for (const section of ["design", "emails", "options", "installation"]) {
      const result = await client.callTool({ name: "growsurf_get_program_settings", arguments: { section, input: { campaignId: "other123" } } });
      expect(result.isError, section).toBeFalsy();
      expect(result.structuredContent?.label).toBe("growsurf_get_campaign_options");
      expect(requests.at(-1)?.url).toContain(`/campaign/other123/${section}`);
    }
    const result = await client.callTool({ name: "growsurf_update_program_settings", arguments: { section: "options", input: { campaignId: "other123", fields: { autoFulfillRewards: false } } } });
    expect(result.isError).toBeFalsy();
    expect(requests.at(-1)).toMatchObject({ body: { autoFulfillRewards: false } });
  });

  it("rejects unknown selectors, missing program IDs, read-only email fields, and full-only calls before REST", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const { client } = await connect({ env: { GROWSURF_API_KEY: "test" } });
    const calls = [
      { name: "growsurf_get_guidance", arguments: { topic: "execute", input: {} } },
      { name: "growsurf_get_guidance", arguments: { topic: "embeddable_element", input: {} } },
      { name: "growsurf_get_program_settings", arguments: { section: "options", input: {} } },
      { name: "growsurf_update_program_settings", arguments: { section: "emails", input: { campaignId: "abc123", fields: { settings: { sender: { fromEmail: "wrong@example.com" } } } } } },
      { name: "growsurf_update_team", arguments: { name: "changed" } },
      { name: "growsurf_update_campaign_options", arguments: { campaignId: "abc123", fields: {} } },
    ];
    for (const call of calls) expect((await client.callTool(call)).isError, call.name).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not let a compact wrapper bypass credential scopes", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const { client, tools } = await connect({ resolveCredentialContext: () => ({ credentialType: CREDENTIAL_TYPES.MCP_OAUTH, scopes: ["program:read"] }) });
    expect(tools.some(tool => tool.name === "growsurf_get_program_settings")).toBe(true);
    expect(tools.some(tool => tool.name === "growsurf_update_program_settings")).toBe(false);
    const result = await client.callTool({ name: "growsurf_update_program_settings", arguments: { section: "options", input: { fields: { autoFulfillRewards: true } } } });
    expect(result.isError).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps generated plans executable against the compact advertised schemas", async () => {
    const { client, tools } = await connect({ env: {} });
    for (const programType of ["REFERRAL", "AFFILIATE"]) for (const detail of ["summary", "full"]) {
      const companyName = "growsurf_get_campaign_options";
      const result = await client.callTool({ name: "growsurf_program_design_advisor", arguments: { programType, goal: "signups", companyName, detail } });
      expect(result.isError, JSON.stringify(result.content)).toBeFalsy();
      const advice = result.structuredContent as { configurationPlan: Array<{ tool: string; arguments: Record<string, unknown> }>; markdown: string };
      expect(advice.configurationPlan[0]?.arguments.companyName).toBe(companyName);
      const serializedPlan = advice.markdown.match(/```json\n([\s\S]*?)\n```/)?.[1];
      expect(JSON.parse(serializedPlan!)).toEqual(advice.configurationPlan);
      expect(advice.configurationPlan.length).toBeGreaterThan(1);
      expect(advice.markdown).toContain(JSON.stringify(advice.configurationPlan, null, 2));
      for (const call of advice.configurationPlan) {
        const tool = tools.find(candidate => candidate.name === call.tool);
        expect(tool, call.tool).toBeDefined();
        expect(() => createToolInputGuard(tool!.inputSchema)(call.arguments)).not.toThrow();
      }
    }
  });

  it("points authored prompts, resources, descriptions and troubleshooting only at advertised tools", async () => {
    const { client, tools } = await connect();
    const names = new Set(tools.map(tool => tool.name));
    const texts = [JSON.stringify(tools)];
    const prompts = (await client.listPrompts()).prompts;
    expect(prompts.some(prompt => prompt.name === "wire_webhooks")).toBe(false);
    expect(JSON.stringify(await client.getPrompt({ name: "growsurf_wire_webhooks" }))).toContain("switch to the full connection");
    for (const prompt of prompts) texts.push(JSON.stringify(await client.getPrompt({ name: prompt.name })));
    texts.push(JSON.stringify(await client.readResource({ uri: "growsurf://agent-index" })));
    texts.push(JSON.stringify(await client.callTool({ name: "growsurf_troubleshoot_referral_tracking", arguments: { symptom: "referral_not_credited" } })));
    for (const text of texts) for (const name of text.match(/\bgrowsurf_[a-z_]+\b/g) ?? []) expect(names.has(name), name).toBe(true);
  });
});
