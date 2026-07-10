import { afterEach, describe, expect, it, vi } from "vitest";
import { GrowSurfClient } from "../src/growsurf/client.js";

const originalFetch = globalThis.fetch;

describe("GrowSurfClient", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("creates mobile participant tokens with the documented REST endpoint", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ participantToken: "token_123", expiresIn: 2592000, isNew: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    const result = await client.createMobileParticipantToken({
      email: "person@example.com",
      firstName: "Gavin",
    });

    expect(result).toEqual({ participantToken: "token_123", expiresIn: 2592000, isNew: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/mobile-participant-token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer api_key",
          Accept: "application/json",
        }),
        body: JSON.stringify({
          email: "person@example.com",
          firstName: "Gavin",
        }),
      }),
    );
  });

  it("triggers a referral without a body when no delay is provided", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ id: "part_1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.triggerReferralByParticipantId("part_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/participant/part_1/ref",
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  it("sends delayInDays in the body when delaying a referral trigger", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ id: "part_1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.triggerReferralByParticipantEmail("person@example.com", 30);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/participant/person%40example.com/ref",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({ delayInDays: 30 }),
      }),
    );
  });

  it("cancels a pending delayed referral with a DELETE on the ref path", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ success: true, message: "Delayed referral cancelled" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    const result = await client.cancelDelayedReferralByParticipantId("part_1");

    expect(result).toEqual({ success: true, message: "Delayed referral cancelled" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/participant/part_1/ref",
      expect.objectContaining({ method: "DELETE" }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  const mockJson = (body: unknown) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));

  it("creates a campaign with a POST to /campaigns and no campaign-id path segment", async () => {
    const fetchMock = mockJson({ id: "new123", type: "REFERRAL" });
    globalThis.fetch = fetchMock as typeof fetch;

    // Campaign create has no id, so an empty campaignId placeholder must not appear in the path.
    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "" });
    const result = await client.createCampaign({ type: "REFERRAL", name: "My Program" });

    expect(result).toEqual({ id: "new123", type: "REFERRAL" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaigns",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({ type: "REFERRAL", name: "My Program" }),
      }),
    );
  });

  it("lists campaigns with a GET to /campaigns and no campaign-id path segment", async () => {
    const fetchMock = mockJson({ campaigns: [{ id: "abc123", name: "Referral Program" }] });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "" });
    const result = await client.listCampaigns();

    expect(result).toEqual({ campaigns: [{ id: "abc123", name: "Referral Program" }] });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaigns",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer api_key",
          Accept: "application/json",
        }),
      }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  it("updates a campaign with a PATCH and a body", async () => {
    const fetchMock = mockJson({ id: "abc123", status: "IN_PROGRESS" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.updateCampaign({ status: "IN_PROGRESS" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      }),
    );
  });

  it("clones a campaign with a POST and no body", async () => {
    const fetchMock = mockJson({ id: "clone123" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.cloneCampaign();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/clone",
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  it("lists campaign rewards with a GET on the reward-configs path", async () => {
    const fetchMock = mockJson({ rewards: [] });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.listCampaignRewards();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/reward-configs",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("creates a campaign reward with a POST on the reward-configs path", async () => {
    const fetchMock = mockJson({ id: "crew_1", type: "SINGLE_SIDED" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.createCampaignReward({
      type: "SINGLE_SIDED",
      title: "Reward",
      referralCouponCode: "FRIEND10",
      value: { fairMarketValueUSD: 25, isTaxReportable: true },
      referredValue: { fairMarketValueUSD: null, isTaxReportable: false },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/reward-configs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          type: "SINGLE_SIDED",
          title: "Reward",
          referralCouponCode: "FRIEND10",
          value: { fairMarketValueUSD: 25, isTaxReportable: true },
          referredValue: { fairMarketValueUSD: null, isTaxReportable: false },
        }),
      }),
    );
  });

  it("updates a campaign reward with a PATCH on the reward-configs path", async () => {
    const fetchMock = mockJson({ id: "crew_1" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.updateCampaignReward("crew_1", {
      referralCouponCode: null,
      value: { fairMarketValueUSD: 10, isTaxReportable: null },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/reward-configs/crew_1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          referralCouponCode: null,
          value: { fairMarketValueUSD: 10, isTaxReportable: null },
        }),
      }),
    );
  });

  it("deletes a campaign reward with a DELETE and no body", async () => {
    const fetchMock = mockJson({ id: "crew_1", success: true });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    const result = await client.deleteCampaignReward("crew_1");

    expect(result).toEqual({ id: "crew_1", success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/reward-configs/crew_1",
      expect.objectContaining({ method: "DELETE" }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  for (const resource of ["design", "emails", "options", "installation"] as const) {
    const capitalized = resource.charAt(0).toUpperCase() + resource.slice(1);
    const getMethod = `getCampaign${capitalized}` as
      | "getCampaignDesign"
      | "getCampaignEmails"
      | "getCampaignOptions"
      | "getCampaignInstallation";
    const updateMethod = `updateCampaign${capitalized}` as
      | "updateCampaignDesign"
      | "updateCampaignEmails"
      | "updateCampaignOptions"
      | "updateCampaignInstallation";

    it(`gets the ${resource} config with a GET on the ${resource} sub-resource path`, async () => {
      const fetchMock = mockJson({ [resource]: {} });
      globalThis.fetch = fetchMock as typeof fetch;

      const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
      await client[getMethod]();

      expect(fetchMock).toHaveBeenCalledWith(
        `https://api.growsurf.com/v2/campaign/abc123/${resource}`,
        expect.objectContaining({ method: "GET" }),
      );
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.body).toBeUndefined();
    });

    it(`updates the ${resource} config with a PATCH and a partial body`, async () => {
      const fetchMock = mockJson({ [resource]: {} });
      globalThis.fetch = fetchMock as typeof fetch;

      const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
      await client[updateMethod]({ nested: { changed: true } });

      expect(fetchMock).toHaveBeenCalledWith(
        `https://api.growsurf.com/v2/campaign/abc123/${resource}`,
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: JSON.stringify({ nested: { changed: true } }),
        }),
      );
    });
  }

  it("captures referral-flow screenshots with a POST to the MCP API path and no body", async () => {
    const fetchMock = mockJson({
      generatedAt: "2026-07-09T00:00:00.000Z",
      expiresAt: "2026-07-09T00:15:00.000Z",
      screenshots: [
        { view: "referrer", url: "https://signed.example.com/referrer.jpg", width: 1280, height: 800 },
        { view: "referredFriend", url: "https://signed.example.com/friend.jpg", width: 1280, height: 800 },
      ],
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    const result = await client.captureReferralFlowScreenshots();

    expect(result).toEqual({
      generatedAt: "2026-07-09T00:00:00.000Z",
      expiresAt: "2026-07-09T00:15:00.000Z",
      screenshots: [
        { view: "referrer", url: "https://signed.example.com/referrer.jpg", width: 1280, height: 800 },
        { view: "referredFriend", url: "https://signed.example.com/friend.jpg", width: 1280, height: 800 },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/api/v2/mcp/campaign/abc123/referral-flow-screenshots",
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  it("derives the MCP API path from a custom REST base URL", async () => {
    const fetchMock = mockJson({ screenshots: [] });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({
      apiKey: "api_key",
      campaignId: "abc123",
      baseUrl: "http://127.0.0.1:8080/v2",
    });
    await client.captureReferralFlowScreenshots();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/api/v2/mcp/campaign/abc123/referral-flow-screenshots",
      expect.objectContaining({ method: "POST" }),
    );
  });

  // ---- Account ----

  it("creates an account with a POST to /accounts and NO Authorization header (keyless)", async () => {
    const fetchMock = mockJson({
      id: "acct_1",
      email: "richard@piedpiper.com",
      apiKey: "new_key",
      verificationStatus: "NOT_REQUESTED",
    });
    globalThis.fetch = fetchMock as typeof fetch;

    // Keyless client: no apiKey configured — createAccount must still work.
    const client = new GrowSurfClient({ campaignId: "" });
    const result = await client.createAccount({
      email: "richard@piedpiper.com",
      firstName: "Richard",
      lastName: "Hendricks",
      company: "Pied Piper",
    });

    expect(result).toEqual({
      id: "acct_1",
      email: "richard@piedpiper.com",
      apiKey: "new_key",
      verificationStatus: "NOT_REQUESTED",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/accounts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "richard@piedpiper.com",
          firstName: "Richard",
          lastName: "Hendricks",
          company: "Pied Piper",
        }),
      }),
    );
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("never sends Authorization for createAccount even when an API key is configured", async () => {
    const fetchMock = mockJson({ id: "acct_1", apiKey: "new_key", verificationStatus: "NOT_REQUESTED" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.createAccount({ email: "richard@piedpiper.com" });

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("gets the account with a GET on /account and the bearer token", async () => {
    const fetchMock = mockJson({ id: "acct_1", email: "richard@piedpiper.com" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.getAccount();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/account",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer api_key" }),
      }),
    );
  });

  it("updates the account with a PATCH on /account and a partial body", async () => {
    const fetchMock = mockJson({ id: "acct_1" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.updateAccount({ firstName: "Richard", company: "Pied Piper" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/account",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ firstName: "Richard", company: "Pied Piper" }),
      }),
    );
  });

  it("rotates the API key with a POST on /account/api-key and no body", async () => {
    const fetchMock = mockJson({ apiKey: "rotated_key" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    const result = await client.rotateApiKey();

    expect(result).toEqual({ apiKey: "rotated_key" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/account/api-key",
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
    expect(new Headers(init.headers).get("Idempotency-Key"))
      .toMatch(/^growsurf-mcp-rotation-[0-9a-f-]{36}$/);
  });

  it("requests account verification with a POST on /account/verification-request", async () => {
    const fetchMock = mockJson({ verificationStatus: "REQUESTED" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.requestAccountVerification();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/account/verification-request",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("resends the verification email with a POST on /account/verification-email", async () => {
    const fetchMock = mockJson({ success: true, status: "SENT" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.resendVerificationEmail();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/account/verification-email",
      expect.objectContaining({ method: "POST" }),
    );
  });

  // ---- Campaign analytics ----

  it("gets campaign analytics with the interval query param", async () => {
    const fetchMock = mockJson({ analytics: {}, series: [] });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.getCampaignAnalytics({ interval: "week", days: 30 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/analytics?interval=week&days=30",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("gets campaign analytics with the include enrichment query param", async () => {
    const fetchMock = mockJson({ analytics: {}, previousPeriod: {}, statusCounts: {}, rates: {} });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.getCampaignAnalytics({ include: "statusCounts", days: 30 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/analytics?include=statusCounts&days=30",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("gets campaign analytics with no query string when no params are passed", async () => {
    const fetchMock = mockJson({ analytics: {} });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.getCampaignAnalytics();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/analytics",
      expect.objectContaining({ method: "GET" }),
    );
  });

  // ---- Campaign webhooks ----

  it("lists webhooks with a GET on the webhooks path", async () => {
    const fetchMock = mockJson({ webhooks: [] });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.listWebhooks();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/webhooks",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("creates a webhook with a POST on the webhooks path", async () => {
    const fetchMock = mockJson({ id: "primary" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.createWebhook({
      payloadUrl: "https://piedpiper.com/growsurf/webhook",
      events: ["NEW_PARTICIPANT_ADDED"],
      secret: "whsec_middleout",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/webhooks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          payloadUrl: "https://piedpiper.com/growsurf/webhook",
          events: ["NEW_PARTICIPANT_ADDED"],
          secret: "whsec_middleout",
        }),
      }),
    );
  });

  it("updates a webhook with a PATCH on the webhooks/{id} path", async () => {
    const fetchMock = mockJson({ id: "primary" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.updateWebhook("primary", { isEnabled: false });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/webhooks/primary",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ isEnabled: false }),
      }),
    );
  });

  it("deletes a webhook with a DELETE and no body", async () => {
    const fetchMock = mockJson({ id: "primary", success: true });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    const result = await client.deleteWebhook("primary");

    expect(result).toEqual({ id: "primary", success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/webhooks/primary",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBeUndefined();
  });

  it("tests a webhook with a POST on the /test path and an event body", async () => {
    const fetchMock = mockJson({ success: true });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.testWebhook("primary", { event: "NEW_PARTICIPANT_ADDED" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/webhooks/primary/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ event: "NEW_PARTICIPANT_ADDED" }),
      }),
    );
  });

  it("tests a webhook with a POST and no body when no event is given", async () => {
    const fetchMock = mockJson({ success: true });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.testWebhook("primary");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/webhooks/primary/test",
      expect.objectContaining({ method: "POST" }),
    );
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBeUndefined();
  });

  // ---- Participant email / analytics / activity-logs / update ----

  it("lists participants with limit and nextId query params", async () => {
    const fetchMock = mockJson({
      participants: [{ id: "part_1", email: "richard@piedpiper.com" }],
      limit: 50,
      nextId: "part_2",
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    const result = await client.listParticipants({ limit: 50, nextId: "part_0" });

    expect(result).toEqual({
      participants: [{ id: "part_1", email: "richard@piedpiper.com" }],
      limit: 50,
      nextId: "part_2",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/participants?limit=50&nextId=part_0",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("gets a participant by email address with a GET on the participant path", async () => {
    const fetchMock = mockJson({ id: "part_1", email: "richard@piedpiper.com" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    const result = await client.getParticipantByEmail("richard@piedpiper.com");

    expect(result).toEqual({ id: "part_1", email: "richard@piedpiper.com" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/participant/richard%40piedpiper.com",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("emails a participant by id with a POST on the /email path", async () => {
    const fetchMock = mockJson({ success: true, status: "queued" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.emailParticipantById("part_1", { emailType: "goalAchieved" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/participant/part_1/email",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ emailType: "goalAchieved" }),
      }),
    );
  });

  it("emails a participant by email address (URL-encoded) with a free-form body", async () => {
    const fetchMock = mockJson({ success: true, status: "queued" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.emailParticipantByEmail("richard@piedpiper.com", {
      subject: "A quick update from Pied Piper",
      body: "<p>Hi {{firstName}}</p>",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/participant/richard%40piedpiper.com/email",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          subject: "A quick update from Pied Piper",
          body: "<p>Hi {{firstName}}</p>",
        }),
      }),
    );
  });

  it("gets participant analytics with a GET on the /analytics path", async () => {
    const fetchMock = mockJson({ analytics: {}, ranks: {}, shareCount: {} });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.getParticipantAnalyticsById("part_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/participant/part_1/analytics",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("gets participant analytics with include/interval/days series query params", async () => {
    const fetchMock = mockJson({ analytics: {}, series: [], startDate: 1, endDate: 2 });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.getParticipantAnalyticsById("part_1", { include: "series", interval: "week", days: 30 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/participant/part_1/analytics?include=series&interval=week&days=30",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("lists participant activity logs with limit/offset query params", async () => {
    const fetchMock = mockJson({ activityLogs: [], offset: null, limit: 50 });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.listParticipantActivityLogsById("part_1", { limit: 50, offset: 20 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/participant/part_1/activity-logs?limit=50&offset=20",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("updates a participant with a POST including notes and paypalEmail", async () => {
    const fetchMock = mockJson({ id: "part_1" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.updateParticipantById("part_1", {
      notes: "VIP affiliate",
      paypalEmail: "richard@piedpiper.com",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/participant/part_1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ notes: "VIP affiliate", paypalEmail: "richard@piedpiper.com" }),
      }),
    );
  });

  it("bulk deletes participants with a POST to the bulk-delete endpoint", async () => {
    const fetchMock = mockJson({
      summary: { total: 2, deletedCount: 1, notFoundCount: 1, duplicateCount: 0, errorCount: 0 },
      results: [
        { index: 0, identifier: "gavin@hooli.com", status: "DELETED", participantId: "f8g9nl", email: "gavin@hooli.com" },
        { index: 1, identifier: "erlich@aviato.com", status: "NOT_FOUND", message: "No participant matches this id or email." },
      ],
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    const result = await client.bulkDeleteParticipants(["gavin@hooli.com", "erlich@aviato.com"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/participants/bulk-delete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ participants: ["gavin@hooli.com", "erlich@aviato.com"] }),
      }),
    );
    expect((result as { summary: { deletedCount: number } }).summary.deletedCount).toBe(1);
  });
});
