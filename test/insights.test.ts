import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_TROUBLESHOOTING_PLAYBOOK,
  buildProgramDesignAdvice,
  matchPlaybookSymptom,
  programDesignAdvisorInputSchema,
  renderProgramDesignAdvisor,
  renderTroubleshootingGuide,
  troubleshootReferralTrackingInputSchema,
  type GrowSurfInsightsBundle,
} from "../src/growsurf/insights.js";
import { createGrowSurfMcpServer } from "../src/index.js";
import { createToolInputGuard } from "../src/toolInputValidation.js";

// A small bundle in the shape a hosted deployment loads: cuts exist as objects whose individual
// figures may be null when withheld, exactly like the generated bundle. All figures below are invented test data.
const summary = (median: number, q1: number, q3: number, programCount = 20) => ({ programCount, median, q1, q3 });

const FIXTURE_BUNDLE = {
  programDesign: {
    scopes: { high_performing: { sentence: "Based on the highest-performing test programs." } },
    platform: {
      scope: "high_performing",
      programCount: 100,
      results: { successfulReferrals: summary(1000, 500, 2000, 100), participantToReferralPercent: summary(15, 4, 50, 100) },
      rewardStructure: {
        programCount: 100,
        typeUse: [{ type: "DOUBLE_SIDED", label: "Double-sided", matchingPrograms: 40, percent: 40 }],
        multiTypeShare: { programCount: 100, matchingPrograms: 19, percent: 19 },
        rewardTiersPerProgram: summary(2, 1, 4, 100),
      },
      rewardValues: {
        rewardCount: 70,
        currencyCaveat: "Dollar-denominated rewards only.",
        doubleSided: { referrerAmount: summary(80, 40, 120, 40), referredFriendAmount: summary(70, 30, 110, 35), symmetry: { rewardCount: 40, equalPercent: 60, referrerMorePercent: 25, friendMorePercent: 15 }, unlimitedPercent: 73, rewardCount: 45 },
        singleSided: { referrerAmount: summary(90, 45, 180, 25), unlimitedPercent: 80, rewardCount: 25 },
        percentOffRewardsPercent: 4,
      },
      qualifyingAction: {
        referralTrigger: {
          programCount: 88,
          signUpOnlyPercent: 59,
          signUpPlusQualifyingActionPercent: 41,
          participantToReferralBySetting: { caveat: "Definitional, not causal.", signUpOnly: summary(53, 23, 72, 52), signUpPlusQualifyingAction: summary(4, 2, 13, 36) },
        },
        observedTwoStep: { programCount: 100, percent: 59, leadToReferralPercent: summary(46, 23, 90, 45) },
      },
      shareChannels: { programCount: 100, basis: "Observed share actions.", channels: [{ channel: "WhatsApp", shareOfAllShareActionsPercent: 55, programsWithShareActivity: 45 }] },
      integrations: { programCount: 100, anyIntegration: { programCount: 100, matchingPrograms: 59, percent: 59 }, integrations: [{ integration: "HubSpot", programsConnected: 20, percent: 20 }] },
    },
    segments: [
      {
        industry: "Healthcare & wellness",
        companyCount: 20,
        results: { successfulReferrals: summary(320, 160, 480, 24), participants: null, participantToReferralPercent: summary(12, 6, 24, 24) },
        rewardStructure: { programCount: 24, typeUse: [{ type: "DOUBLE_SIDED", label: "Double-sided", matchingPrograms: 9, percent: 37.5 }] },
        // The real bundle keeps the cut and nulls the figures inside it when a segment withholds them.
        rewardValues: {
          rewardCount: 12,
          currencyCaveat: "Dollar-denominated rewards only.",
          doubleSided: { referrerAmount: null, referredFriendAmount: null, symmetry: null, unlimitedPercent: null },
          singleSided: { referrerAmount: null, unlimitedPercent: null },
          percentOffRewardsPercent: null,
        },
        milestoneLadders: null,
        qualifyingAction: { referralTrigger: null, observedTwoStep: { programCount: 24, percent: null, leadToReferralPercent: null } },
        shareChannels: { programCount: 24, channels: [{ channel: "Copy link", shareOfAllShareActionsPercent: 36, programsWithShareActivity: 10 }] },
      },
    ],
    correlations: [
      {
        key: "integration_use",
        caveat: "Correlation only.",
        groups: [
          { structure: "One or more integrations connected", programCount: 59, successfulReferrals: summary(452, 200, 900, 59) },
          { structure: "No integrations connected", programCount: 41, successfulReferrals: summary(396, 150, 800, 41) },
        ],
      },
    ],
    withheldCuts: ["Affiliate program design. Too few programs carry a commission rate."],
  },
  programDesignGuidance: [
    "# Program-Design Advisor Rules",
    "",
    "## How the advisor uses these files",
    "",
    "Routing notes that stay out of the output.",
    "",
    "## Rule set 1: qualifying action",
    "",
    "1.1 Use Sign Up + Qualifying Action when the friend must pay. [support 188, support 251] [insights: segments[].qualifyingAction] [support 268]",
    "",
    "## Rule set 9: affiliate programs",
    "",
    "9.1 Affiliate benchmarks are withheld. [support 485, growsurf-mcp `growsurf-agent-toolkit` affiliate workflow]",
    "",
    "## Caveats the advisor always renders",
    "",
    "- The scope sentence, once.",
  ].join("\n"),
  troubleshootingPlaybook: {
    toolMap: { installation: "growsurf_get_campaign_installation", activity_logs: "growsurf_get_participant_activity_logs", team: "growsurf_get_team", participants: "growsurf_list_participants" },
    docLinks: { "188": "https://support.growsurf.com/article/188-what-triggers-a-referral" },
    symptoms: [
      {
        key: "referral_not_credited",
        label: "A referred friend signed up but the referrer was not credited",
        aliases: ["referral not tracked", "showing as direct"],
        checks: [
          { step: 1, tool: "activity_logs", question: "What does the referred participant's log say?" },
          { step: 2, tool: "installation", field: "referralTrigger", question: "Is the trigger Sign Up or Sign Up + Qualifying Action?" },
          { step: 3, tool: "participants", question: "Are both people participants?" },
        ],
        causes: [{ cause: "The qualifying action | never reached GrowSurf.", fix: "Connect the billing integration\nor call the trigger.", docs: ["support 188"] }],
      },
      {
        key: "participant_emails_not_sending",
        label: "Participant emails are not being sent",
        aliases: ["welcome email not received"],
        checks: [{ step: 1, tool: "team", question: "Is the team verified?" }],
        causes: [{ cause: "The team has not completed account verification.", fix: "Request verification.", docs: ["support 467"] }],
      },
      {
        key: "hosted_only_symptom",
        label: "A symptom only the hosted playbook knows",
        checks: [{ step: 1, question: "Hosted-only check." }],
        causes: [{ cause: "Hosted-only cause.", fix: "Hosted-only fix.", docs: ["docs developer-tools/webhooks"] }],
      },
    ],
  },
} as const satisfies GrowSurfInsightsBundle;

