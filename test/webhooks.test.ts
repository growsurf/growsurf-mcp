import { describe, expect, it } from "vitest";
import { normalizeWebhook } from "../src/growsurf/webhooks.js";

describe("normalizeWebhook", () => {
  it("rejects non-object payloads", () => {
    expect(normalizeWebhook("nope").ok).toBe(false);
  });

  it("accepts a minimal envelope and generates an idempotency key", () => {
    const result = normalizeWebhook({
      event: "NEW_PARTICIPANT_ADDED",
      createdAt: 123,
      data: { id: "p1", campaign: { id: "c1" } },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.idempotencyKey).toContain("event:NEW_PARTICIPANT_ADDED");
      expect(result.idempotencyKey).toContain("createdAt:123");
      expect(result.idempotencyKey).toContain("campaign:c1");
      expect(result.idempotencyKey).toContain("data.id:p1");
    }
  });
});

