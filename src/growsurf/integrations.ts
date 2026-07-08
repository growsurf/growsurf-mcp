/**
 * Registry of the integrations a GrowSurf customer connects themselves in the
 * dashboard (Program Editor > Options > Integrations), plus a helper that builds
 * the deep link which opens a specific integration's connect panel.
 *
 * Dependency-free (no MCP internals, no zod) so `installKit.ts` and the sibling
 * `./install-kit` package export can import it without pulling anything else in.
 *
 * Source of truth for the keys and labels is the dashboard app,
 * `growsurf-app/src/components/campaign-integrations.js` (`availableIntegrations`)
 * and its `localized-en.json`. The `key` here must equal the app card's
 * `integration.id` exactly, because that is the value the dashboard matches
 * against the `?integration=` query param to auto-open a card. Most ids are
 * lowercase, but a few are camelCase (`constantContact`, `campaignMonitor`,
 * `helpScout`, `pabblyConnect`, `baskHealth`) and must be kept verbatim.
 *
 * XTRM, Chargify, and Pipedrive are intentionally excluded: their catalog cards
 * are commented out in the app, so they are not currently user-connectable.
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
  /** Deep-link key. Must equal the dashboard card's `integration.id` exactly. */
  key: string;
  /** Human display label, taken from the dashboard. */
  label: string;
  category: IntegrationCategory;
  /**
   * True when the integration is hidden on affiliate programs (it only applies
   * to referral programs). Mirrors the app's `hideForAffiliatePrograms` flag.
   */
  referralOnly?: boolean;
};

export const INTEGRATIONS: readonly Integration[] = [
  // Payments & billing
  { key: "stripe", label: "Stripe", category: "Payments & billing" },
  { key: "chargebee", label: "Chargebee", category: "Payments & billing", referralOnly: true },
  { key: "recurly", label: "Recurly", category: "Payments & billing", referralOnly: true },
  // Payouts & gift cards
  { key: "paypal", label: "PayPal", category: "Payouts & gift cards" },
  { key: "tangocard", label: "Tango Card", category: "Payouts & gift cards", referralOnly: true },
  // CRM & marketing automation
  { key: "hubspot", label: "HubSpot", category: "CRM & marketing automation" },
  { key: "salesforce", label: "Salesforce", category: "CRM & marketing automation" },
  { key: "marketo", label: "Marketo", category: "CRM & marketing automation" },
  // Email & ESP
  { key: "mailchimp", label: "Mailchimp", category: "Email & ESP" },
  { key: "activecampaign", label: "ActiveCampaign", category: "Email & ESP" },
  { key: "bentonow", label: "Bento", category: "Email & ESP" },
  { key: "mailerlite", label: "MailerLite", category: "Email & ESP" },
  { key: "convertkit", label: "ConvertKit", category: "Email & ESP" },
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
  { key: "baskHealth", label: "Bask Health", category: "Other" },
] as const;

/** All connectable integration keys, in registry order. */
export const INTEGRATION_KEYS: readonly string[] = INTEGRATIONS.map((i) => i.key);

/** Look up one integration by its deep-link key. */
export const getIntegration = (key: string): Integration | undefined =>
  INTEGRATIONS.find((i) => i.key === key);

/**
 * Build the dashboard deep link that opens a specific integration's connect
 * panel in the Program Editor. `campaignId` is the program's public id — the
 * same value the REST API uses as the campaign id, which is also the editor URL
 * slug — so no lookup is needed to construct the link.
 */
export const buildIntegrationConnectUrl = (campaignId: string, integrationKey: string): string =>
  `${DASHBOARD_BASE_URL}/editor/${encodeURIComponent(campaignId)}/options/integrations` +
  `?integration=${encodeURIComponent(integrationKey)}`;
