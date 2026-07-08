#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const GROWSURF_MCP_VERSION = "0.6.0";
import { apiLibrarySnippetsInputSchema, renderApiLibrarySnippets } from "./growsurf/apiLibrarySnippets.js";
import { resolveCampaignClient } from "./growsurf/campaignScope.js";
import { GrowSurfClient, type GrowSurfRequestError } from "./growsurf/client.js";
import {
  clientSnippetsSchema,
  embeddableElementSchema,
  grsfConfigSnippetSchema,
  integrationGuideInputSchema,
  renderClientSnippets,
  renderEmbeddableElementSnippet,
  renderGrsfConfigSnippet,
  renderIntegrationGuide,
} from "./growsurf/installKit.js";
import {
  buildIntegrationConnectUrl,
  getIntegration,
  INTEGRATION_KEYS,
} from "./growsurf/integrations.js";
import { mobileSdkGuideInputSchema, renderMobileSdkGuide } from "./growsurf/mobileSdkGuide.js";
import { computeParticipantAuthHash } from "./growsurf/participantAuth.js";
import { normalizeWebhook } from "./growsurf/webhooks.js";
import { getGrowSurfPrompt, listGrowSurfPrompts } from "./prompts.js";

const optionalNonEmptyString = () =>
  z
    .string()
    .optional()
    .transform((v) => {
      const trimmed = v?.trim();
      return trimmed ? trimmed : undefined;
    });

const envSchema = z.object({
  GROWSURF_API_KEY: optionalNonEmptyString(),
  GROWSURF_CAMPAIGN_ID: optionalNonEmptyString(),
  GROWSURF_API_BASE_URL: optionalNonEmptyString(),
  GROWSURF_PARTICIPANT_AUTH_SECRET: optionalNonEmptyString(),
  GROWSURF_WEBHOOK_TOKEN: optionalNonEmptyString(),
});

export type Env = z.infer<typeof envSchema>;

