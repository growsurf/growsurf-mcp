import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  agentProgramCreationEvalInputSchema,
  renderAgentProgramCreationEval,
} from "../src/growsurf/programCreationEval.js";
import { createGrowSurfMcpServer } from "../src/index.js";

describe("program creation steering eval", () => {
  it("renders the required one-shot MCP flow and configuration acceptance checks", () => {
    const text = renderAgentProgramCreationEval(
      agentProgramCreationEvalInputSchema.parse({ programType: "both", includeOneShotPrompts: true }),
    );

    expect(text).toContain("growsurf_create_campaign");
    expect(text).toContain("campaignId");
    expect(text).toContain("growsurf_get_campaign_design");
    expect(text).toContain("growsurf_get_campaign_emails");
    expect(text).toContain("growsurf_get_campaign_options");
    expect(text).toContain("growsurf_get_campaign_installation");
    expect(text).toContain("growsurf_list_campaign_rewards");
    expect(text).toContain("Fetch the campaign, Design, Emails, Options, Installation, and Rewards again");
    expect(text).toContain("Design config preserves the starter GrowSurf Window");
    expect(text).toContain("Review the returned configuration");
    expect(text).toContain("sticky banner, inline heading");
    expect(text).toContain("browser tab title");
    expect(text).toContain("normal share options");
    expect(text).toContain("Window header");
    expect(text).toContain("frontend-design");
    expect(text).toContain("browser-visible GrowSurf flow");
    expect(text).toContain("growsurf_capture_referral_flow_screenshots");
    expect(text).toContain("GrowSurf preview screenshots");
    expect(text).toContain("own installed site");
    expect(text).toContain("host agent's browser automation tool");
    expect(text).toContain("read-only lookups");
  });

  it("includes referral and affiliate one-shot fixtures by default", () => {
    const text = renderAgentProgramCreationEval(agentProgramCreationEvalInputSchema.parse({}));

    expect(text).toContain("Developer-tools referral");
    expect(text).toContain("Voice AI affiliate");
    expect(text).toContain("B2B SaaS referral");
    expect(text).toContain("Founder-led SaaS affiliate");
  });

  it("can filter fixtures to one program type", () => {
    const text = renderAgentProgramCreationEval(
      agentProgramCreationEvalInputSchema.parse({ programType: "affiliate" }),
    );

    expect(text).toContain("Voice AI affiliate");
    expect(text).toContain("Founder-led SaaS affiliate");
    expect(text).not.toContain("Developer-tools referral");
    expect(text).not.toContain("B2B SaaS referral");
  });

  it("exposes the eval guide as a callable MCP tool", async () => {
    const server = createGrowSurfMcpServer({ env: {} });
    const client = new Client({ name: "test-client", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("growsurf_agent_program_creation_eval");

      const result = await client.callTool({
        name: "growsurf_agent_program_creation_eval",
        arguments: { programType: "referral" },
      });
      const first = result.content[0];
      expect(first?.type).toBe("text");
      expect(first && "text" in first ? first.text : "").toContain("Developer-tools referral");
      expect(first && "text" in first ? first.text : "").not.toContain("Voice AI affiliate");
    } finally {
      await client.close();
    }
  });
});
