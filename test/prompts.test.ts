import { describe, expect, it } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";
import { getGrowSurfPrompt, listGrowSurfPrompts } from "../src/prompts.js";

describe("GrowSurf MCP prompts", () => {
  it("lists the agentic recipe prompts", () => {
    const names = listGrowSurfPrompts().map((prompt) => prompt.name);

    expect(names).toContain("growsurf_create_referral_program");
    expect(names).toContain("growsurf_create_affiliate_program");
    expect(names).toContain("growsurf_embed_referral_widget");
    expect(names).toContain("growsurf_set_rewards");
    expect(names).toContain("growsurf_wire_webhooks");
    expect(names).toContain("growsurf_read_analytics");
  });

  it("renders a referral recipe that preserves the create-to-operate campaign id handoff", () => {
    const result = getGrowSurfPrompt("growsurf_create_referral_program", {
      companyName: "Acme",
      websiteUrl: "https://example.com",
      goal: "drive qualified signups",
    });

    const text = result.messages[0]?.content.type === "text" ? result.messages[0].content.text : "";
    expect(text).toContain("Create a GrowSurf referral program for Acme");
    expect(text).toContain("growsurf_create_campaign");
    expect(text).toContain("pass it as campaignId");
    expect(text).toContain("starter Design, Emails, Options, Installation, rewards, and GrowSurf Window content");
    expect(text).toContain("Keep rewards in a non-awarding or disabled state");
    expect(text).toContain("growsurf_get_referral_flow_screenshots");
    expect(text).toContain("referred-friend banner and inline heading");
    expect(text).toContain("browser title motivator");
    expect(text).toContain("not a long HTML page or config JSON");
  });

  it("renders an affiliate recipe with payout-safety guidance", () => {
    const result = getGrowSurfPrompt("growsurf_create_affiliate_program", {
      companyName: "Acme",
      commissionModel: "20% recurring",
    });

    const text = result.messages[0]?.content.type === "text" ? result.messages[0].content.text : "";
    expect(text).toContain("Create a GrowSurf affiliate program for Acme");
    expect(text).toContain("20% recurring");
    expect(text).toContain("GrowSurf Window");
    expect(text).toContain("starter content");
    expect(text).toContain("Do not enable payout exposure");
    expect(text).toContain("growsurf_get_integration_connect_link");
    expect(text).toContain("growsurf_get_referral_flow_screenshots");
    expect(text).toContain("referred-friend banner and inline heading");
  });

  it("throws clearly for an unknown prompt", () => {
    expect(() => getGrowSurfPrompt("nope")).toThrow(/Unknown prompt/);
  });

  it("exports an importable server factory without starting stdio", () => {
    const server = createGrowSurfMcpServer({
      env: {
        GROWSURF_API_KEY: "api_key",
        GROWSURF_API_BASE_URL: "http://127.0.0.1:8080/v2",
      },
    });

    expect(server).toBeDefined();
  });
});
