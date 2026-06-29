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
});
