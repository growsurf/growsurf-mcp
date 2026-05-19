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
});
