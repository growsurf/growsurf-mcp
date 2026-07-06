#!/usr/bin/env node
import { createRequire } from "module";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const { version: PACKAGE_VERSION } = createRequire(import.meta.url)("../package.json") as { version: string };
import { apiLibrarySnippetsInputSchema, renderApiLibrarySnippets } from "./growsurf/apiLibrarySnippets.js";
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
import { mobileSdkGuideInputSchema, renderMobileSdkGuide } from "./growsurf/mobileSdkGuide.js";
import { computeParticipantAuthHash } from "./growsurf/participantAuth.js";
import { normalizeWebhook } from "./growsurf/webhooks.js";

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
  GROWSURF_PARTICIPANT_AUTH_SECRET: optionalNonEmptyString(),
  GROWSURF_WEBHOOK_TOKEN: optionalNonEmptyString(),
});

type Env = z.infer<typeof envSchema>;

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
  return new GrowSurfClient({ apiKey: env.GROWSURF_API_KEY, campaignId: env.GROWSURF_CAMPAIGN_ID });
};

// Creating a campaign (POST /campaigns) has no campaign id, so it only needs the API key.
const requireGrowSurfApiKey = (env: Env): GrowSurfClient => {
  if (!env.GROWSURF_API_KEY) {
    throw new Error("Missing GrowSurf REST credentials. Set GROWSURF_API_KEY to use this tool.");
  }
  return new GrowSurfClient({ apiKey: env.GROWSURF_API_KEY, campaignId: env.GROWSURF_CAMPAIGN_ID ?? "" });
};

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
  referralStatus: z.enum(["CREDIT_PENDING", "CREDIT_AWARDED", "CREDIT_EXPIRED"]).optional(),
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
// PATCH is a partial merge, so every field is optional; see the GrowSurf REST API
// reference for the full field-level schemas of each editor tab.
const campaignConfigUpdateSchema = z.object({
  fields: z.record(z.string(), z.unknown()),
});

// Tax valuation settings shared by the reward `value` and `referredValue` fields
// (openapi RewardTaxValuation). `null` on either sub-field means "clear / use the smart default".
const rewardTaxValuationSchema = z.object({
  fairMarketValueUSD: z.number().min(0).nullable().optional(),
  isTaxReportable: z.boolean().nullable().optional(),
});

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
  commissionStructure: z.record(z.string(), z.unknown()).optional(),
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

