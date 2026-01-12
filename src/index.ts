#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { GrowSurfClient, type GrowSurfRequestError } from "./growsurf/client.js";
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
  GROWSURF_API_KEY: z.string().min(1),
  GROWSURF_CAMPAIGN_ID: z.string().min(1),
  GROWSURF_PARTICIPANT_AUTH_SECRET: optionalNonEmptyString(),
  GROWSURF_WEBHOOK_TOKEN: optionalNonEmptyString(),
});

const getEnv = (): z.infer<typeof envSchema> => {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;
  // Throw a clear message for MCP host logs.
  const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "env"}: ${i.message}`).join("; ");
  throw new Error(`Invalid environment. ${issues}`);
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

/**
 * Tool: Guided implementation plan.
 */
const integrationGuideInputSchema = z.object({
  programType: z.enum(["referral", "affiliate", "both"]).default("both"),
  participantAuthEnabled: z.boolean().default(false),
  referralTrigger: z.enum(["signup", "signup_plus_qualifying_action"]).default("signup_plus_qualifying_action"),
  singlePageApp: z.boolean().default(false),
  webhookSecurity: z.enum(["token_in_url", "none"]).default("token_in_url"),
});

const renderIntegrationGuide = (input: z.infer<typeof integrationGuideInputSchema>, env: z.infer<typeof envSchema>) => {
  const campaignId = env.GROWSURF_CAMPAIGN_ID;
  const hasWebhookToken = Boolean(env.GROWSURF_WEBHOOK_TOKEN?.trim());

  const sections: string[] = [];

  sections.push(
    [
      "## GrowSurf integration guide (happy path)",
      "",
      `- **Campaign ID**: \`${campaignId}\``,
      "- **Universal Code**: install the program-specific snippet from GrowSurf (Program Editor → Installation).",
      "",
    ].join("\n"),
  );

  sections.push(
    [
      "### 1) Install GrowSurf Universal Code",
      "",
      "- Paste the **GrowSurf Universal Code** into your site `<head>` (per GrowSurf docs).",
      "- Ensure your site origin matches the **Share URL / Signup URL** configured in GrowSurf.",
      "",
    ].join("\n"),
  );

  if (input.participantAuthEnabled) {
    sections.push(
      [
        "### 2) Participant authentication (optional but common)",
        "",
        "- Enable **Participant authentication/login** in GrowSurf and generate a **Participant Auth Secret**.",
        "- On your server, compute:",
        "  - `hash = HMAC_SHA256(participantAuthSecret, email).hex`",
        "- Then initialize GrowSurf on the client with `{ email, hash }`.",
        "",
        "You can use the MCP tool `growsurf_participant_auth_hash` to compute the hash during implementation/testing (keep secrets server-side in production).",
        "",
      ].join("\n"),
    );
  }

  if (input.programType === "referral" || input.programType === "both") {
    sections.push(
      [
        "### 3) Referral program flow",
        "",
        "- **On signup**: add the participant.",
        "  - Client-side option: `growsurf.addParticipant({ email, firstName, lastName, ...metadata })`.",
        "  - Server-side option: call GrowSurf REST **Add Participant** and pass `referredBy` when you have it.",
        "",
        "- **If your referral trigger is “Sign up + Qualifying Action”**:",
        "  - When the user completes the qualifying action (purchase, activation, etc.), call **Trigger Referral**.",
        "",
        `- **Your configured trigger**: \`${input.referralTrigger}\``,
        "",
        "MCP tools you’ll likely use:",
        "- `growsurf_add_participant`",
        "- `growsurf_trigger_referral` (only needed for `signup_plus_qualifying_action`)",
        "- `growsurf_get_campaign` (to inspect rewards/type quickly)",
        "",
      ].join("\n"),
    );
  }

  if (input.programType === "affiliate" || input.programType === "both") {
    sections.push(
      [
        "### 4) Affiliate program flow",
        "",
        "- **On signup**: add the participant (this generates their share URL).",
        "- **On sale/payment event** for a referred customer: record a transaction via GrowSurf REST.",
        "  - Use `invoiceId` / `chargeId` / `paymentIntentId` / etc. to ensure idempotency.",
        "  - Commissions are generated **asynchronously**; use webhooks to receive them.",
        "",
        "MCP tools you’ll likely use:",
        "- `growsurf_add_participant`",
        "- `growsurf_record_sale`",
        "- `growsurf_webhook_normalize`",
        "",
      ].join("\n"),
    );
  }

  sections.push(
    [
      "### 5) Webhooks (recommended)",
      "",
      "- Configure a webhook URL in GrowSurf (Program Editor → Options → Webhooks).",
      "- GrowSurf retries with exponential backoff on failures.",
      "",
      "#### Webhook security",
      "",
      "GrowSurf’s docs don’t specify signed webhook headers. The simplest practical approach is to:",
      "- Add a **random token** in your webhook URL (path or querystring) and verify it server-side.",
      "- Validate the payload shape and use an **idempotency key** for safe retries.",
      "",
      hasWebhookToken
        ? `- **Detected**: \`GROWSURF_WEBHOOK_TOKEN\` is set; you can enforce it in your handler.`
        : "- **Tip**: set `GROWSURF_WEBHOOK_TOKEN` and include it in your webhook URL.",
      "",
      "Use the MCP tool `growsurf_webhook_normalize` to normalize events and generate a best-effort idempotency key.",
      "",
    ].join("\n"),
  );

  if (input.singlePageApp) {
    sections.push(
      [
        "### 6) Single Page Apps",
        "",
        "- If you’re an SPA and you re-render/auth changes without full reload, you may need to reinitialize GrowSurf using `growsurf.init()` when the user logs in/out.",
        "",
      ].join("\n"),
    );
  }

  sections.push(
    [
      "### 7) What this MCP server does / does not do",
      "",
      "- It **calls GrowSurf REST** for happy-path server-side actions (campaign, add participant, trigger referral, record sale).",
      "- It **guides implementation** and helps compute participant-auth hashes.",
      "- It **does not** embed the Universal Code for you (you copy that snippet from GrowSurf).",
      "- It **does not** host a webhook endpoint (you run that in your app), but it can normalize/validate payloads.",
      "",
    ].join("\n"),
  );

  return sections.join("\n");
};

