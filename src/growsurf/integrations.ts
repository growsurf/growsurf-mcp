/**
 * Registry of the integrations a GrowSurf customer connects themselves in the
 * dashboard (Program Editor > Options > Integrations), plus a helper that builds
 * the deep link which opens a specific integration's connect panel.
 *
 * Dependency-free (no MCP internals, no zod) so `installKit.ts` and the sibling
 * `./install-kit` package export can import it without pulling anything else in.
 *
 * Mirrors the integration catalog shown in the GrowSurf dashboard. The `key`
 * here must equal the dashboard card's `integration.id` exactly, because that
 * is the value the dashboard matches against the `?integration=` query param
 * to auto-open a card. Most ids are lowercase, but a few are camelCase
 * (`constantContact`, `campaignMonitor`, `helpScout`, `pabblyConnect`,
 * `baskHealth`) and must be kept verbatim.
 *
 * XTRM, Chargify, and Pipedrive are not currently offered in the dashboard
 * catalog and are intentionally excluded.
 */

export const DASHBOARD_BASE_URL = "https://app.growsurf.com";

export const INTEGRATION_CATEGORIES = [
  "Payments & billing",
  "Payouts & gift cards",
  "CRM & marketing automation",
  "Email & ESP",
  "Analytics",
  "Ads",
  "Messaging & support",
  "Automation",
  "Custom & webhooks",
  "Other",
] as const;

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export type Integration = {
  /**
   * Public integration key. Matches the id the REST API reports and the key the
   * client/JS SDK emits in `campaign.integrations`, so every GrowSurf surface
   * calls an integration by the same name.
   */
  key: string;
  /**
   * The dashboard card's `integration.id`, set only where it differs from `key`.
   * That id is what the editor matches against the `?integration=` query param,
   * and Tango Card is the one place the two spellings diverge.
   */
  cardId?: string;
  /**
   * Human display label, taken from the dashboard. Kit and Brevo additionally carry their former
   * brand name (`Kit (formerly ConvertKit)`, `Brevo (formerly Sendinblue)`) so an agent matches a
   * customer who still says "ConvertKit" or "Sendinblue"; the dashboard and the REST API report the
   * current name alone.
   */
  label: string;
  category: IntegrationCategory;
  /**
   * True when the integration is hidden on affiliate programs (it only applies
   * to referral programs). Mirrors the app's `hideForAffiliatePrograms` flag.
   */
  referralOnly?: boolean;
  /** True when the integration applies to affiliate programs only. */
  affiliateOnly?: boolean;
};

