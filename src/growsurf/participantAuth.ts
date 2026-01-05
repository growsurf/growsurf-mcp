import crypto from "node:crypto";

/**
 * Compute GrowSurf participant auto-auth hash:
 * hash = HMAC_SHA256(participantAuthSecret, email).hex
 */
export const computeParticipantAuthHash = (input: { email: string; participantAuthSecret: string }): string => {
  // GrowSurf docs specify hashing the participant email value you provide to GrowSurf.
  // We trim accidental whitespace, but do not alter casing.
  const email = input.email.trim();
  return crypto.createHmac("sha256", input.participantAuthSecret).update(email).digest("hex");
};

