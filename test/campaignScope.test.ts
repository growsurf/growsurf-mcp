import { describe, expect, it } from "vitest";
import { resolveCampaignClient, resolveCampaignId } from "../src/growsurf/campaignScope.js";

describe("resolveCampaignId", () => {
  it("prefers the tool campaignId argument over the env default", () => {
    const id = resolveCampaignId(
      { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "env_campaign" },
      { campaignId: "arg_campaign" },
    );
    expect(id).toBe("arg_campaign");
  });

  it("falls back to GROWSURF_CAMPAIGN_ID when no argument is passed", () => {
    const id = resolveCampaignId({ GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "env_campaign" });
    expect(id).toBe("env_campaign");
  });

  it("resolves a just-created program id in the same session with no env default (the create -> operate flow)", () => {
    // GROWSURF_CAMPAIGN_ID deliberately unset: growsurf_create_campaign returns a new id, and the
    // next tool call passes it as campaignId.
    const id = resolveCampaignId({ GROWSURF_API_KEY: "api_key" }, { campaignId: "new_campaign" });
    expect(id).toBe("new_campaign");
  });

  it("throws a clear error when neither a campaignId argument nor GROWSURF_CAMPAIGN_ID is present", () => {
    expect(() => resolveCampaignId({ GROWSURF_API_KEY: "api_key" })).toThrow(/No program \(campaign\) id/);
  });

  it("throws when the API key is missing", () => {
    expect(() => resolveCampaignId({ GROWSURF_CAMPAIGN_ID: "env_campaign" }, { campaignId: "x" })).toThrow(
      /GROWSURF_API_KEY/,
    );
  });
});

describe("resolveCampaignClient", () => {
  it("returns a client scoped to the resolved program id", () => {
    const client = resolveCampaignClient({ GROWSURF_API_KEY: "api_key" }, { campaignId: "new_campaign" });
    expect(client.getCampaignId()).toBe("new_campaign");
  });

  it("returns a client scoped to the env default when no argument is passed", () => {
    const client = resolveCampaignClient({ GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "env_campaign" });
    expect(client.getCampaignId()).toBe("env_campaign");
  });
});
