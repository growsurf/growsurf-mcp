/** Closed write allowlist. Read/output schemas intentionally remain open strings for future providers. */
export const PAYOUT_DESTINATION_PROVIDER_INPUTS = Object.freeze([
  "PAYPAL",
  "WISECOM",
] as const);