const openClients: Client[] = [];
afterEach(async () => {
  await Promise.all(openClients.splice(0).map((client) => client.close()));
});

const connectClient = async (insights?: GrowSurfInsightsBundle) => {
  const server = createGrowSurfMcpServer({ env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" }, insights });
  const client = new Client({ name: "insights-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  openClients.push(client);
  return client;
};

const textOf = (result: Awaited<ReturnType<Client["callTool"]>>) =>
  Array.isArray(result.content) && result.content[0]?.type === "text" ? result.content[0].text : "";

const parsePlan = (text: string) => {
  const match = /```json\n([\s\S]*?)\n```/.exec(text);
  if (!match) throw new Error("no plan block");
  return JSON.parse(match[1] ?? "[]") as Array<{ tool: string; arguments: Record<string, unknown> }>;
};

describe("program-design advisor", () => {
  // Public evidence must retain its meaning across response detail levels and withheld cuts.
  it("keeps summary facts and configuration calls consistent with the full report", () => {
    const input = programDesignAdvisorInputSchema.parse({ industry: "healthcare_wellness", goal: "paid_conversions" });
    const brief = buildProgramDesignAdvice(input, FIXTURE_BUNDLE);
    const full = buildProgramDesignAdvice({ ...input, detail: "full" }, FIXTURE_BUNDLE);
    expect(input.detail).toBe("summary");
    expect(brief.configurationPlan).toEqual(full.configurationPlan);
    expect(brief.decisions).toEqual(full.decisions);
    expect(brief.benchmarkFacts).toEqual(full.benchmarkFacts);
    expect(brief.benchmarkFacts).toEqual([
      "Successful referrals per 100 participants, measured separately for each high-performing program: median 12; Q1 6; Q3 24; sample: 24 programs; source: Healthcare & wellness.",
      "Successful referrals per 100 pending referrals, measured separately for each high-performing program: median 46; Q1 23; Q3 90; sample: 45 programs; source: platform-wide high performers (segment withheld). This sample includes programs with pending referrals whose successful-referral count does not exceed their pending count.",
    ]);
    for (const fact of brief.benchmarkFacts) expect(brief.markdown).toContain(fact);
    expect(buildProgramDesignAdvice(input, undefined).benchmarkFacts).toEqual([]);
    expect(buildProgramDesignAdvice({ ...input, programType: "AFFILIATE" }, FIXTURE_BUNDLE).benchmarkFacts).toEqual([]);
  });

  it("renders the same sections without figures and points at the hosted server when no bundle is loaded", () => {
    const text = renderProgramDesignAdvisor(programDesignAdvisorInputSchema.parse({ goal: "paid_conversions", detail: "full" }), undefined);

    expect(text).toContain("https://mcp.growsurf.com");
    expect(text).toContain('`referralTrigger: "CUSTOM"`');
    expect(text).toContain("[support article 209](https://support.growsurf.com/article/209-");
    expect(text).not.toContain("quartiles");
    expect(text).not.toContain("undefined");
  });

  it("routes to the segment and falls back per figure when the segment withholds one", () => {
    const text = renderProgramDesignAdvisor(
      programDesignAdvisorInputSchema.parse({ industry: "healthcare_wellness", goal: "paid_conversions", companyName: "Acme Clinics", detail: "full" }),
      FIXTURE_BUNDLE,
    );

    expect(text).toContain("Acme Clinics");
    expect(text).toContain("Based on the highest-performing test programs.");
    expect(text).toContain("Segment: Healthcare & wellness (24 programs from 20 companies)");
    // Segment figure wins where it exists.
    expect(text).toContain("median 320; Q1 160; Q3 480; sample: 24 programs; source: Healthcare & wellness");
    // A null figure inside an existing segment cut falls back to the platform figure and says so.
    expect(text).toMatch(/Participants per program.*withheld/);
    expect(text).toContain("median 80 (mixed dollar currencies); Q1 40 (mixed dollar currencies); Q3 120 (mixed dollar currencies); sample: 40 programs; source: platform-wide high performers (segment withheld)");
    expect(text).toMatch(/Equal reward amounts.*platform-wide.*segment withheld/);
    // Null proportions render as withheld, never as "null%".
    expect(text).toContain("Unlimited earning, double-sided rewards: withheld");
    expect(text).toContain("Unlimited earning, single-sided rewards: withheld");
    expect(text).not.toContain("null%");
    expect(text).not.toContain("undefined");
    // A null referralTrigger cut on the segment falls back to the platform cut with its caveat.
    expect(text).toContain("Definitional, not causal.");
    expect(text).toContain("Correlation only.");
    expect(text).toMatch(/Copy link.*36%.*10/);
    // Rules are opt-in.
    expect(text).not.toContain("## Rule set 1");
    expect(text).toContain("Call again with `includeRules: true`");
  });

  it("omits unconfirmed reward writes and time windows while targeting only the newly created program", () => {
    const result = buildProgramDesignAdvice(
      programDesignAdvisorInputSchema.parse({ industry: "saas_ai", goal: "paid_conversions", companyName: "Acme", currencyISO: "eur", rewardBudgetPerReferral: 25 }),
      FIXTURE_BUNDLE,
    );
    const text = result.markdown;
    const plan = result.configurationPlan;
    expect(plan.map((step) => step.tool)).toEqual([
      "growsurf_create_campaign",
      "growsurf_update_campaign_installation",
      "growsurf_update_campaign_options",
    ]);
    expect(plan[0]?.arguments).toMatchObject({ type: "REFERRAL", companyName: "Acme", currencyISO: "EUR", goal: "B2B_SAAS_SELF_SERVICE" });
    expect(plan[1]?.arguments).toEqual({ campaignId: "<new-program-id>", fields: { referralTrigger: "CUSTOM" } });
    expect(plan[2]?.arguments).toEqual({ campaignId: "<new-program-id>", fields: { requireManualRewardApproval: true } });
    for (const step of plan) {
      if (step !== plan[0]) expect(step.arguments.campaignId).toBe("<new-program-id>");
    }
    expect(plan.some((step) => /reward/.test(step.tool))).toBe(false);
    expect(result.decisions.unresolved).toEqual(expect.arrayContaining([expect.stringMatching(/incentive.*funds.*fulfilled/)]));
    expect(text).toContain("No reward-amount benchmark is available in EUR");
    expect(text).not.toMatch(/\$[0-9]/);
  });

  it("uses the platform cut when no segment matches, honors a sign-up goal, and leaves the trigger open when the goal is unknown", () => {
    const waitlist = renderProgramDesignAdvisor(programDesignAdvisorInputSchema.parse({ industry: "other", goal: "waitlist", detail: "full" }), FIXTURE_BUNDLE);
    expect(waitlist).toContain("Segment: none matched");
    expect(waitlist).toContain('`referralTrigger: "ON_SIGNUP"`');
    expect(waitlist).toContain("Milestone ladder as the base");
    expect(parsePlan(waitlist)[0]?.arguments).toMatchObject({ goal: "WAITLIST" });
    expect(parsePlan(waitlist)[1]?.arguments).toEqual({ campaignId: "<new-program-id>", fields: { referralTrigger: "ON_SIGNUP" } });

    const undecided = renderProgramDesignAdvisor(
      programDesignAdvisorInputSchema.parse({ industry: "other", qualifyingAction: "They book a demo on Facebook", detail: "full" }),
      FIXTURE_BUNDLE,
    );
    expect(undecided).toContain("Decide what counts as a successful referral");
    expect(undecided).toContain("Stated qualifying action: They book a demo on Facebook");
    expect(parsePlan(undecided).some((step) => step.tool === "growsurf_update_campaign_installation")).toBe(false);
  });

  it("appends only the applicable rule sets, stripped of reviewer pointers, when asked", () => {
    // Metric definitions and currency limits must remain consistent when optional prose is included.
    const referral = renderProgramDesignAdvisor(programDesignAdvisorInputSchema.parse({ goal: "leads", includeRules: true }), {
      ...FIXTURE_BUNDLE,
      programDesignGuidance: `${FIXTURE_BUNDLE.programDesignGuidance}\n\n## Rule set 3: reward value\n\nCompare any currency directly. [insights: platform.rewardValues]\n\n## Rule set 1: qualifying action\n\nTreat the ratio as signup conversion. [insights: platform.qualifyingAction.observedTwoStep]`,
    });
    expect(referral).not.toContain("Compare any currency directly");
    expect(referral).not.toContain("Treat the ratio as signup conversion");
    expect(referral).toContain("## How to apply these figures");
    expect(referral).toContain("### Rule set 1: qualifying action");
    expect(referral).toContain("([support article 188](https://support.growsurf.com/article/188-what-triggers-a-referral), [support article 251](");
    expect(referral).not.toContain("[insights:");
    expect(referral).not.toContain(".qualifyingAction]");
    expect(referral).not.toContain("support.growsurf.com article");
    expect(referral).not.toContain("Routing notes");
    expect(referral).not.toContain("Rule set 9");

    const affiliate = renderProgramDesignAdvisor(programDesignAdvisorInputSchema.parse({ programType: "AFFILIATE", includeRules: true }), FIXTURE_BUNDLE);
    expect(affiliate).toContain("Affiliate benchmarks are withheld");
    expect(affiliate).toContain("### Rule set 9");
    expect(affiliate).not.toContain("Rule set 1");
    expect(affiliate).not.toContain("affiliate workflow]");
    expect(affiliate).toContain("https://support.growsurf.com/article/485-");
    expect(parsePlan(affiliate)[0]?.arguments).toMatchObject({ type: "AFFILIATE" });
  });

  it.each([
    [{ industry: "media_newsletters", goal: "subscribers" }, "MILESTONE"],
    [{ industry: "saas_ai", goal: "leads", businessModel: "Enterprise sales-led platform" }, "SINGLE_SIDED"],
    [{ goal: "paid_conversions" }, "DOUBLE_SIDED"],
    [{ industry: "saas_ai", businessModel: "Annual software sold through demos and signed contracts", salesMotion: "sales_led" }, "SINGLE_SIDED"],
    [{ businessModel: "We are not sales-led", salesMotion: "self_service" }, "DOUBLE_SIDED"],
    [{ programType: "AFFILIATE" }, "AFFILIATE"],
  ])("keeps the planned reward type consistent with the business profile %j", (input, type) => {
    const result = buildProgramDesignAdvice(programDesignAdvisorInputSchema.parse({ ...input, detail: "full" }), FIXTURE_BUNDLE);
    expect(result.decisions.rewardType).toBe(type);
    expect(result.configurationPlan.some((step) => step.tool === "growsurf_create_campaign_reward")).toBe(false);
    if (input.industry === "saas_ai" && type === "SINGLE_SIDED") {
      expect(result.configurationPlan[0]?.arguments.goal).toBe("B2B_SAAS_ENTERPRISE");
      expect(result.markdown).toContain("seeds LinkedIn visible");
    }
  });

  it("keeps each metric's definition, sample, source, and currency basis beside its value", () => {
    const segment = FIXTURE_BUNDLE.programDesign.segments[0];
    const bundle = {
      programDesign: {
        ...FIXTURE_BUNDLE.programDesign,
        segments: [{ ...segment, qualifyingAction: { referralTrigger: { programCount: 12, signUpOnlyPercent: 25, signUpPlusQualifyingActionPercent: 75 } } }],
      },
    } satisfies GrowSurfInsightsBundle;
    const text = renderProgramDesignAdvisor(programDesignAdvisorInputSchema.parse({ industry: "healthcare_wellness", currencyISO: "USD", rewardBudgetPerReferral: 25, detail: "full" }), bundle);
    const rows = text.split("\n");
    expect(rows.find((row) => row.includes("Successful referrals ÷ participants × 100"))).toContain("median 12%; Q1 6%; Q3 24%; sample: 24 programs; source: Healthcare & wellness");
    expect(rows.find((row) => row.includes("Signup counts as the referral"))).toMatch(/25% of 12 programs with installation evidence.*Healthcare & wellness/);
    expect(rows.find((row) => row.includes("Copy link"))).toMatch(/36% of recorded share actions.*10 of 24 programs.*Healthcare & wellness/);
    expect(rows.find((row) => row.includes("HubSpot"))).toMatch(/20% \(20 of 100 programs\).*platform-wide/);
    expect(text).toContain("not USD-only benchmarks");
    expect(text).toContain("Dollar reward bands are omitted for this budget comparison");
    expect(text).not.toContain("median 80 (mixed dollar currencies)");
    expect(text).not.toMatch(/budget.*(?:is below|is above|is at).*median/);
    expect(text).toContain("does not measure how many participants actively refer");
    expect(text).toContain("middle half, not the full range");
  });

  it("treats withheld affiliate coverage as unknown data and enrollment advice as a design choice", () => {
    const result = buildProgramDesignAdvice(programDesignAdvisorInputSchema.parse({ programType: "AFFILIATE", industry: "saas_ai" }), FIXTURE_BUNDLE);
    expect(result.markdown).toContain("platform-wide affiliate sample, not an industry-specific sample");
    expect(result.markdown).toContain("A missing recorded commission rate is unknown data");
    expect(result.markdown).toContain("documentation-based design defaults");
    expect(result.markdown).toContain("not a claim that vetted affiliates perform better");
    expect(result.configurationPlan.find((step) => step.tool === "growsurf_update_campaign_options")?.arguments).toMatchObject({ fields: { affiliateApplicationMode: "MANUAL_REVIEW" } });
    expect(result.decisions.qualifyingAction).toBe("Paid conversion");
    expect(result.markdown).toContain(`Qualifying action: ${result.decisions.qualifyingAction}`);
  });

  it("leaves a signup goal with a separate qualifying action unresolved instead of silently crediting signup", () => {
    const result = buildProgramDesignAdvice(programDesignAdvisorInputSchema.parse({ goal: "signups", qualifyingAction: "Completed paid appointment" }), FIXTURE_BUNDLE);
    expect(result.decisions).toMatchObject({ referralTrigger: null, qualifyingAction: "Completed paid appointment" });
    expect(result.decisions.unresolved).toEqual(expect.arrayContaining([expect.stringMatching(/whether signup alone completes the stated qualifying action/)]));
    expect(result.configurationPlan.some((step) => step.tool === "growsurf_update_campaign_installation")).toBe(false);
    expect(result.markdown).not.toContain('Recommendation: `referralTrigger: "ON_SIGNUP"`');

    const leadDraft = buildProgramDesignAdvice(programDesignAdvisorInputSchema.parse({ goal: "leads" }), FIXTURE_BUNDLE);
    expect(leadDraft.decisions).toMatchObject({ referralTrigger: "CUSTOM", qualifyingAction: null });
    expect(leadDraft.decisions.unresolved).toEqual(expect.arrayContaining([expect.stringMatching(/Confirm the exact qualifying action/)]));
  });

  it("rejects a blank company name and normalizes the currency code", () => {
    expect(() => programDesignAdvisorInputSchema.parse({ companyName: "" })).toThrow();
    expect(programDesignAdvisorInputSchema.parse({ currencyISO: "usd" }).currencyISO).toBe("USD");
    expect(() => programDesignAdvisorInputSchema.parse({ currencyISO: "US " })).toThrow();
  });
});

describe("referral-tracking troubleshooter", () => {
  it("matches a symptom by key, names the tool and field per check, and hints participants only on participant-scoped tools", () => {
    const text = renderTroubleshootingGuide(
      troubleshootReferralTrackingInputSchema.parse({ symptom: "referral_not_credited", campaignId: "abc123", participantEmail: "gavin@hooli.com" }),
      FIXTURE_BUNDLE,
    );

    expect(text).toContain("# A referred friend signed up but the referrer was not credited for program `abc123`");
    expect(text).toContain("`growsurf_get_participant_activity_logs` for participant `gavin@hooli.com`");
    expect(text).toContain("`growsurf_get_campaign_installation`, field `referralTrigger`");
    expect(text).toContain("Tool: `growsurf_list_participants`.");
    expect(text).not.toContain("`growsurf_list_participants` for participant");
    // Table cells are escaped so playbook text cannot break the row.
    expect(text).toContain("The qualifying action \\| never reached GrowSurf.");
    expect(text).toContain("Connect the billing integration or call the trigger.");
    expect(text).toContain("https://support.growsurf.com/article/188-what-triggers-a-referral");
    expect(text).not.toContain("https://mcp.growsurf.com");
  });

  it("matches a description only when it contains a symptom phrase verbatim", () => {
    const playbook = FIXTURE_BUNDLE.troubleshootingPlaybook;
    expect(matchPlaybookSymptom(playbook, { description: "Our welcome email not received by anyone" })?.symptom.key).toBe("participant_emails_not_sending");
    expect(matchPlaybookSymptom(playbook, { description: "referrals are not being credited" })).toBeNull();

    const text = renderTroubleshootingGuide(troubleshootReferralTrackingInputSchema.parse({ description: "referrals are not being credited" }), FIXTURE_BUNDLE);
    expect(text).toContain("No symptom matched the description");
    expect(text).toContain("- `referral_not_credited`: A referred friend signed up but the referrer was not credited (referral not tracked; showing as direct)");
  });

  it("answers a known key the loaded playbook lacks from the default playbook, and lists keys for an unknown one", () => {
    const fallback = renderTroubleshootingGuide(troubleshootReferralTrackingInputSchema.parse({ symptom: "reward_not_issued" }), FIXTURE_BUNDLE);
    expect(fallback).toContain("# A participant earned a reward but did not receive it");
    expect(fallback).toContain("`requireManualRewardApproval`");
    expect(fallback).toContain("documentation-based");
    expect(fallback).toContain("`growsurf_get_participant`, field `rewards`");
    expect(fallback).toContain("`false` does not prevent manual fulfillment or prove that rewards were never sent");
    expect(fallback).toContain("A failed read is an unknown result, not a failed reward or referral");

    const unknown = renderTroubleshootingGuide(troubleshootReferralTrackingInputSchema.parse({ symptom: "nope" }), FIXTURE_BUNDLE);
    expect(unknown).toContain("Unknown symptom `nope`");
    expect(unknown).toContain("- `hosted_only_symptom`");
    expect(unknown).toContain("- `reward_not_issued`");
  });

  it("uses the default playbook with linked docs and the hosted note when no bundle is loaded", () => {
    const text = renderTroubleshootingGuide(troubleshootReferralTrackingInputSchema.parse({ symptom: "participants_not_added" }), undefined, { campaignId: "env123" });
    expect(text).toContain("for program `env123`");
    expect(text).toContain("https://mcp.growsurf.com");
    expect(text).toContain("field `signupEvent`");
    expect(text).toContain("[support article 203](https://support.growsurf.com/article/203-");
    for (const symptom of DEFAULT_TROUBLESHOOTING_PLAYBOOK.symptoms ?? []) {
      expect(renderTroubleshootingGuide({ symptom: symptom.key }, undefined)).not.toContain("support.growsurf.com article");
    }
  });

  it("requires a symptom or a description", () => {
    expect(() => troubleshootReferralTrackingInputSchema.parse({ campaignId: "abc123" })).toThrow();
  });
});

describe("insight tools over MCP", () => {
  it("keeps the advertised input guard aligned with runtime enums, types, bounds, and required fields", async () => {
    const client = await connectClient(FIXTURE_BUNDLE);
    const { tools } = await client.listTools();
    const cases = [
      { name: "growsurf_program_design_advisor", schema: programDesignAdvisorInputSchema, inputs: [
        {}, { programType: "AFFILIATE", includeRules: true }, { industry: "saas_ai", goal: "leads" },
        { programType: "affiliate" }, { industry: "unknown" }, { goal: "unknown" },
        { rewardBudgetPerReferral: -1 }, { rewardBudgetPerReferral: "10" }, { includeRules: "true" },
        { companyName: "" }, { companyName: "a".repeat(201) }, { currencyISO: "US" },
        { companyName: "🙂".repeat(200) }, { companyName: "🙂".repeat(201) },
        { businessModel: "a".repeat(501) }, { audience: "a".repeat(501) }, { qualifyingAction: "a".repeat(501) },
        { unexpected: true }, { goal: null }, { salesMotion: "sales_led" }, { salesMotion: "self_service" }, { salesMotion: "unknown" },
        { detail: "summary" }, { detail: "full" }, { detail: "brief" }, { detail: true },
      ] },
      { name: "growsurf_troubleshoot_referral_tracking", schema: troubleshootReferralTrackingInputSchema, inputs: [
        {}, { campaignId: "abc123" }, { symptom: "unknown_key" }, { symptom: "hosted_only_symptom" },
        { description: "A problem" }, { symptom: "" }, { description: "ab" }, { description: "🙂🙂" },
        { symptom: "a".repeat(101) }, { description: "a".repeat(2001) },
        { symptom: "unknown_key", participantId: "" }, { symptom: "unknown_key", participantEmail: "ab" },
        { symptom: "unknown_key", campaignId: "" }, { description: null }, { symptom: "known", unexpected: true },
      ] },
    ];
    for (const { name, schema, inputs } of cases) {
      const guard = createToolInputGuard(tools.find(tool => tool.name === name)?.inputSchema);
      for (const input of inputs) {
        if (schema.safeParse(input).success) expect(() => guard(input), JSON.stringify(input)).not.toThrow();
        else expect(() => guard(input), JSON.stringify(input)).toThrow();
      }
    }
  });

  it("advertises the loaded playbook's symptom keys, READ metadata, and the markdown envelope", async () => {
    const client = await connectClient(FIXTURE_BUNDLE);
    const { tools } = await client.listTools();
    const advisor = tools.find((tool) => tool.name === "growsurf_program_design_advisor");
    const troubleshooter = tools.find((tool) => tool.name === "growsurf_troubleshoot_referral_tracking");

    expect(advisor?.annotations?.readOnlyHint).toBe(true);
    expect((advisor?._meta as Record<string, unknown>)["growsurf/riskTier"]).toBe("READ");
    const symptomSchema = (troubleshooter?.inputSchema as { properties: { symptom: { examples: string[] } } }).properties.symptom;
    expect(symptomSchema.examples).toEqual(expect.arrayContaining(["referral_not_credited", "participant_emails_not_sending", "hosted_only_symptom", "reward_not_issued"]));

    const result = await client.callTool({ name: "growsurf_program_design_advisor", arguments: { industry: "healthcare_wellness", goal: "paid_conversions" } });
    expect(result.isError).toBeFalsy();
    const text = textOf(result);
    expect(text).toContain("Segment: Healthcare & wellness");
    expect(result.structuredContent).toMatchObject({ markdown: text });

    const hostedOnly = await client.callTool({ name: "growsurf_troubleshoot_referral_tracking", arguments: { symptom: "hosted_only_symptom" } });
    expect(textOf(hostedOnly)).toContain("Hosted-only check.");
  });

  it("advertises the default symptom keys without a bundle and rejects a call with neither symptom nor description", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const troubleshooter = tools.find((tool) => tool.name === "growsurf_troubleshoot_referral_tracking");
    const symptomSchema = (troubleshooter?.inputSchema as { properties: { symptom: { examples: string[] } } }).properties.symptom;
    expect(symptomSchema.examples).toContain("referral_not_credited");

    const result = await client.callTool({ name: "growsurf_troubleshoot_referral_tracking", arguments: { campaignId: "abc123" } });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("INVALID_TOOL_INPUT");
    expect(() => createToolInputGuard(troubleshooter?.inputSchema)({ campaignId: "abc123" })).toThrow();
    const unknown = await client.callTool({ name: "growsurf_troubleshoot_referral_tracking", arguments: { symptom: "unknown_test_symptom" } });
    expect(unknown.isError).toBeFalsy();
    expect(textOf(unknown)).toContain("Unknown symptom");
  });
});
