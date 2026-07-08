import { describe, expect, it } from "vitest";
import { renderClientSnippets, renderInstallKit, renderIntegrationGuide } from "../src/growsurf/installKit.js";

describe("renderInstallKit", () => {
  const kit = renderInstallKit({ campaignId: "abc123" });

  it("bakes the real campaign id in literally (not a placeholder)", () => {
    expect(kit).toContain("abc123");
    expect(kit).not.toContain("REPLACE_WITH_CAMPAIGN_ID");
    expect(kit).not.toContain("YOUR_CAMPAIGN_ID");
  });

  it("includes the Universal Code grsfSettings bootstrap with the real id", () => {
    expect(kit).toContain("grsfSettings");
    expect(kit).toContain('campaignId:"abc123"');
  });

  it("includes the verify-install checklist heading", () => {
    expect(kit).toContain("## How to verify your install");
    expect(kit).toContain("referrer GrowSurf Window");
    expect(kit).toContain("sticky banner and inline heading");
    expect(kit).toContain("browser tab title");
  });

  it("documents the ?grsf= share-url attribution param", () => {
    expect(kit).toContain("?grsf=");
  });

  it("renders the top-level install-kit title", () => {
    expect(kit).toContain("# GrowSurf install kit");
  });

  it("applies defaults (both program flows) when options are omitted", () => {
    // referral + affiliate sections both render under the default programType "both".
    expect(kit).toContain("Referral program flow");
    expect(kit).toContain("Affiliate program flow");
  });

  it("includes a connect-integrations section with a real editor deep link and the tool reference", () => {
    expect(kit).toContain("### Connect integrations");
    // The link is baked with the real program id (no placeholder) and the editor path.
    expect(kit).toContain("app.growsurf.com/editor/abc123/options/integrations?integration=<key>");
    expect(kit).toContain("growsurf_get_integration_connect_link");
    // Tango Card is surfaced as a connectable gift-card integration.
    expect(kit).toContain("Tango Card");
  });

  it("tells the agent to recommend integrations from the user's stack, not just ask", () => {
    // Recommend-first + context-aware guidance (read the codebase, map stack -> integration).
    expect(kit).toContain("read the user's codebase and stack");
    expect(kit).toContain("Recommend, don't just ask");
    expect(kit).toContain("Billing / payments");
    expect(kit).toContain("CRM (B2B signals)");
    expect(kit).toContain("Salesforce");
    // Prompts are woven into the real steps: referral tracking + affiliate payout.
    expect(kit).toContain("recommend connecting that billing integration so referred purchases are tracked");
    expect(kit).toContain("Pay commissions");
  });

  it("steers agents to review starter content and the GrowSurf Window before patching configs", () => {
    const guide = renderIntegrationGuide(
      {
        programType: "both",
        participantAuthEnabled: false,
        referralTrigger: "signup_plus_qualifying_action",
        singlePageApp: false,
        webhookSecurity: "token_in_url",
      },
      { campaignId: "abc123" },
    );

    expect(guide).toContain("starter Design, Emails, Options, Installation, and GrowSurf Window content");
    expect(guide).toContain("Preserve that starter content");
  });

  it("points embeddable UI work at a frontend design workflow when one is available", () => {
    const snippets = renderClientSnippets({
      programType: "referral",
      participantAuthEnabled: false,
      referralTrigger: "signup_plus_qualifying_action",
      singlePageApp: false,
      includeEmbeddableElements: true,
      includeGrowSurfWindow: true,
      includeUnreadBadge: true,
      includeEventSubscriptions: false,
    });

    expect(snippets).toContain("frontend-design");
    expect(snippets).toContain("GrowSurf Window");
  });

  it("never recommends a non-connectable integration (excluded from the registry)", () => {
    // Pipedrive, Chargify, and XTRM cards are commented out in the dashboard, so a deep link to
    // them is dead and the connect-link tool rejects them — they must not appear as suggestions.
    expect(kit).not.toContain("Pipedrive");
    expect(kit).not.toContain("Chargify");
    expect(kit).not.toContain("XTRM");
  });

  it("fully tailors an affiliate guide: no referral-only integrations anywhere", () => {
    // Chargebee, Recurly, and Tango Card are hidden on affiliate programs (hideForAffiliatePrograms),
    // so a deep link to them from an affiliate program opens to a missing card. An affiliate-only
    // guide must recommend only affiliate-visible options (Stripe for tracking, PayPal for payouts).
    const affiliateGuide = renderIntegrationGuide(
      {
        programType: "affiliate",
        participantAuthEnabled: false,
        referralTrigger: "signup",
        singlePageApp: false,
        webhookSecurity: "token_in_url",
      },
      { campaignId: "abc123" },
    );
    expect(affiliateGuide).not.toContain("Tango Card");
    expect(affiliateGuide).not.toContain("Chargebee");
    expect(affiliateGuide).not.toContain("Recurly");
    expect(affiliateGuide).toContain("Stripe");
    expect(affiliateGuide).toContain("PayPal");
    expect(affiliateGuide).toContain("pay affiliate commissions");
  });

  it("fully tailors a referral guide: gift cards + billing trio, no affiliate-commission framing", () => {
    const referralGuide = renderIntegrationGuide(
      {
        programType: "referral",
        participantAuthEnabled: false,
        referralTrigger: "signup_plus_qualifying_action",
        singlePageApp: false,
        webhookSecurity: "token_in_url",
      },
      { campaignId: "abc123" },
    );
    // Tango Card (gift-card rewards) and the full billing trio are referral-relevant.
    expect(referralGuide).toContain("Tango Card");
    expect(referralGuide).toContain("Chargebee");
    expect(referralGuide).toContain("Recurly");
    // Affiliate-commission framing must not appear in a referral-only guide.
    expect(referralGuide).not.toContain("pay affiliate commissions");
  });

  it("does not include referral-only upfront discount snippets for affiliate programs", () => {
    const affiliateSnippets = renderClientSnippets({
      programType: "affiliate",
      participantAuthEnabled: false,
      referralTrigger: "signup",
      singlePageApp: false,
      includeEmbeddableElements: true,
      includeGrowSurfWindow: true,
      includeUnreadBadge: true,
      includeEventSubscriptions: false,
    });

    expect(affiliateSnippets).not.toContain("Upfront discounts for referred friends");
    expect(affiliateSnippets).not.toContain("growsurf.getUpfrontDiscount");
    expect(affiliateSnippets).not.toContain("chargebee");
    expect(affiliateSnippets).not.toContain("recurly");
  });

  it("keeps webhook guidance public-facing without retry implementation details", () => {
    const guide = renderIntegrationGuide(
      {
        programType: "referral",
        participantAuthEnabled: false,
        referralTrigger: "signup_plus_qualifying_action",
        singlePageApp: false,
        webhookSecurity: "token_in_url",
      },
      { campaignId: "abc123" },
    );

    expect(guide).toContain("Webhook security");
    expect(guide).toContain("idempotency key");
    expect(guide).not.toContain("exponential backoff");
    expect(guide).not.toContain("retries with");
  });
});