const addParticipantSchema = z.object({
  email: z.string().min(3),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  referredBy: z.string().min(1).optional(),
  referralStatus: z.enum(["CREDIT_PENDING", "CREDIT_AWARDED", "CREDIT_EXPIRED"]).optional(),
  ipAddress: z.string().min(1).optional(),
  fingerprint: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const triggerReferralSchema = z
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

const participantAuthHashSchema = z.object({
  email: z.string().min(3),
  participantAuthSecret: z.string().min(1).optional(),
});

const webhookNormalizeSchema = z.object({
  payload: z.unknown(),
});

const clientSnippetsSchema = z.object({
  programType: z.enum(["referral", "affiliate", "both"]).default("both"),
  participantAuthEnabled: z.boolean().default(false),
  referralTrigger: z.enum(["signup", "signup_plus_qualifying_action"]).default("signup_plus_qualifying_action"),
  singlePageApp: z.boolean().default(false),
  includeEmbeddableElements: z.boolean().default(true),
  includeGrowSurfWindow: z.boolean().default(true),
  includeUnreadBadge: z.boolean().default(true),
  includeEventSubscriptions: z.boolean().default(false),
});

const embeddableElementSchema = z.object({
  element: z.enum(["form", "invite", "rewards", "referral_status", "affiliate_summary", "commissions", "payouts"]),
  withAuthAttributes: z.boolean().default(false),
  participant: z
    .object({
      email: z.string().min(3),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
    })
    .optional(),
});

const grsfConfigSnippetSchema = z
  .object({
    /**
     * If true, outputs campaignId as the literal string "REPLACE_WITH_CAMPAIGN_ID"
     * to match GrowSurf's docs snippet format.
     */
    useCampaignIdPlaceholder: z.boolean().default(true),
    /**
     * Only used when useCampaignIdPlaceholder is false.
     * If omitted, we'll default to GROWSURF_CAMPAIGN_ID from env.
     */
    campaignId: z.string().min(1).optional(),
    /**
     * If true, outputs window.grsfConfig as enabled (not commented) using email/hash.
     * If false, outputs the docs-style commented block with placeholder values.
     */
    enableParticipantAutoAuth: z.boolean().default(false),
    email: z.string().min(3).optional(),
    hash: z.string().min(32).optional(),
    /**
     * GrowSurf's docs snippet includes the comment header above the auto-auth block.
     */
    includeAutoAuthCommentHeader: z.boolean().default(true),
  })
  .refine((v) => !v.enableParticipantAutoAuth || (Boolean(v.email) && Boolean(v.hash)), {
    message: "If enableParticipantAutoAuth is true, provide email and hash.",
  });

const renderClientSnippets = (input: z.infer<typeof clientSnippetsSchema>, env: z.infer<typeof envSchema>) => {
  const lines: string[] = [];

  lines.push("## GrowSurf client-side snippets");
  lines.push("");
  lines.push("- Prereq: install your **GrowSurf Universal Code** on the page.");
  lines.push("- Always call `growsurf.*` APIs after GrowSurf has loaded (use the `grsfReady` event listener).");
  lines.push("");

  lines.push("### Referral tracking (JS SDK)");
  lines.push("");
  lines.push("```html");
  lines.push("<script>");
  lines.push("  document.addEventListener('grsfReady', async () => {");
  lines.push("    // 1) On signup/login, create or fetch the participant (generates shareUrl).");
  lines.push("    // await growsurf.addParticipant({ email: user.email, firstName: user.firstName, lastName: user.lastName });");
  lines.push("");
  lines.push("    // 2) Optional: if you want to only add referred users, check referrer id first.");
  lines.push("    // const referrerId = growsurf.getReferrerId(); // null if not referred");
  lines.push("    // if (referrerId) await growsurf.addParticipant({ email: user.email, referredBy: referrerId });");
  lines.push("");
  if (input.programType === "referral" || input.programType === "both") {
    lines.push("    // 3) Referral programs only: trigger referral credit when qualifying action occurs (if configured).");
    lines.push(
      input.referralTrigger === "signup_plus_qualifying_action"
        ? "    // await growsurf.triggerReferral({ email: user.email });"
        : "    // (Not needed if your trigger is 'Sign Up' because credit is awarded on signup.)",
    );
    lines.push("");
  }
  if (input.includeEventSubscriptions) {
    lines.push("    // 4) Optional: subscribe to GrowSurf client events");
    lines.push("    // growsurf.subscribe('referral', (data) => console.log('referral', data));");
    lines.push("    // growsurf.subscribe('share', (data) => console.log('share', data));");
    lines.push("    // growsurf.subscribe('invite', (data) => console.log('invite', data));");
    lines.push("");
  }
  lines.push("  });");
  lines.push("</script>");
  lines.push("```");
  lines.push("");

  if (input.participantAuthEnabled) {
    lines.push("### Participant auto-auth (if authentication is enabled)");
    lines.push("");
    lines.push("- Compute `hash = HMAC_SHA256(participantAuthSecret, email).hex` on your server.");
    lines.push("- Then on the client you can reinitialize GrowSurf after login:");
    lines.push("");
    lines.push("```html");
    lines.push("<script>");
    lines.push("  document.addEventListener('grsfReady', async () => {");
    lines.push("    // await growsurf.init({ email: user.email, hash: user.growsurfHash });");
    lines.push("  });");
    lines.push("</script>");
    lines.push("```");
    lines.push("");
    if (env.GROWSURF_PARTICIPANT_AUTH_SECRET) {
      lines.push("- Tip: you can compute the hash with MCP tool `growsurf_participant_auth_hash` while implementing.");
      lines.push("");
    }
  }

  if (input.includeGrowSurfWindow) {
    lines.push("### GrowSurf window (JS + CSS)");
    lines.push("");
    lines.push("**JS method:**");
    lines.push("");
    lines.push("```html");
    lines.push("<button id=\"refer\">Refer and Earn</button>");
    lines.push("<script>");
    lines.push("  document.addEventListener('grsfReady', () => {");
    lines.push("    document.getElementById('refer')?.addEventListener('click', () => growsurf.open());");
    lines.push("  });");
    lines.push("</script>");
    lines.push("```");
    lines.push("");
    lines.push("**CSS class alternative:**");
    lines.push("");
    lines.push("```html");
    lines.push("<a class=\"growsurf-open-window\">Refer and Earn</a>");
    lines.push("```");
    lines.push("");
  }

  if (input.includeUnreadBadge) {
    lines.push("### Unread notifications badge (optional)");
    lines.push("");
    lines.push("**JS method:**");
    lines.push("");
    lines.push("```html");
    lines.push("<a class=\"my-button\">Refer and Earn</a>");
    lines.push("<script>");
    lines.push("  document.addEventListener('grsfReady', () => {");
    lines.push("    growsurf.initUnreadNotificationsBadge('.my-button');");
    lines.push("  });");
    lines.push("</script>");
    lines.push("```");
    lines.push("");
    lines.push("**CSS class alternative:**");
    lines.push("");
    lines.push("```html");
    lines.push("<a class=\"my-button growsurf-unread-notifications-badge\">Refer and Earn</a>");
    lines.push("```");
    lines.push("");
  }

  if (input.includeEmbeddableElements) {
    lines.push("### Embeddable elements");
    lines.push("");
    lines.push("- Add one-line HTML blocks like:");
    lines.push("```html");
    lines.push("<div data-grsf-block-form></div>");
    lines.push("<div data-grsf-block-invite></div>");
    lines.push("<div data-grsf-block-rewards></div>");
    lines.push("```");
    lines.push("");
    lines.push("- If you dynamically change `data-grsf-*` attributes and rendering doesn’t update, you can force re-render:");
    lines.push("```html");
    lines.push("<script>");
    lines.push("  document.addEventListener('grsfReady', () => {");
    lines.push("    // growsurf.initElements();");
    if (input.singlePageApp) {
      lines.push("    // For some SPAs you may need: growsurf.init();");
    }
    lines.push("  });");
    lines.push("</script>");
    lines.push("```");
    lines.push("");
    lines.push("Use MCP tool `growsurf_embeddable_element_snippet` to generate the exact HTML block for a specific element.");
    lines.push("");
  }

  return lines.join("\n");
};

const renderGrsfConfigSnippet = (input: z.infer<typeof grsfConfigSnippetSchema>, env: z.infer<typeof envSchema>) => {
  const campaignId = input.useCampaignIdPlaceholder ? "REPLACE_WITH_CAMPAIGN_ID" : (input.campaignId ?? env.GROWSURF_CAMPAIGN_ID);
  const lines: string[] = [];
  lines.push("## GrowSurf Universal Code wrapper (docs-style)");
  lines.push("");
  lines.push("- Put this in your page `<head>`.");
  lines.push("- Make sure `campaignId` matches your GrowSurf program/campaign.");
  lines.push("");
  lines.push("```html");
  lines.push("<script type=\"text/javascript\">");
  if (input.includeAutoAuthCommentHeader) {
    lines.push(
      "  /* To enable Participant Auto Authentication for your logged-in users, uncomment this code below (https://docs.growsurf.com/getting-started/participant-auto-authentication) */",
    );
  }
  if (input.enableParticipantAutoAuth) {
    lines.push("  window.grsfConfig = {");
    lines.push(`    email: ${JSON.stringify(input.email)},// Replace this with the participant's email address`);
    lines.push(`    hash: ${JSON.stringify(input.hash)} // Replace this with the SHA-256 HMAC value`);
    lines.push("  };");
  } else {
    lines.push("  /*");
    lines.push("  window.grsfConfig = {");
    lines.push("    email: \"participant@email.com\",// Replace this with the participant's email address");
    lines.push("    hash: \"HASH_VALUE\" // Replace this with the SHA-256 HMAC value");
    lines.push("  };");
    lines.push("  */");
  }
  lines.push(
    `  (function(g,r,s,f){g.grsfSettings={campaignId:${JSON.stringify(campaignId)},version:"2.0.0"};s=r.getElementsByTagName("head")[0];f=r.createElement("script");f.async=1;f.src="https://app.growsurf.com/growsurf.js"+"?v="+g.grsfSettings.version;f.setAttribute("grsf-campaign", g.grsfSettings.campaignId);!g.grsfInit?s.appendChild(f):"";})(window,document);`,
  );
  lines.push("</script>");
  lines.push("```");
  return lines.join("\n");
};

const renderEmbeddableElementSnippet = (input: z.infer<typeof embeddableElementSchema>) => {
  const attrFor = (k: string, v: string) => ` ${k}="${v.replaceAll('"', "&quot;")}"`;
  const participant = input.participant;
  const shouldIncludeAuth = input.withAuthAttributes && participant;

  const emailAttr = shouldIncludeAuth ? attrFor("data-grsf-email", participant.email) : "";
  const firstNameAttr = shouldIncludeAuth && participant.firstName ? attrFor("data-grsf-first-name", participant.firstName) : "";
  const lastNameAttr = shouldIncludeAuth && participant.lastName ? attrFor("data-grsf-last-name", participant.lastName) : "";

  const blocks: Record<(typeof input)["element"], { title: string; attr: string; note: string }> = {
    form: { title: "Embedded Form", attr: "data-grsf-block-form", note: "Shows signup form for non-participants; share link + social buttons for participants." },
    invite: { title: "Embedded Invite", attr: "data-grsf-block-invite", note: "Lets signed-in participants send bulk email invites." },
    rewards: { title: "Embedded Rewards", attr: "data-grsf-block-rewards", note: "Shows participant rewards (signed-in participants)." },
    referral_status: { title: "Embedded Referral Status", attr: "data-grsf-block-referral-status", note: "Shows referral status (signed-in participants)." },
    affiliate_summary: { title: "Embedded Affiliate Summary", attr: "data-grsf-block-affiliate-summary", note: "Shows affiliate summary stats (affiliate programs; signed-in participants)." },
    commissions: { title: "Embedded Commissions", attr: "data-grsf-block-commissions", note: "Shows commission list (affiliate programs; signed-in participants)." },
    payouts: { title: "Embedded Payouts", attr: "data-grsf-block-payouts", note: "Shows payout list (affiliate programs; signed-in participants)." },
  };

  const block = blocks[input.element];
  const html = `<div ${block.attr}${emailAttr}${firstNameAttr}${lastNameAttr}></div>`;

  return [
    `## ${block.title}`,
    "",
    "- Prereq: ensure the GrowSurf Universal Code is installed on this page.",
    `- Note: ${block.note}`,
    "",
    "```html",
    html,
    "```",
  ].join("\n");
};

const main = async () => {
  const env = getEnv();
  const growsurf = new GrowSurfClient({ apiKey: env.GROWSURF_API_KEY, campaignId: env.GROWSURF_CAMPAIGN_ID });

  const server = new Server(
    {
      name: "growsurf-mcp",
      version: "0.1.0",
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
              metadata: { type: "object", additionalProperties: true },
            },
            required: ["email"],
            additionalProperties: false,
          },
        },
        {
          name: "growsurf_trigger_referral",
          description:
            "Trigger referral credit for a referred participant (use when your trigger is Sign up + Qualifying Action).",
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
                enum: ["form", "invite", "rewards", "referral_status", "affiliate_summary", "commissions", "payouts"]
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
          const text = renderIntegrationGuide(input, env);
          return { content: [{ type: "text", text }] };
        }
        case "growsurf_get_campaign": {
          const result = await growsurf.getCampaign();
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_add_participant": {
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
          const input = triggerReferralSchema.parse(request.params.arguments ?? {});
          const result = input.participantId
            ? await growsurf.triggerReferralByParticipantId(input.participantId)
            : await growsurf.triggerReferralByParticipantEmail(input.participantEmail!);
          return { content: [{ type: "text", text: safeJson(result) }] };
        }
        case "growsurf_record_sale": {
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
          const text = renderClientSnippets(input, env);
          return { content: [{ type: "text", text }] };
        }
        case "growsurf_embeddable_element_snippet": {
          const input = embeddableElementSchema.parse(request.params.arguments ?? {});
          const text = renderEmbeddableElementSnippet(input);
          return { content: [{ type: "text", text }] };
        }
        case "growsurf_grsf_config_snippet": {
          const input = grsfConfigSnippetSchema.parse(request.params.arguments ?? {});
          const text = renderGrsfConfigSnippet(input, env);
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

