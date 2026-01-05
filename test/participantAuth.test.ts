import { describe, expect, it } from "vitest";
import { computeParticipantAuthHash } from "../src/growsurf/participantAuth.js";

describe("computeParticipantAuthHash", () => {
  it("computes a stable SHA-256 HMAC hex", () => {
    const hash = computeParticipantAuthHash({
      email: "Participant@Email.com",
      participantAuthSecret: "secret",
    });
    expect(hash).toBe("1d9ecfbe1b6ab47494cff73bd689c8289ecb9977c4d7e89f633c06a5bba3fafa");
  });
});

