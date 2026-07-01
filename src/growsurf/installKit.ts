import { z } from "zod";

/**
 * Minimal env shape the install-kit renderers need, decoupled from the MCP
 * server's `Env`. A sibling CommonJS app (e.g. growsurf-api) renders an install
 * kit by importing this module directly, so it must not depend on MCP internals.
 *
 * Fields are `string | undefined` (not bare `?: string`) so callers can pass
 * values straight from a parsed environment under `exactOptionalPropertyTypes`.
 */
export type InstallKitEnv = {
  campaignId?: string | undefined;
  webhookToken?: string | undefined;
  participantAuthSecret?: string | undefined;
};

/**
 * Options for {@link renderInstallKit}. `campaignId` is required and is baked
 * into the rendered markdown literally (never a placeholder).
 */
export type RenderInstallKitOptions = {
  /** The real, public campaign id. Baked into the output literally. */
  campaignId: string;
  /** Which program flows to document. Defaults to "both". */
  programType?: "referral" | "affiliate" | "both";
  /** Whether participant auto-auth guidance is included. Defaults to false. */
  participantAuthEnabled?: boolean;
  /** Referral trigger model. Defaults to "signup_plus_qualifying_action". */
  referralTrigger?: "signup" | "signup_plus_qualifying_action";
  /** Whether to add single-page-app reinit notes. Defaults to false. */
  singlePageApp?: boolean;
  /** Optional webhook token to reference in the webhook-security section. */
  webhookToken?: string;
  /** Optional participant-auth secret (only used to surface a helper tip). */
  participantAuthSecret?: string;
};

/**
 * Guided, happy-path integration plan renderer.
 */
export const integrationGuideInputSchema = z.object({
  programType: z.enum(["referral", "affiliate", "both"]).default("both"),
  participantAuthEnabled: z.boolean().default(false),
  referralTrigger: z.enum(["signup", "signup_plus_qualifying_action"]).default("signup_plus_qualifying_action"),
  singlePageApp: z.boolean().default(false),
  webhookSecurity: z.enum(["token_in_url", "none"]).default("token_in_url"),
});

