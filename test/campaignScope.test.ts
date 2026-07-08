import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveCampaignClient, resolveCampaignId } from "../src/growsurf/campaignScope.js";

const originalFetch = globalThis.fetch;

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
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns a client scoped to the resolved program id", () => {
    const client = resolveCampaignClient({ GROWSURF_API_KEY: "api_key" }, { campaignId: "new_campaign" });
    expect(client.getCampaignId()).toBe("new_campaign");
  });

  it("returns a client scoped to the env default when no argument is passed", () => {
    const client = resolveCampaignClient({ GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "env_campaign" });
    expect(client.getCampaignId()).toBe("env_campaign");
  });

  it("passes a hosted API base URL through to the per-call REST client", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ id: "new_campaign" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = resolveCampaignClient(
      {
        GROWSURF_API_KEY: "api_key",
        GROWSURF_API_BASE_URL: "http://127.0.0.1:8080/v2",
      },
      { campaignId: "new_campaign" },
    );

    await client.getCampaign();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/v2/campaign/new_campaign",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