const main = async () => {
  const env = getEnv();

  // Shared env shape for the install-kit renderers (decoupled from the MCP Env).
  const installKitEnv = {
    campaignId: env.GROWSURF_CAMPAIGN_ID,
    webhookToken: env.GROWSURF_WEBHOOK_TOKEN,
    participantAuthSecret: env.GROWSURF_PARTICIPANT_AUTH_SECRET,
  };

  const server = new Server(
    {
      name: "growsurf-mcp",
      version: PACKAGE_VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
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
      const growsurf = requireGrowSurfClient(env);
      const result = await growsurf.getCampaign();
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

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
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
          description: "Fetch your GrowSurf campaign (program) details via REST.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_create_campaign",
          description:
            "Create a new GrowSurf program (campaign) pre-populated with type-appropriate defaults, optionally with inline rewards. Only `type` is required; the program is created in DRAFT status owned by your API key's account. `currencyISO` sets the program's currency (defaults to USD) and is immutable after creation. Editor-tab config (design, emails, options, installation) is not accepted here — configure it after creation with the config sub-resource tools. Does NOT require GROWSURF_CAMPAIGN_ID.",
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
            "Update your GrowSurf program's (campaign's) identity and lifecycle: name, companyName, companyLogoImageUrl, and status (set IN_PROGRESS to publish/resume the program, COMPLETE to end it). Only the fields you send are changed. `type`, `urlId`, and `currencyISO` are immutable (currency is chosen once at program creation), so this tool does not accept them. Editor-tab config (design, emails, options, installation) is edited with the dedicated config sub-resource tools, not here. Uses GROWSURF_CAMPAIGN_ID.",
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
            "Clone your GrowSurf program (campaign) into a new DRAFT program. Integrations and credentials are not copied; active rewards are cloned. Uses GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_list_campaign_rewards",
          description: "List your GrowSurf program's configured rewards (reward configs). Uses GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_create_campaign_reward",
          description:
            "Create a new campaign reward (reward config) on your GrowSurf program. `type` must be compatible with the program type (affiliate programs support only AFFILIATE rewards; referral programs support the other types). Uses GROWSURF_CAMPAIGN_ID.",
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
              commissionStructure: { type: "object", additionalProperties: true },
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
            "Update an existing campaign reward (reward config) on your GrowSurf program. `campaignRewardId` is the reward key (e.g. crew_...). The reward `type` is immutable. Uses GROWSURF_CAMPAIGN_ID.",
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
              commissionStructure: { type: "object", additionalProperties: true },
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
            "Delete a campaign reward (reward config) from your GrowSurf program. The reward is deactivated, removed from the program's reward set, and any connected upfront-discount coupons are cleaned up. `campaignRewardId` is the reward key. Returns { id, success }. Uses GROWSURF_CAMPAIGN_ID.",
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
            "Fetch the Design tab configuration for your GrowSurf program (colors, fonts, sharing sections, and other appearance settings). Returns a large nested object; see the GrowSurf REST API reference for the field-level schema. Uses GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_update_campaign_design",
          description:
            "Update the Design tab configuration for your GrowSurf program. This is a partial merge — pass only the nested fields you want to change under `fields`. See the GrowSurf REST API reference for the field-level schema. Uses GROWSURF_CAMPAIGN_ID.",
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
            "Fetch the Emails tab configuration for your GrowSurf program (participant and admin email templates and settings). Returns a large nested object; see the GrowSurf REST API reference for the field-level schema. Uses GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_update_campaign_emails",
          description:
            "Update the Emails tab configuration for your GrowSurf program. This is a partial merge — pass only the nested fields you want to change under `fields`. See the GrowSurf REST API reference for the field-level schema. Uses GROWSURF_CAMPAIGN_ID.",
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
            "Fetch the Options tab configuration for your GrowSurf program (referral triggers, fraud/firewall settings, notifications, and other behavior options). Returns a large nested object; see the GrowSurf REST API reference for the field-level schema. Uses GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_update_campaign_options",
          description:
            "Update the Options tab configuration for your GrowSurf program. This is a partial merge — pass only the nested fields you want to change under `fields`. See the GrowSurf REST API reference for the field-level schema. Uses GROWSURF_CAMPAIGN_ID.",
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
            "Fetch the Installation tab configuration for your GrowSurf program (embed/installation and tracking setup). Returns a large nested object; see the GrowSurf REST API reference for the field-level schema. Uses GROWSURF_CAMPAIGN_ID.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "growsurf_update_campaign_installation",
          description:
            "Update the Installation tab configuration for your GrowSurf program. This is a partial merge — pass only the nested fields you want to change under `fields`. See the GrowSurf REST API reference for the field-level schema. Uses GROWSURF_CAMPAIGN_ID.",
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
          name: "growsurf_add_participant",
          description: "Add or fetch an existing participant by email (GrowSurf REST).",
          inputSchema: {
            type: "object",
            properties: {
              email: { type: "string" },
              firstName: { type: "string" },
              lastName: { type: "string" },
              referredBy: { type: "string" },
              referralStatus: { type: "string", enum: ["CREDIT_PENDING", "CREDIT_AWARDED", "CREDIT_EXPIRED"] },
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
          name: "growsurf_trigger_referral",
          description:
            "Trigger referral credit for a referred participant (use when your trigger is Sign up + Qualifying Action). Optionally pass delayInDays (1-90) to hold the credit for N days before awarding it (e.g. to cover a refund window).",
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
            "Cancel a pending delayed referral trigger for a participant before the delay elapses (e.g. on refund/cancellation). Returns { success, message }.",
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
            "Record a sale/transaction for an affiliate program (commissions generate asynchronously; use webhooks). Requires at least one transaction identifier (externalId, transactionId, orderId, paymentId, invoiceId, paymentIntentId, or chargeId) so repeated calls are de-duplicated instead of double-paying the referrer; reuse the same one when refunding.",
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
            "Record an amendment (refund, partial refund, or chargeback) against a previously recorded affiliate transaction; reverses or adjusts the referrer's commission. The inverse of growsurf_record_sale. Identify the original transaction with the same identifier you sent when recording it (omit amountRefunded for a full refund). Already-paid commissions are not clawed back (recorded for tax only).",
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
            "Create or fetch a participant, then create a participant-scoped mobile SDK token via GrowSurf REST.",
          inputSchema: {
            type: "object",
            properties: {
              email: { type: "string" },
              firstName: { type: "string" },
              lastName: { type: "string" },
              referredBy: { type: "string" },
              referralStatus: { type: "string", enum: ["CREDIT_PENDING", "CREDIT_AWARDED", "CREDIT_EXPIRED"] },
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
            "Generate copy-pasteable client-side snippets for GrowSurf referral tracking, embeddable elements, and GrowSurf window (JS + CSS).",
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
        }
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
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
          const growsurf = requireGrowSurfClient(env);
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
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_update_campaign": {
          const growsurf = requireGrowSurfClient(env);
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
          const growsurf = requireGrowSurfClient(env);
          const result = await growsurf.cloneCampaign();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_list_campaign_rewards": {
          const growsurf = requireGrowSurfClient(env);
          const result = await growsurf.listCampaignRewards();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_create_campaign_reward": {
          const growsurf = requireGrowSurfClient(env);
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
          const growsurf = requireGrowSurfClient(env);
          const input = updateCampaignRewardSchema.parse(request.params.arguments ?? {});
          const { campaignRewardId, ...rest } = input;
          const fields = omitUndefined(rest) as Record<string, unknown>;
          const result = await growsurf.updateCampaignReward(campaignRewardId, fields);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_delete_campaign_reward": {
          const growsurf = requireGrowSurfClient(env);
          const input = deleteCampaignRewardSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.deleteCampaignReward(input.campaignRewardId);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_get_campaign_design": {
          const growsurf = requireGrowSurfClient(env);
          const result = await growsurf.getCampaignDesign();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_update_campaign_design": {
          const growsurf = requireGrowSurfClient(env);
          const input = campaignConfigUpdateSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.updateCampaignDesign(input.fields);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_get_campaign_emails": {
          const growsurf = requireGrowSurfClient(env);
          const result = await growsurf.getCampaignEmails();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_update_campaign_emails": {
          const growsurf = requireGrowSurfClient(env);
          const input = campaignConfigUpdateSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.updateCampaignEmails(input.fields);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_get_campaign_options": {
          const growsurf = requireGrowSurfClient(env);
          const result = await growsurf.getCampaignOptions();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_update_campaign_options": {
          const growsurf = requireGrowSurfClient(env);
          const input = campaignConfigUpdateSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.updateCampaignOptions(input.fields);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_get_campaign_installation": {
          const growsurf = requireGrowSurfClient(env);
          const result = await growsurf.getCampaignInstallation();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_update_campaign_installation": {
          const growsurf = requireGrowSurfClient(env);
          const input = campaignConfigUpdateSchema.parse(request.params.arguments ?? {});
          const result = await growsurf.updateCampaignInstallation(input.fields);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_add_participant": {
          const growsurf = requireGrowSurfClient(env);
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
        case "growsurf_trigger_referral": {
          const growsurf = requireGrowSurfClient(env);
          const input = triggerReferralSchema.parse(request.params.arguments ?? {});
          const result = input.participantId
            ? await growsurf.triggerReferralByParticipantId(input.participantId, input.delayInDays)
            : await growsurf.triggerReferralByParticipantEmail(input.participantEmail!, input.delayInDays);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_cancel_delayed_referral": {
          const growsurf = requireGrowSurfClient(env);
          const input = cancelDelayedReferralSchema.parse(request.params.arguments ?? {});
          const result = input.participantId
            ? await growsurf.cancelDelayedReferralByParticipantId(input.participantId)
            : await growsurf.cancelDelayedReferralByParticipantEmail(input.participantEmail!);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_record_sale": {
          const growsurf = requireGrowSurfClient(env);
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
          const growsurf = requireGrowSurfClient(env);
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
          const growsurf = requireGrowSurfClient(env);
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
        default:
          return { content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }], isError: true };
      }
    } catch (err) {
      return { content: [{ type: "text", text: toToolErrorText(err) }], isError: true };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
