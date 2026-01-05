export type GrowSurfWebhookEventName =
  | "PARTICIPANT_REACHED_A_GOAL"
  | "NEW_PARTICIPANT_ADDED"
  | "PARTICIPANT_FRAUD_STATUS_UPDATED"
  | "NEW_COMMISSION_ADDED"
  | "COMMISSION_ADJUSTED"
  | "NEW_PAYOUT_ISSUED"
  | "CAMPAIGN_ENDED";

export type GrowSurfWebhookEnvelope = {
  event: GrowSurfWebhookEventName | string;
  createdAt: number;
  data: unknown;
};

export type WebhookNormalizationResult =
  | {
      ok: true;
      envelope: GrowSurfWebhookEnvelope;
      /**
       * A deterministic key you can use to dedupe/retry safely in your system.
       * (GrowSurf docs do not guarantee a delivery id.)
       */
      idempotencyKey: string;
    }
  | {
      ok: false;
      error: string;
    };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/**
 * Normalize and validate a GrowSurf webhook payload shape.
 *
 * Security note:
 * GrowSurf docs do not specify signed webhooks. For verification, we recommend:
 * - put a random token in the webhook URL path/query and validate it
 * - restrict ingress (WAF/IP allowlist) where possible
 * - validate payload schema + dedupe with an idempotency key
 */
export const normalizeWebhook = (payload: unknown): WebhookNormalizationResult => {
  if (!isObject(payload)) return { ok: false, error: "Webhook payload must be a JSON object." };

  const event = payload.event;
  const createdAt = payload.createdAt;
  const data = payload.data;

  if (typeof event !== "string" || event.length === 0) return { ok: false, error: "Missing 'event'." };
  if (typeof createdAt !== "number" || !Number.isFinite(createdAt)) return { ok: false, error: "Missing 'createdAt'." };
  if (data === undefined) return { ok: false, error: "Missing 'data'." };

  const envelope: GrowSurfWebhookEnvelope = { event, createdAt, data };

  // Build a stable idempotency key from fields commonly present in examples.
  // Prefer deeply identifying ids where present.
  const candidateIds: Array<string> = [];
  if (isObject(data)) {
    const campaign = isObject(data.campaign) ? data.campaign : undefined;
    if (campaign && typeof campaign.id === "string") candidateIds.push(`campaign:${campaign.id}`);

    if (typeof data.id === "string") candidateIds.push(`data.id:${data.id}`);

    const participant = isObject(data.participant) ? data.participant : undefined;
    if (participant && typeof participant.id === "string") candidateIds.push(`participant:${participant.id}`);

    const reward = isObject(data.reward) ? data.reward : undefined;
    if (reward && typeof reward.id === "string") candidateIds.push(`reward:${reward.id}`);

    const commission = isObject(data.commission) ? data.commission : undefined;
    if (commission && typeof commission.id === "string") candidateIds.push(`commission:${commission.id}`);

    const payout = isObject(data.payout) ? data.payout : undefined;
    if (payout && typeof payout.id === "string") candidateIds.push(`payout:${payout.id}`);
  }

  const idempotencyKey = [
    `event:${event}`,
    `createdAt:${createdAt}`,
    ...candidateIds.slice(0, 3),
  ].join("|");

  return { ok: true, envelope, idempotencyKey };
};

