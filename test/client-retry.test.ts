import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GrowSurfClient } from "../src/growsurf/client.js";

// Keep the client's timer boundary under the fake clock without changing its retry policy.
vi.mock("node:timers/promises", () => ({
  setTimeout: (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}));

const errorResponse = (status: number, headers: Record<string, string>) => new Response(
  JSON.stringify({ name: "RateLimit", code: "RATE_LIMIT", message: "Wait before retrying", status }),
  { status, headers: { "content-type": "application/json", ...headers } },
);

describe("GrowSurfClient retry timing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-06T00:00:00Z"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it.each([
    { status: 429, headers: { "Retry-After": "60" } },
    { status: 503, headers: { "Retry-After": "Fri, 06 Nov 2026 00:01:00 GMT" } },
    { status: 503, headers: { "Retry-After": "Fri, 06 Nov 2026 00:00:00 GMT", "Date": "Thu, 05 Nov 2026 23:59:00 GMT" } },
    { status: 429, headers: { "GrowSurf-Retry-After-Minute-Milliseconds": "60000" } },
  ])("returns HTTP $status without an early retry when the required wait exceeds its budget ($headers)", async ({ status, headers }) => {
    const fetchMock = vi.fn(async () => errorResponse(status, headers));
    vi.stubGlobal("fetch", fetchMock);
    const client = new GrowSurfClient({ apiKey: "test-key" });
    let settled = false;
    let failure: unknown;
    void client.listCampaigns().then(
      () => { settled = true; },
      (error) => { settled = true; failure = error; },
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(true);
    expect(failure).toMatchObject({ code: "RATE_LIMIT", message: "Wait before retrying", status });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits for the longest retry hint before making another request", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(errorResponse(429, {
        "GrowSurf-Retry-After-Second-Milliseconds": "250",
        "GrowSurf-Retry-After-Minute-Milliseconds": "1500",
        "Retry-After": "1",
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ campaigns: [] }), {
        headers: { "content-type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);
    const request = new GrowSurfClient({ apiKey: "test-key" }).listCampaigns();

    await vi.advanceTimersByTimeAsync(1499);
    expect(fetchMock).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    await expect(request).resolves.toEqual({ campaigns: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses the bounded fallback when retry hints are invalid", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(errorResponse(503, {
        "Retry-After": "not-a-date",
        "GrowSurf-Retry-After-Second-Milliseconds": "-10",
        "GrowSurf-Retry-After-Minute-Milliseconds": "NaN",
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ campaigns: [] }), {
        headers: { "content-type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);
    const request = new GrowSurfClient({ apiKey: "test-key" }).listCampaigns();

    await vi.advanceTimersByTimeAsync(249);
    expect(fetchMock).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    await expect(request).resolves.toEqual({ campaigns: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
