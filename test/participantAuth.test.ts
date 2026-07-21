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

  it("signs affiliate Join as a separate scope", () => {
    const identityHash = computeParticipantAuthHash({
      email: "Participant@Email.com",
      participantAuthSecret: "secret",
    });
    const joinHash = computeParticipantAuthHash({
      email: "Participant@Email.com",
      participantAuthSecret: "secret",
      affiliateJoin: true,
    });

    expect(joinHash).toBe("3fc5ffc499752aca6b2f2e128f298c73191aac88d55ca0d5fa6be2f784c12d26");
    expect(joinHash).not.toBe(identityHash);
  });
});
