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

export const GROWSURF_MCP_VERSION = "0.13.0";
import { apiLibrarySnippetsInputSchema, renderApiLibrarySnippets } from "./growsurf/apiLibrarySnippets.js";
import { resolveCampaignClient } from "./growsurf/campaignScope.js";
import { GrowSurfClient } from "./growsurf/client.js";
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
import { TOOL_OUTPUT_SCHEMAS, type ToolOutputSchema } from "./growsurf/outputSchemas.js";
import { computeParticipantAuthHash } from "./growsurf/participantAuth.js";
import { PAYOUT_DESTINATION_PROVIDER_INPUTS } from "./growsurf/payoutProviders.js";
import {
  agentProgramCreationEvalInputSchema,
  renderAgentProgramCreationEval,
} from "./growsurf/programCreationEval.js";
import { PUBLIC_GROWSURF_RESOURCES, readPublicGrowSurfResource } from "./growsurf/resources.js";
import { normalizeWebhook } from "./growsurf/webhooks.js";
import { getGrowSurfPrompt, listGrowSurfPrompts } from "./prompts.js";
import { toToolErrorText } from "./toolError.js";
import {
  filterToolsForCredential,
  withToolAuthorizationMetadata,
  type ResolveVerifiedCredentialContext,
} from "./toolAuthorization.js";

export {
  CREDENTIAL_TYPES,
  filterToolsForCredential,
  HOSTED_MCP_REQUESTED_SCOPES,
  MACHINE_SCOPES,
  TOOL_AUTHORIZATION_MANIFEST,
  TOOL_RISK_META_KEY,
  TOOL_RISK_TIERS,
  withToolAuthorizationMetadata,
  type CredentialType,
  type MachineScope,
  type ResolveVerifiedCredentialContext,
  type ToolAuthorizationRequirement,
  type ToolRiskTier,
  type VerifiedCredentialContext,
} from "./toolAuthorization.js";

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
  GROWSURF_UPLOAD_ALLOWED_ORIGINS: optionalNonEmptyString(),
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
    uploadAllowedOrigins: env.GROWSURF_UPLOAD_ALLOWED_ORIGINS,
  });
};

// Listing/creating campaigns (`GET/POST /campaigns`) has no campaign id, so those only need the API key.
// Team reads/writes and verification are also key-only.
const requireGrowSurfApiKey = (env: Env): GrowSurfClient => {
  if (!env.GROWSURF_API_KEY) {
    throw new Error("Missing GrowSurf REST credentials. Set GROWSURF_API_KEY to use this tool.");
  }
  return new GrowSurfClient({
    apiKey: env.GROWSURF_API_KEY,
    campaignId: env.GROWSURF_CAMPAIGN_ID ?? "",
    ...(env.GROWSURF_API_BASE_URL ? { baseUrl: env.GROWSURF_API_BASE_URL } : {}),
    uploadAllowedOrigins: env.GROWSURF_UPLOAD_ALLOWED_ORIGINS,
  });
};

// Creating an account (POST /accounts) is the one unauthenticated endpoint — it RETURNS a new API
// key, so it must work even when no GROWSURF_API_KEY is configured (the keyless exception).
const getKeylessGrowSurfClient = (env: Env): GrowSurfClient =>
  new GrowSurfClient({
    apiKey: env.GROWSURF_API_KEY,
    campaignId: env.GROWSURF_CAMPAIGN_ID ?? "",
    ...(env.GROWSURF_API_BASE_URL ? { baseUrl: env.GROWSURF_API_BASE_URL } : {}),
    uploadAllowedOrigins: env.GROWSURF_UPLOAD_ALLOWED_ORIGINS,
  });

// The campaign-scoped tools: every tool that operates on a single program (campaign). Each accepts
// an optional `campaignId` argument that overrides GROWSURF_CAMPAIGN_ID (resolved per call via
// resolveCampaignClient), so an agent can create a program and immediately operate on the returned
// id. The tool-catalog builder below injects the shared campaignId input-schema property into exactly
// these tools, and each handler resolves its client with resolveCampaignClient(env, toolArgs).
// Team-level, keyless, and static guidance tools are intentionally excluded, as are the tools
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
  "growsurf_list_program_resources",
  "growsurf_prepare_program_resource_file",
  "growsurf_create_program_resource",
  "growsurf_update_program_resource",
  "growsurf_delete_program_resource",
  "growsurf_get_campaign_design",
  "growsurf_update_campaign_design",
  "growsurf_get_campaign_emails",
  "growsurf_update_campaign_emails",
  "growsurf_get_campaign_options",
  "growsurf_update_campaign_options",
  "growsurf_get_campaign_installation",
  "growsurf_update_campaign_installation",
  "growsurf_capture_referral_flow_screenshots",
  "growsurf_get_campaign_analytics",
  "growsurf_get_campaign_activation_analytics",
  "growsurf_list_campaign_webhooks",
  "growsurf_create_campaign_webhook",
  "growsurf_update_campaign_webhook",
  "growsurf_delete_campaign_webhook",
  "growsurf_test_campaign_webhook",
  "growsurf_list_participants",
  "growsurf_get_participant",
  "growsurf_add_participant",
  "growsurf_update_participant",
  "growsurf_bulk_delete_participants",
  "growsurf_email_participant",
  "growsurf_get_participant_analytics",
  "growsurf_get_participant_activity_logs",
  "growsurf_trigger_referral",
  "growsurf_cancel_delayed_referral",
  "growsurf_get_participant_payout_destination",
  "growsurf_request_participant_payout_destination_confirmation",
  "growsurf_record_sale",
  "growsurf_refund_transaction",
  "growsurf_create_mobile_participant_token",
]);

// Sent to the client at connection time, so these rules apply to any call of these tools, not only
// to the sessions that started from a GrowSurf prompt. Keep it short: it is read on every session.
const GROWSURF_SERVER_INSTRUCTIONS = [
  "GrowSurf runs a customer's live referral or affiliate program. The settings you write are what",
  "their participants see, and the reward amounts you write are what the customer pays out.",
  "",
  "Before creating a program, resolve these with the person, asking at most two short questions and",
  "skipping anything they already told you:",
  "",
  "- What the program is for, so share settings match the audience. Pass it as `goal` on",
  "  `growsurf_create_campaign`.",
  "- The incentive, and who funds and fulfills it.",
  "",
  "Never choose a reward or commission amount yourself. If the person has not named one, omit",
  "`rewards` from `growsurf_create_campaign`. The program is then created with GrowSurf's starter",
  "rewards switched off, so it awards nothing until they decide the amount and turn one on. Say that,",
  "rather than reporting an amount you picked.",
  "",
  "Read a configuration tab before you patch it, and change only what the request calls for. Treat",
  "an existing value the customer already set, such as the program's Share URL, as theirs: to make",
  "GrowSurf work on another origin, add that origin to `allowedUrls` instead of replacing the Share",
  "URL, and ask before changing one that is already set.",
].join("\n");

// Shared JSON-schema property injected into every campaign-scoped tool's input schema (see the
// tool-catalog builder). Keeping it in one place means the campaign-scoped tool schemas cannot drift.
const CAMPAIGN_ID_JSON_PROP = {
  type: "string",
  description:
    "Target program (campaign) id for this call. Defaults to GROWSURF_CAMPAIGN_ID when omitted. Pass the `id` returned by growsurf_create_campaign to configure or operate a program you just created, without restarting the server.",
} as const;

// Keep JSON text compact to reduce serialized MCP payload size while preserving valid JSON.
const safeJson = (value: unknown): string => JSON.stringify(value);

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
};

// Build the result for a tool that returns JSON: the serialized text block (kept for clients that
// only read text) plus `structuredContent`, which must accompany every success result once a tool
// declares an output schema. Non-object results fall back to text only.
const jsonToolResult = (result: unknown, appendText = ""): ToolResult => {
  const content = [{ type: "text" as const, text: safeJson(result) + appendText }];
  if (result && typeof result === "object" && !Array.isArray(result)) {
    return { content, structuredContent: result as Record<string, unknown> };
  }
  return { content };
};

// Build the result for a tool whose output is a markdown document. The text block stays the raw
// markdown, which is what a reader and a model want to see, and the same document is repeated in
// `structuredContent` to satisfy the tool's advertised output schema.
const markdownToolResult = (markdown: string): ToolResult => ({
  content: [{ type: "text", text: markdown }],
  structuredContent: { markdown },
});

// Returns an explanation when a patch would replace a Share URL the customer already set, and
// undefined when the patch is safe to send. Every referral link already handed out points at the
// current Share URL, so overwriting one to reach a different origin breaks live links; adding that
// origin to `allowedUrls` is what the caller almost always wanted.
const findShareUrlConflict = async (
  growsurf: GrowSurfClient,
  fields: Record<string, unknown>,
): Promise<string | undefined> => {
  const nextShareUrl = fields.shareUrl;
  if (typeof nextShareUrl !== "string") return undefined;

  // The guard is a safety net over a reversible setting, not an authorization boundary, so it fails
  // open. Reading the tab needs `program:read` while patching it needs only `program:write`, and a
  // caller holding just the write scope must not lose an update it was always allowed to make.
  let current: unknown;
  try {
    current = await growsurf.getCampaignInstallation();
  } catch {
    return undefined;
  }
  const currentShareUrl = current && typeof current === "object"
    ? (current as { shareUrl?: unknown }).shareUrl
    : undefined;
  if (typeof currentShareUrl !== "string" || currentShareUrl.trim() === "") return undefined;
  if (currentShareUrl.trim() === nextShareUrl.trim()) return undefined;

  return [
    `This program's Share URL is already set to ${currentShareUrl}, and the patch would replace it with ${nextShareUrl}.`,
    "",
    "Every referral link already shared points at the current Share URL, so replacing it sends those",
    "visitors somewhere else. To let GrowSurf run on another origin, such as a development server, add",
    "that origin to `allowedUrls` and leave `shareUrl` out of the patch.",
    "",
    "If the customer does want the landing page changed, confirm it with them and send the same patch",
    "again with `replaceExistingShareUrl: true`.",
  ].join("\n");
};

const omitUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  return Object.fromEntries(entries) as Partial<T>;
};