export const renderIntegrationGuide = (input: z.infer<typeof integrationGuideInputSchema>, env: InstallKitEnv = {}) => {
  const campaignId = env.campaignId ?? "YOUR_CAMPAIGN_ID";
  const hasWebhookToken = Boolean(env.webhookToken?.trim());

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
        "  - Client-side option: `growsurf.addReferredParticipant({ email, firstName, lastName, ...metadata })` for referral-only signup tracking, or `growsurf.addParticipant(...)` when every signup should join GrowSurf.",
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

  if (input.programType === "referral" || input.programType === "both") {
    sections.push(
      [
        "### Upfront discounts for referred friends",
        "",
        "- If your campaign has **referred reward upfront** enabled, referred visitors can receive a discount code before completing the qualifying action.",
        "- Works with Stripe, Chargebee, or Recurly — GrowSurf auto-creates a coupon/promotion code on the connected platform.",
        "- For custom integrations (no Stripe/Chargebee/Recurly), use the JS SDK:",
        "  - `growsurf.validateReferrer()` — returns `Promise<boolean>`, confirms the referrer is valid without exposing participant data.",
        "  - `growsurf.addReferredParticipant()` — validates the referrer and adds a participant only when the referral is valid.",
        "  - `growsurf.getUpfrontDiscount(integrationType?)` — returns `{ integration, promotionCode, couponId }` or `null`.",
        "",
        "MCP tools you'll likely use:",
        "- `growsurf_client_snippets` (includes upfront discount code examples)",
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
      "- It **guides implementation** for web, backend, and native iOS/Android SDK 0.3.3 paths.",
      "- For native mobile apps, use `growsurf_mobile_sdk_guide` for Mobile SDK, attribution, `trackShare`, and native GrowSurf Window examples.",
      "- It **helps compute participant-auth hashes** and create participant-scoped mobile SDK tokens.",
      "- For broader production REST API coverage, use `growsurf_api_library_snippets` and the official GrowSurf API Libraries: https://docs.growsurf.com/developer-tools/rest-api/api-libraries",
      "- It **does not** embed the Universal Code for you (you copy that snippet from GrowSurf).",
      "- It **does not** host a webhook endpoint (you run that in your app), but it can normalize/validate payloads.",
      "",
    ].join("\n"),
  );

  return sections.join("\n");
};

export const clientSnippetsSchema = z.object({
  programType: z.enum(["referral", "affiliate", "both"]).default("both"),
  participantAuthEnabled: z.boolean().default(false),
  referralTrigger: z.enum(["signup", "signup_plus_qualifying_action"]).default("signup_plus_qualifying_action"),
  singlePageApp: z.boolean().default(false),
  includeEmbeddableElements: z.boolean().default(true),
  includeGrowSurfWindow: z.boolean().default(true),
  includeUnreadBadge: z.boolean().default(true),
  includeEventSubscriptions: z.boolean().default(false),
});

export const embeddableElementSchema = z.object({
  element: z.enum(["form", "invite", "rewards", "referral_status", "referral_summary", "affiliate_summary", "commissions", "payouts"]),
  withAuthAttributes: z.boolean().default(false),
  participant: z
    .object({
      email: z.string().min(3),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
    })
    .optional(),
});

export const grsfConfigSnippetSchema = z
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

export const renderClientSnippets = (input: z.infer<typeof clientSnippetsSchema>, env: InstallKitEnv = {}) => {
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
  lines.push("    // 2) Referral-only signup tracking: adds only when a valid referrer exists.");
  lines.push("    // const result = await growsurf.addReferredParticipant({ email: user.email, firstName: user.firstName, lastName: user.lastName });");
  lines.push("    // if (result.added) console.log(result.participant.shareUrl);");
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

  lines.push("### Upfront discounts for referred friends");
  lines.push("");
  lines.push("If upfront discounts are enabled, referred visitors can receive a discount code **before** completing the qualifying action.");
  lines.push("");
  lines.push("#### `growsurf.validateReferrer(participantId?)`");
  lines.push("");
  lines.push("Validates whether a referrer exists in the campaign. Does not require participant auth and does not expose participant data.");
  lines.push("If `participantId` is omitted, automatically resolves the referrer from the `grsf` URL parameter or browser cookie.");
  lines.push("Returns a `Promise<boolean>`.");
  lines.push("");
  lines.push("```html");
  lines.push("<script>");
  lines.push("  document.addEventListener('grsfReady', async () => {");
  lines.push("    const isValidReferral = await growsurf.validateReferrer();");
  lines.push("    if (isValidReferral) {");
  lines.push("      // Show upfront discount or apply coupon");
  lines.push("    }");
  lines.push("  });");
  lines.push("</script>");
  lines.push("```");
  lines.push("");
  lines.push("#### `growsurf.getUpfrontDiscount(integrationType?)`");
  lines.push("");
  lines.push("Returns the upfront discount promotion code for the current referred visitor. Returns `null` if the visitor was not referred or upfront discount is not enabled.");
  lines.push("`integrationType` is optional: `'stripe'`, `'chargebee'`, or `'recurly'`. If omitted, returns the first available upfront discount.");
  lines.push("");
  lines.push("Returns: `{ integration, promotionCode, couponId }` or `null`.");
  lines.push("");
  lines.push("```html");
  lines.push("<script>");
  lines.push("  document.addEventListener('grsfReady', async () => {");
  lines.push("    const discount = growsurf.getUpfrontDiscount(); // or getUpfrontDiscount('stripe')");
  lines.push("    if (discount) {");
  lines.push("      console.log(discount.integration);   // 'stripe', 'chargebee', or 'recurly'");
  lines.push("      console.log(discount.promotionCode); // e.g. 'GRSF_A1B2C3D4'");
  lines.push("      console.log(discount.couponId);      // the coupon ID on the integration platform");
  lines.push("    }");
  lines.push("  });");
  lines.push("</script>");
  lines.push("```");
  lines.push("");
  lines.push("**Common pattern** — validate the referrer, then apply the upfront discount:");
  lines.push("");
  lines.push("```html");
  lines.push("<script>");
  lines.push("  document.addEventListener('grsfReady', async () => {");
  lines.push("    const isValid = await growsurf.validateReferrer();");
  lines.push("    if (!isValid) return;");
  lines.push("    const discount = growsurf.getUpfrontDiscount('stripe');");
  lines.push("    if (discount) {");
  lines.push("      // Auto-apply discount.promotionCode to Stripe Checkout / Payment Link");
  lines.push("    }");
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
    if (env.participantAuthSecret) {
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

export const renderGrsfConfigSnippet = (input: z.infer<typeof grsfConfigSnippetSchema>, env: InstallKitEnv = {}) => {
  const campaignId = input.useCampaignIdPlaceholder
    ? "REPLACE_WITH_CAMPAIGN_ID"
    : (input.campaignId ?? env.campaignId ?? "REPLACE_WITH_CAMPAIGN_ID");
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

export const renderEmbeddableElementSnippet = (input: z.infer<typeof embeddableElementSchema>) => {
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
    referral_summary: { title: "Embedded Referral Summary", attr: "data-grsf-block-referral-summary", note: "Shows referral summary stats (referral programs; signed-in participants; opt-in via Campaign Editor)." },
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

/**
 * Compose the full `GROWSURF_INSTALL.md` body for one real campaign.
 *
 * Stitches the individual install-kit renderers together under a single set of
 * headings, bakes the real `campaignId` in literally (never a placeholder), and
 * appends a "How to verify your install" checklist. Dependency-free (zod only).
 */
export const renderInstallKit = (options: RenderInstallKitOptions): string => {
  const campaignId = options.campaignId;
  const programType = options.programType ?? "both";
  const participantAuthEnabled = options.participantAuthEnabled ?? false;
  const referralTrigger = options.referralTrigger ?? "signup_plus_qualifying_action";
  const singlePageApp = options.singlePageApp ?? false;
  const webhookToken = options.webhookToken;
  const participantAuthSecret = options.participantAuthSecret;

  const installKitEnv: InstallKitEnv = { campaignId, webhookToken, participantAuthSecret };

  // Universal Code with the real campaign id baked in (no placeholder).
  const universalCode = renderGrsfConfigSnippet(
    grsfConfigSnippetSchema.parse({
      useCampaignIdPlaceholder: false,
      campaignId,
      includeAutoAuthCommentHeader: true,
    }),
    installKitEnv,
  );

  const integrationGuide = renderIntegrationGuide(
    integrationGuideInputSchema.parse({
      programType,
      participantAuthEnabled,
      referralTrigger,
      singlePageApp,
      webhookSecurity: "token_in_url",
    }),
    installKitEnv,
  );

  const embeddedForm = renderEmbeddableElementSnippet(embeddableElementSchema.parse({ element: "form" }));

  const clientSnippets = renderClientSnippets(
    clientSnippetsSchema.parse({
      programType,
      participantAuthEnabled,
      referralTrigger,
      singlePageApp,
    }),
    installKitEnv,
  );

  const sections: string[] = [];

  sections.push(
    [
      "# GrowSurf install kit",
      "",
      `This kit wires GrowSurf into your site for campaign \`${campaignId}\`. Copy each section below in order — every snippet is pre-filled with your real campaign ID (\`${campaignId}\`), so there are no placeholders to replace.`,
    ].join("\n"),
  );

  sections.push(universalCode);
  sections.push(integrationGuide);

  sections.push(
    [
      "## Embed options",
      "",
      "GrowSurf renders its UI from one-line HTML blocks. The most common is the embedded signup/share form:",
    ].join("\n"),
  );
  sections.push(embeddedForm);
  sections.push(
    [
      "Other blocks you can drop in the same way (for signed-in participants): \`data-grsf-block-invite\`, \`data-grsf-block-rewards\`, \`data-grsf-block-referral-status\`, \`data-grsf-block-referral-summary\`, \`data-grsf-block-affiliate-summary\`, \`data-grsf-block-commissions\`, and \`data-grsf-block-payouts\`.",
      "",
      "To open the GrowSurf refer-a-friend window from your own button, call \`growsurf.open()\` on click (or add the \`growsurf-open-window\` CSS class to a link).",
    ].join("\n"),
  );

  sections.push(clientSnippets);

  sections.push(
    [
      "## Origin & Share URL",
      "",
      "Referrals are attributed automatically through the GrowSurf cookie and the \`?grsf=\` share-URL parameter that GrowSurf appends to each participant's share link. When a referred visitor lands on your site with \`?grsf=...\` (or returns with the GrowSurf cookie already set), GrowSurf links them to the referrer.",
      "",
      "For the basic install there is nothing to configure server-side — just make sure your site's origin matches the **Share URL / Signup URL** configured in your GrowSurf program so the cookie is read on the correct domain.",
    ].join("\n"),
  );

  sections.push(
    [
      "## How to verify your install",
      "",
      "- [ ] The GrowSurf Universal Code snippet loads on **every** page (it lives in your \`<head>\`, on all routes).",
      "- [ ] \`window.growsurf\` is defined in the browser console once the page has loaded.",
      "- [ ] A test signup appears as a new participant in your GrowSurf dashboard.",
      "- [ ] After sharing, the generated share URL contains the \`?grsf=\` referral parameter.",
    ].join("\n"),
  );

  return sections.join("\n\n");
};