const getEnv = (): Env => {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;
  // Throw a clear message for MCP host logs.
  const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "env"}: ${i.message}`).join("; ");
  throw new Error(`Invalid environment. ${issues}`);
};

const requireGrowSurfClient = (env: Env): GrowSurfClient => {
  if (!env.GROWSURF_API_KEY || !env.GROWSURF_CAMPAIGN_ID) {
    throw new Error(
      "Missing GrowSurf REST credentials. Set GROWSURF_API_KEY and GROWSURF_CAMPAIGN_ID to use API-calling tools.",
    );
  }
  return new GrowSurfClient({
    apiKey: env.GROWSURF_API_KEY,
    campaignId: env.GROWSURF_CAMPAIGN_ID,
    ...(env.GROWSURF_API_BASE_URL ? { baseUrl: env.GROWSURF_API_BASE_URL } : {}),
  });
};

// Creating a campaign (POST /campaigns) has no campaign id, so it only needs the API key.
// Account-level reads/writes (get/update account, rotate key, verification) are also key-only.
const requireGrowSurfApiKey = (env: Env): GrowSurfClient => {
  if (!env.GROWSURF_API_KEY) {
    throw new Error("Missing GrowSurf REST credentials. Set GROWSURF_API_KEY to use this tool.");
  }
  return new GrowSurfClient({
    apiKey: env.GROWSURF_API_KEY,
    campaignId: env.GROWSURF_CAMPAIGN_ID ?? "",
    ...(env.GROWSURF_API_BASE_URL ? { baseUrl: env.GROWSURF_API_BASE_URL } : {}),
  });
};

// Creating an account (POST /accounts) is the one unauthenticated endpoint — it RETURNS a new API
// key, so it must work even when no GROWSURF_API_KEY is configured (the keyless exception).
const getKeylessGrowSurfClient = (env: Env): GrowSurfClient =>
  new GrowSurfClient({
    apiKey: env.GROWSURF_API_KEY,
    campaignId: env.GROWSURF_CAMPAIGN_ID ?? "",
    ...(env.GROWSURF_API_BASE_URL ? { baseUrl: env.GROWSURF_API_BASE_URL } : {}),
  });

// The campaign-scoped tools: every tool that operates on a single program (campaign). Each accepts
// an optional `campaignId` argument that overrides GROWSURF_CAMPAIGN_ID (resolved per call via
// resolveCampaignClient), so an agent can create a program and immediately operate on the returned
// id. The list-time loop below injects the shared campaignId input-schema property into exactly
// these tools, and each handler resolves its client with resolveCampaignClient(env, toolArgs).
// Account-level, keyless, and static guidance tools are intentionally excluded, as are the tools
// that already declare their own campaignId (create_campaign has none; the guide/snippet and
// integration-connect-link tools carry their own bespoke campaignId param).
const CAMPAIGN_SCOPED_TOOL_NAMES = new Set<string>([
  "growsurf_get_campaign",
  "growsurf_update_campaign",
  "growsurf_clone_campaign",
  "growsurf_list_campaign_rewards",
  "growsurf_create_campaign_reward",
  "growsurf_update_campaign_reward",
  "growsurf_delete_campaign_reward",
  "growsurf_get_campaign_design",
  "growsurf_update_campaign_design",
  "growsurf_get_referral_flow_screenshots",
  "growsurf_get_campaign_emails",
  "growsurf_update_campaign_emails",
  "growsurf_get_campaign_options",
  "growsurf_update_campaign_options",
  "growsurf_get_campaign_installation",
  "growsurf_update_campaign_installation",
  "growsurf_get_campaign_analytics",
  "growsurf_list_campaign_webhooks",
  "growsurf_create_campaign_webhook",
  "growsurf_update_campaign_webhook",
  "growsurf_delete_campaign_webhook",
  "growsurf_test_campaign_webhook",
  "growsurf_add_participant",
  "growsurf_update_participant",
  "growsurf_bulk_delete_participants",
  "growsurf_email_participant",
  "growsurf_get_participant_analytics",
  "growsurf_get_participant_activity_logs",
  "growsurf_trigger_referral",
  "growsurf_cancel_delayed_referral",
  "growsurf_record_sale",
  "growsurf_refund_transaction",
  "growsurf_create_mobile_participant_token",
]);

// Shared JSON-schema property injected into every campaign-scoped tool's input schema (see the loop
// in the ListTools handler). Keeping it in one place means the campaign-scoped tool schemas cannot drift.
const CAMPAIGN_ID_JSON_PROP = {
  type: "string",
  description:
    "Target program (campaign) id for this call. Defaults to GROWSURF_CAMPAIGN_ID when omitted. Pass the `id` returned by growsurf_create_campaign to configure or operate a program you just created, without restarting the server.",
} as const;

const safeJson = (value: unknown): string => JSON.stringify(value, null, 2);

const toToolErrorText = (err: unknown): string => {
  if (!err) return "Unknown error.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const maybe = err as GrowSurfRequestError;
    if (typeof maybe.message === "string") return safeJson(maybe);
    return safeJson(err);
  }
  return String(err);
};

const omitUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  return Object.fromEntries(entries) as Partial<T>;
};

const addParticipantSchema = z.object({
  email: z.string().min(3),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  referredBy: z.string().min(1).optional(),
  referralStatus: z.enum(["CREDIT_PENDING", "CREDIT_AWARDED"]).optional(),
  ipAddress: z.string().min(1).optional(),
  fingerprint: z.string().min(1).optional(),
  mobileInstanceId: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const triggerReferralSchema = z
  .object({
    participantId: z.string().min(1).optional(),
    participantEmail: z.string().min(3).optional(),
    delayInDays: z.number().int().min(1).max(90).optional(),
  })
  .refine((v) => Boolean(v.participantId) || Boolean(v.participantEmail), {
    message: "Provide participantId or participantEmail.",
  });

const cancelDelayedReferralSchema = z
  .object({
    participantId: z.string().min(1).optional(),
    participantEmail: z.string().min(3).optional(),
  })
  .refine((v) => Boolean(v.participantId) || Boolean(v.participantEmail), {
    message: "Provide participantId or participantEmail.",
  });

// Shared by the record-sale and refund schemas: at least one of these transaction identifiers must be
// present so the request can be matched to (or distinguished from) an existing commission.
const hasTransactionIdentifier = (v: {
  externalId?: string | undefined;
  transactionId?: string | undefined;
  orderId?: string | undefined;
  paymentId?: string | undefined;
  invoiceId?: string | undefined;
  paymentIntentId?: string | undefined;
  chargeId?: string | undefined;
}) =>
  Boolean(
    v.externalId || v.transactionId || v.orderId || v.paymentId || v.invoiceId || v.paymentIntentId || v.chargeId,
  );

const TRANSACTION_IDENTIFIER_HINT =
  "at least one transaction identifier (externalId, transactionId, orderId, paymentId, invoiceId, paymentIntentId, or chargeId)";

const recordSaleSchema = z
  .object({
    participantId: z.string().min(1).optional(),
    participantEmail: z.string().min(3).optional(),
    currency: z.string().min(3),
    grossAmount: z.number().int().positive(),
    invoiceId: z.string().min(1).optional(),
    chargeId: z.string().min(1).optional(),
    paymentIntentId: z.string().min(1).optional(),
    transactionId: z.string().min(1).optional(),
    externalId: z.string().min(1).optional(),
    orderId: z.string().min(1).optional(),
    paymentId: z.string().min(1).optional(),
    customerId: z.string().min(1).optional(),
    subscriptionId: z.string().min(1).optional(),
    netAmount: z.number().int().positive().optional(),
    taxAmount: z.number().int().nonnegative().optional(),
    amountCashNet: z.number().int().positive().optional(),
    amountPaid: z.number().int().positive().optional(),
    paidAt: z.number().int().positive().optional(),
    description: z.string().max(500).optional(),
  })
  .refine((v) => Boolean(v.participantId) || Boolean(v.participantEmail), {
    message: "Provide participantId or participantEmail.",
  })
  // At least one transaction identifier is required so a resent sale is de-duplicated instead of
  // creating a second commission (symmetric with the refund endpoint).
  .refine(hasTransactionIdentifier, {
    message: `Provide ${TRANSACTION_IDENTIFIER_HINT} so the sale can be de-duplicated.`,
  });

const refundTransactionSchema = z
  .object({
    participantId: z.string().min(1).optional(),
    participantEmail: z.string().min(3).optional(),
    amendmentType: z.enum(["REFUND", "CHARGEBACK"]).optional(),
    amountRefunded: z.number().int().nonnegative().optional(),
    amount: z.number().int().positive().optional(),
    refundId: z.string().min(1).optional(),
    refundStatus: z.string().min(1).optional(),
    refundAmount: z.number().int().nonnegative().optional(),
    currency: z.string().min(3).optional(),
    invoiceId: z.string().min(1).optional(),
    chargeId: z.string().min(1).optional(),
    paymentIntentId: z.string().min(1).optional(),
    transactionId: z.string().min(1).optional(),
    externalId: z.string().min(1).optional(),
    orderId: z.string().min(1).optional(),
    paymentId: z.string().min(1).optional(),
    description: z.string().max(500).optional(),
  })
  .refine((v) => Boolean(v.participantId) || Boolean(v.participantEmail), {
    message: "Provide participantId or participantEmail.",
  })
  .refine(hasTransactionIdentifier, {
    message: `Provide ${TRANSACTION_IDENTIFIER_HINT}.`,
  });

// Create = type + identity + inline rewards only. Editor-tab config (options, design,
// emails, installation) is NOT accepted here; configure it via the config sub-resource
// tools after the program is created.
const createCampaignSchema = z.object({
  type: z.enum(["REFERRAL", "AFFILIATE"]),
  name: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  companyLogoImageUrl: z.string().min(1).optional(),
  currencyISO: z.string().min(3).max(3).optional(),
  rewards: z.array(z.record(z.string(), z.unknown())).optional(),
});

// Update = identity/lifecycle only. Editor-tab config (design, emails, options,
// notifications, installation) is edited via the dedicated config sub-resource tools,
// not here — the API rejects those fields on this endpoint.
const updateCampaignSchema = z
  .object({
    name: z.string().min(1).optional(),
    companyName: z.string().min(1).optional(),
    companyLogoImageUrl: z.string().min(1).optional(),
    // currencyISO is intentionally absent: currency is chosen once at creation and is immutable —
    // the update endpoint rejects it with a 400. It is only settable via growsurf_create_campaign.
    // Only IN_PROGRESS (publish/resume) and COMPLETE (end) are accepted as PATCH status
    // targets. The API rejects DRAFT/PENDING/CANCELLED with a 400 (they would stamp
    // deletedAt on a live campaign). Mirrors growsurf-api UPDATABLE_CAMPAIGN_STATUSES,
    // derived from rest-campaign-write.service ALLOWED_STATUS_TRANSITIONS.
    status: z.enum(["IN_PROGRESS", "COMPLETE"]).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Provide at least one field to update.",
  });

// Permissive request body shared by the four campaign config sub-resource update tools.
// Only the fields you send are changed, so every field is optional. To see the full object
// with every field and its current value, fetch the tab first, then send back only what you
// want to change.
const campaignConfigUpdateSchema = z.object({
  fields: z.record(z.string(), z.unknown()),
});

// Tax valuation settings shared by the reward `value` and `referredValue` fields
// (openapi RewardTaxValuation). `null` on either sub-field means "clear / use the smart default".
const rewardTaxValuationSchema = z.object({
  fairMarketValueUSD: z.number().min(0).nullable().optional(),
  isTaxReportable: z.boolean().nullable().optional(),
});

// Affiliate commission structure (openapi CommissionStructure) — a CLOSED object. The API rejects
// unknown keys, so the MCP mirrors that exact shape instead of advertising an open `{[key]: any}`
// dictionary. Provide `amount` (+ optional `amountISO`) for a FIXED commission, or `percent` for a
// PERCENT commission; the remaining fields tune hold/duration, caps, and the intro rate.
const commissionStructureSchema = z
  .object({
    type: z.enum(["PERCENT", "FIXED"]).optional(),
    event: z.enum(["CLICK", "LEAD", "SALE"]).optional(),
    amount: z.number().int().nullable().optional(),
    amountISO: z.string().nullable().optional(),
    percent: z.number().nullable().optional(),
    minPaidReferrals: z.number().int().min(1).optional(),
    holdDuration: z.number().int().optional(),
    duration: z.enum(["FOREVER", "REPEATING", "ONCE"]).optional(),
    durationInMonths: z.number().int().nullable().optional(),
    approvalRequired: z.boolean().optional(),
    hasMaxAmount: z.boolean().optional(),
    maxAmount: z.number().int().nullable().optional(),
    maxAmountISO: z.string().nullable().optional(),
    hasIntro: z.boolean().optional(),
    introType: z.enum(["PERCENT", "FIXED"]).nullable().optional(),
    introPercent: z.number().nullable().optional(),
    introAmount: z.number().int().nullable().optional(),
    introAmountISO: z.string().nullable().optional(),
    introDuration: z.enum(["REPEATING", "ONCE"]).nullable().optional(),
    introDurationInMonths: z.number().int().nullable().optional(),
  })
  .strict();

// JSON-schema mirror of commissionStructureSchema for the MCP tool input contract (closed object).
const commissionStructureJsonSchema = {
  type: "object",
  description:
    "Affiliate commission structure (AFFILIATE rewards only). Provide `amount` (+ optional `amountISO`) for a FIXED commission, or `percent` for a PERCENT commission.",
  properties: {
    type: { type: "string", enum: ["PERCENT", "FIXED"] },
    event: { type: "string", enum: ["CLICK", "LEAD", "SALE"] },
    amount: { type: ["integer", "null"] },
    amountISO: { type: ["string", "null"] },
    percent: { type: ["number", "null"] },
    minPaidReferrals: { type: "integer", minimum: 1 },
    holdDuration: { type: "integer" },
    duration: { type: "string", enum: ["FOREVER", "REPEATING", "ONCE"] },
    durationInMonths: { type: ["integer", "null"] },
    approvalRequired: { type: "boolean" },
    hasMaxAmount: { type: "boolean" },
    maxAmount: { type: ["integer", "null"] },
    maxAmountISO: { type: ["string", "null"] },
    hasIntro: { type: "boolean" },
    introType: { type: ["string", "null"] },
    introPercent: { type: ["number", "null"] },
    introAmount: { type: ["integer", "null"] },
    introAmountISO: { type: ["string", "null"] },
    introDuration: { type: ["string", "null"] },
    introDurationInMonths: { type: ["integer", "null"] },
  },
  additionalProperties: false,
} as const;

// Writable fields shared by the create and update campaign-reward tools.
const rewardWritableFields = {
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  referralDescription: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  isVisible: z.boolean().optional(),
  isUnlimited: z.boolean().optional(),
  referredRewardUpfront: z.boolean().optional(),
  limit: z.number().int().min(0).optional(),
  conversionsRequired: z.number().int().min(1).optional(),
  numberOfWinners: z.number().int().min(0).optional(),
  order: z.number().int().optional(),
  limitDuration: z.enum(["IN_TOTAL", "PER_MONTH", "PER_YEAR"]).optional(),
  nextMilestonePrefix: z.string().nullable().optional(),
  nextMilestoneSuffix: z.string().nullable().optional(),
  couponCode: z.string().nullable().optional(),
  referralCouponCode: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  commissionStructure: commissionStructureSchema.optional(),
  value: rewardTaxValuationSchema.optional(),
  referredValue: rewardTaxValuationSchema.optional(),
};

const createCampaignRewardSchema = z.object({
  type: z.enum(["SINGLE_SIDED", "DOUBLE_SIDED", "MILESTONE", "LEADERBOARD", "AFFILIATE"]),
  ...rewardWritableFields,
});

const updateCampaignRewardSchema = z.object({
  campaignRewardId: z.string().min(1),
  ...rewardWritableFields,
});

const deleteCampaignRewardSchema = z.object({
  campaignRewardId: z.string().min(1),
});

const createMobileParticipantTokenSchema = addParticipantSchema;

const participantAuthHashSchema = z.object({
  email: z.string().min(3),
  participantAuthSecret: z.string().min(1).optional(),
});

const webhookNormalizeSchema = z.object({
  payload: z.unknown(),
});

// Integration connect-link tool. `integration` must be one of the connectable keys
// (see ./growsurf/integrations); `campaignId` overrides GROWSURF_CAMPAIGN_ID as the link target.
const integrationConnectLinkSchema = z.object({
  integration: z.enum(INTEGRATION_KEYS as unknown as [string, ...string[]]),
  campaignId: z.string().min(1).optional(),
});

// ---- Account tools ----

const createAccountSchema = z.object({
  email: z.string().min(3),
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  company: z.string().min(1).max(255).optional(),
});

const updateAccountSchema = z
  .object({
    firstName: z.string().max(255).optional(),
    lastName: z.string().max(255).optional(),
    company: z.string().max(255).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Provide at least one field to update.",
  });

// ---- Campaign webhook tools ----

// Single source of truth for webhook event names — mirrors openapi WebhookEvent. `.options`
// is reused as the JSON Schema `enum` so the zod and JSON schemas cannot drift.
const webhookEventSchema = z.enum([
  "PARTICIPANT_REACHED_A_GOAL",
  "NEW_PARTICIPANT_ADDED",
  "CAMPAIGN_ENDED",
  "PARTICIPANT_FRAUD_STATUS_UPDATED",
  "NEW_COMMISSION_ADDED",
  "COMMISSION_ADJUSTED",
  "NEW_PAYOUT_ISSUED",
]);

const WEBHOOK_EVENTS = [...webhookEventSchema.options];

const createWebhookSchema = z.object({
  payloadUrl: z.string().min(1),
  events: z.array(webhookEventSchema).optional(),
  secret: z.string().min(1).optional(),
  isEnabled: z.boolean().optional(),
});

const updateWebhookSchema = z
  .object({
    webhookId: z.string().min(1),
    payloadUrl: z.string().min(1).optional(),
    events: z.array(webhookEventSchema).optional(),
    secret: z.string().min(1).optional(),
    isEnabled: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.payloadUrl !== undefined ||
      v.events !== undefined ||
      v.secret !== undefined ||
      v.isEnabled !== undefined,
    { message: "Provide at least one webhook field to update." },
  );

const deleteWebhookSchema = z.object({ webhookId: z.string().min(1) });

const testWebhookSchema = z.object({
  webhookId: z.string().min(1),
  event: webhookEventSchema.optional(),
});

// ---- Campaign analytics tool ----

const getCampaignAnalyticsSchema = z.object({
  interval: z.enum(["day", "week", "month", "total"]).optional(),
  // Comma-separated opt-in enrichments (previousPeriod, statusCounts, rates). Modeled as a free
  // string like the openapi `include` param — the API validates the individual tokens, and new
  // enrichments can be added server-side without a schema bump here.
  include: z.string().optional(),
  days: z.number().int().min(1).max(1825).optional(),
  startDate: z.number().int().optional(),
  endDate: z.number().int().optional(),
});

// ---- Participant email / analytics / activity-log / update tools ----

// The participant is addressed by GrowSurf participant ID OR email (identical path parameter),
// mirroring the existing trigger/record participant tools. Shared identity fields + refine.
const participantIdentityFields = {
  participantId: z.string().min(1).optional(),
  participantEmail: z.string().min(3).optional(),
};
const hasParticipantIdentity = (v: { participantId?: string | undefined; participantEmail?: string | undefined }) =>
  Boolean(v.participantId) || Boolean(v.participantEmail);
const PARTICIPANT_IDENTITY_HINT = "Provide participantId or participantEmail.";

const emailParticipantSchema = z
  .object({
    ...participantIdentityFields,
    emailType: z.string().min(1).optional(),
    subject: z.string().max(255).optional(),
    body: z.string().min(1).optional(),
    preheader: z.string().optional(),
  })
  .refine(hasParticipantIdentity, { message: PARTICIPANT_IDENTITY_HINT })
  .refine((v) => Boolean(v.emailType) || (Boolean(v.subject) && Boolean(v.body)), {
    message: "Provide either emailType (template mode) or both subject and body (free-form mode).",
  });

const getParticipantAnalyticsSchema = z
  .object({
    ...participantIdentityFields,
    // include=series adds a per-period `series` of this participant's own activity. `interval`,
    // `days`, `startDate`, and `endDate` mirror the campaign-analytics window params (interval has
    // no "total" here — the series is only produced when include=series).
    include: z.enum(["series"]).optional(),
    interval: z.enum(["day", "week", "month"]).optional(),
    days: z.number().int().min(1).max(1825).optional(),
    startDate: z.number().int().optional(),
    endDate: z.number().int().optional(),
  })
  .refine(hasParticipantIdentity, { message: PARTICIPANT_IDENTITY_HINT });

const getParticipantActivityLogsSchema = z
  .object({
    ...participantIdentityFields,
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .refine(hasParticipantIdentity, { message: PARTICIPANT_IDENTITY_HINT });

const updateParticipantSchema = z
  .object({
    ...participantIdentityFields,
    referredBy: z.string().max(100).optional(),
    email: z.string().min(3).optional(),
    firstName: z.string().max(255).optional(),
    lastName: z.string().max(255).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    referralStatus: z.enum(["CREDIT_PENDING", "CREDIT_AWARDED", "CREDIT_EXPIRED"]).optional(),
    vanityKeys: z.array(z.string().min(1).max(20).regex(/^[A-Za-z0-9_-]+$/)).max(5).optional(),
    unsubscribed: z.boolean().optional(),
    notes: z.string().max(500).optional(),
    paypalEmail: z.string().min(3).optional(),
  })
  .refine(hasParticipantIdentity, { message: PARTICIPANT_IDENTITY_HINT })
  .refine(
    (v) =>
      [
        v.referredBy,
        v.email,
        v.firstName,
        v.lastName,
        v.metadata,
        v.referralStatus,
        v.vanityKeys,
        v.unsubscribed,
        v.notes,
        v.paypalEmail,
      ].some((x) => x !== undefined),
    { message: "Provide at least one participant field to update." },
  );

// Bulk delete is campaign-scoped (POST /campaign/{id}/participants/bulk-delete), not addressed by a
// single participant identity — each array entry is itself an ID-or-email identifier.
const bulkDeleteParticipantsSchema = z.object({
  participants: z
    .array(
      z
        .string()
        .min(1)
        .describe("A GrowSurf participant ID or an email address identifying one participant to delete."),
    )
    .min(1)
    .max(200)
    .describe("GrowSurf participant IDs and/or email addresses to delete (1-200 entries; mixed lists allowed)."),
});

export type CreateGrowSurfMcpServerOptions = {
  env?: Env;
};

export const createGrowSurfMcpServer = (options: CreateGrowSurfMcpServerOptions = {}) => {
  const env = options.env ?? getEnv();

  // Shared env shape for the install-kit renderers (decoupled from the MCP Env).
  const installKitEnv = {
    campaignId: env.GROWSURF_CAMPAIGN_ID,
    webhookToken: env.GROWSURF_WEBHOOK_TOKEN,
    participantAuthSecret: env.GROWSURF_PARTICIPANT_AUTH_SECRET,
  };

  const server = new Server(
    {
      name: "growsurf-mcp",
      version: GROWSURF_MCP_VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "growsurf://campaign",
          name: "GrowSurf Campaign Details",
          description: "Full campaign (program) details fetched from GrowSurf REST API.",
          mimeType: "application/json",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === "growsurf://campaign") {
      // The campaign resource has no per-read arguments, so it stays scoped to GROWSURF_CAMPAIGN_ID.
      const campaignResource = requireGrowSurfClient(env);
      const result = await campaignResource.getCampaign();
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "application/json",
            text: safeJson(result),
          },
        ],
      };
    }
    throw new Error(`Unknown resource: ${request.params.uri}`);
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: listGrowSurfPrompts(),
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    return getGrowSurfPrompt(request.params.name, request.params.arguments ?? {});
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = [
        {
          name: "growsurf_integration_guide",
          description: "Generate a guided, happy-path GrowSurf integration plan (referral + affiliate).",
          inputSchema: {
            type: "object",
            properties: {
              programType: { type: "string", enum: ["referral", "affiliate", "both"], default: "both" },
              participantAuthEnabled: { type: "boolean", default: false },
              referralTrigger: { type: "string", enum: ["signup", "signup_plus_qualifying_action"], default: "signup_plus_qualifying_action" },
              singlePageApp: { type: "boolean", default: false },
              webhookSecurity: { type: "string", enum: ["token_in_url", "none"], default: "token_in_url" },
            },
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_mobile_sdk_guide",
          description:
            "Generate native iOS/Android SDK 0.3.3 guidance, including attribution, shareUrl sharing, trackShare, and the native GrowSurf Window.",
          inputSchema: {
            type: "object",
            properties: {
              platform: { type: "string", enum: ["ios", "android", "both"], default: "both" },
              attributionProvider: {
                type: "string",
                enum: ["all", "direct_link", "google_play", "branch", "adjust", "appsflyer", "singular", "none"],
                default: "all",
              },
              participantState: {
                type: "string",
                enum: ["new_participant", "existing_signed_in_user", "both"],
                default: "both",
              },
              serverVerifiedQualifyingAction: { type: "boolean", default: true },
              includeInstallSnippets: { type: "boolean", default: true },
              campaignId: { type: "string" },
              mobilePublicKey: { type: "string" },
            },
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_api_library_snippets",
          description:
            "Generate REST API integration snippets for TypeScript, Python, PHP, Ruby, and Java, including a raw REST Create Mobile Participant Token fallback.",
          inputSchema: {
            type: "object",
            properties: {
              language: {
                type: "string",
                enum: ["typescript", "python", "php", "ruby", "java", "all"],
                default: "all",
              },
              workflow: {
                type: "string",
                enum: [
                  "setup",
                  "campaign_lookup",
                  "add_participant",
                  "trigger_referral",
                  "record_transaction",
                  "mobile_participant_token",
                  "all",
                ],
                default: "all",
              },
              campaignId: { type: "string" },
              email: { type: "string" },
              referredBy: { type: "string" },
              participantIdOrEmail: { type: "string" },
            },
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_get_campaign",
          description:
            "Fetch your GrowSurf campaign (program) details via REST. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_create_campaign",
          description:
            "Create a new GrowSurf program (campaign) pre-populated with type-appropriate starter content, optionally with inline rewards. Starter content includes Design, Emails, Options, Installation, and GrowSurf Window defaults. Only `type` is required; the program is created in `DRAFT` status owned by your API key's account. `currencyISO` sets the program's currency (defaults to `USD`) and is immutable after creation. Editor-tab config (design, emails, options, installation) is not accepted here. Fetch and review those config sub-resources after creation, then patch only what needs to change. Does NOT require GROWSURF_CAMPAIGN_ID. The response includes the new program `id`; pass it as `campaignId` to the other tools (or set GROWSURF_CAMPAIGN_ID) to configure and operate the program.",
          inputSchema: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["REFERRAL", "AFFILIATE"] },
              name: { type: "string" },
              companyName: { type: "string" },
              companyLogoImageUrl: { type: "string" },
              currencyISO: { type: "string" },
              rewards: { type: "array", items: { type: "object", additionalProperties: true } },
            },
            required: ["type"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_update_campaign",
          description:
            "Update your GrowSurf program's (campaign's) identity and lifecycle: name, companyName, companyLogoImageUrl, and status (set IN_PROGRESS to publish/resume the program, COMPLETE to end it). Only the fields you send are changed. `type`, `urlId`, and `currencyISO` are immutable (currency is chosen once at program creation), so this tool does not accept them. Editor-tab config (design, emails, options, installation) is edited with the dedicated config sub-resource tools, not here. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string" },
              companyName: { type: "string" },
              companyLogoImageUrl: { type: "string" },
              status: {
                type: "string",
                enum: ["IN_PROGRESS", "COMPLETE"],
                description:
                  "Lifecycle transition. IN_PROGRESS publishes/resumes the program; COMPLETE ends it. These are the only accepted targets — DRAFT/PENDING/CANCELLED are rejected by the API.",
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_clone_campaign",
          description:
            "Clone your GrowSurf program (campaign) into a new DRAFT program. Integrations and credentials are not copied; active rewards are cloned. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_list_campaign_rewards",
          description: "List your GrowSurf program's configured rewards (reward configs). Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_create_campaign_reward",
          description:
            "Create a new campaign reward (reward config) on your GrowSurf program. `type` must be compatible with the program type (affiliate programs support only AFFILIATE rewards; referral programs support the other types). Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["SINGLE_SIDED", "DOUBLE_SIDED", "MILESTONE", "LEADERBOARD", "AFFILIATE"] },
              title: { type: "string" },
              description: { type: "string" },
              referralDescription: { type: "string" },
              imageUrl: { type: "string" },
              isVisible: { type: "boolean" },
              isUnlimited: { type: "boolean" },
              referredRewardUpfront: { type: "boolean" },
              limit: { type: "integer", minimum: 0 },
              conversionsRequired: { type: "integer", minimum: 1 },
              numberOfWinners: { type: "integer", minimum: 0 },
              order: { type: "integer" },
              limitDuration: { type: "string", enum: ["IN_TOTAL", "PER_MONTH", "PER_YEAR"] },
              nextMilestonePrefix: { type: "string" },
              nextMilestoneSuffix: { type: "string" },
              couponCode: { type: "string" },
              referralCouponCode: { type: "string" },
              metadata: { type: "object", additionalProperties: true },
              commissionStructure: commissionStructureJsonSchema,
              value: {
                type: "object",
                description:
                  "Tax valuation for the reward (the referrer's side of a double-sided reward). fairMarketValueUSD = manual fair-market value in USD (major units); isTaxReportable = whether it counts toward 1099 thresholds (null = smart default).",
                properties: {
                  fairMarketValueUSD: { type: ["number", "null"], minimum: 0 },
                  isTaxReportable: { type: ["boolean", "null"] },
                },
                additionalProperties: false,
              },
              referredValue: {
                type: "object",
                description:
                  "Tax valuation for the referred friend's side of a double-sided reward. Defaults to not tax-reportable (a purchase rebate).",
                properties: {
                  fairMarketValueUSD: { type: ["number", "null"], minimum: 0 },
                  isTaxReportable: { type: ["boolean", "null"] },
                },
                additionalProperties: false,
              },
            },
            required: ["type"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_update_campaign_reward",
          description:
            "Update an existing campaign reward (reward config) on your GrowSurf program. `campaignRewardId` is the reward key (e.g. crew_...). The reward `type` is immutable. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              campaignRewardId: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              referralDescription: { type: "string" },
              imageUrl: { type: "string" },
              isVisible: { type: "boolean" },
              isUnlimited: { type: "boolean" },
              referredRewardUpfront: { type: "boolean" },
              limit: { type: "integer", minimum: 0 },
              conversionsRequired: { type: "integer", minimum: 1 },
              numberOfWinners: { type: "integer", minimum: 0 },
              order: { type: "integer" },
              limitDuration: { type: "string", enum: ["IN_TOTAL", "PER_MONTH", "PER_YEAR"] },
              nextMilestonePrefix: { type: "string" },
              nextMilestoneSuffix: { type: "string" },
              couponCode: { type: "string" },
              referralCouponCode: { type: "string" },
              metadata: { type: "object", additionalProperties: true },
              commissionStructure: commissionStructureJsonSchema,
              value: {
                type: "object",
                description:
                  "Tax valuation for the reward (the referrer's side of a double-sided reward). fairMarketValueUSD = manual fair-market value in USD (major units); isTaxReportable = whether it counts toward 1099 thresholds (null = smart default).",
                properties: {
                  fairMarketValueUSD: { type: ["number", "null"], minimum: 0 },
                  isTaxReportable: { type: ["boolean", "null"] },
                },
                additionalProperties: false,
              },
              referredValue: {
                type: "object",
                description:
                  "Tax valuation for the referred friend's side of a double-sided reward. Defaults to not tax-reportable (a purchase rebate).",
                properties: {
                  fairMarketValueUSD: { type: ["number", "null"], minimum: 0 },
                  isTaxReportable: { type: ["boolean", "null"] },
                },
                additionalProperties: false,
              },
            },
            required: ["campaignRewardId"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_delete_campaign_reward",
          description:
            "Delete a campaign reward (reward config) from your GrowSurf program. The reward is deactivated, removed from the program's reward set, and any connected upfront-discount coupons are cleaned up. `campaignRewardId` is the reward key. Returns { id, success }. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              campaignRewardId: { type: "string" },
            },
            required: ["campaignRewardId"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_get_campaign_design",
          description:
            "Fetch the Design tab configuration for your GrowSurf program, including GrowSurf Window content, colors, sharing sections, landing/referred-friend content, and other appearance settings. Returns the full object with every field and its current value. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_update_campaign_design",
          description:
            "Update the Design tab configuration for your GrowSurf program. Only the fields you send are changed; anything you leave out is untouched (arrays replace wholesale). Fetch the tab first, preserve the starter GrowSurf Window content unless the user asked to change it, then pass just the fields you want to change under `fields`. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              fields: { type: "object", additionalProperties: true },
            },
            required: ["fields"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_get_referral_flow_screenshots",
          description:
            "Capture screenshots of what the current GrowSurf program looks like to a referrer and to a referred friend. Use this after creating or changing a program so the user can confirm the design, participant messaging, and reward presentation. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_get_campaign_emails",
          description:
            "Fetch the Emails tab configuration for your GrowSurf program (participant and admin email templates and settings). Returns the full object with every field and its current value — the same shape you send back on update. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_update_campaign_emails",
          description:
            "Update the Emails tab configuration for your GrowSurf program. Only the fields you send are changed; anything you leave out is untouched (arrays replace wholesale). Pass just the fields you want to change under `fields`. To see the full object with every field and its current value, fetch the tab first, then send back only what you want to change. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              fields: { type: "object", additionalProperties: true },
            },
            required: ["fields"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_get_campaign_options",
          description:
            "Fetch the Options tab configuration for your GrowSurf program (referral triggers, anti-fraud lists and toggles, notifications, and other behavior options). Returns the full object with every field and its current value — the same shape you send back on update. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_update_campaign_options",
          description:
            "Update the Options tab configuration for your GrowSurf program. Only the fields you send are changed; anything you leave out is untouched (arrays replace wholesale). Pass just the fields you want to change under `fields`. To see the full object with every field and its current value, fetch the tab first, then send back only what you want to change. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              fields: { type: "object", additionalProperties: true },
            },
            required: ["fields"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_get_campaign_installation",
          description:
            "Fetch the Installation tab configuration for your GrowSurf program (embed/installation and tracking setup). Returns the full object with every field and its current value — the same shape you send back on update. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_update_campaign_installation",
          description:
            "Update the Installation tab configuration for your GrowSurf program. Only the fields you send are changed; anything you leave out is untouched (arrays replace wholesale). Pass just the fields you want to change under `fields`. To see the full object with every field and its current value, fetch the tab first, then send back only what you want to change. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              fields: { type: "object", additionalProperties: true },
            },
            required: ["fields"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_create_account",
          description:
            "Create a brand-new GrowSurf account and return an API key. This is the ONLY tool that does NOT require GROWSURF_API_KEY to be configured — the endpoint is unauthenticated and returns a fresh key in `apiKey`. The key is LOCKED until the account's email address is verified: until then, authenticated endpoints outside the Account tools return a `403` with error code `EMAIL_NOT_VERIFIED_ERROR`. Practical flow: create the account, tell the user to click the link in the verification email GrowSurf sends, then retry/poll until the `EMAIL_NOT_VERIFIED_ERROR` clears and continue with the returned key (use `growsurf_resend_verification_email` if the email was lost). The account is created passwordless; the welcome email contains the verification link and a set-password link for dashboard access. Accounts whose email is never verified are deleted automatically after 7 days. For security, the API key is rotated the first time the account owner signs in to the GrowSurf dashboard. Some actions (such as emailing participants) additionally require the GrowSurf team to verify the account first. Personal email and disposable email addresses are not accepted. By creating an account you agree, on behalf of the account holder, to GrowSurf's Terms of Service (https://growsurf.com/terms) and Privacy Policy (https://growsurf.com/privacy).",
          inputSchema: {
            type: "object",
            properties: {
              email: { type: "string" },
              firstName: { type: "string" },
              lastName: { type: "string" },
              company: { type: "string" },
            },
            required: ["email"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_get_account",
          description:
            "Fetch the GrowSurf account that owns the API key: profile and GrowSurf-team verification state. `verificationStatus` is VERIFIED once the team has verified the account — required before a program can email participants. Requires GROWSURF_API_KEY; does NOT require GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_update_account",
          description:
            "Update your own GrowSurf account profile (`firstName`, `lastName`, `company`). Only the fields you send are changed. The account `email` cannot be changed via the API and billing/subscription is not editable here — any unknown field is rejected with a 400. Requires GROWSURF_API_KEY; does NOT require GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              firstName: { type: "string" },
              lastName: { type: "string" },
              company: { type: "string" },
            },
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_rotate_api_key",
          description:
            "Generate a new GrowSurf API key and immediately revoke the current one. The key used to make this request stops working as soon as the response returns — update every integration (including GROWSURF_API_KEY in this MCP server's config) with the new key from `apiKey`. The account owner is notified by email whenever the key is rotated. Requires GROWSURF_API_KEY; does NOT require GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_request_account_verification",
          description:
            "Request GrowSurf-team verification of your account (required before a program can email its participants). Idempotent — calling it again while a request is pending does not create a duplicate. Returns the account with its updated `verificationStatus`. Requires GROWSURF_API_KEY; does NOT require GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_resend_verification_email",
          description:
            "Resend the email-verification email to the account's email address. A 200 with status SENT is only returned when an email was actually dispatched. Returns a 400 if the email is already verified, or a 429 if a verification email was sent too recently — wait a moment, then retry. Requires GROWSURF_API_KEY; does NOT require GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_get_campaign_analytics",
          description:
            "Fetch analytics for your GrowSurf program — participants, referrals, impressions, per-channel shares, plus affiliate revenue/commissions for affiliate programs. Pass `interval` (day, week, or month) to also receive a `series` array of per-period totals for trend detection (defaults to `total`, no series). Pass `include` (comma-separated: previousPeriod, statusCounts, rates) to enrich the response — previousPeriod adds totals for the equal-length window immediately before the requested one; statusCounts adds reward (and, for affiliate programs, affiliate/commission/payout) status breakdowns; rates adds derived referral rates. Scope the timeframe with `days` (last N days, default 365, max 1825) or an explicit `startDate`/`endDate` window (Unix ms). Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              interval: {
                type: "string",
                enum: ["day", "week", "month", "total"],
                description: "day/week/month adds a per-period `series`; total (default) returns totals only.",
              },
              include: {
                type: "string",
                description:
                  "Comma-separated opt-in enrichments (keeps the default response lean): `previousPeriod` (totals for the equal-length prior window), `statusCounts` (reward and, for affiliate programs, affiliate/commission/payout status breakdowns), `rates` (derived referral rates).",
              },
              days: { type: "integer", minimum: 1, maximum: 1825 },
              startDate: { type: "integer", description: "Start of the timeframe, Unix timestamp in ms. Use with endDate instead of days." },
              endDate: { type: "integer", description: "End of the timeframe, Unix timestamp in ms." },
            },
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_list_campaign_webhooks",
          description: "List your GrowSurf program's webhooks (secrets are never returned). Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_create_campaign_webhook",
          description:
            "Add a webhook to your GrowSurf program. `payloadUrl` is required. `events` is the list of events this webhook is subscribed to (omit to subscribe it to no events). `secret` is write-only — GrowSurf uses it to sign deliveries (the GrowSurf-Signature HMAC header) and never returns it. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              payloadUrl: { type: "string" },
              events: { type: "array", items: { type: "string", enum: WEBHOOK_EVENTS } },
              secret: { type: "string", description: "Write-only. Signs deliveries; never returned." },
              isEnabled: { type: "boolean" },
            },
            required: ["payloadUrl"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_update_campaign_webhook",
          description:
            "Update a webhook on your GrowSurf program by id (`webhookId` is `primary` for the program's primary webhook). Only the fields you send are changed. `secret` is write-only and never returned. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              webhookId: { type: "string" },
              payloadUrl: { type: "string" },
              events: { type: "array", items: { type: "string", enum: WEBHOOK_EVENTS } },
              secret: { type: "string", description: "Write-only." },
              isEnabled: { type: "boolean" },
            },
            required: ["webhookId"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_delete_campaign_webhook",
          description:
            "Remove a webhook from your GrowSurf program by id. Returns { id, success }. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              webhookId: { type: "string" },
            },
            required: ["webhookId"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_test_campaign_webhook",
          description:
            "Send a live test event to a webhook on your GrowSurf program using its stored URL and secret. Optionally pass `event` to choose which event type to simulate; when omitted, the webhook's first enabled event is used (returns 400 if the webhook has no enabled events). Returns the mock payload and the receiving endpoint's response. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              webhookId: { type: "string" },
              event: { type: "string", enum: WEBHOOK_EVENTS },
            },
            required: ["webhookId"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_add_participant",
          description:
            "Add or fetch an existing participant by email (GrowSurf REST). Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              email: { type: "string" },
              firstName: { type: "string" },
              lastName: { type: "string" },
              referredBy: { type: "string" },
              referralStatus: { type: "string", enum: ["CREDIT_PENDING", "CREDIT_AWARDED"] },
              ipAddress: { type: "string" },
              fingerprint: { type: "string" },
              mobileInstanceId: { type: "string" },
              metadata: { type: "object", additionalProperties: true },
            },
            required: ["email"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_update_participant",
          description:
            "Update a participant (by GrowSurf participant ID or email). Only the fields you send are changed; read-only fields (counters, origin, fraud state) are rejected with a 400. `notes` is freeform internal notes (never shown to participants); `paypalEmail` is the participant's PayPal address for affiliate payouts. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              participantId: { type: "string" },
              participantEmail: { type: "string" },
              referredBy: { type: "string" },
              email: { type: "string", description: "Change the participant's email address." },
              firstName: { type: "string" },
              lastName: { type: "string" },
              metadata: { type: "object", additionalProperties: true },
              referralStatus: { type: "string", enum: ["CREDIT_PENDING", "CREDIT_AWARDED", "CREDIT_EXPIRED"] },
              vanityKeys: {
                type: "array",
                maxItems: 5,
                items: { type: "string", minLength: 1, maxLength: 20, pattern: "^[A-Za-z0-9_-]+$" },
              },
              unsubscribed: { type: "boolean" },
              notes: {
                type: "string",
                maxLength: 500,
                description: "Freeform internal notes (internal only, never exposed to participants).",
              },
              paypalEmail: {
                type: "string",
                description: "The participant's PayPal email address, used for affiliate payouts.",
              },
            },
            anyOf: [{ required: ["participantId"] }, { required: ["participantEmail"] }],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_bulk_delete_participants",
          description:
            "Bulk delete participants from your GrowSurf program in one request. DESTRUCTIVE: deletion is permanent, cannot be undone, and removes the participants' referrals, rewards, commissions, and payout records. Each entry in `participants` is a GrowSurf participant ID or an email address (mixed lists are allowed), up to 200 entries per request — chunk larger lists across multiple calls. Returns a `summary` (total, deletedCount, notFoundCount, duplicateCount, errorCount) plus per-row `results` in request order, each with `status` DELETED, NOT_FOUND, DUPLICATE (resolves to the same participant as an earlier entry), or ERROR — a 200 response can still include NOT_FOUND or ERROR rows, so check the summary. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              participants: {
                type: "array",
                minItems: 1,
                maxItems: 200,
                items: {
                  type: "string",
                  minLength: 1,
                  description: "A GrowSurf participant ID or an email address identifying one participant to delete.",
                },
                description:
                  "GrowSurf participant IDs and/or email addresses to delete (1-200 entries; mixed lists allowed).",
              },
            },
            required: ["participants"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_email_participant",
          description:
            "Send an email to a participant (by GrowSurf participant ID or email). Provide EITHER `emailType` to trigger one of the program's configured email templates, OR `subject` + `body` for a free-form email (optionally `preheader`). Free-form emails are sent with the same compliance handling (company name, postal address, and an unsubscribe link are added automatically, and unsubscribed participants are suppressed). Sending requires the account to be verified by the GrowSurf team and a verified custom email domain on the program (set up in *Campaign Editor > 3. Emails > Email Settings*). Returns 400 until one is verified. The email is accepted for delivery. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              participantId: { type: "string" },
              participantEmail: { type: "string" },
              emailType: {
                type: "string",
                description: "The program email template to trigger. Send the camelCase key; the available types depend on the program type. The template's `isEnabled` setting controls automatic sends only, so this tool can trigger any sendable template. System and transactional types (login link, PayPal confirmation, tax) and the invite email cannot be sent. Referral programs: `welcomeNonReferred`, `referralLinkViewedFirstTime`, `referralLinkUsed`, `referredSignup`, `welcomeReferred`, `goalAchieved`, `campaignEndedWinners`, `campaignEndedNonWinners`, `progressUpdateMonthly`. Affiliate programs: `welcomeNonReferred`, `referralLinkViewedFirstTime`, `referredSignup`, `commissionGenerated`, `commissionAdjusted`, `payoutPending`, `payoutSentSuccess`, `progressUpdateMonthly`.",
              },
              subject: { type: "string", description: "Free-form subject. Supports dynamic text (`{{...}}` tokens), the same as the body." },
              body: { type: "string", description: "Free-form HTML body. You can personalize it with dynamic text, inserting `{{...}}` tokens like `{{firstName}}` or `{{shareUrl}}`. See [Guide to using dynamic text in GrowSurf emails](https://support.growsurf.com/article/213-guide-to-using-dynamic-text-in-growsurf-emails)." },
              preheader: { type: "string" },
            },
            anyOf: [{ required: ["participantId"] }, { required: ["participantEmail"] }],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_get_participant_analytics",
          description:
            "Fetch all-time analytics for a single participant (by GrowSurf participant ID or email): engagement counters, leaderboard ranks, and per-channel share counts, plus affiliate money metrics (referral revenue, commissions, paid out, upcoming payout) for affiliate programs. Pass `include=series` to also receive a `series` array of this participant's own activity per period; bucket it with `interval` (day, week, or month; default day) and scope the timeframe with `days` (last N days, max 1825) or an explicit `startDate`/`endDate` window (Unix ms). Useful for segmenting and re-engaging participants. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              participantId: { type: "string" },
              participantEmail: { type: "string" },
              include: {
                type: "string",
                enum: ["series"],
                description: "Set to `series` to also return this participant's own activity per period.",
              },
              interval: {
                type: "string",
                enum: ["day", "week", "month"],
                description: "Bucket size for the `series` (only used with include=series). Defaults to day.",
              },
              days: { type: "integer", minimum: 1, maximum: 1825 },
              startDate: { type: "integer", description: "Start of the timeframe, Unix timestamp in ms. Use with endDate instead of days." },
              endDate: { type: "integer", description: "End of the timeframe, Unix timestamp in ms." },
            },
            anyOf: [{ required: ["participantId"] }, { required: ["participantEmail"] }],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_get_participant_activity_logs",
          description:
            "List a participant's activity logs (by GrowSurf participant ID or email), most recent first, offset/limit paginated. `limit` is 1-100 (default 20); `offset` skips logs. The response `offset` is the cursor for the next page (null when there are no more). Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              participantId: { type: "string" },
              participantEmail: { type: "string" },
              limit: { type: "integer", minimum: 1, maximum: 100 },
              offset: { type: "integer", minimum: 0 },
            },
            anyOf: [{ required: ["participantId"] }, { required: ["participantEmail"] }],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_trigger_referral",
          description:
            "Trigger referral credit for a referred participant (use when your trigger is Sign up + Qualifying Action). Optionally pass delayInDays (1-90) to hold the credit for N days before awarding it (e.g. to cover a refund window). Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              participantId: { type: "string" },
              participantEmail: { type: "string" },
              delayInDays: { type: "integer", minimum: 1, maximum: 90 },
            },
            anyOf: [{ required: ["participantId"] }, { required: ["participantEmail"] }],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_cancel_delayed_referral",
          description:
            "Cancel a pending delayed referral trigger for a participant before the delay elapses (e.g. on refund/cancellation). Returns { success, message }. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              participantId: { type: "string" },
              participantEmail: { type: "string" },
            },
            anyOf: [{ required: ["participantId"] }, { required: ["participantEmail"] }],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_record_sale",
          description:
            "Record a sale/transaction for an affiliate program. Use webhooks to know when commissions are added. Requires at least one transaction identifier (externalId, transactionId, orderId, paymentId, invoiceId, paymentIntentId, or chargeId) so repeated calls are de-duplicated instead of double-paying the referrer; reuse the same one when refunding. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              participantId: { type: "string" },
              participantEmail: { type: "string" },
              currency: { type: "string" },
              grossAmount: { type: "integer" },
              invoiceId: { type: "string" },
              chargeId: { type: "string" },
              paymentIntentId: { type: "string" },
              transactionId: { type: "string" },
              externalId: { type: "string" },
              orderId: { type: "string" },
              paymentId: { type: "string" },
              customerId: { type: "string" },
              subscriptionId: { type: "string" },
              netAmount: { type: "integer" },
              taxAmount: { type: "integer" },
              amountCashNet: { type: "integer" },
              amountPaid: { type: "integer" },
              paidAt: { type: "integer" },
              description: { type: "string" },
            },
            required: ["currency", "grossAmount"],
            anyOf: [{ required: ["participantId"] }, { required: ["participantEmail"] }],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_refund_transaction",
          description:
            "Record an amendment (refund, partial refund, or chargeback) against a previously recorded affiliate transaction; reverses or adjusts the referrer's commission. The inverse of growsurf_record_sale. Identify the original transaction with the same identifier you sent when recording it (omit amountRefunded for a full refund). Already-paid commissions are not clawed back (recorded for tax only). Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              participantId: { type: "string" },
              participantEmail: { type: "string" },
              amendmentType: { type: "string", enum: ["REFUND", "CHARGEBACK"] },
              amountRefunded: { type: "integer" },
              amount: { type: "integer" },
              refundId: { type: "string" },
              refundStatus: { type: "string" },
              refundAmount: { type: "integer" },
              currency: { type: "string" },
              invoiceId: { type: "string" },
              chargeId: { type: "string" },
              paymentIntentId: { type: "string" },
              transactionId: { type: "string" },
              externalId: { type: "string" },
              orderId: { type: "string" },
              paymentId: { type: "string" },
              description: { type: "string" },
            },
            anyOf: [{ required: ["participantId"] }, { required: ["participantEmail"] }],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_create_mobile_participant_token",
          description:
            "Create or fetch a participant, then create a participant-scoped mobile SDK token via GrowSurf REST. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              email: { type: "string" },
              firstName: { type: "string" },
              lastName: { type: "string" },
              referredBy: { type: "string" },
              referralStatus: { type: "string", enum: ["CREDIT_PENDING", "CREDIT_AWARDED"] },
              ipAddress: { type: "string" },
              fingerprint: { type: "string" },
              mobileInstanceId: { type: "string" },
              metadata: { type: "object", additionalProperties: true },
            },
            required: ["email"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_participant_auth_hash",
          description: "Compute SHA-256 HMAC hash used for GrowSurf participant auto-auth (server-side helper).",
          inputSchema: {
            type: "object",
            properties: {
              email: { type: "string" },
              participantAuthSecret: { type: "string" },
            },
            required: ["email"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_webhook_normalize",
          description:
            "Validate/normalize a GrowSurf webhook payload and generate a best-effort idempotency key for dedupe.",
          inputSchema: {
            type: "object",
            properties: {
              payload: {},
            },
            required: ["payload"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_client_snippets",
          description:
            "Generate copy-pasteable client-side snippets for GrowSurf referral tracking, embeddable elements, and the GrowSurf Window (JS + CSS), with placement guidance for app UI work.",
          inputSchema: {
            type: "object",
            properties: {
              programType: { type: "string", enum: ["referral", "affiliate", "both"], default: "both" },
              participantAuthEnabled: { type: "boolean", default: false },
              referralTrigger: { type: "string", enum: ["signup", "signup_plus_qualifying_action"], default: "signup_plus_qualifying_action" },
              singlePageApp: { type: "boolean", default: false },
              includeEmbeddableElements: { type: "boolean", default: true },
              includeGrowSurfWindow: { type: "boolean", default: true },
              includeUnreadBadge: { type: "boolean", default: true },
              includeEventSubscriptions: { type: "boolean", default: false }
            },
            additionalProperties: false
          }
        },
        {
          name: "growsurf_embeddable_element_snippet",
          description: "Generate the HTML snippet for a GrowSurf embeddable element (with optional auth attributes).",
          inputSchema: {
            type: "object",
            properties: {
              element: {
                type: "string",
                enum: ["form", "invite", "rewards", "referral_status", "referral_summary", "affiliate_summary", "commissions", "payouts"]
              },
              withAuthAttributes: { type: "boolean", default: false },
              participant: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" }
                },
                required: ["email"],
                additionalProperties: false
              }
            },
            required: ["element"],
            additionalProperties: false
          }
        },
        {
          name: "growsurf_grsf_config_snippet",
          description:
            "Generate the <head> snippet for participant auto-auth using window.grsfConfig (place before the GrowSurf Universal Code).",
          inputSchema: {
            type: "object",
            properties: {
              useCampaignIdPlaceholder: { type: "boolean", default: true },
              campaignId: { type: "string" },
              enableParticipantAutoAuth: { type: "boolean", default: false },
              email: { type: "string" },
              hash: { type: "string" },
              includeAutoAuthCommentHeader: { type: "boolean", default: true }
            },
            required: [],
            additionalProperties: false
          }
        },
        {
          name: "growsurf_get_integration_connect_link",
          description:
            "Return a dashboard link that opens a specific integration's connect panel in the GrowSurf Program Editor (Options > Integrations). Use this whenever a user says they want to connect an integration, for example \"connect Stripe\", \"set up PayPal payouts\", \"send Tango Card gift cards\", or \"sync signups to Mailchimp\": call it with the `integration` key and give the user the returned `url` to open. Connecting an integration happens in the dashboard, not through the API. GrowSurf cannot link a Stripe, PayPal, or other account on the user's behalf, so hand them the link. `integration` must be one of the supported keys (some are camelCase, e.g. `constantContact`, `helpScout`). The link points at GROWSURF_CAMPAIGN_ID; pass `campaignId` to target a different program. Chargebee, Recurly, and Tango Card apply to referral programs only (they are hidden on affiliate programs).",
          inputSchema: {
            type: "object",
            properties: {
              integration: {
                type: "string",
                enum: [...INTEGRATION_KEYS],
                description:
                  "The integration to connect. Must exactly match one of the supported keys (some are camelCase, e.g. `constantContact`, `campaignMonitor`, `helpScout`, `pabblyConnect`, `baskHealth`).",
              },
              campaignId: {
                type: "string",
                description: "Target program for the link. Defaults to GROWSURF_CAMPAIGN_ID.",
              },
            },
            required: ["integration"],
            additionalProperties: false,
          },
        }
    ];
    // Inject the optional campaignId argument into every campaign-scoped tool so an agent can target
    // a program by id (for example one just returned by growsurf_create_campaign) without a server
    // restart. Keyless, account-level, and static tools are left untouched.
    for (const tool of tools) {
      if (!CAMPAIGN_SCOPED_TOOL_NAMES.has(tool.name)) continue;
      const inputSchema = tool.inputSchema as { properties?: Record<string, unknown> };
      inputSchema.properties = { ...(inputSchema.properties ?? {}), campaignId: CAMPAIGN_ID_JSON_PROP };
    }
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      // Optional per-call program override — an explicit `campaignId` tool argument wins over
      // GROWSURF_CAMPAIGN_ID (see resolveCampaignClient), so an agent can operate on a program it
      // just created without restarting the server. Tools that are not campaign-scoped ignore it.
      const toolArgs = (request.params.arguments ?? {}) as { campaignId?: string } & Record<string, unknown>;
      switch (request.params.name) {
        case "growsurf_integration_guide": {
          const input = integrationGuideInputSchema.parse(request.params.arguments ?? {});
          const text = renderIntegrationGuide(input, installKitEnv);
          return { content: [{ type: "text", text }] };
        }
        case "growsurf_mobile_sdk_guide": {
          const input = mobileSdkGuideInputSchema.parse(request.params.arguments ?? {});
          const text = renderMobileSdkGuide(input, { campaignId: env.GROWSURF_CAMPAIGN_ID });
          return { content: [{ type: "text", text }] };
        }
        case "growsurf_api_library_snippets": {
          const input = apiLibrarySnippetsInputSchema.parse(request.params.arguments ?? {});
          const text = renderApiLibrarySnippets(input, { campaignId: env.GROWSURF_CAMPAIGN_ID });
          return { content: [{ type: "text", text }] };
        }
        case "growsurf_get_campaign": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.getCampaign();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_create_campaign": {
          const growsurf = requireGrowSurfApiKey(env);
          const input = createCampaignSchema.parse(request.params.arguments ?? {});
          const body = omitUndefined({
            type: input.type,
            name: input.name,
            companyName: input.companyName,
            companyLogoImageUrl: input.companyLogoImageUrl,
            currencyISO: input.currencyISO,
            rewards: input.rewards,
          }) as Record<string, unknown>;
          const result = await growsurf.createCampaign(body);
          const newProgramId =
            result && typeof result === "object" && typeof (result as { id?: unknown }).id === "string"
              ? (result as { id: string }).id
              : undefined;
          const hint = newProgramId
            ? `\n\nNew program id: ${newProgramId}. Pass it as campaignId to the other tools (or set GROWSURF_CAMPAIGN_ID) to configure and operate this program.`
            : "";
          return { content: [{ type: "text", text: safeJson(result) + hint }] };
        }
        case "growsurf_update_campaign": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = updateCampaignSchema.parse(request.params.arguments ?? {});
          const fields = omitUndefined({
            name: input.name,
            companyName: input.companyName,
            companyLogoImageUrl: input.companyLogoImageUrl,
            status: input.status,
          }) as Record<string, unknown>;
          const result = await growsurf.updateCampaign(fields);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_clone_campaign": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.cloneCampaign();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_list_campaign_rewards": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.listCampaignRewards();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_create_campaign_reward": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = createCampaignRewardSchema.parse(request.params.arguments ?? {});
          const reward = omitUndefined({
            type: input.type,
            title: input.title,
            description: input.description,
            referralDescription: input.referralDescription,
            imageUrl: input.imageUrl,
            isVisible: input.isVisible,
            isUnlimited: input.isUnlimited,
            referredRewardUpfront: input.referredRewardUpfront,
            limit: input.limit,
            conversionsRequired: input.conversionsRequired,
            numberOfWinners: input.numberOfWinners,
            order: input.order,
            limitDuration: input.limitDuration,
            nextMilestonePrefix: input.nextMilestonePrefix,
            nextMilestoneSuffix: input.nextMilestoneSuffix,
            couponCode: input.couponCode,
            referralCouponCode: input.referralCouponCode,
            metadata: input.metadata,
            commissionStructure: input.commissionStructure,
            value: input.value,
            referredValue: input.referredValue,
          }) as Record<string, unknown>;
          const result = await growsurf.createCampaignReward(reward);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_update_campaign_reward": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = updateCampaignRewardSchema.parse(request.params.arguments ?? {});
          const { campaignRewardId, ...rest } = input;
          const fields = omitUndefined(rest) as Record<string, unknown>;
          const result = await growsurf.updateCampaignReward(campaignRewardId, fields);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_delete_campaign_reward": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = deleteCampaignRewardSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.deleteCampaignReward(input.campaignRewardId);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_get_campaign_design": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.getCampaignDesign();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_update_campaign_design": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = campaignConfigUpdateSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.updateCampaignDesign(input.fields);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_get_referral_flow_screenshots": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.getReferralFlowScreenshots();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_get_campaign_emails": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.getCampaignEmails();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_update_campaign_emails": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = campaignConfigUpdateSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.updateCampaignEmails(input.fields);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_get_campaign_options": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.getCampaignOptions();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_update_campaign_options": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = campaignConfigUpdateSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.updateCampaignOptions(input.fields);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_get_campaign_installation": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.getCampaignInstallation();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_update_campaign_installation": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = campaignConfigUpdateSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.updateCampaignInstallation(input.fields);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_create_account": {
          // Keyless exception: works without GROWSURF_API_KEY and returns a new key (locked
          // until the account's email is verified).
          const growsurf = getKeylessGrowSurfClient(env);
          const input = createAccountSchema.parse(request.params.arguments ?? {});
          const body = omitUndefined({
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            company: input.company,
          }) as Record<string, unknown>;
          const result = await growsurf.createAccount(body);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_get_account": {
          const growsurf = requireGrowSurfApiKey(env);
          const result = await growsurf.getAccount();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_update_account": {
          const growsurf = requireGrowSurfApiKey(env);
          const input = updateAccountSchema.parse(request.params.arguments ?? {});
          const fields = omitUndefined({
            firstName: input.firstName,
            lastName: input.lastName,
            company: input.company,
          }) as Record<string, unknown>;
          const result = await growsurf.updateAccount(fields);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_rotate_api_key": {
          const growsurf = requireGrowSurfApiKey(env);
          const result = await growsurf.rotateApiKey();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_request_account_verification": {
          const growsurf = requireGrowSurfApiKey(env);
          const result = await growsurf.requestAccountVerification();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_resend_verification_email": {
          const growsurf = requireGrowSurfApiKey(env);
          const result = await growsurf.resendVerificationEmail();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_get_campaign_analytics": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = getCampaignAnalyticsSchema.parse(request.params.arguments ?? {});
          const query = omitUndefined({
            interval: input.interval,
            include: input.include,
            days: input.days,
            startDate: input.startDate,
            endDate: input.endDate,
          }) as { interval?: string; include?: string; days?: number; startDate?: number; endDate?: number };
          const result = await growsurf.getCampaignAnalytics(query);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_list_campaign_webhooks": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.listWebhooks();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_create_campaign_webhook": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = createWebhookSchema.parse(request.params.arguments ?? {});
          const webhook = omitUndefined({
            payloadUrl: input.payloadUrl,
            events: input.events,
            secret: input.secret,
            isEnabled: input.isEnabled,
          }) as Record<string, unknown>;
          const result = await growsurf.createWebhook(webhook);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_update_campaign_webhook": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = updateWebhookSchema.parse(request.params.arguments ?? {});
          const { webhookId, ...rest } = input;
          const fields = omitUndefined(rest) as Record<string, unknown>;
          const result = await growsurf.updateWebhook(webhookId, fields);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_delete_campaign_webhook": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = deleteWebhookSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.deleteWebhook(input.webhookId);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_test_campaign_webhook": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = testWebhookSchema.parse(request.params.arguments ?? {});
          const body = omitUndefined({ event: input.event }) as Record<string, unknown>;
          const result = await growsurf.testWebhook(
            input.webhookId,
            Object.keys(body).length ? body : undefined,
          );
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_add_participant": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = addParticipantSchema.parse(request.params.arguments ?? {});
          if (input.metadata && Object.prototype.hasOwnProperty.call(input.metadata, "gdprAgreements")) {
            return {
              content: [
                {
                  type: "text",
                  text:
                    "Invalid metadata: 'gdprAgreements' is a restricted key. Pass GDPR agreements using the dedicated field (JS SDK) or remove it from metadata (REST).",
                },
              ],
              isError: true,
            };
          }
          const result = await growsurf.addParticipant(omitUndefined(input) as Parameters<GrowSurfClient["addParticipant"]>[0]);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_update_participant": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = updateParticipantSchema.parse(request.params.arguments ?? {});
          if (input.metadata && Object.prototype.hasOwnProperty.call(input.metadata, "gdprAgreements")) {
            return {
              content: [
                {
                  type: "text",
                  text:
                    "Invalid metadata: 'gdprAgreements' is a restricted key. Pass GDPR agreements using the dedicated field (JS SDK) or remove it from metadata (REST).",
                },
              ],
              isError: true,
            };
          }
          const { participantId, participantEmail, ...rest } = input;
          const fields = omitUndefined(rest) as Record<string, unknown>;
          const result = participantId
            ? await growsurf.updateParticipantById(participantId, fields)
            : await growsurf.updateParticipantByEmail(participantEmail!, fields);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_bulk_delete_participants": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = bulkDeleteParticipantsSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.bulkDeleteParticipants(input.participants);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_email_participant": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = emailParticipantSchema.parse(request.params.arguments ?? {});
          const body = omitUndefined({
            emailType: input.emailType,
            subject: input.subject,
            body: input.body,
            preheader: input.preheader,
          }) as Record<string, unknown>;
          const result = input.participantId
            ? await growsurf.emailParticipantById(input.participantId, body)
            : await growsurf.emailParticipantByEmail(input.participantEmail!, body);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_get_participant_analytics": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = getParticipantAnalyticsSchema.parse(request.params.arguments ?? {});
          const query = omitUndefined({
            include: input.include,
            interval: input.interval,
            days: input.days,
            startDate: input.startDate,
            endDate: input.endDate,
          }) as { include?: string; interval?: string; days?: number; startDate?: number; endDate?: number };
          const result = input.participantId
            ? await growsurf.getParticipantAnalyticsById(input.participantId, query)
            : await growsurf.getParticipantAnalyticsByEmail(input.participantEmail!, query);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_get_participant_activity_logs": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = getParticipantActivityLogsSchema.parse(request.params.arguments ?? {});
          const query = omitUndefined({ limit: input.limit, offset: input.offset }) as {
            limit?: number;
            offset?: number;
          };
          const result = input.participantId
            ? await growsurf.listParticipantActivityLogsById(input.participantId, query)
            : await growsurf.listParticipantActivityLogsByEmail(input.participantEmail!, query);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_trigger_referral": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = triggerReferralSchema.parse(request.params.arguments ?? {});
          const result = input.participantId
            ? await growsurf.triggerReferralByParticipantId(input.participantId, input.delayInDays)
            : await growsurf.triggerReferralByParticipantEmail(input.participantEmail!, input.delayInDays);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_cancel_delayed_referral": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = cancelDelayedReferralSchema.parse(request.params.arguments ?? {});
          const result = input.participantId
            ? await growsurf.cancelDelayedReferralByParticipantId(input.participantId)
            : await growsurf.cancelDelayedReferralByParticipantEmail(input.participantEmail!);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_record_sale": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = recordSaleSchema.parse(request.params.arguments ?? {});
          const sale = omitUndefined({
            currency: input.currency,
            grossAmount: input.grossAmount,
            invoiceId: input.invoiceId,
            chargeId: input.chargeId,
            paymentIntentId: input.paymentIntentId,
            transactionId: input.transactionId,
            externalId: input.externalId,
            orderId: input.orderId,
            paymentId: input.paymentId,
            customerId: input.customerId,
            subscriptionId: input.subscriptionId,
            netAmount: input.netAmount,
            taxAmount: input.taxAmount,
            amountCashNet: input.amountCashNet,
            amountPaid: input.amountPaid,
            paidAt: input.paidAt,
            description: input.description,
          }) as Record<string, unknown>;
          const result = input.participantId
            ? await growsurf.recordSaleByParticipantId(input.participantId, sale)
            : await growsurf.recordSaleByParticipantEmail(input.participantEmail!, sale);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_refund_transaction": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = refundTransactionSchema.parse(request.params.arguments ?? {});
          const amendment = omitUndefined({
            amendmentType: input.amendmentType,
            amountRefunded: input.amountRefunded,
            amount: input.amount,
            refundId: input.refundId,
            refundStatus: input.refundStatus,
            refundAmount: input.refundAmount,
            currency: input.currency,
            invoiceId: input.invoiceId,
            chargeId: input.chargeId,
            paymentIntentId: input.paymentIntentId,
            transactionId: input.transactionId,
            externalId: input.externalId,
            orderId: input.orderId,
            paymentId: input.paymentId,
            description: input.description,
          }) as Record<string, unknown>;
          const result = input.participantId
            ? await growsurf.refundTransactionByParticipantId(input.participantId, amendment)
            : await growsurf.refundTransactionByParticipantEmail(input.participantEmail!, amendment);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_create_mobile_participant_token": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = createMobileParticipantTokenSchema.parse(request.params.arguments ?? {});
          if (input.metadata && Object.prototype.hasOwnProperty.call(input.metadata, "gdprAgreements")) {
            return {
              content: [
                {
                  type: "text",
                  text:
                    "Invalid metadata: 'gdprAgreements' is a restricted key. Pass GDPR agreements using the dedicated field (JS SDK) or remove it from metadata (REST).",
                },
              ],
              isError: true,
            };
          }
          const result = await growsurf.createMobileParticipantToken(
            omitUndefined(input) as Parameters<GrowSurfClient["createMobileParticipantToken"]>[0],
          );
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_participant_auth_hash": {
          const input = participantAuthHashSchema.parse(request.params.arguments ?? {});
          const secret = input.participantAuthSecret ?? env.GROWSURF_PARTICIPANT_AUTH_SECRET;
          if (!secret) {
            return {
              content: [
                {
                  type: "text",
                  text:
                    "Missing participantAuthSecret. Provide it in the tool args or set GROWSURF_PARTICIPANT_AUTH_SECRET.",
                },
              ],
              isError: true,
            };
          }
          const hash = computeParticipantAuthHash({ email: input.email, participantAuthSecret: secret });
          return { content: [{ type: "text", text: hash }] };
        }
        case "growsurf_webhook_normalize": {
          const input = webhookNormalizeSchema.parse(request.params.arguments ?? {});
          const normalized = normalizeWebhook(input.payload);
          return { content: [{ type: "text", text: safeJson(normalized) }] };
        }
        case "growsurf_client_snippets": {
          const input = clientSnippetsSchema.parse(request.params.arguments ?? {});
          const text = renderClientSnippets(input, installKitEnv);
          return { content: [{ type: "text", text }] };
        }
        case "growsurf_embeddable_element_snippet": {
          const input = embeddableElementSchema.parse(request.params.arguments ?? {});
          const text = renderEmbeddableElementSnippet(input);
          return { content: [{ type: "text", text }] };
        }
        case "growsurf_grsf_config_snippet": {
          const input = grsfConfigSnippetSchema.parse(request.params.arguments ?? {});
          const text = renderGrsfConfigSnippet(input, installKitEnv);
          return { content: [{ type: "text", text }] };
        }
        case "growsurf_get_integration_connect_link": {
          const input = integrationConnectLinkSchema.parse(request.params.arguments ?? {});
          const campaignId = input.campaignId ?? env.GROWSURF_CAMPAIGN_ID;
          if (!campaignId) {
            return {
              content: [
                {
                  type: "text",
                  text: "Missing program id. Set GROWSURF_CAMPAIGN_ID or pass campaignId so the link points at your program.",
                },
              ],
              isError: true,
            };
          }
          const integration = getIntegration(input.integration);
          if (!integration) {
            return {
              content: [{ type: "text", text: `Unknown integration: ${input.integration}` }],
              isError: true,
            };
          }
          const result = {
            integration: integration.key,
            label: integration.label,
            category: integration.category,
            referralOnly: integration.referralOnly ?? false,
            url: buildIntegrationConnectUrl(campaignId, integration.key),
            note: `Open this link and connect ${integration.label} from the Program Editor. Connecting an integration happens in the GrowSurf dashboard, not through the API.`,
          };
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        default:
          return { content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }], isError: true };
      }
    } catch (err) {
      return { content: [{ type: "text", text: toToolErrorText(err) }], isError: true };
    }
  });

  return server;
};

const main = async () => {
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const server = createGrowSurfMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

const isCliEntrypoint = async (): Promise<boolean> => {
  if (typeof process === "undefined") return false;
  const entrypoint = process.argv[1];
  const moduleUrl = import.meta.url;
  if (!entrypoint || typeof moduleUrl !== "string" || !moduleUrl) return false;

  const { fileURLToPath } = await import("node:url");
  return fileURLToPath(moduleUrl) === entrypoint;
};

if (await isCliEntrypoint()) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