// The optional profile and attribution fields accept an empty string, because the REST endpoint does
// and `growsurf_update_participant` does. A caller clearing a field, or passing through a form value
// the person left blank, sends `""`; rejecting it here would fail a request REST accepts.
const addParticipantSchema = z.object({
  email: z.string().min(3),
  isAffiliate: z.boolean().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  referredBy: z.string().optional(),
  referralStatus: z.enum(["CREDIT_PENDING", "CREDIT_AWARDED"]).optional(),
  ipAddress: z.string().optional(),
  fingerprint: z.string().optional(),
  mobileInstanceId: z.string().optional(),
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

const PARTICIPANT_IDENTIFIER_JSON_REQUIREMENT = {
  anyOf: [{ required: ["participantId"] }, { required: ["participantEmail"] }],
};

const TRANSACTION_IDENTIFIER_JSON_REQUIREMENT = {
  anyOf: [
    { required: ["externalId"] },
    { required: ["transactionId"] },
    { required: ["orderId"] },
    { required: ["paymentId"] },
    { required: ["invoiceId"] },
    { required: ["paymentIntentId"] },
    { required: ["chargeId"] },
  ],
};

const recordSaleSchema = z
  .object({
    participantId: z.string().min(1).optional(),
    participantEmail: z.string().min(3).optional(),
    currency: z.string().length(3).regex(/^[A-Za-z]{3}$/),
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
    netAmount: z.number().int().nonnegative().optional(),
    taxAmount: z.number().int().nonnegative().optional(),
    amountCashNet: z.number().int().nonnegative().optional(),
    amountPaid: z.number().int().nonnegative().optional(),
    invoiceTotal: z.number().int().nonnegative().optional(),
    invoiceTotalExcludingTax: z.number().int().nonnegative().optional(),
    invoiceSubtotalExcludingTax: z.number().int().nonnegative().optional(),
    totalTaxAmount: z.number().int().nonnegative().optional(),
    totalTaxAmounts: z.array(z.record(z.string(), z.unknown())).optional(),
    totalTaxes: z.array(z.record(z.string(), z.unknown())).optional(),
    paidAt: z.number().int().nonnegative().optional(),
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
// What the program is for. Same list the GrowSurf dashboard offers when someone creates a program,
// and it seeds the share settings that suit that audience (see the tool description). Chosen once,
// at create: the update endpoint does not accept it.
const CAMPAIGN_GOALS = [
  "CUSTOMERS",
  "USERS",
  "SUBSCRIBERS",
  "WAITLIST",
  "B2B_SAAS_SELF_SERVICE",
  "B2B_SAAS_ENTERPRISE",
  "B2C_SUBSCRIPTIONS",
  "FINANCIAL_SERVICES",
  "ONLINE_EDUCATION",
  "ONLINE_INSURANCE",
] as const;

const createCampaignSchema = z.object({
  type: z.enum(["REFERRAL", "AFFILIATE"]),
  name: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  companyLogoImageUrl: z.string().min(1).optional(),
  currencyISO: z.string().min(3).max(3).optional(),
  goal: z.enum(CAMPAIGN_GOALS).optional(),
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
    // deletedAt on a live campaign). Matches the public API's accepted status transitions.
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

// The Installation tab is the one config tab that carries a value a caller can silently destroy: the
// Share URL is where every referral link already in the wild points. `replaceExistingShareUrl` makes
// replacing one that is already set an explicit act, so adding a development origin cannot take the
// live landing page with it.
const campaignInstallationUpdateSchema = campaignConfigUpdateSchema.extend({
  replaceExistingShareUrl: z.boolean().optional(),
});

// Tax valuation settings shared by the reward `value` and `referredValue` fields
// (openapi RewardTaxValuation). For configurable non-commission rewards, a null `taxCharacter`
// inherits the program's confirmed treatment; Commission always uses `NONEMPLOYEE_SERVICES`.
const rewardTaxValuationSchema = z.object({
  fairMarketValueUSD: z.number().min(0).max(90071992547409.9).nullable().optional(),
  taxCharacter: z
    .enum([
      "NONEMPLOYEE_SERVICES",
      "PRIZE_OR_AWARD",
      "PURCHASE_REBATE",
      "OTHER_INCOME",
      "REVIEW_REQUIRED",
    ])
    .nullable()
    .optional(),
}).strict();

// Affiliate commission structure (openapi CommissionStructure) — a CLOSED object. The API rejects
// unknown keys, so the MCP mirrors that exact shape instead of advertising an open `{[key]: any}`
// dictionary. Provide `amount` (+ optional `amountISO`) for a FIXED commission, or `percent` for a
// PERCENT commission; the remaining fields tune hold/duration, caps, and the intro rate.
const COMMISSION_MINOR_UNITS_DESCRIPTION =
  "Amount in minor currency units (the currency's smallest denomination). For USD, $100.00 is `10000`.";

const commissionStructureSchema = z
  .object({
    type: z.enum(["PERCENT", "FIXED"]).optional(),
    event: z.enum(["CLICK", "LEAD", "SALE"]).optional(),
    amount: z.number().int().min(1).nullable().optional().describe(COMMISSION_MINOR_UNITS_DESCRIPTION),
    amountISO: z.string().nullable().optional(),
    percent: z.number().nullable().optional(),
    minPaidReferrals: z.number().int().min(1).optional(),
    holdDuration: z.number().int().optional(),
    duration: z.enum(["FOREVER", "REPEATING", "ONCE"]).optional(),
    durationInMonths: z.number().int().nullable().optional(),
    approvalRequired: z.boolean().optional(),
    hasMaxAmount: z.boolean().optional(),
    maxAmount: z.number().int().nullable().optional().describe(COMMISSION_MINOR_UNITS_DESCRIPTION),
    maxAmountISO: z.string().nullable().optional(),
    hasIntro: z.boolean().optional(),
    introType: z.enum(["PERCENT", "FIXED"]).nullable().optional(),
    introPercent: z.number().nullable().optional(),
    introAmount: z.number().int().nullable().optional().describe(COMMISSION_MINOR_UNITS_DESCRIPTION),
    introAmountISO: z.string().nullable().optional(),
    introDuration: z.enum(["REPEATING", "ONCE"]).nullable().optional(),
    introDurationInMonths: z.number().int().nullable().optional(),
  })
  .strict()
  .superRefine((commissionStructure, context) => {
    const isFixedEvent = ["CLICK", "LEAD"].includes(commissionStructure.event ?? "");
    if (!isFixedEvent) return;

    if (commissionStructure.type === "PERCENT") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: "CLICK and LEAD commissions must use FIXED.",
      });
    }
    if (typeof commissionStructure.amount !== "number") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "CLICK and LEAD commissions require a positive fixed amount.",
      });
    }
  });

// JSON-schema mirror of commissionStructureSchema for the MCP tool input contract (closed object).
const commissionStructureJsonSchema = {
  type: "object",
  description:
    "Affiliate commission structure (AFFILIATE rewards only). Provide a positive `amount` (+ optional `amountISO`) for a FIXED commission, or `percent` for a PERCENT commission. CLICK and LEAD commissions must use FIXED.",
  properties: {
    type: { type: "string", enum: ["PERCENT", "FIXED"] },
    event: {
      type: "string",
      enum: ["CLICK", "LEAD", "SALE"],
      description: "The affiliate event that earns the commission. `CLICK` and `LEAD` must use `FIXED`.",
    },
    amount: { type: ["integer", "null"], minimum: 1, description: COMMISSION_MINOR_UNITS_DESCRIPTION },
    amountISO: { type: ["string", "null"] },
    percent: { type: ["number", "null"] },
    minPaidReferrals: { type: "integer", minimum: 1 },
    holdDuration: { type: "integer" },
    duration: { type: "string", enum: ["FOREVER", "REPEATING", "ONCE"] },
    durationInMonths: { type: ["integer", "null"] },
    approvalRequired: { type: "boolean" },
    hasMaxAmount: { type: "boolean" },
    maxAmount: { type: ["integer", "null"], description: COMMISSION_MINOR_UNITS_DESCRIPTION },
    maxAmountISO: { type: ["string", "null"] },
    hasIntro: { type: "boolean" },
    introType: { type: ["string", "null"] },
    introPercent: { type: ["number", "null"] },
    introAmount: { type: ["integer", "null"], description: COMMISSION_MINOR_UNITS_DESCRIPTION },
    introAmountISO: { type: ["string", "null"] },
    introDuration: { type: ["string", "null"] },
    introDurationInMonths: { type: ["integer", "null"] },
  },
  allOf: [
    {
      if: {
        properties: { event: { enum: ["CLICK", "LEAD"] } },
        required: ["event"],
      },
      then: {
        properties: {
          type: { enum: ["FIXED"] },
          amount: { type: "integer", minimum: 1 },
        },
        required: ["amount"],
      },
    },
  ],
  additionalProperties: false,
} as const;

