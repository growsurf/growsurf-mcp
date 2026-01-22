import { afterEach, describe, expect, it, vi } from "vitest";
import { GrowSurfClient } from "../src/growsurf/client.js";

const createClient = () =>
  new GrowSurfClient({
    apiKey: "test-api-key",
    campaignId: "test-campaign-id",
    baseUrl: "https://example.test",
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GrowSurfClient.requestJson (success response parsing)", () => {
  it("returns null for 204 No Content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204, headers: { "content-type": "application/json" } })),
    );

    const client = createClient();
    const result = await client.getCampaign();
    expect(result).toBeNull();
  });

  it("returns null for 2xx responses with an empty body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 200, headers: { "content-type": "application/json" } })),
    );

    const client = createClient();
    const result = await client.getCampaign();
    expect(result).toBeNull();
  });

  it("returns parsed JSON for 2xx application/json responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }),
      ),
    );

    const client = createClient();
    const result = await client.getCampaign();
    expect(result).toEqual({ ok: true });
  });

  it("returns text for 2xx non-JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ok", { status: 200, headers: { "content-type": "text/plain" } })),
    );

    const client = createClient();
    const result = await client.getCampaign();
    expect(result).toBe("ok");
  });

  it("throws a structured error for 2xx invalid JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{not-json", { status: 200, headers: { "content-type": "application/json" } })),
    );

    const client = createClient();
    await expect(client.getCampaign()).rejects.toMatchObject({
      code: "INVALID_JSON",
      status: 200,
    });
  });
});

