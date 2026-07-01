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

  it("lists campaign rewards with a GET on the plural rewards path", async () => {
    const fetchMock = mockJson({ rewards: [] });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.listCampaignRewards();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/rewards",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("creates a campaign reward with a POST on the plural rewards path", async () => {
    const fetchMock = mockJson({ id: "crew_1", type: "SINGLE_SIDED" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.createCampaignReward({ type: "SINGLE_SIDED", title: "Reward" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/rewards",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ type: "SINGLE_SIDED", title: "Reward" }),
      }),
    );
  });

  it("updates a campaign reward with a PATCH on the plural rewards path", async () => {
    const fetchMock = mockJson({ id: "crew_1" });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "abc123" });
    await client.updateCampaignReward("crew_1", { isActive: false });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.growsurf.com/v2/campaign/abc123/rewards/crew_1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
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
      "https://api.growsurf.com/v2/campaign/abc123/rewards/crew_1",
      expect.objectContaining({ method: "DELETE" }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });
});