// Writable fields shared by the create and update campaign-reward tools.
const rewardWritableFields = {
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  event: z.enum(["LEAD", "CONVERSION"]).optional(),
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

const programResourceCommonFields = {
  campaignId: z.string().min(1).optional(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  isPublished: z.boolean().optional(),
};

const PROGRAM_RESOURCE_MAX_FILE_BYTES = 10 * 1024 * 1024;
const PROGRAM_RESOURCE_MAX_BASE64_LENGTH = 4 * Math.ceil(PROGRAM_RESOURCE_MAX_FILE_BYTES / 3);
const PROGRAM_RESOURCE_MIME_BY_EXTENSION = {
  jpg: ["image/jpeg", "image/jpg"],
  jpeg: ["image/jpeg", "image/jpg"],
  png: ["image/png"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  pdf: ["application/pdf"],
  csv: ["text/csv", "application/csv", "text/plain"],
  zip: ["application/zip", "application/x-zip-compressed"],
  doc: ["application/msword", "application/x-ole-storage"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel", "application/x-ole-storage"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ppt: ["application/vnd.ms-powerpoint", "application/x-ole-storage"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
} as const;

/** Validates base64 structure without a repeated-group regex that can overflow on 10 MB input. */
const isStructurallyValidProgramResourceBase64 = (value: string): boolean => {
  if (value.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(value)) return false;
  const firstPadding = value.indexOf("=");
  if (firstPadding === -1) return true;
  const paddingLength = value.length - firstPadding;
  return paddingLength <= 2 && value.endsWith("=".repeat(paddingLength));
};

const prepareProgramResourceFileSchema = z.object({
  fileName: z.string().min(1).max(120),
  mimeType: z.string().min(1),
  fileBase64: z.string().min(4).max(PROGRAM_RESOURCE_MAX_BASE64_LENGTH).refine(
    isStructurallyValidProgramResourceBase64,
    "fileBase64 must contain valid padded base64 bytes without a data-URL prefix or whitespace.",
  ),
  campaignId: z.string().min(1).optional(),
}).strict().superRefine((input, ctx) => {
  if (
    input.fileName !== input.fileName.trim() ||
    /[\\/\u0000-\u001f\u007f]/.test(input.fileName) ||
    input.fileName === "." || input.fileName === ".."
  ) {
    ctx.addIssue({ code: "custom", path: ["fileName"], message: "fileName must be a safe base name." });
    return;
  }
  const extension = input.fileName.includes(".") ? input.fileName.split(".").pop()!.toLowerCase() : "";
  const allowedMimes = PROGRAM_RESOURCE_MIME_BY_EXTENSION[
    extension as keyof typeof PROGRAM_RESOURCE_MIME_BY_EXTENSION
  ];
  if (!allowedMimes || !(allowedMimes as readonly string[]).includes(input.mimeType)) {
    ctx.addIssue({
      code: "custom",
      path: ["mimeType"],
      message: "mimeType must match a supported file extension.",
    });
  }
});

const programResourceUploadResultSchema = z.object({
  asset_id: z.string().min(1).optional(),
  public_id: z.string().min(1),
  version: z.number().int().positive(),
  signature: z.string().min(1),
  resource_type: z.enum(["image", "raw"]),
  type: z.literal("authenticated"),
  bytes: z.number().int().positive().max(10 * 1024 * 1024),
  secure_url: z.string().url().refine((value) => value.startsWith("https://"), "URL must use HTTPS"),
  format: z.string().min(1).optional(),
}).passthrough();

const createProgramResourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("FILE"),
    ...programResourceCommonFields,
    uploadTicket: z.string().min(20),
    uploadResult: programResourceUploadResultSchema,
  }).strict(),
  z.object({
    type: z.literal("LINK"),
    ...programResourceCommonFields,
    url: z.string().url().max(2048).refine((value) => value.startsWith("https://"), "URL must use HTTPS"),
  }).strict(),
  z.object({
    type: z.literal("TEXT"),
    ...programResourceCommonFields,
    text: z.string().min(1).max(5000),
  }).strict(),
]);

const updateProgramResourceSchema = z.object({
  resourceId: z.string().min(1),
  campaignId: z.string().min(1).optional(),
  type: z.enum(["FILE", "LINK", "TEXT"]).optional(),
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  isPublished: z.boolean().optional(),
  position: z.number().int().min(0).max(99).optional(),
  uploadTicket: z.string().min(20).optional(),
  uploadResult: programResourceUploadResultSchema.optional(),
  url: z.string().url().max(2048).refine((value) => value.startsWith("https://"), "URL must use HTTPS").optional(),
  text: z.string().min(1).max(5000).optional(),
}).strict().superRefine((input, ctx) => {
  if (Object.keys(input).every((key) => key === "resourceId" || key === "campaignId")) {
    ctx.addIssue({ code: "custom", message: "Send at least one Resource field to update." });
  }
  if ((input.uploadTicket === undefined) !== (input.uploadResult === undefined)) {
    ctx.addIssue({
      code: "custom",
      message: "`uploadTicket` and `uploadResult` must be supplied together.",
      path: input.uploadTicket === undefined ? ["uploadTicket"] : ["uploadResult"],
    });
  }
  const suppliedContentTypes = [
    input.url === undefined ? undefined : "LINK",
    input.text === undefined ? undefined : "TEXT",
    input.uploadTicket === undefined && input.uploadResult === undefined ? undefined : "FILE",
  ].filter((value): value is "FILE" | "LINK" | "TEXT" => value !== undefined);
  if (suppliedContentTypes.length > 1) {
    ctx.addIssue({ code: "custom", message: "Send content fields for only one Resource type." });
  }
  if (input.type && suppliedContentTypes.some((contentType) => contentType !== input.type)) {
    ctx.addIssue({
      code: "custom",
      message: "Content fields must match the selected Resource type.",
      path: ["type"],
    });
  }
});

const deleteProgramResourceSchema = z.object({
  resourceId: z.string().min(1),
});

const createMobileParticipantTokenSchema = addParticipantSchema;

const participantAuthHashSchema = z.object({
  email: z.string().min(3),
  participantAuthSecret: z.string().min(1).optional(),
  affiliateJoin: z.boolean().default(false),
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

// ---- Account onboarding and Team tools ----

const createAccountSchema = z.object({
  email: z.string().min(3),
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  company: z.string().min(1).max(255).optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(255),
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
  // Modeled as a free string like the OpenAPI `include` param so additive server values do not
  // require an MCP release solely to pass through the new token.
  include: z.string().optional(),
  days: z.number().int().min(1).max(1825).optional(),
  startDate: z.number().int().optional(),
  endDate: z.number().int().optional(),
  timezone: z.string().min(1).optional(),
  platform: z.enum(["ALL", "WEB", "IOS", "ANDROID"]).optional(),
});

const getCampaignActivationAnalyticsSchema = z
  .object({
    cohortFrom: z.number().int().optional(),
    cohortTo: z.number().int().optional(),
    cohortInterval: z.enum(["day", "week", "month"]).optional(),
    observationWindowDays: z.union([z.literal(7), z.literal(30)]).optional(),
    timezone: z.string().min(1).optional(),
  })
  .superRefine((input, ctx) => {
    if ((input.cohortFrom === undefined) !== (input.cohortTo === undefined)) {
      ctx.addIssue({
        code: "custom",
        message: "Provide both cohortFrom and cohortTo, or omit both.",
        path: input.cohortFrom === undefined ? ["cohortFrom"] : ["cohortTo"],
      });
    }
    if (input.cohortFrom !== undefined && input.cohortTo !== undefined && input.cohortTo <= input.cohortFrom) {
      ctx.addIssue({
        code: "custom",
        message: "cohortTo must be greater than cohortFrom.",
        path: ["cohortTo"],
      });
    }
  });

// ---- Participant email / analytics / activity-log / update tools ----

const listParticipantsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  nextId: z.string().min(1).optional(),
});

// The participant is addressed by GrowSurf participant ID OR email (identical path parameter),
// mirroring the existing trigger/record participant tools. Shared identity fields + refine.
const participantIdentityFields = {
  participantId: z.string().min(1).optional(),
  participantEmail: z.string().min(3).optional(),
};
const hasParticipantIdentity = (v: { participantId?: string | undefined; participantEmail?: string | undefined }) =>
  Boolean(v.participantId) || Boolean(v.participantEmail);
const PARTICIPANT_IDENTITY_HINT = "Provide participantId or participantEmail.";

const getParticipantSchema = z.object({ ...participantIdentityFields }).refine(hasParticipantIdentity, {
  message: PARTICIPANT_IDENTITY_HINT,
});

const emailParticipantSchema = z
  .object({
    ...participantIdentityFields,
    emailType: z.string().min(1).optional(),
    subject: z.string().max(255).optional(),
    body: z.string().min(1).optional(),
    preheader: z.string().optional(),
  })
  .refine(hasParticipantIdentity, { message: PARTICIPANT_IDENTITY_HINT })
  .refine(
    (v) =>
      (Boolean(v.emailType) && !Boolean(v.subject) && !Boolean(v.body)) ||
      (!Boolean(v.emailType) && Boolean(v.subject) && Boolean(v.body)),
    {
      message: "Provide either emailType (template mode) or both subject and body (free-form mode).",
    },
  );

