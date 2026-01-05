import { describe, expect, it } from "vitest";
import { computeParticipantAuthHash } from "../src/growsurf/participantAuth.js";

describe("computeParticipantAuthHash", () => {
  it("computes a stable SHA-256 HMAC hex", () => {
    const hash = computeParticipantAuthHash({
      email: "participant@email.com",
      participantAuthSecret: "secret",
    });
    expect(hash).toBe("80270ac15ce386c87e7f972621ab2c00aee243010224f692e4e1c5e60e834b2d");
  });
});

