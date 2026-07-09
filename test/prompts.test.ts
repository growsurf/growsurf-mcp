import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createGrowSurfMcpServer } from "../src/index.js";
import { getGrowSurfPrompt, listGrowSurfPrompts } from "../src/prompts.js";

describe("GrowSurf MCP prompts", () => {
  it("lists the agentic recipe prompts", () => {
    const names = listGrowSurfPrompts().map((prompt) => prompt.name);

    expect(names).toContain("create_referral_program");
    expect(names).toContain("create_affiliate_program");
    expect(names).toContain("embed_referral_widget");
    expect(names).toContain("list_campaigns");
    expect(names).toContain("get_campaign");
    expect(names).toContain("list_participants");
    expect(names).toContain("get_participant");
    expect(names).toContain("set_rewards");
    expect(names).toContain("wire_webhooks");
    expect(names).toContain("read_analytics");
    expect(names).not.toContain("growsurf_set_rewards");
    expect(names).not.toContain("growsurf_get_campaign");
    expect(names).not.toContain("growsurf_list_participants");
    expect(names).not.toContain("growsurf_get_participant");
    expect(JSON.stringify(listGrowSurfPrompts())).not.toContain("growsurf_set_rewards");
    expect(JSON.stringify(listGrowSurfPrompts())).not.toContain("growsurf_get_campaign");
    expect(JSON.stringify(listGrowSurfPrompts())).not.toContain("growsurf_list_participants");
  });

  it("lists short prompt names through the MCP prompts/list response", async () => {
    const server = createGrowSurfMcpServer({
      env: {
        GROWSURF_API_KEY: "api_key",
        GROWSURF_CAMPAIGN_ID: "abc123",
      },
    });
    const client = new Client({ name: "prompt-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const result = await client.listPrompts();
      const names = result.prompts.map((prompt) => prompt.name);

      expect(names).toContain("set_rewards");
      expect(names).toContain("list_campaigns");
      expect(names).toContain("get_campaign");
      expect(names).toContain("list_participants");
      expect(names).toContain("get_participant");
      expect(names).toContain("read_analytics");
      expect(names).not.toContain("growsurf_set_rewards");
      expect(names).not.toContain("growsurf_get_campaign");
      expect(names).not.toContain("growsurf_list_participants");
      expect(JSON.stringify(result.prompts)).not.toContain("growsurf_set_rewards");
      expect(JSON.stringify(result.prompts)).not.toContain("growsurf_get_campaign");
      expect(JSON.stringify(result.prompts)).not.toContain("growsurf_list_participants");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("renders a referral recipe that preserves the create-to-operate campaign id handoff", () => {
    const result = getGrowSurfPrompt("create_referral_program", {
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
    expect(text).toContain("Fetch the campaign, Design, Emails, Options, Installation, and Rewards again");
    expect(text).toContain("referred-friend banner and inline heading");
    expect(text).toContain("browser title motivator");
    expect(text).toContain("Review those returned settings");
    expect(text).toContain("browser-visible GrowSurf flow");
    expect(text).toContain("screenshot proof");
    expect(text).toContain("growsurf_capture_referral_flow_screenshots");
    expect(text).toContain("GrowSurf preview screenshots");
    expect(text).toContain("own installed site");
    expect(text).toContain("host agent's browser automation tool");
  });

  it("renders an affiliate recipe with payout-safety guidance", () => {
    const result = getGrowSurfPrompt("create_affiliate_program", {
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
    expect(text).toContain("Fetch the campaign, Design, Emails, Options, Installation, and Rewards again");
    expect(text).toContain("referred-friend banner and inline heading");
    expect(text).toContain("browser-visible GrowSurf flow");
    expect(text).toContain("screenshot proof");
    expect(text).toContain("growsurf_capture_referral_flow_screenshots");
    expect(text).toContain("GrowSurf preview screenshots");
    expect(text).toContain("own installed site");
  });

  it("throws clearly for an unknown prompt", () => {
    expect(() => getGrowSurfPrompt("nope")).toThrow(/Unknown prompt/);
  });

  it("renders short lookup prompts that call the matching raw tools", () => {
    const listCampaigns = getGrowSurfPrompt("list_campaigns");
    const getCampaign = getGrowSurfPrompt("get_campaign", {
      campaignId: "abc123",
    });
    const listParticipants = getGrowSurfPrompt("list_participants", {
      campaignId: "abc123",
      limit: "25",
    });
    const getParticipant = getGrowSurfPrompt("get_participant", {
      campaignId: "abc123",
      participantEmail: "ada@example.com",
    });

    const listCampaignsText =
      listCampaigns.messages[0]?.content.type === "text" ? listCampaigns.messages[0].content.text : "";
    const getCampaignText =
      getCampaign.messages[0]?.content.type === "text" ? getCampaign.messages[0].content.text : "";
    const listParticipantsText =
      listParticipants.messages[0]?.content.type === "text" ? listParticipants.messages[0].content.text : "";
    const getParticipantText =
      getParticipant.messages[0]?.content.type === "text" ? getParticipant.messages[0].content.text : "";

    expect(listCampaignsText).toContain("growsurf_list_campaigns");
    expect(listCampaignsText).toContain("campaignId");
    expect(getCampaignText).toContain("Fetch campaign abc123");
    expect(getCampaignText).toContain("growsurf_get_campaign");
    expect(listParticipantsText).toContain("campaign abc123");
    expect(listParticipantsText).toContain("Limit: 25");
    expect(listParticipantsText).toContain("growsurf_list_participants");
    expect(getParticipantText).toContain("ada@example.com");
    expect(getParticipantText).toContain("growsurf_get_participant");
  });

  it("accepts legacy growsurf-prefixed prompt names without listing them", () => {
    const result = getGrowSurfPrompt("growsurf_set_rewards", {
      campaignId: "abc123",
      programType: "REFERRAL",
      rewardGoal: "double-sided credit",
    });

    const text = result.messages[0]?.content.type === "text" ? result.messages[0].content.text : "";
    expect(text).toContain("Review and adjust rewards for REFERRAL campaign abc123");

    const lookupResult = getGrowSurfPrompt("growsurf_list_participants", {
      campaignId: "abc123",
    });
    const lookupText =
      lookupResult.messages[0]?.content.type === "text" ? lookupResult.messages[0].content.text : "";
    expect(lookupText).toContain("List participants for campaign abc123");

    const campaignResult = getGrowSurfPrompt("growsurf_get_campaign", {
      campaignId: "abc123",
    });
    const campaignText =
      campaignResult.messages[0]?.content.type === "text" ? campaignResult.messages[0].content.text : "";
    expect(campaignText).toContain("Fetch campaign abc123");
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
