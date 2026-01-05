import crypto from "node:crypto";

/**
 * Compute GrowSurf participant auto-auth hash:
 * hash = HMAC_SHA256(participantAuthSecret, email).hex
 */
export const computeParticipantAuthHash = (input: { email: string; participantAuthSecret: string }): string => {
  const email = input.email.trim().toLowerCase();
  return crypto.createHmac("sha256", input.participantAuthSecret).update(email).digest("hex");
};

