import crypto from "node:crypto";

/**
 * Compute a GrowSurf Participant Auto Authentication hash. The optional affiliate Join grant
 * signs a separate scope, so an identity-only hash can never authorize direct enrollment.
 */
export const computeParticipantAuthHash = (input: {
  email: string;
  participantAuthSecret: string;
  affiliateJoin?: boolean;
}): string => {
  // GrowSurf docs specify hashing the participant email value you provide to GrowSurf.
  // We trim accidental whitespace, but do not alter casing.
  const email = input.email.trim();
  const message = input.affiliateJoin ? `${email}:AFFILIATE_JOIN` : email;
  return crypto.createHmac("sha256", input.participantAuthSecret).update(message).digest("hex");
};