const getParticipantAnalyticsSchema = z
  .object({
    ...participantIdentityFields,
    // Keep this open so new server-supported include tokens do not require an MCP release.
    include: z.string().min(1).optional(),
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

const getParticipantPayoutDestinationSchema = z
  .object({
    ...participantIdentityFields,
  })
  .refine(hasParticipantIdentity, { message: PARTICIPANT_IDENTITY_HINT });

const requestParticipantPayoutDestinationConfirmationSchema = z
  .object({
    ...participantIdentityFields,
    provider: z.enum(PAYOUT_DESTINATION_PROVIDER_INPUTS),
  })
  .refine(hasParticipantIdentity, { message: PARTICIPANT_IDENTITY_HINT });

const updateParticipantSchema = z
  .object({
    ...participantIdentityFields,
    affiliateStatus: z.enum(["APPROVED", "SUSPENDED", "BANNED"]).optional(),
    referredBy: z.string().max(100).optional(),
    email: z.string().min(3).optional(),
    firstName: z.string().max(255).optional(),
    lastName: z.string().max(255).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    referralStatus: z.enum(["CREDIT_PENDING", "CREDIT_AWARDED", "CREDIT_EXPIRED"]).optional(),
    vanityKeys: z.array(z.string().min(1).max(20).regex(/^[A-Za-z0-9_-]+$/)).max(5).optional(),
    unsubscribed: z.boolean().optional(),
    notes: z.string().max(500).optional(),
  })
  .refine(hasParticipantIdentity, { message: PARTICIPANT_IDENTITY_HINT })
  .refine(
    (v) =>
      [
        v.affiliateStatus,
        v.referredBy,
        v.email,
        v.firstName,
        v.lastName,
        v.metadata,
        v.referralStatus,
        v.vanityKeys,
        v.unsubscribed,
        v.notes,
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
  resolveCredentialContext?: ResolveVerifiedCredentialContext;
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
      instructions: GROWSURF_SERVER_INSTRUCTIONS,
    },
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        ...PUBLIC_GROWSURF_RESOURCES,
        ...(env.GROWSURF_API_KEY && env.GROWSURF_CAMPAIGN_ID ? [
          {
            uri: "growsurf://campaign",
            name: "GrowSurf Campaign Details",
            description: "Full campaign (program) details fetched from GrowSurf REST API.",
            mimeType: "application/json",
          },
        ] : []),
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const publicResource = readPublicGrowSurfResource(request.params.uri);
    if (publicResource) return publicResource;

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

  // Builds the static tool catalog once per server while leaving credential filtering request-scoped.
  const buildToolsWithMetadata = () => {
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
          name: "growsurf_agent_program_creation_eval",
          description:
            "Generate one-shot GrowSurf program-creation eval prompts and acceptance checks for agent steering: starter content review, conservative rewards, configuration review, and frontend install proof.",
          inputSchema: {
            type: "object",
            properties: {
              programType: { type: "string", enum: ["referral", "affiliate", "both"], default: "both" },
              includeOneShotPrompts: { type: "boolean", default: true },
            },
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_mobile_sdk_guide",
          description:
            "Generate native iOS/Android SDK 0.4.0 guidance, including attribution, shareUrl sharing, trackShare, and the native GrowSurf Window.",
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
            "Generate official REST API library snippets for TypeScript, Python, PHP, Ruby, and Java, including Create Mobile Participant Token.",
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
          name: "growsurf_list_campaigns",
          description:
            "List the GrowSurf programs available to the bound team. Use this first when you need to choose a `campaignId` before calling campaign-scoped tools. Deleted programs are not returned. Does NOT require GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_create_campaign",
          description:
            "Create a new GrowSurf program (campaign) pre-populated with type-appropriate starter content, optionally with inline rewards. Starter content includes Design, Emails, Options, Installation, and GrowSurf Window defaults. Only `type` is required; the program is created in `DRAFT` status owned by the credential's bound team. `currencyISO` sets the program's currency (defaults to `USD`) and is immutable after creation. Pass `goal` so the share settings suit the audience; it is set here or not at all. Ask the person for the incentive rather than choosing one: leave `rewards` out unless they named an amount, and tell them the program starts with GrowSurf's starter rewards switched off so it awards nothing yet. Editor-tab config (design, emails, options, installation) is not accepted here. Fetch and review those config sub-resources after creation, then patch only what needs to change. Does NOT require GROWSURF_CAMPAIGN_ID. The response includes the new program `id`; pass it as `campaignId` to the other tools (or set GROWSURF_CAMPAIGN_ID) to configure and operate the program.",
          inputSchema: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["REFERRAL", "AFFILIATE"] },
              name: { type: "string" },
              companyName: { type: "string" },
              companyLogoImageUrl: { type: "string" },
              currencyISO: { type: "string" },
              goal: {
                type: "string",
                enum: [...CAMPAIGN_GOALS],
                description:
                  "What the program is for, which seeds share settings that suit that audience. Programs selling to businesses (`CUSTOMERS`, `USERS`, `B2B_SAAS_SELF_SERVICE`, `B2B_SAAS_ENTERPRISE`) start with the LinkedIn share button visible. Consumer, financial, education, insurance, newsletter, and waitlist programs (`B2C_SUBSCRIPTIONS`, `FINANCIAL_SERVICES`, `ONLINE_EDUCATION`, `ONLINE_INSURANCE`, `SUBSCRIBERS`, `WAITLIST`) start with it hidden. Omit `goal` and every share button keeps its standard default. Change any of it afterward with `growsurf_update_campaign_design`. Set only at creation; `growsurf_update_campaign` does not accept it.",
              },
              rewards: {
                type: "array",
                items: { type: "object", additionalProperties: true },
                description:
                  "Rewards to create with the program. Include this only when the person told you the amount and who funds it. Omit it and the program is seeded with starter rewards that are switched off, awarding nothing until the customer enables one. Send `[]` to start with no rewards at all.",
              },
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
              event: {
                type: "string",
                enum: ["LEAD", "CONVERSION"],
                description:
                  "The referral event that earns this Campaign Reward. Use `LEAD` for a referred signup or `CONVERSION` for a qualifying action. A `LEAD` reward requires a later custom conversion trigger. Referral reward types only.",
              },
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
                  "Tax valuation for the reward (the referrer's side of a double-sided reward). `fairMarketValueUSD` is the manual fair-market value in USD (major units). `taxCharacter` is the reason the recipient earns the reward. For configurable non-commission rewards, `null` inherits the program's confirmed treatment. Commission rewards always use `NONEMPLOYEE_SERVICES`.",
                properties: {
                  fairMarketValueUSD: { type: ["number", "null"], minimum: 0 },
                  taxCharacter: {
                    type: ["string", "null"],
                    enum: [
                      "NONEMPLOYEE_SERVICES",
                      "PRIZE_OR_AWARD",
                      "PURCHASE_REBATE",
                      "OTHER_INCOME",
                      "REVIEW_REQUIRED",
                      null,
                    ],
                  },
                },
                additionalProperties: false,
              },
              referredValue: {
                type: "object",
                description:
                  "Tax valuation for the referred friend's side of a double-sided reward. `taxCharacter` is the reason the recipient earns the reward. For configurable non-commission rewards, `null` inherits the program's confirmed treatment. Commission rewards have no referred-friend side, so GrowSurf clears these settings. Use `PURCHASE_REBATE` only when that is the correct tax character.",
                properties: {
                  fairMarketValueUSD: { type: ["number", "null"], minimum: 0 },
                  taxCharacter: {
                    type: ["string", "null"],
                    enum: [
                      "NONEMPLOYEE_SERVICES",
                      "PRIZE_OR_AWARD",
                      "PURCHASE_REBATE",
                      "OTHER_INCOME",
                      "REVIEW_REQUIRED",
                      null,
                    ],
                  },
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
              event: {
                type: "string",
                enum: ["LEAD", "CONVERSION"],
                description:
                  "The referral event that earns this Campaign Reward. Use `LEAD` for a referred signup or `CONVERSION` for a qualifying action. A `LEAD` reward requires a later custom conversion trigger. Referral reward types only.",
              },
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
                  "Tax valuation for the reward (the referrer's side of a double-sided reward). `fairMarketValueUSD` is the manual fair-market value in USD (major units). `taxCharacter` is the reason the recipient earns the reward. For configurable non-commission rewards, `null` inherits the program's confirmed treatment. Commission rewards always use `NONEMPLOYEE_SERVICES`.",
                properties: {
                  fairMarketValueUSD: { type: ["number", "null"], minimum: 0 },
                  taxCharacter: {
                    type: ["string", "null"],
                    enum: [
                      "NONEMPLOYEE_SERVICES",
                      "PRIZE_OR_AWARD",
                      "PURCHASE_REBATE",
                      "OTHER_INCOME",
                      "REVIEW_REQUIRED",
                      null,
                    ],
                  },
                },
                additionalProperties: false,
              },
              referredValue: {
                type: "object",
                description:
                  "Tax valuation for the referred friend's side of a double-sided reward. `taxCharacter` is the reason the recipient earns the reward. For configurable non-commission rewards, `null` inherits the program's confirmed treatment. Commission rewards have no referred-friend side, so GrowSurf clears these settings. Use `PURCHASE_REBATE` only when that is the correct tax character.",
                properties: {
                  fairMarketValueUSD: { type: ["number", "null"], minimum: 0 },
                  taxCharacter: {
                    type: ["string", "null"],
                    enum: [
                      "NONEMPLOYEE_SERVICES",
                      "PRIZE_OR_AWARD",
                      "PURCHASE_REBATE",
                      "OTHER_INCOME",
                      "REVIEW_REQUIRED",
                      null,
                    ],
                  },
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
          name: "growsurf_list_program_resources",
          description:
            "List the participant resources configured for your GrowSurf program, including drafts. Results stay in display order. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_prepare_program_resource_file",
          description:
            "Prepare a local file for a `FILE` Program Resource. Pass the safe file name, matching supported MIME type, and padded base64 bytes (10 MB maximum). GrowSurf requests a one-time ticket and uploads only to the secure HTTPS destination selected by GrowSurf. The result contains only `uploadTicket` and `uploadResult`; pass both unchanged to `growsurf_create_program_resource` or `growsurf_update_program_resource`. The tool does not accept upload URLs or credentials and never retries an ambiguous upload. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              fileName: {
                type: "string",
                minLength: 1,
                maxLength: 120,
                description: "A safe base name with an allowed extension: jpg/jpeg/png/gif/webp/pdf/csv/zip/doc/docx/xls/xlsx/ppt/pptx.",
              },
              mimeType: {
                type: "string",
                enum: [...new Set(Object.values(PROGRAM_RESOURCE_MIME_BY_EXTENSION).flat())],
                description: "The supported MIME type matching fileName's extension.",
              },
              fileBase64: {
                type: "string",
                minLength: 4,
                maxLength: PROGRAM_RESOURCE_MAX_BASE64_LENGTH,
                description: "Canonical padded base64 file bytes only. Do not include a data-URL prefix or whitespace.",
              },
            },
            required: ["fileName", "mimeType", "fileBase64"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_create_program_resource",
          description:
            "Create a `FILE`, `LINK`, or `TEXT` resource for participants. `LINK` requires an HTTPS `url`. `TEXT` requires plain `text`. For a `FILE` up to 10 MB, call `growsurf_prepare_program_resource_file` first and pass its `uploadTicket` and `uploadResult` unchanged. New resources default to draft unless you set `isPublished`. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["FILE", "LINK", "TEXT"] },
              title: { type: "string", minLength: 1, maxLength: 120 },
              description: { type: ["string", "null"], maxLength: 500 },
              category: { type: ["string", "null"], maxLength: 60 },
              isPublished: { type: "boolean" },
              uploadTicket: {
                type: "string",
                minLength: 20,
                description: "The one-time upload ticket. Used only with `FILE`.",
              },
              uploadResult: {
                type: "object",
                description: "The unmodified result returned by the secure upload flow. Used only with `FILE`.",
                properties: {
                  asset_id: { type: "string" },
                  public_id: { type: "string" },
                  version: { type: "integer", minimum: 1 },
                  signature: { type: "string" },
                  resource_type: { type: "string", enum: ["image", "raw"] },
                  type: { type: "string", const: "authenticated" },
                  bytes: { type: "integer", minimum: 1, maximum: 10 * 1024 * 1024 },
                  secure_url: { type: "string", pattern: "^https://" },
                  format: { type: "string" },
                },
                required: ["public_id", "version", "signature", "resource_type", "type", "bytes", "secure_url"],
                additionalProperties: true,
              },
              url: { type: "string", maxLength: 2048, pattern: "^https://", description: "Used only with `LINK`." },
              text: { type: "string", minLength: 1, maxLength: 5000, description: "Used only with `TEXT`." },
            },
            required: ["type", "title"],
            allOf: [
              {
                if: { properties: { type: { const: "FILE" } } },
                then: {
                  required: ["uploadTicket", "uploadResult"],
                  not: { anyOf: [{ required: ["url"] }, { required: ["text"] }] },
                },
              },
              {
                if: { properties: { type: { const: "LINK" } } },
                then: {
                  required: ["url"],
                  not: {
                    anyOf: [
                      { required: ["text"] },
                      { required: ["uploadTicket"] },
                      { required: ["uploadResult"] },
                    ],
                  },
                },
              },
              {
                if: { properties: { type: { const: "TEXT" } } },
                then: {
                  required: ["text"],
                  not: {
                    anyOf: [
                      { required: ["url"] },
                      { required: ["uploadTicket"] },
                      { required: ["uploadResult"] },
                    ],
                  },
                },
              },
            ],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_update_program_resource",
          description:
            "Update at least one participant resource field, or move it to a zero-based `position`. Only sent fields change. To replace a `FILE`, call `growsurf_prepare_program_resource_file` first and pass its `uploadTicket` and `uploadResult` unchanged. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            minProperties: 2,
            properties: {
              resourceId: { type: "string" },
              type: { type: "string", enum: ["FILE", "LINK", "TEXT"] },
              title: { type: "string", minLength: 1, maxLength: 120 },
              description: { type: ["string", "null"], maxLength: 500 },
              category: { type: ["string", "null"], maxLength: 60 },
              isPublished: { type: "boolean" },
              position: { type: "integer", minimum: 0, maximum: 99 },
              uploadTicket: { type: "string", minLength: 20, description: "The one-time upload ticket for a replacement `FILE`." },
              uploadResult: {
                type: "object",
                description: "The unmodified result returned by the secure upload flow for a replacement `FILE`.",
                properties: {
                  asset_id: { type: "string" },
                  public_id: { type: "string" },
                  version: { type: "integer", minimum: 1 },
                  signature: { type: "string" },
                  resource_type: { type: "string", enum: ["image", "raw"] },
                  type: { type: "string", const: "authenticated" },
                  bytes: { type: "integer", minimum: 1, maximum: 10 * 1024 * 1024 },
                  secure_url: { type: "string", pattern: "^https://" },
                  format: { type: "string" },
                },
                required: ["public_id", "version", "signature", "resource_type", "type", "bytes", "secure_url"],
                additionalProperties: true,
              },
              url: { type: "string", maxLength: 2048, pattern: "^https://", description: "Used with `LINK`." },
              text: { type: "string", minLength: 1, maxLength: 5000, description: "Used with `TEXT`." },
            },
            required: ["resourceId"],
            anyOf: [
              { required: ["type"] },
              { required: ["title"] },
              { required: ["description"] },
              { required: ["category"] },
              { required: ["isPublished"] },
              { required: ["position"] },
              { required: ["uploadTicket"] },
              { required: ["uploadResult"] },
              { required: ["url"] },
              { required: ["text"] },
            ],
            allOf: [
              { if: { required: ["uploadTicket"] }, then: { required: ["uploadResult"] } },
              { if: { required: ["uploadResult"] }, then: { required: ["uploadTicket"] } },
              {
                not: {
                  anyOf: [
                    { required: ["url", "text"] },
                    { required: ["url", "uploadTicket"] },
                    { required: ["url", "uploadResult"] },
                    { required: ["text", "uploadTicket"] },
                    { required: ["text", "uploadResult"] },
                  ],
                },
              },
              {
                if: { required: ["type"], properties: { type: { const: "FILE" } } },
                then: { not: { anyOf: [{ required: ["url"] }, { required: ["text"] }] } },
              },
              {
                if: { required: ["type"], properties: { type: { const: "LINK" } } },
                then: {
                  not: {
                    anyOf: [
                      { required: ["text"] },
                      { required: ["uploadTicket"] },
                      { required: ["uploadResult"] },
                    ],
                  },
                },
              },
              {
                if: { required: ["type"], properties: { type: { const: "TEXT" } } },
                then: {
                  not: {
                    anyOf: [
                      { required: ["url"] },
                      { required: ["uploadTicket"] },
                      { required: ["uploadResult"] },
                    ],
                  },
                },
              },
            ],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_delete_program_resource",
          description:
            "Delete a participant resource from your GrowSurf program. This does not remove its reusable Media Center asset. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: { resourceId: { type: "string" } },
            required: ["resourceId"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_get_campaign_design",
          description:
            "Fetch the configured design fields for your GrowSurf program, including GrowSurf Window content, colors, sharing sections, participant avatars under `participantAvatarStyle`, referred-visitor content such as the Claim Offer Popup, participant sign-in copy under `login`, payout-destination confirmation page copy under `payoutDestinationConfirmation`, and country-name overrides under `countryLabels`. `participantAvatarStyle` is `CHARACTERS`, `INITIALS`, `ANIMALS`, or `GRADIENT`; missing or unknown values mean `INITIALS`. The confirmation section is omitted when no confirmation fields are stored. Stored `null` fields are returned as `null`; omitted and `null` fields use localized defaults. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_update_campaign_design",
          description:
            "Update the design configuration for your GrowSurf program, including participant avatars under `participantAvatarStyle`, referred-visitor content such as the Claim Offer Popup, participant sign-in copy under `login`, and payout-destination confirmation page copy under `payoutDestinationConfirmation`. `participantAvatarStyle` accepts `CHARACTERS`, `INITIALS`, `ANIMALS`, or `GRADIENT`. Only the fields you send are changed; anything you leave out is untouched (arrays replace wholesale). Fetch the configuration first, preserve starter content unless the user asked to change it, then pass just the fields you want to change under `fields`. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
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
            "Fetch the Options tab configuration for your GrowSurf program (referral triggers, anti-fraud lists and toggles, affiliate enrollment and application review, notifications, and other behavior options). Returns the full object with every field and its current value — the same shape you send back on update. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
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
            "Update the Installation tab configuration for your GrowSurf program. Only the fields you send are changed; anything you leave out is untouched (arrays replace wholesale). To let GrowSurf run on another origin, such as `http://localhost:3000`, add that origin to `allowedUrls` and preserve the rest of the array; a browser origin missing from both `shareUrl` and `allowedUrls` can return `403`. Leave `shareUrl` out of the patch unless the customer asked for a different landing page: every referral link already shared points at the current one. A patch that would replace a Share URL that is already set is refused until you confirm it with the customer and resend with `replaceExistingShareUrl: true`. Fetch the tab first, then pass just the fields you want to change under `fields`. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              fields: {
                type: "object",
                description:
                  "Installation fields to patch. Common keys include `shareUrl`, `allowedUrls`, `signupEvent`, `referralTrigger`, and `signup`. Arrays replace wholesale.",
                properties: {
                  shareUrl: {
                    type: "string",
                    description:
                      "The program's Share URL: the landing page referred friends reach after opening a participant's referral link.",
                  },
                  allowedUrls: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Every browser origin allowed to use the program, including local and staging origins. Send the full array because arrays replace wholesale.",
                  },
                  signup: {
                    type: "object",
                    description:
                      "Custom signup-form settings. `signup.url` is the custom signup form URL, not the program's `shareUrl`.",
                    properties: {
                      isCustomForm: { type: "boolean" },
                      url: {
                        type: ["string", "null"],
                        description:
                          "The custom signup form URL. This is not the program's `shareUrl` (Share URL).",
                      },
                      redirectUrl: { type: ["string", "null"] },
                      trackInputFields: { type: "boolean" },
                    },
                    additionalProperties: true,
                  },
                },
                additionalProperties: true,
              },
              replaceExistingShareUrl: {
                type: "boolean",
                description:
                  "Set this to `true` only after the customer confirms they want a different landing page. Without it, a patch that would replace a Share URL that is already set is refused.",
              },
            },
            required: ["fields"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_capture_referral_flow_screenshots",
          description:
            "Capture temporary GrowSurf preview screenshots after the user explicitly asks for screenshots or screenshot proof. Returns short-lived URLs for the controlled referrer Window and referred-friend experience for this program. This does not prove the user's installed site; use browser automation for that. This tool does not accept arbitrary URLs, HTML, JavaScript, or external screenshot targets. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_create_account",
          description:
            "Create a brand-new GrowSurf account and return an API key. Call this tool only after the authorized owner explicitly approves account creation and accepts GrowSurf's Terms of Service (https://growsurf.com/terms) and Privacy Policy (https://growsurf.com/privacy). This is the only tool that does not require `GROWSURF_API_KEY`. The account starts a 14-day Business trial without a credit card. The endpoint returns the new key once in `apiKey`. The key is locked until the account owner's email address is verified. Until then, program and resource endpoints return a `403` with error code `EMAIL_NOT_VERIFIED_ERROR`. Create the account, tell the owner to click the link in the verification email, then retry until that error clears. Use `growsurf_resend_team_owner_verification_email` if the email was lost. The welcome email also contains a set-password link for dashboard access. Accounts whose email is never verified are deleted automatically after 7 days. Verification unlocks the same key you were given, so keep it and retry rather than asking for a replacement. Separately, the API key is replaced the first time the account owner signs in to the GrowSurf dashboard; after that the previous key returns a `403` with error code `NOT_AUTHORIZED_ERROR`. Some actions, such as emailing participants, also require GrowSurf to verify the team. Personal and disposable email addresses are not accepted.",
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
          name: "growsurf_get_team",
          description:
            "Fetch the team bound to the API key or OAuth connection. `verificationStatus` is `VERIFIED` once GrowSurf has verified the team, which is required before a program can email participants. Personal profiles and internal identifiers are not returned. Requires `GROWSURF_API_KEY`; does not require `GROWSURF_CAMPAIGN_ID`.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_update_team",
          description:
            "Update the display name of the team bound to the API key or OAuth connection. Personal profiles, billing, and team ownership are not editable here. Requires `GROWSURF_API_KEY`; does not require `GROWSURF_CAMPAIGN_ID`.",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                minLength: 1,
                maxLength: 255,
                description: "The team's display name.",
              },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_request_team_verification",
          description:
            "Ask GrowSurf to verify the team bound to the API key or OAuth connection. Verification is required before a program can email participants. Calling this again while a request is pending does not create a duplicate. Returns the team with its updated `verificationStatus`. Requires `GROWSURF_API_KEY`; does not require `GROWSURF_CAMPAIGN_ID`.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_resend_team_owner_verification_email",
          description:
            "Resend the email-verification message to the bound team's owner. The response never reveals the owner's email address. A `200` with `status: SENT` is returned only when an email was sent. Returns `400` if the email is already verified and `429` if one was sent too recently. Requires `GROWSURF_API_KEY`; does not require `GROWSURF_CAMPAIGN_ID`.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_get_campaign_analytics",
          description:
            "Fetch analytics for your GrowSurf program: participants, referrals, impressions, per-channel shares, and affiliate revenue, commission, and payout metrics when applicable. Pass `interval` (`day`, `week`, or `month`) for a per-period `series`. Pass comma-separated `include` values for `previousPeriod`, `statusCounts`, `rates`, `email`, or `engagement`. `engagement` groups unique active, sharing, repeat, and retained participants by when portal views and share actions occurred. Its `coverageStartAt`, `state`, and `reason` distinguish measured zeroes from partial or unavailable history. Scope the timeframe with `days` (default 365, max 1825) or an explicit `startDate`/`endDate` window (Unix ms). `timezone` and `platform` apply to engagement only. Targets `campaignId` if passed, otherwise `GROWSURF_CAMPAIGN_ID`.",
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
                  "Comma-separated optional data: `previousPeriod`, `statusCounts`, `rates`, `email`, and `engagement`. Combine values when the question needs more than one view.",
              },
              days: { type: "integer", minimum: 1, maximum: 1825 },
              startDate: { type: "integer", description: "Start of the timeframe, Unix timestamp in ms. Use with endDate instead of days." },
              endDate: { type: "integer", description: "End of the timeframe, Unix timestamp in ms." },
              timezone: {
                type: "string",
                description: "IANA timezone for engagement interval and distinct-day calculations. Used with `include=engagement`.",
              },
              platform: {
                type: "string",
                enum: ["ALL", "WEB", "IOS", "ANDROID"],
                description: "Client-platform filter for engagement. Defaults to `ALL`.",
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_get_campaign_activation_analytics",
          description:
            "Fetch strict activation for eligible participants in one enrollment cohort. Referral programs group by `enrolledAsAdvocateAt`; affiliate programs group by `approvedAsAffiliateAt`. The ordered stages are `ELIGIBLE`, `PORTAL_VIEWED`, `SHARE_ACTION`, `UNIQUE_REFERRAL_VISIT`, `LEAD`, and `CREDITED_REFERRAL`. Each participant gets the selected 7- or 30-day observation window. Omit both cohort bounds for the latest fully matured cohort. Read `coverageStartAt`, `state`, and `reason` before interpreting a null or zero; unavailable history does not mean an action never happened. Targets `campaignId` if passed, otherwise `GROWSURF_CAMPAIGN_ID`.",
          inputSchema: {
            type: "object",
            properties: {
              cohortFrom: {
                type: "integer",
                description: "Inclusive eligibility-cohort start, Unix timestamp in ms. Use with `cohortTo`.",
              },
              cohortTo: {
                type: "integer",
                description: "Exclusive eligibility-cohort end, Unix timestamp in ms. Must be greater than `cohortFrom`.",
              },
              cohortInterval: {
                type: "string",
                enum: ["day", "week", "month"],
                description: "Bucket size for `cohorts`. Defaults to `day`.",
              },
              observationWindowDays: {
                type: "integer",
                enum: [7, 30],
                description: "Days after eligibility in which stages can count. Defaults to `30`.",
              },
              timezone: {
                type: "string",
                description: "IANA timezone used to advance cohort boundaries. Defaults to `UTC`.",
              },
            },
            allOf: [
              { if: { required: ["cohortFrom"] }, then: { required: ["cohortTo"] } },
              { if: { required: ["cohortTo"] }, then: { required: ["cohortFrom"] } },
            ],
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
          name: "growsurf_list_participants",
          description:
            "List participants in your GrowSurf program, newest page first. `limit` is 1-100 (default 10). Pass response `nextId` into the next call to continue paging. Use this when you need a participant ID before calling participant-scoped tools. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "integer", minimum: 1, maximum: 100 },
              nextId: {
                type: "string",
                description: "Participant ID returned as `nextId` from the previous page.",
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_get_participant",
          description:
            "Fetch a single participant by GrowSurf participant ID or email address. Use `growsurf_list_participants` first if you need to find a participant ID. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
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
          name: "growsurf_add_participant",
          description:
            "Add or fetch a participant by email. Existing participants are returned unchanged. This is trusted direct enrollment; do not use it for a public application when the program requires affiliate review. For affiliate programs, set `isAffiliate` to `true` to enroll a new participant as approved or `false` to create a non-affiliate. If you omit it, a valid `referredBy` creates a referred non-affiliate; without a valid referrer, the new participant is enrolled as approved. A valid `referredBy` can be combined with `isAffiliate: true`. Targets `campaignId` if you pass it, otherwise `GROWSURF_CAMPAIGN_ID`.",
          inputSchema: {
            type: "object",
            properties: {
              email: { type: "string" },
              isAffiliate: {
                type: "boolean",
                description:
                  "Affiliate programs only. Controls affiliate enrollment for a new participant. `true` enrolls the participant with `affiliateStatus: APPROVED`; `false` creates a non-affiliate without `affiliateStatus`. Existing participants are returned unchanged.",
              },
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
            "Update a participant by GrowSurf participant ID or email. Only the fields you send are changed; read-only fields such as counters, `isAffiliate`, `origin`, and fraud state are rejected with a `400`. In affiliate programs, `affiliateStatus` accepts `APPROVED`, `SUSPENDED`, or `BANNED`; `APPROVED` enrolls the participant, while `SUSPENDED` and `BANNED` require an existing affiliate. Affiliate enrollment cannot be removed through REST. `notes` is freeform internal notes (never shown to participants). Targets `campaignId` if you pass it, otherwise `GROWSURF_CAMPAIGN_ID`.",
          inputSchema: {
            type: "object",
            properties: {
              participantId: { type: "string" },
              participantEmail: { type: "string" },
              affiliateStatus: {
                type: "string",
                enum: ["APPROVED", "SUSPENDED", "BANNED"],
                description:
                  "Affiliate programs only. Sets the affiliate status. `APPROVED` also enrolls a participant who is not yet an affiliate. `SUSPENDED` and `BANNED` are rejected for non-affiliates.",
              },
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
            "Send an email to a participant (by GrowSurf participant ID or email). Provide EITHER `emailType` to trigger one of the program's configured email templates, OR `subject` + `body` for a free-form email (optionally `preheader`). Free-form emails are sent with the same compliance handling (company name, postal address, and an unsubscribe link are added automatically, and unsubscribed participants are suppressed). Sending requires the team to be verified by GrowSurf and a verified custom email domain on the program (set up in *Campaign Editor > 3. Emails > Email Settings*). Returns 400 until one is verified. The email is accepted for delivery. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              participantId: { type: "string" },
              participantEmail: { type: "string" },
              emailType: {
                type: "string",
                description: "The program email template to trigger. Send the camelCase key; the available types depend on the program type. The template's `isEnabled` setting controls automatic sends only, so this tool can trigger any sendable template. System and transactional types (login link, payout destination confirmation, tax) and the invite email cannot be sent. Referral programs: `welcomeNonReferred`, `referralLinkViewedFirstTime`, `referralLinkUsed`, `referredSignup`, `welcomeReferred`, `goalAchieved`, `campaignEndedWinners`, `campaignEndedNonWinners`, `progressUpdateMonthly`. Affiliate programs: `welcomeNonReferred`, `referralLinkViewedFirstTime`, `referredSignup`, `commissionGenerated`, `commissionAdjusted`, `payoutPending`, `payoutSentSuccess`, `progressUpdateMonthly`.",
              },
              subject: { type: "string", description: "Free-form subject. Supports dynamic text (`{{...}}` tokens), the same as the body." },
              body: { type: "string", description: "Free-form HTML body. You can personalize it with dynamic text, inserting `{{...}}` tokens like `{{firstName}}` or `{{shareUrl}}`. See [Guide to using dynamic text in GrowSurf emails](https://support.growsurf.com/article/213-guide-to-using-dynamic-text-in-growsurf-emails)." },
              preheader: { type: "string" },
            },
            allOf: [
              PARTICIPANT_IDENTIFIER_JSON_REQUIREMENT,
              {
                oneOf: [
                  {
                    required: ["emailType"],
                    not: {
                      anyOf: [{ required: ["subject"] }, { required: ["body"] }],
                    },
                  },
                  {
                    required: ["subject", "body"],
                    not: { required: ["emailType"] },
                  },
                ],
              },
            ],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_get_participant_analytics",
          description:
            "Fetch analytics for one participant by GrowSurf participant ID or email. The base response includes all-time engagement, rank, share, and applicable affiliate revenue, commission, and payout metrics. Add `activation` to `include` for the program-specific eligibility anchor and covered first milestones, including `firstPortalViewedAt` and `firstShareChannel`. A null milestone with a partial or unavailable `state` is unknown, not proof that the action never happened. Request both `activation` and `series` for covered `portalViews` and `shareActions` buckets. Date-window parameters filter optional series and email data, not the base response or activation milestones. Targets `campaignId` if passed, otherwise `GROWSURF_CAMPAIGN_ID`.",
          inputSchema: {
            type: "object",
            properties: {
              participantId: { type: "string" },
              participantEmail: { type: "string" },
              include: {
                type: "string",
                description: "Comma-separated optional data. Current values are `series`, `email`, and `activation`; the API returns `400` for unknown values.",
              },
              interval: {
                type: "string",
                enum: ["day", "week", "month"],
                description: "Bucket size for `series` and email series. Defaults to `day`.",
              },
              days: {
                type: "integer",
                minimum: 1,
                maximum: 1825,
                description: "Number of days for optional `series` and `email` analytics. Does not filter the all-time base response.",
              },
              startDate: { type: "integer", description: "Start of the optional-data timeframe, Unix timestamp in ms. Use with `endDate` instead of `days`." },
              endDate: { type: "integer", description: "End of the optional-data timeframe, Unix timestamp in ms. Use with `startDate`." },
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
          name: "growsurf_get_participant_payout_destination",
          description:
            "Get a participant's payout-destination status (by GrowSurf participant ID or email) across every payout provider enabled for the program (PayPal and/or Wise). For each provider it reports the current `status`, the confirmed payout email, the legal recipient type, and — when a delivery bounced or a recipient was invalidated — the repair reason. `activeProvider` is the provider that currently gets paid, or null until the participant confirms one. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
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
          name: "growsurf_request_participant_payout_destination_confirmation",
          description:
            "Ask a participant to confirm their payout destination for a provider (by GrowSurf participant ID or email). Sends them a one-time confirmation link for the chosen `provider`; only the participant can open the link and confirm — this just triggers the message, and the provider must be enabled for the program. Returns { status, provider, providerDisplayName, expiresAt }. Targets `campaignId` if you pass it, otherwise GROWSURF_CAMPAIGN_ID.",
          inputSchema: {
            type: "object",
            properties: {
              participantId: { type: "string" },
              participantEmail: { type: "string" },
              provider: {
                type: "string",
                enum: [...PAYOUT_DESTINATION_PROVIDER_INPUTS],
                description: "The payout provider the participant should confirm a destination for.",
              },
            },
            required: ["provider"],
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
              currency: { type: "string", minLength: 3, maxLength: 3, pattern: "^[A-Za-z]{3}$" },
              grossAmount: { type: "integer", minimum: 1 },
              invoiceId: { type: "string" },
              chargeId: { type: "string" },
              paymentIntentId: { type: "string" },
              transactionId: { type: "string" },
              externalId: { type: "string" },
              orderId: { type: "string" },
              paymentId: { type: "string" },
              customerId: { type: "string" },
              subscriptionId: { type: "string" },
              netAmount: { type: "integer", minimum: 0 },
              taxAmount: { type: "integer", minimum: 0 },
              amountCashNet: { type: "integer", minimum: 0 },
              amountPaid: { type: "integer", minimum: 0 },
              invoiceTotal: { type: "integer", minimum: 0 },
              invoiceTotalExcludingTax: { type: "integer", minimum: 0 },
              invoiceSubtotalExcludingTax: { type: "integer", minimum: 0 },
              totalTaxAmount: { type: "integer", minimum: 0 },
              totalTaxAmounts: {
                type: "array",
                items: {
                  type: "object",
                  properties: { amount: { type: "integer", minimum: 0 } },
                  additionalProperties: true,
                },
              },
              totalTaxes: {
                type: "array",
                items: {
                  type: "object",
                  properties: { amount: { type: "integer", minimum: 0 } },
                  additionalProperties: true,
                },
              },
              paidAt: { type: "integer", minimum: 0 },
              description: { type: "string", maxLength: 500 },
            },
            required: ["currency", "grossAmount"],
            allOf: [PARTICIPANT_IDENTIFIER_JSON_REQUIREMENT, TRANSACTION_IDENTIFIER_JSON_REQUIREMENT],
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
            allOf: [PARTICIPANT_IDENTIFIER_JSON_REQUIREMENT, TRANSACTION_IDENTIFIER_JSON_REQUIREMENT],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_create_mobile_participant_token",
          description:
            "Create or fetch a participant, then create a participant-scoped mobile SDK token via GrowSurf REST. Participant creation is trusted direct enrollment; do not use it for a public application when the program requires affiliate review. Targets `campaignId` if you pass it, otherwise `GROWSURF_CAMPAIGN_ID`.",
          inputSchema: {
            type: "object",
            properties: {
              email: { type: "string" },
              isAffiliate: {
                type: "boolean",
                description:
                  "Sets whether the participant is an affiliate. Use `true` only for trusted direct enrollment. Public applicants should follow the program's configured application flow.",
              },
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
          description:
            "Compute the server-side SHA-256 HMAC for GrowSurf Participant Auto Authentication. Set affiliateJoin only when this signed-in user may join the affiliate program directly.",
          inputSchema: {
            type: "object",
            properties: {
              email: { type: "string" },
              participantAuthSecret: { type: "string" },
              affiliateJoin: { type: "boolean", default: false },
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
              affiliateJoin: { type: "boolean", default: false },
              includeAutoAuthCommentHeader: { type: "boolean", default: true }
            },
            required: [],
            additionalProperties: false
          }
        },
        {
          name: "growsurf_get_integration_connect_link",
          description:
            "Return a dashboard link that opens a specific integration's connect panel in the GrowSurf Program Editor (Options > Integrations). Use this whenever a user says they want to connect an integration, for example \"connect Stripe\", \"set up PayPal or Wise payouts\", \"send Tango Card gift cards\", or \"sync signups to Mailchimp\": call it with the `integration` key and give the user the returned `url` to open. Connecting an integration happens in the dashboard, not through the API. GrowSurf cannot link a Stripe, PayPal, Wise, or other account on the user's behalf, so hand them the link. `integration` must be one of the supported keys (some are camelCase, e.g. `constantContact`, `helpScout`). The link points at GROWSURF_CAMPAIGN_ID; pass `campaignId` to target a different program. Chargebee, Recurly, and Tango Card apply to referral programs only. Wise applies to affiliate programs only.",
          inputSchema: {
            type: "object",
            properties: {
              integration: {
                type: "string",
                enum: [...INTEGRATION_KEYS],
                description:
                  "The integration to connect. Must exactly match one of the supported keys (for example `wisecom`; some are camelCase, e.g. `constantContact`, `campaignMonitor`, `helpScout`, `pabblyConnect`, `baskHealth`).",
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
    // restart. Keyless, Team-level, and static tools are left untouched.
    for (const tool of tools) {
      if (!CAMPAIGN_SCOPED_TOOL_NAMES.has(tool.name)) continue;
      const inputSchema = tool.inputSchema as { properties?: Record<string, unknown> };
      inputSchema.properties = { ...(inputSchema.properties ?? {}), campaignId: CAMPAIGN_ID_JSON_PROP };
    }
    // Advertise an output schema for every tool that returns structured JSON, so clients know the
    // result shape. Tools that return markdown or plain text are not in the map and stay as-is.
    for (const tool of tools) {
      const outputSchema = TOOL_OUTPUT_SCHEMAS[tool.name];
      if (outputSchema) (tool as { outputSchema?: ToolOutputSchema }).outputSchema = outputSchema;
    }
    return tools.map(withToolAuthorizationMetadata);
  };

  let toolsWithMetadataCache: ReturnType<typeof buildToolsWithMetadata> | undefined;
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const toolsWithMetadata = (toolsWithMetadataCache ??= buildToolsWithMetadata());
    // Hosted transports can hide tools that a verified credential cannot use. Omitting the
    // resolver preserves the local/stdio server's existing all-tools discovery behavior.
    if (!options.resolveCredentialContext) return { tools: toolsWithMetadata };
    const credentialContext = await options.resolveCredentialContext();
    return { tools: filterToolsForCredential(toolsWithMetadata, credentialContext) };
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
          return markdownToolResult(text);
        }
        case "growsurf_agent_program_creation_eval": {
          const input = agentProgramCreationEvalInputSchema.parse(request.params.arguments ?? {});
          const text = renderAgentProgramCreationEval(input);
          return markdownToolResult(text);
        }
        case "growsurf_mobile_sdk_guide": {
          const input = mobileSdkGuideInputSchema.parse(request.params.arguments ?? {});
          const text = renderMobileSdkGuide(input, { campaignId: env.GROWSURF_CAMPAIGN_ID });
          return markdownToolResult(text);
        }
        case "growsurf_api_library_snippets": {
          const input = apiLibrarySnippetsInputSchema.parse(request.params.arguments ?? {});
          const text = renderApiLibrarySnippets(input, { campaignId: env.GROWSURF_CAMPAIGN_ID });
          return markdownToolResult(text);
        }
        case "growsurf_get_campaign": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.getCampaign();
          return jsonToolResult(result);
        }
        case "growsurf_list_campaigns": {
          const growsurf = requireGrowSurfApiKey(env);
          const result = await growsurf.listCampaigns();
          return jsonToolResult(result);
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
            goal: input.goal,
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
          return jsonToolResult(result, hint);
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
          return jsonToolResult(result);
        }
        case "growsurf_clone_campaign": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.cloneCampaign();
          return jsonToolResult(result);
        }
        case "growsurf_list_campaign_rewards": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.listCampaignRewards();
          return jsonToolResult(result);
        }
        case "growsurf_create_campaign_reward": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = createCampaignRewardSchema.parse(request.params.arguments ?? {});
          const reward = omitUndefined({
            type: input.type,
            title: input.title,
            description: input.description,
            event: input.event,
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
          return jsonToolResult(result);
        }
        case "growsurf_update_campaign_reward": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = updateCampaignRewardSchema.parse(request.params.arguments ?? {});
          const { campaignRewardId, ...rest } = input;
          const fields = omitUndefined(rest) as Record<string, unknown>;
          const result = await growsurf.updateCampaignReward(campaignRewardId, fields);
          return jsonToolResult(result);
        }
        case "growsurf_delete_campaign_reward": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = deleteCampaignRewardSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.deleteCampaignReward(input.campaignRewardId);
          return jsonToolResult(result);
        }
        case "growsurf_list_program_resources": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.listProgramResources();
          return jsonToolResult(result);
        }
        case "growsurf_prepare_program_resource_file": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = prepareProgramResourceFileSchema.parse(request.params.arguments ?? {});
          const bytes = Buffer.from(input.fileBase64, "base64");
          if (bytes.toString("base64") !== input.fileBase64) {
            throw new Error("fileBase64 must use canonical padded base64 encoding.");
          }
          if (bytes.byteLength < 1 || bytes.byteLength > PROGRAM_RESOURCE_MAX_FILE_BYTES) {
            throw new Error("The decoded file must be between 1 byte and 10 MB.");
          }
          const result = await growsurf.prepareProgramResourceFile({
            fileName: input.fileName,
            mimeType: input.mimeType,
            bytes,
          });
          return jsonToolResult(result);
        }
        case "growsurf_create_program_resource": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = createProgramResourceSchema.parse(request.params.arguments ?? {});
          const body = { ...input } as Record<string, unknown>;
          delete body.campaignId;
          const result = await growsurf.createProgramResource(body);
          return jsonToolResult(result);
        }
        case "growsurf_update_program_resource": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = updateProgramResourceSchema.parse(request.params.arguments ?? {});
          const resourceId = input.resourceId;
          const fields = { ...input } as Record<string, unknown>;
          delete fields.resourceId;
          delete fields.campaignId;
          const result = await growsurf.updateProgramResource(resourceId, omitUndefined(fields));
          return jsonToolResult(result);
        }
        case "growsurf_delete_program_resource": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = deleteProgramResourceSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.deleteProgramResource(input.resourceId);
          return jsonToolResult(result);
        }
        case "growsurf_get_campaign_design": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.getCampaignDesign();
          return jsonToolResult(result);
        }
        case "growsurf_update_campaign_design": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = campaignConfigUpdateSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.updateCampaignDesign(input.fields);
          return jsonToolResult(result);
        }
        case "growsurf_get_campaign_emails": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.getCampaignEmails();
          return jsonToolResult(result);
        }
        case "growsurf_update_campaign_emails": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = campaignConfigUpdateSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.updateCampaignEmails(input.fields);
          return jsonToolResult(result);
        }
        case "growsurf_get_campaign_options": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.getCampaignOptions();
          return jsonToolResult(result);
        }
        case "growsurf_update_campaign_options": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = campaignConfigUpdateSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.updateCampaignOptions(input.fields);
          return jsonToolResult(result);
        }
        case "growsurf_get_campaign_installation": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.getCampaignInstallation();
          return jsonToolResult(result);
        }
        case "growsurf_update_campaign_installation": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = campaignInstallationUpdateSchema.parse(request.params.arguments ?? {});
          const conflict = input.replaceExistingShareUrl === true
            ? undefined
            : await findShareUrlConflict(growsurf, input.fields);
          if (conflict) {
            return {
              content: [{ type: "text", text: conflict }],
              isError: true,
            };
          }
          const result = await growsurf.updateCampaignInstallation(input.fields);
          return jsonToolResult(result);
        }
        case "growsurf_capture_referral_flow_screenshots": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.captureReferralFlowScreenshots();
          return jsonToolResult(result);
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
          return jsonToolResult(result);
        }
        case "growsurf_get_team": {
          const growsurf = requireGrowSurfApiKey(env);
          const result = await growsurf.getTeam();
          return jsonToolResult(result);
        }
        case "growsurf_update_team": {
          const growsurf = requireGrowSurfApiKey(env);
          const input = updateTeamSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.updateTeam({ name: input.name });
          return jsonToolResult(result);
        }
        case "growsurf_request_team_verification": {
          const growsurf = requireGrowSurfApiKey(env);
          const result = await growsurf.requestTeamVerification();
          return jsonToolResult(result);
        }
        case "growsurf_resend_team_owner_verification_email": {
          const growsurf = requireGrowSurfApiKey(env);
          const result = await growsurf.resendTeamOwnerVerificationEmail();
          return jsonToolResult(result);
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
            timezone: input.timezone,
            platform: input.platform,
          }) as {
            interval?: string;
            include?: string;
            days?: number;
            startDate?: number;
            endDate?: number;
            timezone?: string;
            platform?: string;
          };
          const result = await growsurf.getCampaignAnalytics(query);
          return jsonToolResult(result);
        }
        case "growsurf_get_campaign_activation_analytics": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = getCampaignActivationAnalyticsSchema.parse(request.params.arguments ?? {});
          const query = omitUndefined({
            cohortFrom: input.cohortFrom,
            cohortTo: input.cohortTo,
            cohortInterval: input.cohortInterval,
            observationWindowDays: input.observationWindowDays,
            timezone: input.timezone,
          }) as {
            cohortFrom?: number;
            cohortTo?: number;
            cohortInterval?: string;
            observationWindowDays?: number;
            timezone?: string;
          };
          const result = await growsurf.getCampaignActivationAnalytics(query);
          return jsonToolResult(result);
        }
        case "growsurf_list_campaign_webhooks": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const result = await growsurf.listWebhooks();
          return jsonToolResult(result);
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
          return jsonToolResult(result);
        }
        case "growsurf_update_campaign_webhook": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = updateWebhookSchema.parse(request.params.arguments ?? {});
          const { webhookId, ...rest } = input;
          const fields = omitUndefined(rest) as Record<string, unknown>;
          const result = await growsurf.updateWebhook(webhookId, fields);
          return jsonToolResult(result);
        }
        case "growsurf_delete_campaign_webhook": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = deleteWebhookSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.deleteWebhook(input.webhookId);
          return jsonToolResult(result);
        }
        case "growsurf_test_campaign_webhook": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = testWebhookSchema.parse(request.params.arguments ?? {});
          const body = omitUndefined({ event: input.event }) as Record<string, unknown>;
          const result = await growsurf.testWebhook(
            input.webhookId,
            Object.keys(body).length ? body : undefined,
          );
          return jsonToolResult(result);
        }
        case "growsurf_list_participants": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = listParticipantsSchema.parse(request.params.arguments ?? {});
          const query = omitUndefined({ limit: input.limit, nextId: input.nextId }) as {
            limit?: number;
            nextId?: string;
          };
          const result = await growsurf.listParticipants(query);
          return jsonToolResult(result);
        }
        case "growsurf_get_participant": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = getParticipantSchema.parse(request.params.arguments ?? {});
          const result = input.participantId
            ? await growsurf.getParticipantById(input.participantId)
            : await growsurf.getParticipantByEmail(input.participantEmail!);
          return jsonToolResult(result);
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
          return jsonToolResult(result);
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
          return jsonToolResult(result);
        }
        case "growsurf_bulk_delete_participants": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = bulkDeleteParticipantsSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.bulkDeleteParticipants(input.participants);
          return jsonToolResult(result);
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
          return jsonToolResult(result);
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
          return jsonToolResult(result);
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
          return jsonToolResult(result);
        }
        case "growsurf_trigger_referral": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = triggerReferralSchema.parse(request.params.arguments ?? {});
          const result = input.participantId
            ? await growsurf.triggerReferralByParticipantId(input.participantId, input.delayInDays)
            : await growsurf.triggerReferralByParticipantEmail(input.participantEmail!, input.delayInDays);
          return jsonToolResult(result);
        }
        case "growsurf_cancel_delayed_referral": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = cancelDelayedReferralSchema.parse(request.params.arguments ?? {});
          const result = input.participantId
            ? await growsurf.cancelDelayedReferralByParticipantId(input.participantId)
            : await growsurf.cancelDelayedReferralByParticipantEmail(input.participantEmail!);
          return jsonToolResult(result);
        }
        case "growsurf_get_participant_payout_destination": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = getParticipantPayoutDestinationSchema.parse(request.params.arguments ?? {});
          const result = input.participantId
            ? await growsurf.getPayoutDestinationById(input.participantId)
            : await growsurf.getPayoutDestinationByEmail(input.participantEmail!);
          return jsonToolResult(result);
        }
        case "growsurf_request_participant_payout_destination_confirmation": {
          const growsurf = resolveCampaignClient(env, toolArgs);
          const input = requestParticipantPayoutDestinationConfirmationSchema.parse(request.params.arguments ?? {});
          const body = { provider: input.provider };
          const result = input.participantId
            ? await growsurf.requestPayoutDestinationConfirmationById(input.participantId, body)
            : await growsurf.requestPayoutDestinationConfirmationByEmail(input.participantEmail!, body);
          return jsonToolResult(result);
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
            invoiceTotal: input.invoiceTotal,
            invoiceTotalExcludingTax: input.invoiceTotalExcludingTax,
            invoiceSubtotalExcludingTax: input.invoiceSubtotalExcludingTax,
            totalTaxAmount: input.totalTaxAmount,
            totalTaxAmounts: input.totalTaxAmounts,
            totalTaxes: input.totalTaxes,
            paidAt: input.paidAt,
            description: input.description,
          }) as Record<string, unknown>;
          const result = input.participantId
            ? await growsurf.recordSaleByParticipantId(input.participantId, sale)
            : await growsurf.recordSaleByParticipantEmail(input.participantEmail!, sale);
          return jsonToolResult(result);
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
          return jsonToolResult(result);
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
          return jsonToolResult(result);
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
          const hash = computeParticipantAuthHash({
            email: input.email,
            participantAuthSecret: secret,
            affiliateJoin: input.affiliateJoin,
          });
          return { content: [{ type: "text", text: hash }], structuredContent: { hash } };
        }
        case "growsurf_webhook_normalize": {
          const input = webhookNormalizeSchema.parse(request.params.arguments ?? {});
          const normalized = normalizeWebhook(input.payload);
          return jsonToolResult(normalized);
        }
        case "growsurf_client_snippets": {
          const input = clientSnippetsSchema.parse(request.params.arguments ?? {});
          const text = renderClientSnippets(input, installKitEnv);
          return markdownToolResult(text);
        }
        case "growsurf_embeddable_element_snippet": {
          const input = embeddableElementSchema.parse(request.params.arguments ?? {});
          const text = renderEmbeddableElementSnippet(input);
          return markdownToolResult(text);
        }
        case "growsurf_grsf_config_snippet": {
          const input = grsfConfigSnippetSchema.parse(request.params.arguments ?? {});
          const text = renderGrsfConfigSnippet(input, installKitEnv);
          return markdownToolResult(text);
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
            affiliateOnly: integration.affiliateOnly ?? false,
            url: buildIntegrationConnectUrl(campaignId, integration.key),
            note: `Open this link and connect ${integration.label} from the Program Editor. Connecting an integration happens in the GrowSurf dashboard, not through the API.`,
          };
          return jsonToolResult(result);
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
