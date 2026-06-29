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
  .refine(
    (v) =>
      Boolean(
        v.externalId || v.transactionId || v.orderId || v.paymentId || v.invoiceId || v.paymentIntentId || v.chargeId,
      ),
    {
      message:
        "Provide at least one transaction identifier (externalId, transactionId, orderId, paymentId, invoiceId, paymentIntentId, or chargeId).",
    },
  );

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
            "Generate native iOS/Android SDK 0.3.2 guidance, including attribution, shareUrl sharing, trackShare, and the native GrowSurf Window.",
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
            "Record a sale/transaction for an affiliate program (commissions generate asynchronously; use webhooks).",
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