export const INTEGRATIONS: readonly Integration[] = [
  // Payments & billing
  { key: "stripe", label: "Stripe", category: "Payments & billing" },
  { key: "chargebee", label: "Chargebee", category: "Payments & billing" },
  { key: "recurly", label: "Recurly", category: "Payments & billing" },
  // Payouts & gift cards
  { key: "paypal", label: "PayPal", category: "Payouts & gift cards" },
  { key: "wisecom", label: "Wise", category: "Payouts & gift cards", affiliateOnly: true },
  { key: "tangoCard", cardId: "tangocard", label: "Tango Card", category: "Payouts & gift cards", referralOnly: true },
  { key: "tremendous", label: "Tremendous", category: "Payouts & gift cards", referralOnly: true },
  // CRM & marketing automation
  { key: "hubspot", label: "HubSpot", category: "CRM & marketing automation" },
  { key: "salesforce", label: "Salesforce", category: "CRM & marketing automation" },
  { key: "marketo", label: "Marketo", category: "CRM & marketing automation" },
  // Email & ESP
  { key: "mailchimp", label: "Mailchimp", category: "Email & ESP" },
  { key: "activecampaign", label: "ActiveCampaign", category: "Email & ESP" },
  { key: "braze", label: "Braze", category: "Email & ESP" },
  { key: "bentonow", label: "Bento", category: "Email & ESP" },
  { key: "mailerlite", label: "MailerLite", category: "Email & ESP" },
  { key: "resenddotcom", label: "Resend", category: "Email & ESP" },
  { key: "loopsdotso", label: "Loops", category: "Email & ESP" },
  { key: "convertkit", label: "Kit (formerly ConvertKit)", category: "Email & ESP" },
  { key: "constantContact", label: "Constant Contact", category: "Email & ESP" },
  { key: "campaignMonitor", label: "Campaign Monitor", category: "Email & ESP" },
  { key: "aweber", label: "AWeber", category: "Email & ESP" },
  { key: "klaviyo", label: "Klaviyo", category: "Email & ESP" },
  { key: "mailjet", label: "Mailjet", category: "Email & ESP" },
  { key: "sendgrid", label: "SendGrid", category: "Email & ESP" },
  { key: "sendinblue", label: "Brevo (formerly Sendinblue)", category: "Email & ESP" },
  { key: "emailoctopus", label: "EmailOctopus", category: "Email & ESP" },
  { key: "customerio", label: "Customer.io", category: "Email & ESP" },
  { key: "getresponse", label: "GetResponse", category: "Email & ESP" },
  { key: "drip", label: "Drip", category: "Email & ESP" },
  // Analytics
  { key: "googleanalytics", label: "Google Analytics", category: "Analytics" },
  { key: "segmentanalytics", label: "Segment", category: "Analytics" },
  { key: "posthoganalytics", label: "PostHog", category: "Analytics" },
  { key: "mixpanelanalytics", label: "Mixpanel", category: "Analytics" },
  { key: "pendo", label: "Pendo", category: "Analytics" },
  { key: "fullstory", label: "Fullstory", category: "Analytics" },
  { key: "heapanalytics", label: "Heap", category: "Analytics" },
  { key: "amplitude", label: "Amplitude", category: "Analytics" },
  // Ads
  { key: "googleads", label: "Google Ads", category: "Ads" },
  { key: "metaads", label: "Meta Ads", category: "Ads" },
  { key: "linkedinads", label: "LinkedIn Ads", category: "Ads" },
  { key: "twitterads", label: "X (Twitter) Ads", category: "Ads" },
  // Messaging & support
  { key: "slack", label: "Slack", category: "Messaging & support" },
  { key: "intercom", label: "Intercom", category: "Messaging & support" },
  { key: "helpScout", label: "Help Scout", category: "Messaging & support" },
  // Automation
  { key: "zapier", label: "Zapier", category: "Automation" },
  { key: "integromat", label: "Make", category: "Automation" },
  { key: "pabblyConnect", label: "Pabbly Connect", category: "Automation" },
  // Custom & webhooks
  { key: "webhook", label: "Webhooks", category: "Custom & webhooks" },
  // Other
  { key: "baskHealth", label: "Bask Health", category: "Other", referralOnly: true },
] as const;

/** All connectable integration keys, in registry order. */
export const INTEGRATION_KEYS: readonly string[] = INTEGRATIONS.map((i) => i.key);

/**
 * Keys that earlier releases accepted and that callers may still send. Tango Card shipped as
 * `tangocard` before its key was aligned with the id the REST API and the JS SDK report, so it is
 * still accepted on input rather than failing validation for an agent that learned the old value.
 */
export const LEGACY_INTEGRATION_KEY_ALIASES: Readonly<Record<string, string>> = { tangocard: "tangoCard" };

/** Every value accepted as an `integration` argument: current keys plus the legacy aliases. */
export const ACCEPTED_INTEGRATION_KEYS: readonly string[] = [
  ...INTEGRATION_KEYS,
  ...Object.keys(LEGACY_INTEGRATION_KEY_ALIASES),
];

/** Look up one integration by its key, accepting a legacy alias. */
export const getIntegration = (key: string): Integration | undefined => {
  const resolved = LEGACY_INTEGRATION_KEY_ALIASES[key] ?? key;
  return INTEGRATIONS.find((i) => i.key === resolved);
};

/**
 * Build the dashboard deep link that opens a specific integration's connect
 * panel in the Program Editor. `campaignId` is the program's public id — the
 * same value the REST API uses as the campaign id, which is also the editor URL
 * slug — so no lookup is needed to construct the link.
 *
 * This is the offline fallback: it always points at the production dashboard.
 * `growsurf_get_integration_connect_link` prefers the `connectUrl` the API
 * returns, which is built for whichever GrowSurf environment answered.
 */
export const buildIntegrationConnectUrl = (campaignId: string, integrationKey: string): string => {
  const cardId = getIntegration(integrationKey)?.cardId ?? integrationKey;
  return (
    `${DASHBOARD_BASE_URL}/editor/${encodeURIComponent(campaignId)}/options/integrations` +
    `?integration=${encodeURIComponent(cardId)}`
  );
};
