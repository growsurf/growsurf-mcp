import { z } from "zod";
import { codeBlock, table, tableCell } from "./markdown.js";
import { REWARD_DIAGNOSTIC_GUIDANCE } from "./rewardEvidence.js";

// Program-design advisor and referral-tracking troubleshooter.
//
// Both tools render from an optional insights bundle that a hosted deployment passes to
// `createGrowSurfMcpServer({ insights })`. The bundle carries aggregate figures from GrowSurf
// programs (medians, quartiles, and proportions, never a single customer's data), the advisor
// rules that say how to apply them, and a symptom-first troubleshooting playbook. Without a
// bundle the tools still work: the advisor renders the same sections without figures, and the
// troubleshooter falls back to the documentation-based playbook in this file.

export const HOSTED_MCP_URL = "https://mcp.growsurf.com";

const NO_INSIGHTS_NOTE = `This server is running without GrowSurf's program-data insights, so the guidance below is documentation-based. The hosted GrowSurf MCP at ${HOSTED_MCP_URL} includes figures from GrowSurf's highest-performing programs.`;

// Public support articles the documentation-based guidance and the default playbook cite.
// Bare article numbers do not resolve on support.growsurf.com, so every reference carries its slug.
export const SUPPORT_ARTICLE_URLS: Readonly<Record<string, string>> = {
  "188": "https://support.growsurf.com/article/188-what-triggers-a-referral",
  "189": "https://support.growsurf.com/article/189-how-can-i-manually-trigger-a-referral",
  "190": "https://support.growsurf.com/article/190-when-someone-visits-their-friends-shareable-link-why-doesnt-that-trigger-a-referral",
  "191": "https://support.growsurf.com/article/191-how-can-i-manually-assign-a-referrer",
  "195": "https://support.growsurf.com/article/195-what-does-the-growsurf-anti-fraud-system-entail",
  "199": "https://support.growsurf.com/article/199-how-can-i-automatically-log-in-a-participant",
  "200": "https://support.growsurf.com/article/200-guide-to-installing-growsurf-on-your-website",
  "201": "https://support.growsurf.com/article/201-why-are-participants-not-being-added-to-my-program",
  "203": "https://support.growsurf.com/article/203-why-is-my-form-not-able-to-be-detected",
  "206": "https://support.growsurf.com/article/206-can-i-test-growsurf-on-a-url-that-is-different-than-the-ones-i-entered-for-my-program",
  "209": "https://support.growsurf.com/article/209-best-practices-for-testing-your-referral-program",
  "211": "https://support.growsurf.com/article/211-why-do-growsurf-analytics-differ-from-my-other-analytics-tools",
  "212": "https://support.growsurf.com/article/212-how-come-using-embedded-elements-doesnt-work-for-me-on-wix",
  "213": "https://support.growsurf.com/article/213-guide-to-using-dynamic-text-in-growsurf-emails",
  "248": "https://support.growsurf.com/article/248-what-types-of-reward-s-can-i-create",
  "251": "https://support.growsurf.com/article/251-how-can-i-secure-my-program-against-fraudsters",
  "258": "https://support.growsurf.com/article/258-what-are-some-ways-i-can-use-zapier-to-fulfill-rewards",
  "259": "https://support.growsurf.com/article/259-how-can-i-add-new-participants-to-my-referral-program",
  "260": "https://support.growsurf.com/article/260-how-can-i-send-unique-coupon-codes-as-rewards",
  "266": "https://support.growsurf.com/article/266-how-to-automate-rewards-fulfillment",
  "261": "https://support.growsurf.com/article/261-how-do-i-enable-recaptcha",
  "268": "https://support.growsurf.com/article/268-how-is-a-participants-rank-calculated",
  "288": "https://support.growsurf.com/article/288-can-i-create-a-referral-program-to-grow-my-newsletter",
  "297": "https://support.growsurf.com/article/297-how-can-i-send-weekly-reminder-emails-to-participants",
  "353": "https://support.growsurf.com/article/353-how-email-invites-work",
  "267": "https://support.growsurf.com/article/267-why-is-the-growsurf-universal-code-not-detected-on-my-webpage",
  "270": "https://support.growsurf.com/article/270-what-is-an-impression",
  "272": "https://support.growsurf.com/article/272-can-i-implement-growsurf-if-my-checkout-happens-on-a-third-party-service",
  "278": "https://support.growsurf.com/article/278-what-is-the-referral-credit-expiration-window",
  "280": "https://support.growsurf.com/article/280-how-can-i-have-a-coupon-code-instantly-available-for-a-referred-person-before-they-sign-up",
  "281": "https://support.growsurf.com/article/281-how-to-customize-the-from-email-address-in-growsurf-emails",
  "282": "https://support.growsurf.com/article/282-how-do-i-add-dns-records-to-my-domain-registrar",
  "285": "https://support.growsurf.com/article/285-embeddable-elements-are-not-showing-up-on-my-webpage-even-after-whitelisting-the-url",
  "289": "https://support.growsurf.com/article/289-how-can-i-connect-growsurf-to-trigger-referrals-when-i-close-won-deals-in-my-crm",
  "295": "https://support.growsurf.com/article/295-how-can-i-fulfill-physical-goods-for-my-referral-program",
  "301": "https://support.growsurf.com/article/301-how-can-i-trigger-a-referral-on-a-double-opt-in-email",
  "345": "https://support.growsurf.com/article/345-iframe-form-vs-standard-form",
  "349": "https://support.growsurf.com/article/349-how-many-rewards-can-a-referrer-earn",
  "357": "https://support.growsurf.com/article/357-how-to-set-up-dynamic-rewards",
  "367": "https://support.growsurf.com/article/367-how-to-add-referral-tracking-to-a-hubspot-meeting-form",
  "370": "https://support.growsurf.com/article/370-can-i-use-cloudflare-rocket-loader-with-growsurf",
  "460": "https://support.growsurf.com/article/460-how-to-resolve-the-content-security-policy-issue-with-the-growsurf-universal-code",
  "463": "https://support.growsurf.com/article/463-referral-program-definitions",
  "466": "https://support.growsurf.com/article/466-when-using-the-javascript-method-growsurf-addparticipant-why-am-i-getting-an-error",
  "467": "https://support.growsurf.com/article/467-why-arent-my-program-emails-being-delivered-to-participants",
  "481": "https://support.growsurf.com/article/481-what-is-the-referral-cookie-duration",
  "483": "https://support.growsurf.com/article/483-i-am-having-cors-issues-when-loading-the-growsurf-universal-code",
  "485": "https://support.growsurf.com/article/485-best-practices-for-testing-your-affiliate-program",
  "493": "https://support.growsurf.com/article/493-view-participant-rankings-for-different-time-periods",
};

const DOCS_SITE_URL = "https://docs.growsurf.com";

// Turns a `support NNN` or `docs <path>` reference into a link, preferring the bundle's own map.
export const docLink = (reference: string, links?: Readonly<Record<string, string>>): string => {
  const support = /^support (\d{3})$/.exec(reference);
  if (support) {
    const url = links?.[support[1] ?? ""] ?? SUPPORT_ARTICLE_URLS[support[1] ?? ""];
    return url ? `[support article ${support[1]}](${url})` : `support.growsurf.com article ${support[1]}`;
  }
  const docs = /^docs (\S+)$/.exec(reference);
  if (docs) return `[docs.growsurf.com/${docs[1]}](${DOCS_SITE_URL}/${docs[1]})`;
  return reference;
};

const supportLink = (id: string) => docLink(`support ${id}`);

// ---------------------------------------------------------------------------------------------
// Bundle types. Loose on purpose: a hosted deployment may ship a newer bundle than the package
// knows about, and every renderer below treats a missing cut as "withheld" rather than failing.
// Arrays are readonly so a bundle vendored `as const` type-checks.
// ---------------------------------------------------------------------------------------------

export type InsightSummary = {
  programCount: number;
  median: number;
  q1: number;
  q3: number;
} | null;

export type InsightShare = {
  programCount: number;
  matchingPrograms: number;
  percent: number;
} | null;

type Percent = number | null | undefined;

export type DesignCuts = {
  results?: {
    programCount?: number;
    successfulReferrals?: InsightSummary;
    participants?: InsightSummary;
    participantToReferralPercent?: InsightSummary;
    uniqueViewToReferralPercent?: InsightSummary;
    uniqueViewInclusionRule?: string;
  } | null;
  rewardStructure?: {
    programCount?: number;
    basis?: string;
    typeUse?: ReadonlyArray<{ type: string; label: string; matchingPrograms: number; percent: number }>;
    multiTypeShare?: InsightShare;
    rewardTiersPerProgram?: InsightSummary;
  } | null;
  rewardArchetypes?: {
    programCount?: number;
    archetypes?: ReadonlyArray<{ archetype: string; label: string; matchingPrograms: number; percent: number }>;
  } | null;
  rewardValues?: {
    rewardCount?: number;
    programCount?: number;
    basis?: string;
    currencyCaveat?: string;
    doubleSided?: {
      referrerAmount?: InsightSummary;
      referredFriendAmount?: InsightSummary;
      symmetry?: { rewardCount: number; equalPercent: number; referrerMorePercent: number; friendMorePercent: number } | null;
      unlimitedPercent?: Percent;
      rewardCount?: number;
    } | null;
    singleSided?: { referrerAmount?: InsightSummary; unlimitedPercent?: Percent; rewardCount?: number } | null;
    percentOffRewardsPercent?: Percent;
    leaderboardWinnersPerReward?: InsightSummary;
  } | null;
  milestoneLadders?: {
    programCount?: number;
    tiersPerProgram?: InsightSummary;
    multiTierPercent?: Percent;
    firstTierReferralsRequired?: InsightSummary;
    topTierReferralsRequired?: InsightSummary;
    repeatedLadders?: ReadonlyArray<{ referralsRequired: ReadonlyArray<number>; programCount: number }>;
  } | null;
  qualifyingAction?: {
    referralTrigger?: {
      programCount?: number;
      signUpOnlyPercent?: Percent;
      signUpPlusQualifyingActionPercent?: Percent;
      participantToReferralBySetting?: {
        caveat?: string;
        signUpOnly?: InsightSummary;
        signUpPlusQualifyingAction?: InsightSummary;
      } | null;
    } | null;
    observedTwoStep?: {
      programCount?: number;
      percent?: Percent;
      leadToReferralPercent?: InsightSummary;
      leadToReferralBasis?: string;
    } | null;
  } | null;
  shareChannels?: {
    programCount?: number;
    basis?: string;
    channels?: ReadonlyArray<{ channel: string; shareOfAllShareActionsPercent: number; programsWithShareActivity: number }>;
  } | null;
  integrations?: {
    programCount?: number;
    anyIntegration?: InsightShare;
    integrations?: ReadonlyArray<{ integration: string; programsConnected: number; percent: number }>;
  } | null;
};

export type ProgramDesignSegment = DesignCuts & {
  industry: string;
  companyCount: number;
  programCount?: number;
  scope?: string;
};

export type ProgramDesignInsights = {
  publicationStatus?: string;
  scopes?: Readonly<Record<string, { sentence?: string; programCount?: number }>>;
  platform?: DesignCuts & { scope?: string; programCount?: number; stillRunningPercent?: Percent };
  segments?: ReadonlyArray<ProgramDesignSegment>;
  correlations?: ReadonlyArray<{
    key: string;
    caveat: string;
    groups: ReadonlyArray<{ structure: string; programCount: number; successfulReferrals?: InsightSummary; participantToReferralPercent?: InsightSummary }>;
  }>;
  withheldCuts?: ReadonlyArray<string>;
};

export type PlaybookCheck = { step: number; tool?: string; field?: string; question: string };
export type PlaybookCause = { cause: string; fix: string; tool?: string; docs?: ReadonlyArray<string> };
export type PlaybookSymptom = {
  key: string;
  label: string;
  aliases?: ReadonlyArray<string>;
  checks?: ReadonlyArray<PlaybookCheck>;
  causes?: ReadonlyArray<PlaybookCause>;
};

export type TroubleshootingPlaybook = {
  publicationStatus?: string;
  toolMap?: Readonly<Record<string, string>>;
  docLinks?: Readonly<Record<string, string>>;
  symptoms?: ReadonlyArray<PlaybookSymptom>;
};

export type GrowSurfInsightsBundle = {
  programDesign?: ProgramDesignInsights;
  programDesignGuidance?: string;
  troubleshootingPlaybook?: TroubleshootingPlaybook;
};

// ---------------------------------------------------------------------------------------------
// Program-design advisor
// ---------------------------------------------------------------------------------------------

export const ADVISOR_INDUSTRIES = [
  "financial_services_fintech",
  "saas_ai",
  "media_newsletters",
  "healthcare_wellness",
  "education_workforce",
  "consumer_subscriptions_commerce",
  "other",
] as const;

export type AdvisorIndustry = (typeof ADVISOR_INDUSTRIES)[number];

export const ADVISOR_GOALS = ["paid_conversions", "signups", "leads", "subscribers", "waitlist", "other"] as const;
export const ADVISOR_SALES_MOTIONS = ["self_service", "sales_led"] as const;
export const ADVISOR_DETAILS = ["summary", "full"] as const;

export type AdvisorGoal = (typeof ADVISOR_GOALS)[number];

// Input enum -> the segment label used inside the bundle.
const INDUSTRY_SEGMENT_LABELS: Record<AdvisorIndustry, string | null> = {
  financial_services_fintech: "Financial services & fintech",
  saas_ai: "SaaS & AI",
  media_newsletters: "Media & newsletters",
  healthcare_wellness: "Healthcare & wellness",
  education_workforce: "Education & workforce",
  consumer_subscriptions_commerce: "Consumer subscriptions & commerce",
  other: null,
};

// Advisor profile -> the `goal` value `growsurf_create_campaign` accepts, which also seeds the
// share settings (B2B goals start with the LinkedIn button visible; the others start hidden).
const CAMPAIGN_GOAL_FOR_PROFILE: Record<AdvisorIndustry, string | null> = {
  financial_services_fintech: "FINANCIAL_SERVICES",
  saas_ai: "B2B_SAAS_SELF_SERVICE",
  media_newsletters: "SUBSCRIBERS",
  healthcare_wellness: "B2C_SUBSCRIPTIONS",
  education_workforce: "ONLINE_EDUCATION",
  consumer_subscriptions_commerce: "B2C_SUBSCRIPTIONS",
  other: null,
};

const SALES_LED_SAAS_GOAL = "B2B_SAAS_ENTERPRISE";
const PENDING_REFERRAL_SAMPLE_RULE = "This sample includes programs with pending referrals whose successful-referral count does not exceed their pending count.";

const CAMPAIGN_GOAL_FOR_GOAL: Partial<Record<AdvisorGoal, string>> = {
  subscribers: "SUBSCRIBERS",
  waitlist: "WAITLIST",
};

const CURRENCY_ISO_PATTERN = /^[A-Za-z]{3}$/;

/** Counts Unicode characters as JSON Schema does, including characters outside the BMP. */
const inputText = (minimum = 0, maximum = Infinity) => z.string().refine((value) => {
  const length = [...value].length;
  return length >= minimum && length <= maximum;
}, { message: maximum === Infinity ? `Text must contain at least ${minimum} characters.` : `Text must contain between ${minimum} and ${maximum} characters.` });

export const programDesignAdvisorInputSchema = z.object({
  programType: z.enum(["REFERRAL", "AFFILIATE"]).default("REFERRAL"),
  industry: z.enum(ADVISOR_INDUSTRIES).default("other"),
  goal: z.enum(ADVISOR_GOALS).default("other"),
  businessModel: inputText(0, 500).optional(),
  salesMotion: z.enum(ADVISOR_SALES_MOTIONS).optional(),
  audience: inputText(0, 500).optional(),
  qualifyingAction: inputText(0, 500).optional(),
  rewardBudgetPerReferral: z.number().nonnegative().optional(),
  currencyISO: z.string().regex(CURRENCY_ISO_PATTERN).transform((value) => value.toUpperCase()).optional(),
  companyName: inputText(1, 200).optional(),
  detail: z.enum(ADVISOR_DETAILS).default("summary"),
  includeRules: z.boolean().default(false),
}).strict();

export type ProgramDesignAdvisorInput = z.infer<typeof programDesignAdvisorInputSchema>;

type Source = "segment" | "platform";

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Keeps the median, both quartiles, and the sample size distinct when a figure is quoted. */
const fmt = (summary: InsightSummary | undefined, unit = "", prefix = ""): string => {
  if (!summary) return "withheld";
  return `median ${prefix}${summary.median}${unit}; Q1 ${prefix}${summary.q1}${unit}; Q3 ${prefix}${summary.q3}${unit}; sample: ${summary.programCount} programs`;
};

// Formats a proportion, treating the bundle's null as withheld.
const pct = (value: Percent): string => (isNumber(value) ? `${value}%` : "withheld");

// Formats a program count, treating a missing count as unknown rather than printing "undefined".
const count = (value: number | undefined): string => (isNumber(value) ? `${value} programs` : "an unstated number of programs");

const findSegment = (insights: ProgramDesignInsights, industry: AdvisorIndustry): ProgramDesignSegment | null => {
  const label = INDUSTRY_SEGMENT_LABELS[industry];
  if (!label) return null;
  return insights.segments?.find((segment) => segment.industry === label) ?? null;
};

// Returns the segment's cut when it exists, otherwise the platform cut, and says which was used.
const pickCut = <K extends keyof DesignCuts>(
  key: K,
  segment: ProgramDesignSegment | null,
  platform: DesignCuts | undefined,
): { cut: NonNullable<DesignCuts[K]> | undefined; from: Source } => {
  const fromSegment = segment?.[key];
  if (fromSegment) return { cut: fromSegment as NonNullable<DesignCuts[K]>, from: "segment" };
  const fromPlatform = platform?.[key];
  return { cut: fromPlatform ? (fromPlatform as NonNullable<DesignCuts[K]>) : undefined, from: "platform" };
};

// Returns one figure with per-figure fallback: the bundle nulls individual summaries inside a
// cut that otherwise exists, so a withheld segment figure falls back to the platform figure.
const pickFigure = (
  read: (cuts: DesignCuts | undefined) => InsightSummary | undefined,
  segment: ProgramDesignSegment | null,
  platform: DesignCuts | undefined,
): { summary: InsightSummary | undefined; from: Source } => {
  const fromSegment = read(segment ?? undefined);
  if (fromSegment) return { summary: fromSegment, from: "segment" };
  return { summary: read(platform), from: "platform" };
};

// Uses the program denominator separately from the number of distinct companies.
const segmentProgramCount = (segment: ProgramDesignSegment) =>
  segment.programCount ?? segment.results?.programCount ?? segment.results?.successfulReferrals?.programCount;

/** Names the cohort without substituting its total for an individual cut's denominator. */
const sourceNote = (from: Source, segment: ProgramDesignSegment | null) =>
  from === "segment" && segment ? segment.industry : "platform-wide high performers";

/** Keeps source and sample beside the figure, including a withheld segment's fallback. */
const figureCell = (picked: { summary: InsightSummary | undefined; from: Source }, segment: ProgramDesignSegment | null, unit = "", prefix = "") =>
  `${fmt(picked.summary, unit, prefix)}${picked.summary ? `; source: ${sourceNote(picked.from, segment)}${segment && picked.from === "platform" ? " (segment withheld)" : ""}` : ""}`;

type Trigger = "CUSTOM" | "ON_SIGNUP" | null;
/** Echoes free text; a separate action on a signup goal needs clarification before configuring it. */
const decideTrigger = (input: ProgramDesignAdvisorInput): Trigger => {
  if (input.programType === "AFFILIATE") return null;
  if (input.goal === "paid_conversions" || input.goal === "leads") return "CUSTOM";
  if (input.goal === "signups" || input.goal === "subscribers" || input.goal === "waitlist") return input.qualifyingAction ? null : "ON_SIGNUP";
  return null;
};

export type ProgramDesignAdvice = {
  markdown: string;
  benchmarkFacts: string[];
  configurationPlan: Array<{ tool: string; arguments: Record<string, unknown>; note: string }>;
  decisions: {
    referralTrigger: Trigger;
    qualifyingAction: string | null;
    rewardType: "AFFILIATE" | "MILESTONE" | "SINGLE_SIDED" | "DOUBLE_SIDED";
    unresolved: string[];
  };
};

type Decisions = {
  trigger: Trigger;
  campaignGoal: string | null;
  linkedInVisible: boolean;
  prefersMilestones: boolean;
  salesLed: boolean;
};

/** Keeps the creation goal, sharing defaults, and reward recommendation on the same business profile. */
const decide = (input: ProgramDesignAdvisorInput): Decisions => {
  const salesLed = input.salesMotion ? input.salesMotion === "sales_led" : /sales[- ]led|negotiated|enterprise sales|account executive/i.test(input.businessModel ?? "");
  const campaignGoal = CAMPAIGN_GOAL_FOR_GOAL[input.goal] ?? (input.industry === "saas_ai" && salesLed ? SALES_LED_SAAS_GOAL : CAMPAIGN_GOAL_FOR_PROFILE[input.industry]);
  return {
    trigger: decideTrigger(input),
    campaignGoal,
    linkedInVisible: campaignGoal === CAMPAIGN_GOAL_FOR_PROFILE.saas_ai || campaignGoal === SALES_LED_SAAS_GOAL,
    prefersMilestones: input.industry === "media_newsletters" || input.goal === "subscribers" || input.goal === "waitlist",
    salesLed,
  };
};

/** Carries one qualifying action and reward structure through the advice and proposed writes. */
const adviceDecisions = (input: ProgramDesignAdvisorInput, decisions: Decisions): ProgramDesignAdvice["decisions"] => {
  const qualifyingAction = input.qualifyingAction ?? (input.programType === "AFFILIATE" || input.goal === "paid_conversions" ? "Paid conversion" : decisions.trigger === "ON_SIGNUP" ? "Signup" : null);
  const unresolved = ["Confirm the incentive, its amount or value, who funds it, and how it is fulfilled before creating a reward."];
  if (!input.companyName) unresolved.push("Confirm the company name before creating the program.");
  if (input.programType === "REFERRAL" && !decisions.trigger) {
    unresolved.push(input.qualifyingAction
      ? "Confirm whether signup alone completes the stated qualifying action or an additional action is required. No referral trigger is selected."
      : "Confirm the qualifying action before selecting a referral trigger.");
  }
  if (decisions.trigger === "CUSTOM" && !qualifyingAction) unresolved.push("Confirm the exact qualifying action before configuring the referral trigger.");
  if (input.programType === "AFFILIATE") unresolved.push("Confirm commission terms, refund hold, payout threshold, and payout requirements before enabling affiliate rewards.");
  return {
    referralTrigger: decisions.trigger,
    qualifyingAction,
    rewardType: input.programType === "AFFILIATE" ? "AFFILIATE" : decisions.prefersMilestones ? "MILESTONE" : decisions.salesLed ? "SINGLE_SIDED" : "DOUBLE_SIDED",
    unresolved,
  };
};

/** Leads with an actionable draft while preserving all detailed evidence below. */
const renderDraftRecommendation = (decisions: ProgramDesignAdvice["decisions"]): string[] => [
  "## Draft recommendation",
  "",
  `- Reward structure: \`${decisions.rewardType}\`, a proposed design choice. No incentive amount is selected.`,
  decisions.rewardType === "AFFILIATE"
    ? `- Qualifying action: ${decisions.qualifyingAction}; confirm the commission terms with the customer.`
    : decisions.referralTrigger
    ? `- Referral trigger: \`${decisions.referralTrigger}\`. Qualifying action: ${decisions.qualifyingAction ?? "confirm the exact action with the customer"}.`
    : `- Referral trigger: unresolved${decisions.qualifyingAction ? `; stated action: ${decisions.qualifyingAction}` : ""}.`,
  "- Confirm the open choices in the configuration plan before executing writes. The figures below are observations; the proposed settings are design judgment.",
  "",
];

// Pulls the sections of the advisor rules document that apply to the program type, drops the
// evidence pointers written for reviewers, and links the support citations.
const applicableRuleSections = (guidance: string, programType: ProgramDesignAdvisorInput["programType"], links?: Readonly<Record<string, string>>): string => {
  const keep = programType === "AFFILIATE" ? /^## (?:Intake|Rule set 9|Caveats)/ : /^## (?:Intake|Rule set [1-7]\b|Caveats)/;
  return guidance
    .split(/\n(?=## )/)
    .filter((section) => keep.test(section))
    .join("\n\n")
    // The result sections define these ratios and currency limits from the figures themselves.
    // Omit duplicate interpretations from prose rules so they cannot contradict those definitions.
    .split(/\n\n+/)
    .filter((paragraph) => !/\[insights: platform\.(?:qualifyingAction\.observedTwoStep|rewardValues)\]/.test(paragraph))
    .join("\n\n")
    .replace(/\[(?:[^\[\]\n]|\[[^\[\]\n]*\])*\]/g, (citation) => {
      const references = citation.slice(1, -1).split(/,\s*/);
      const publicReferences = references.filter((reference) => /^(?:support \d{3}|docs \S+)$/.test(reference));
      if (publicReferences.length) return `(${publicReferences.map((reference) => docLink(reference, links)).join(", ")})`;
      return references.every((reference) => /^(?:insights|growsurf-mcp)\b/.test(reference)) ? "" : citation;
    })
    .replace(/^## /gm, "### ")
    .trim();
};

/** Defines each measured ratio beside its figures so it cannot imply participant behavior. */
const renderResultsSection = (segment: ProgramDesignSegment | null, platform: DesignCuts | undefined): string[] => {
  const { cut, from } = pickCut("results", segment, platform);
  if (!cut) return [];
  const figure = (read: (cuts: DesignCuts | undefined) => InsightSummary | undefined, unit = "") =>
    figureCell(pickFigure(read, segment, platform), segment, unit);
  return [
    `## What good looks like (${sourceNote(from, segment)})`,
    "",
    "Each median summarizes one value per program. Q1 and Q3 are the 25th and 75th percentiles; they bound the middle half, not the full range. These observations are not forecasts.",
    "",
    table(
      ["Measured result", "Observed figure and source"],
      [
        ["Successful referrals per program", figure((cuts) => cuts?.results?.successfulReferrals)],
        ["Participants per program", figure((cuts) => cuts?.results?.participants)],
        ["Successful referrals ÷ participants × 100, per program", figure((cuts) => cuts?.results?.participantToReferralPercent, "%")],
        ["Successful referrals ÷ unique link views × 100, per program", figure((cuts) => cuts?.results?.uniqueViewToReferralPercent, "%")],
      ],
    ),
    "The participant ratio does not measure how many participants actively refer. It does not measure subscriber participation or the percentage of advocates who share.",
    ...(cut.uniqueViewInclusionRule ? [`Unique-view sample: ${cut.uniqueViewInclusionRule}`] : []),
    "",
  ];
};

/** Separates a proposed trigger from observed settings, with each setting's own sample. */
const renderQualifyingActionSection = (
  input: ProgramDesignAdvisorInput,
  decisions: Decisions,
  segment: ProgramDesignSegment | null,
  platform: DesignCuts | undefined,
): string[] => {
  const lines = ["## Qualifying action", ""];
  if (input.qualifyingAction) lines.push(`Stated qualifying action: ${input.qualifyingAction}`, "");
  if (decisions.trigger === "CUSTOM") {
    lines.push(
      "Recommendation: `referralTrigger: \"CUSTOM\"` (Sign Up + Qualifying Action). The referred friend must complete the action before the referrer is credited. This protects the reward budget and keeps signup-only fraud from earning rewards.",
    );
  } else if (decisions.trigger === "ON_SIGNUP") {
    lines.push(
      "Recommendation: `referralTrigger: \"ON_SIGNUP\"`. The signup is the business outcome, so it counts as the referral. Pair it with `autoBlockFraud: true` after testing, `fraud.recaptcha` on public forms, and a double opt-in trigger for email lists.",
    );
  } else {
    lines.push(
      "Decide what counts as a successful referral before configuring anything. If the referred friend must pay, activate, book, or reach a stage your team marks as won, use `referralTrigger: \"CUSTOM\"`. If the signup itself is the outcome, use `\"ON_SIGNUP\"`. Pass `goal` to get a recommendation.",
    );
  }
  // The two sub-cuts fall back independently: a segment often withholds one and keeps the other.
  const triggerPick = segment?.qualifyingAction?.referralTrigger
    ? { trigger: segment.qualifyingAction.referralTrigger, from: "segment" as Source }
    : { trigger: platform?.qualifyingAction?.referralTrigger, from: "platform" as Source };
  const twoStepPick = segment?.qualifyingAction?.observedTwoStep && isNumber(segment.qualifyingAction.observedTwoStep.percent)
    ? { twoStep: segment.qualifyingAction.observedTwoStep, from: "segment" as Source }
    : { twoStep: platform?.qualifyingAction?.observedTwoStep, from: "platform" as Source };
  const trigger = triggerPick.trigger;
  if (trigger) {
    lines.push(
      "",
      table(["Observed setting", "Share and denominator", "Source"], [
        ["Signup counts as the referral", `${pct(trigger.signUpOnlyPercent)} of ${count(trigger.programCount)} with installation evidence`, sourceNote(triggerPick.from, segment)],
        ["Signup plus qualifying action", `${pct(trigger.signUpPlusQualifyingActionPercent)} of ${count(trigger.programCount)} with installation evidence`, sourceNote(triggerPick.from, segment)],
      ]),
    );
    const bySetting = trigger.participantToReferralBySetting;
    if (bySetting?.signUpOnly || bySetting?.signUpPlusQualifyingAction) {
      lines.push(
        `Successful referrals ÷ participants × 100, per program; signup-only setting: ${fmt(bySetting.signUpOnly, "%")}; source: ${sourceNote(triggerPick.from, segment)}.`,
        `Successful referrals ÷ participants × 100, per program; qualifying-action setting: ${fmt(bySetting.signUpPlusQualifyingAction, "%")}; source: ${sourceNote(triggerPick.from, segment)}. ${bySetting.caveat ?? ""}`.trim(),
      );
    }
  }
  const twoStep = twoStepPick.twoStep;
  if (twoStep && isNumber(twoStep.percent)) {
    lines.push(
      `Programs with at least one recorded pending referral: ${twoStep.percent}% of ${count(twoStep.programCount)}; source: ${sourceNote(twoStepPick.from, segment)}.`,
      `Successful referrals ÷ pending referrals × 100, per program: ${fmt(twoStep.leadToReferralPercent, "%")}; source: ${sourceNote(twoStepPick.from, segment)}. ${twoStep.leadToReferralBasis ?? PENDING_REFERRAL_SAMPLE_RULE}`,
    );
  }
  lines.push(
    "",
    "Set `referralCreditWindowDays` to the longest realistic time between signup and the action, and `referralCookieWindowDays` to cover the consideration period before signup. These are two different windows. No window length is selected in the plan; confirm both with the customer.",
    "",
  );
  return lines;
};

/** Labels observed reward use independently of the recommended reward structure. */
const renderRewardTypeSection = (
  decisions: Decisions,
  segment: ProgramDesignSegment | null,
  platform: DesignCuts | undefined,
): string[] => {
  const lines = ["## Reward type", ""];
  const { cut, from } = pickCut("rewardStructure", segment, platform);
  const topType = cut?.typeUse?.length ? [...cut.typeUse].sort((left, right) => right.percent - left.percent)[0] : undefined;
  if (cut?.typeUse?.length) {
    lines.push(
      `Reward types in use among high performers (${sourceNote(from, segment)}; ${count(cut.programCount)} with reward evidence; a program can run more than one):`,
      "",
      table(["Type", "Observed share and denominator", "Source"], cut.typeUse.map((row) => [row.label, `${row.percent}% (${row.matchingPrograms} of ${count(cut.programCount)} with reward evidence)`, sourceNote(from, segment)]), 1),
      "",
    );
    if (topType) lines.push(`Most common observed reward type: ${topType.label} (${topType.percent}%, ${topType.matchingPrograms} of ${count(cut.programCount)} with reward evidence; source: ${sourceNote(from, segment)}).`, "");
    if (cut.multiTypeShare) lines.push(`Programs combining types: ${pct(cut.multiTypeShare.percent)} (${cut.multiTypeShare.matchingPrograms} of ${count(cut.multiTypeShare.programCount)}); source: ${sourceNote(from, segment)}. Reward tiers per program: ${fmt(cut.rewardTiersPerProgram)}.`, "");
  }
  const recommendation: string[] = [];
  if (decisions.prefersMilestones) {
    recommendation.push(
      "Milestone ladder as the base. Choose the referral thresholds and incentives with the customer; the observed ladder does not establish which tiers will work for their audience.",
    );
  } else if (decisions.salesLed) {
    recommendation.push(
      "Single-sided reward to the referrer for this sales-led profile. This is a design recommendation, not a measured preference among sales-led programs. Consider double-sided when a concrete benefit for the friend fits the sales process.",
    );
  } else if (topType && topType.type !== "DOUBLE_SIDED") {
    recommendation.push(
      `Consider double-sided when the referred friend needs a reason to act. The most common observed reward type above is descriptive; it does not establish the best type for this business.`,
    );
  } else {
    recommendation.push(
      "Double-sided reward as the base when both people need an incentive. Confirm the benefit for each person before choosing amounts. An upfront friend discount needs a supported billing integration.",
    );
  }
  recommendation.push("Consider a leaderboard for a time-limited promotion after the base reward is working. Confirm its winner count and period.");
  lines.push("Recommendation (design judgment, not an observed benchmark):", "", ...recommendation.map((line) => `- ${line}`), "");
  const ladders = pickCut("milestoneLadders", segment, platform);
  if (ladders.cut && isNumber(ladders.cut.programCount) && ladders.cut.programCount > 0) {
    const cutLadders = ladders.cut;
    lines.push(
      `Milestone reference (${sourceNote(ladders.from, segment)}; ${count(cutLadders.programCount)} run milestones): tiers per program ${fmt(cutLadders.tiersPerProgram)}; first tier at ${fmt(cutLadders.firstTierReferralsRequired)} referrals; top tier at ${fmt(cutLadders.topTierReferralsRequired)} referrals.`,
    );
    if (cutLadders.repeatedLadders?.length) {
      lines.push(`Ladders that recur: ${cutLadders.repeatedLadders.map((row) => `${row.referralsRequired.join("/")} (${row.programCount} programs)`).join("; ")}.`);
    }
    lines.push("");
  }
  return lines;
};

/** Preserves each amount's currency limitations and keeps reward-count denominators explicit. */
const renderRewardValueSection = (
  input: ProgramDesignAdvisorInput,
  segment: ProgramDesignSegment | null,
  platform: DesignCuts | undefined,
): string[] => {
  const lines = ["## Reward value", ""];
  if (input.currencyISO && input.currencyISO !== "USD") {
    lines.push(
      `No reward-amount benchmark is available in ${input.currencyISO}. Dollar reward bands are omitted: they mix dollar currencies and cannot support a currency conversion or an above/below-median comparison.`,
      isNumber(input.rewardBudgetPerReferral) ? `Stated budget: ${input.rewardBudgetPerReferral} ${input.currencyISO} per referral. Confirm whether this covers both sides before choosing amounts.` : "Choose the amount from the customer's budget and margins.",
      "",
    );
    return lines;
  }
  if (isNumber(input.rewardBudgetPerReferral)) {
    lines.push(
      `Stated budget: ${input.rewardBudgetPerReferral} ${input.currencyISO ?? "(currency not specified)"} per referral. Confirm whether this covers both sides before choosing amounts.`,
      "Dollar reward bands are omitted for this budget comparison. The pool mixes dollar currencies; these are not USD-only benchmarks. It cannot establish whether this budget is above, below, or within a reward band, or whether the budget is workable for this business.",
      "",
    );
    return lines;
  }
  const { cut, from } = pickCut("rewardValues", segment, platform);
  if (!cut) {
    lines.push("Anchor the value to what a converted referral is worth to the business and never exceed it. Make both sides of a double-sided reward equal unless there is a reason not to.", "");
    return lines;
  }
  const doubleReferrer = pickFigure((cuts) => cuts?.rewardValues?.doubleSided?.referrerAmount, segment, platform);
  const doubleFriend = pickFigure((cuts) => cuts?.rewardValues?.doubleSided?.referredFriendAmount, segment, platform);
  const singleReferrer = pickFigure((cuts) => cuts?.rewardValues?.singleSided?.referrerAmount, segment, platform);
  lines.push(
    `Dollar reward bands among high performers (${sourceNote(from, segment)}). ${cut.currencyCaveat ?? ""}`.trim(),
    "Currency basis: the dollar pool mixes currencies. These are not USD-only benchmarks and do not support exchange-rate conversions or above/below-budget comparisons. Amounts summarize one median amount per program.",
    "",
    table(
      ["Reward", "Observed amount in mixed dollar currencies and source"],
      [
        ["Double-sided, referrer", figureCell(doubleReferrer, segment, " (mixed dollar currencies)")],
        ["Double-sided, referred friend", figureCell(doubleFriend, segment, " (mixed dollar currencies)")],
        ["Single-sided, referrer", figureCell(singleReferrer, segment, " (mixed dollar currencies)")],
      ],
    ),
    "",
  );
  const symmetry = cut.doubleSided?.symmetry ?? platform?.rewardValues?.doubleSided?.symmetry;
  if (symmetry) {
    const symmetrySource = segment && !segment.rewardValues?.doubleSided?.symmetry ? " (platform-wide, segment withheld)" : "";
    lines.push(`Equal reward amounts${symmetrySource}: ${symmetry.equalPercent}% of ${symmetry.rewardCount} double-sided rewards give both sides the same amount; source: ${sourceNote(symmetrySource ? "platform" : from, segment)}. This is a reward denominator, not a program denominator.`);
  }
  lines.push(
    `Unlimited earning, double-sided rewards: ${pct(cut.doubleSided?.unlimitedPercent)}${isNumber(cut.doubleSided?.unlimitedPercent) ? ` of ${cut.doubleSided?.rewardCount ?? "an unstated number of"} double-sided rewards` : ""}; source: ${sourceNote(from, segment)}.`,
    `Unlimited earning, single-sided rewards: ${pct(cut.singleSided?.unlimitedPercent)}${isNumber(cut.singleSided?.unlimitedPercent) ? ` of ${cut.singleSided?.rewardCount ?? "an unstated number of"} single-sided rewards` : ""}; source: ${sourceNote(from, segment)}.`,
    "Offer repeated earning only within the confirmed budget; use `limit` and `limitDuration` when the customer needs a cap.",
  );
  if (isNumber(cut.percentOffRewardsPercent)) {
    lines.push(`Percent-off rewards: ${cut.percentOffRewardsPercent}% of ${cut.rewardCount ?? "an unstated number of"} rewards; source: ${sourceNote(from, segment)}. Choose a fixed amount or percentage with the customer.`);
  }
  lines.push(
    "",
    "Set the value of a converted referral in the program's dashboard settings so its Referral Revenue and Lead Revenue figures are meaningful estimates; that value is not part of the API contract.",
    "",
  );
  return lines;
};

/** Gives every archetype percentage its reward-evidence cohort and program denominator. */
const renderArchetypeSection = (segment: ProgramDesignSegment | null, platform: DesignCuts | undefined): string[] => {
  const lines = ["## Reward archetype and fulfillment", ""];
  const { cut, from } = pickCut("rewardArchetypes", segment, platform);
  if (cut?.archetypes?.length) {
    lines.push(
      `What high performers give away (${sourceNote(from, segment)}; ${count(cut.programCount)} with reward evidence):`,
      "",
      table(["Archetype", "Observed share and denominator", "Source"], cut.archetypes.map((row) => [row.label, `${row.percent}% (${row.matchingPrograms} of ${count(cut.programCount)} with reward evidence)`, sourceNote(from, segment)]), 1),
      "",
    );
  }
  lines.push(
    "Match the archetype to a fulfillment path before promising it:",
    "",
    table(
      ["Archetype", "Fulfill with"],
      [
        ["Cash or gift card", "Tango Card or PayPal payouts through the integrations page"],
        ["Product credit or discount", "Stripe, Chargebee, or Recurly coupons; upfront discount for the friend's side"],
        ["Unique coupon codes from your own store", "Webhooks to your billing platform, or Zapier with a coupon service"],
        ["Merchandise", "Zapier or Make with on-demand printing for low volume, bulk inventory plus a shipping API for high volume"],
        ["Product access, features, points", "Webhooks or Zapier into your own system"],
      ],
    ),
    "",
    `Keep rewards non-awarding (\`isVisible: false\`) until funding, fulfillment, tax treatment, and approval settings are confirmed (${supportLink("266")}, ${supportLink("280")}).`,
    "",
  );
  return lines;
};

/** Keeps share-action proportions separate from program preferences and referral outcomes. */
const renderShareChannelsSection = (decisions: Decisions, segment: ProgramDesignSegment | null, platform: DesignCuts | undefined): string[] => {
  const lines = ["## Share channels", ""];
  const { cut, from } = pickCut("shareChannels", segment, platform);
  if (cut?.channels?.length) {
    lines.push(
      `Observed sharing among high performers (${sourceNote(from, segment)}; ${count(cut.programCount)}). ${cut.basis ?? ""}`.trim(),
      "A channel's percentage is its share of all recorded share actions in this cohort. It is not the percentage of programs, people, or credited referrals using that channel, and does not show which channels were enabled.",
      "",
      table(["Channel", "Observed share of actions", "Programs with activity", "Source"], cut.channels.map((row) => [row.channel, `${row.shareOfAllShareActionsPercent}% of recorded share actions`, `${row.programsWithShareActivity} of ${count(cut.programCount)}`, sourceNote(from, segment)]), 1),
      "",
    );
  }
  lines.push(
    `Keep copy-link and email on for every program. The \`goal\` passed at creation seeds LinkedIn ${decisions.linkedInVisible ? "visible" : "hidden"} for this profile; change \`share.type.linkedin.isVisible\` in Design only if the customer asks. Turn on the referred-friend welcome banner and inline welcome message.`,
    "",
  );
  return lines;
};

/** Reports integration proportions with their own denominator and preserves correlation caveats. */
const renderIntegrationsSection = (
  insights: ProgramDesignInsights | undefined,
  segment: ProgramDesignSegment | null,
  platform: DesignCuts | undefined,
): string[] => {
  const lines = ["## Integrations", ""];
  const { cut, from } = pickCut("integrations", segment, platform);
  if (cut) {
    if (cut.anyIntegration) lines.push(`At least one integration connected: ${pct(cut.anyIntegration.percent)} (${cut.anyIntegration.matchingPrograms} of ${count(cut.anyIntegration.programCount)}); source: ${sourceNote(from, segment)}.`, "");
    if (cut.integrations?.length) {
      lines.push(table(["Integration", "Observed share and denominator", "Source"], cut.integrations.map((row) => [row.integration, `${row.percent}% (${row.programsConnected} of ${count(cut.programCount)})`, sourceNote(from, segment)]), 1), "");
    }
  }
  const correlation = insights?.correlations?.find((row) => row.key === "integration_use");
  if (correlation) {
    lines.push(`${correlation.caveat} ${correlation.groups.map((group) => `${group.structure}: median ${group.successfulReferrals?.median ?? "withheld"} referrals (${group.programCount} programs)`).join("; ")}.`, "");
  }
  lines.push("Sync referral status back to the CRM or email platform so the team sees pending, converted, and expired referrals next to the customer record. Use `growsurf_get_integration_connect_link` to hand the customer the connect panel.", "");
  return lines;
};

/** Keeps referral reward approval separate from affiliate commission and payout decisions. */
const renderAntiFraudSection = (decisions: Decisions, programType: ProgramDesignAdvisorInput["programType"] = "REFERRAL"): string[] => [
  "## Anti-fraud and approval defaults",
  "",
  `- Test with anti-fraud loose (\`autoBlockFraud: false\`, \`requireManualFraudApproval: false\`), launch strict (\`autoBlockFraud: true\`) (${supportLink("209")}, ${supportLink("251")}).`,
  `- ${programType === "AFFILIATE" ? "Confirm commission approval and payout requirements before enabling affiliate rewards." : decisions.trigger === "ON_SIGNUP" ? "The trigger counts the signup, so keep `requireManualRewardApproval: true` for the first weeks." : "Keep `requireManualRewardApproval: true` when the reward is cash or a gift card, and for the first weeks of a referral program."}`,
  "- Enable `fraud.recaptcha` on public signup forms, set `fraud.blockBurnerEmails`, and set `fraud.blockDataCenterIps` for consumer-facing products.",
  "",
];

/** Proposes only complete calls, with explicit targets and no unconfirmed incentive writes. */
const buildConfigurationPlan = (input: ProgramDesignAdvisorInput, decisions: Decisions): ProgramDesignAdvice["configurationPlan"] => {
  const campaignId = "<new-program-id>";
  const plan: ProgramDesignAdvice["configurationPlan"] = [
    {
      tool: "growsurf_create_campaign",
      arguments: {
        type: input.programType,
        name: `${input.companyName ?? "<company>"} ${input.programType === "AFFILIATE" ? "affiliate" : "referral"} program`,
        companyName: input.companyName ?? "<company>",
        ...(input.currencyISO && input.currencyISO !== "USD" ? { currencyISO: input.currencyISO } : {}),
        ...(decisions.campaignGoal ? { goal: decisions.campaignGoal } : {}),
      },
      note: "WRITE: creates a program after the customer confirms its name and creation. Omitted `rewards` keeps starter rewards switched off. Use the exact creation `goal` shown here; it is a different enum from the advisor's `goal`.",
    },
  ];
  if (input.programType === "REFERRAL" && decisions.trigger) {
    plan.push({
      tool: "growsurf_update_campaign_installation",
      arguments: { campaignId, fields: { referralTrigger: decisions.trigger } },
      note: "WRITE: changes the referral trigger. Read the new program's Installation tab first and patch only this field after the customer confirms it.",
    });
  }
  plan.push({
    tool: "growsurf_update_campaign_options",
    arguments: {
      campaignId,
      fields: {
        ...(input.programType === "AFFILIATE" ? { affiliateApplicationMode: "MANUAL_REVIEW" } : { requireManualRewardApproval: true }),
      },
    },
    note: "WRITE: changes program options. Read the new program's Options tab first and patch only the settings the customer confirms. No credit window, cookie window, commission rate, or incentive amount is selected.",
  });
  return plan;
};

/** Renders the same machine-readable plan that the client receives in structured content. */
const renderConfigurationPlan = (plan: ProgramDesignAdvice["configurationPlan"], decisions: ProgramDesignAdvice["decisions"]): string[] => {
  return [
    "## Configuration plan",
    "",
    "The advisor is read-only. Executing this plan creates or changes a program; these are proposed writes, not benchmarks. Confirm the open choices first. Use these exact tool names and argument shapes; do not turn advisor inputs into creation fields. Replace every `<new-program-id>` with the `id` returned by `growsurf_create_campaign`; never use a previously configured default program. Fetch each tab with that same `campaignId` before patching it. Each patch tool takes its changes under `fields`.",
    "",
    ...decisions.unresolved.map((choice) => `- ${choice}`),
    "",
    "Reward creation is omitted because the incentive and its required copy are unconfirmed. After confirmation, fetch the reward tool schema, fill the required fields, and keep `isVisible: false` until funding and fulfillment are confirmed.",
    "",
    codeBlock("json", JSON.stringify(plan, null, 2)),
    "",
  ];
};

/** Explains missing affiliate data without converting its coverage into prevalence or performance. */
const renderAffiliateAdvice = (insights: ProgramDesignInsights | undefined): string[] => {
  const withheld = insights?.withheldCuts?.find((line) => /affiliate/i.test(line));
  return [
    "## Affiliate program defaults",
    "",
    withheld ? `Affiliate benchmarks are withheld. Data-coverage note for the platform-wide affiliate sample, not an industry-specific sample: ${withheld}` : "No benchmark backs affiliate program figures.",
    "A missing recorded commission rate is unknown data. It does not show that the program pays no commission or that commission rates are uncommon. This evidence does not establish typical rates, industry-specific affiliate behavior, or better performance from reviewed applications.",
    "",
    "The following are documentation-based design defaults, not findings about affiliate performance:",
    "",
    "- Reviewed applications (`affiliateApplicationMode: \"MANUAL_REVIEW\"`) unless the customer intentionally enrolls known partners. This controls enrollment; it is not a claim that vetted affiliates perform better.",
    "- Commission on paid conversions with a refund-hold period; a payout threshold; payout instructions and tax-document collection confirmed before enabling payouts.",
    "- Public applicants use the configured GrowSurf Program Page flow, not trusted REST Add Participant.",
    `- Test end to end as an affiliate and as a referred lead before launch (${supportLink("485")}).`,
    "",
  ];
};

const renderTitle = (input: ProgramDesignAdvisorInput) => `# Program-design advice${input.companyName ? ` for ${input.companyName}` : ""}`;

/** Keeps a ratio's unit, quartiles, sample, and source in one reusable statement. */
const buildBenchmarkFacts = (input: ProgramDesignAdvisorInput, insights: ProgramDesignInsights | undefined): string[] => {
  if (!insights || input.programType === "AFFILIATE") return [];
  const segment = findSegment(insights, input.industry);
  const metrics: Array<{ label: string; read: (cuts: DesignCuts | undefined) => InsightSummary | undefined; inclusionRule?: (cuts: DesignCuts | undefined) => string }> = [
    { label: "Successful referrals per 100 participants", read: (cuts) => cuts?.results?.participantToReferralPercent },
    { label: "Successful referrals per 100 pending referrals", read: (cuts) => cuts?.qualifyingAction?.observedTwoStep?.leadToReferralPercent, inclusionRule: (cuts) => cuts?.qualifyingAction?.observedTwoStep?.leadToReferralBasis ?? PENDING_REFERRAL_SAMPLE_RULE },
  ];
  return metrics.flatMap(({ label, read, inclusionRule }) => {
    const picked = pickFigure(read, segment, insights.platform);
    const rule = inclusionRule?.(picked.from === "segment" ? segment ?? undefined : insights.platform);
    return picked.summary ? [`${label}, measured separately for each high-performing program: ${figureCell(picked, segment)}.${rule ? ` ${rule}` : ""}`] : [];
  });
};

/** Gives a first draft without flooding it with unrelated figures or incentive examples. */
const renderAdviceSummary = (
  input: ProgramDesignAdvisorInput,
  insights: ProgramDesignInsights | undefined,
  decisions: ProgramDesignAdvice["decisions"],
  configurationPlan: ProgramDesignAdvice["configurationPlan"],
  benchmarkFacts: string[],
): string[] => [
  ...(input.programType === "AFFILIATE" ? renderAffiliateAdvice(insights) : [
    ...(insights ? [`Segment: ${sourceNote(findSegment(insights, input.industry) ? "segment" : "platform", findSegment(insights, input.industry))}.`] : []),
    ...(benchmarkFacts.length ? [
      insights?.scopes?.high_performing?.sentence ?? "These observations describe high-performing referral programs, not expected results for a new program.",
      ...benchmarkFacts,
      "These ratios count referrals. They do not measure participants who refer or the share of all signups that converts. Q1 and Q3 bound the middle half of program values, not the full range.",
    ] : ["No referral benchmark figures are available for this request."]),
  ]),
  ...(input.currencyISO && input.currencyISO !== "USD" ? [`No reward-amount benchmark is available in ${input.currencyISO}.`] : []),
  ...(input.rewardBudgetPerReferral !== undefined ? ["The supplied budget is a limit, not a selected incentive. Mixed-currency reward figures cannot establish whether it is above or below a typical amount."] : []),
  "",
  "## Configuration plan",
  "",
  ...decisions.unresolved.map((choice) => `- ${choice}`),
  "",
  "Proposed calls only. After confirmation, use the new program's returned id for every `<new-program-id>` and read each tab before patching it. No reward is created by this plan.",
  codeBlock("json", JSON.stringify(configurationPlan, null, 2)),
  "",
  "Call again with `detail: \"full\"` for all available reward, qualifying-action, sharing, and integration figures with their caveats.",
  "",
];

/** Builds the advice and its proposed calls from the same resolved decisions. */
export const buildProgramDesignAdvice = (
  input: ProgramDesignAdvisorInput,
  bundle: GrowSurfInsightsBundle | undefined,
): ProgramDesignAdvice => {
  const insights = bundle?.programDesign;
  const decisions = decide(input);
  const resolvedDecisions = adviceDecisions(input, decisions);
  const configurationPlan = buildConfigurationPlan(input, decisions);
  const benchmarkFacts = buildBenchmarkFacts(input, insights);
  const links = bundle?.troubleshootingPlaybook?.docLinks;
  const lines: string[] = [renderTitle(input), ""];
  if (!insights) lines.push(NO_INSIGHTS_NOTE, "");
  lines.push(...renderDraftRecommendation(resolvedDecisions));

  if (input.detail === "summary") {
    lines.push(...renderAdviceSummary(input, insights, resolvedDecisions, configurationPlan, benchmarkFacts));
  } else if (input.programType === "AFFILIATE") {
    lines.push(...renderAffiliateAdvice(insights), ...renderAntiFraudSection(decisions, input.programType), ...renderConfigurationPlan(configurationPlan, resolvedDecisions));
  } else {
    const segment = insights ? findSegment(insights, input.industry) : null;
    const platform = insights?.platform;
    if (insights) {
      lines.push(
        `Scope: ${insights.scopes?.high_performing?.sentence ?? "Figures describe GrowSurf's highest-performing referral programs."}`,
        segment
          ? `Segment: ${segment.industry} (${count(segmentProgramCount(segment))} from ${segment.companyCount} companies). A figure falls back to the platform-wide cut when the segment withholds it, and says so.`
          : "Segment: none matched, so every figure is the platform-wide high-performer cut.",
        segment
          ? `Quote each figure with its own sample, source, and metric definition. A platform-wide fallback is not ${segment.industry} data. If the business is not clearly ${segment.industry}, call again with industry \`other\`.`
          : "Quote each figure with its own sample and metric definition, and say it is platform-wide.",
        "Share-channel percentages describe share actions, not credited referrals. Quartiles describe the middle half of the sample, not its full range. Suggested settings and reward examples are not observed benchmarks.",
      );
    }
    if (input.businessModel) lines.push(`Business: ${input.businessModel}.`);
    if (input.audience) lines.push(`Audience: ${input.audience}.`);
    lines.push(
      "",
      ...renderResultsSection(segment, platform),
      ...renderQualifyingActionSection(input, decisions, segment, platform),
      ...renderRewardTypeSection(decisions, segment, platform),
      ...renderRewardValueSection(input, segment, platform),
      ...renderArchetypeSection(segment, platform),
      ...renderAntiFraudSection(decisions),
      ...renderShareChannelsSection(decisions, segment, platform),
      ...renderIntegrationsSection(insights, segment, platform),
      ...renderConfigurationPlan(configurationPlan, resolvedDecisions),
    );
  }

  if (bundle?.programDesignGuidance) {
    if (input.includeRules) {
      const rules = applicableRuleSections(bundle.programDesignGuidance, input.programType, links);
      if (rules) lines.push("## How to apply these figures", "", rules, "");
    } else {
      lines.push("Call again with `includeRules: true` for more guidance on applying these recommendations.", "");
    }
  }
  return { decisions: resolvedDecisions, configurationPlan, benchmarkFacts, markdown: lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() };
};

/** Retains the Markdown-only renderer for hosts that do not need the structured plan. */
export const renderProgramDesignAdvisor = (input: ProgramDesignAdvisorInput, bundle: GrowSurfInsightsBundle | undefined): string =>
  buildProgramDesignAdvice(input, bundle).markdown;

// ---------------------------------------------------------------------------------------------
// Referral-tracking troubleshooter
// ---------------------------------------------------------------------------------------------

const TOOL_MAP: Readonly<Record<string, string>> = {
  installation: "growsurf_get_campaign_installation",
  options: "growsurf_get_campaign_options",
  campaign: "growsurf_get_campaign",
  rewards: "growsurf_list_campaign_rewards",
  emails: "growsurf_get_campaign_emails",
  design: "growsurf_get_campaign_design",
  participant: "growsurf_get_participant",
  participants: "growsurf_list_participants",
  activity_logs: "growsurf_get_participant_activity_logs",
  analytics: "growsurf_get_campaign_analytics",
  webhooks: "growsurf_list_campaign_webhooks",
  trigger_referral: "growsurf_trigger_referral",
  update_participant: "growsurf_update_participant",
  team: "growsurf_get_team",
  request_verification: "growsurf_request_team_verification",
};

// Tool keys whose call is scoped to one participant; only these get the participant hint.
const PARTICIPANT_SCOPED_TOOL_KEYS = new Set(["participant", "activity_logs", "update_participant"]);

// Documentation-based playbook used when no bundle is loaded. Symptom keys match the hosted
// playbook so a client can pass the same `symptom` to either server.
export const DEFAULT_TROUBLESHOOTING_PLAYBOOK: TroubleshootingPlaybook = {
  toolMap: TOOL_MAP,
  symptoms: [
    {
      key: "participant_emails_not_sending",
      label: "Participant emails are not being sent",
      aliases: ["welcome email not received", "test email not arriving", "reward email missing"],
      checks: [
        { step: 1, tool: "team", question: "Is the team verified? Participant emails do not send until GrowSurf verifies the account." },
        { step: 2, tool: "emails", question: "Is the specific email enabled? The referrer's credit email fires only on the qualifying action; the signup email fires on signup." },
        { step: 3, tool: "activity_logs", question: "Does the participant's activity log show the email as sent? If yes, check the recipient's spam folder." },
      ],
      causes: [
        { cause: "The team has not completed account verification.", fix: "Request verification; it usually completes the same business day.", tool: "request_verification", docs: ["support 467"] },
        { cause: "The email is switched off in the Emails step, or the wrong email is expected.", fix: "Enable the email in the Emails step.", docs: ["support 213"] },
        { cause: "A custom from address is set but its DNS records are not validated.", fix: "Add the records at the registrar and re-validate.", docs: ["support 281", "support 282"] },
      ],
    },
    {
      key: "reward_not_issued",
      label: "A participant earned a reward but did not receive it",
      aliases: ["reward not unlocked", "reward not sent", "gift card not received", "reward stuck"],
      checks: [
        { step: 1, tool: "participant", field: "rewards", question: "Does the affected participant have an earned reward? Read its `approved`, `status`, `isFulfilled`, and `fulfilledAt` fields. A fulfillment marker does not establish delivery." },
        { step: 2, tool: "options", field: "requireManualRewardApproval", question: "Is manual approval configured? Read `autoFulfillRewards` too: it controls automatic fulfillment marking, not whether manual fulfillment or delivery is possible." },
        { step: 3, tool: "activity_logs", question: "Which reward and referral events are actually recorded? Separate approval, fulfillment marking, and delivery evidence. A missing event or failed read leaves that step unknown." },
        { step: 4, tool: "rewards", question: "Does the reward configuration exist and allow the expected reward to be earned? Configuration alone does not prove what happened to this participant's reward." },
      ],
      causes: [
        { cause: "The participant reward has `approved: false` and manual approval is configured.", fix: "Review the affected reward in the Rewards dashboard. Approve it only if it is valid; approval does not itself confirm delivery.", docs: ["support 251", "support 349"] },
        { cause: "A reward-integration record reports missing funding or incomplete verification.", fix: "Resolve the reported setup issue and confirm whether the reward was sent before attempting another delivery.", docs: ["support 266"] },
        { cause: "The affected referral record shows a credit delay that has not ended.", fix: "Wait for the recorded delay to end. A delay setting alone does not establish that this reward is waiting on it.", docs: ["support 278"] },
      ],
    },
    {
      key: "referral_not_credited",
      label: "A referred friend signed up but the referrer was not credited",
      aliases: ["referral not tracked", "referral pending forever", "showing as direct", "no referral counted"],
      checks: [
        { step: 1, tool: "activity_logs", question: "What does the referred participant's log say: signed up at which URL, referred by whom, credit pending, delayed, expired, or awarded?" },
        { step: 2, tool: "installation", field: "referralTrigger", question: "Is the trigger `ON_SIGNUP`, or `CUSTOM` (Sign Up + Qualifying Action)? With `CUSTOM`, what calls the trigger: a billing integration, a CRM stage, Zapier, or a REST call?" },
        { step: 3, tool: "installation", question: "Do the Share URL, Signup URL, and Redirect URL share one domain? Cookies do not cross domains." },
        { step: 4, tool: "options", question: "Is `referralCreditWindowDays` shorter than the time referred friends take to convert? Is `requireManualFraudApproval` on with participants flagged high risk?" },
      ],
      causes: [
        { cause: "The qualifying action never reached GrowSurf: no billing or CRM connection, or the REST trigger call is missing.", fix: "Connect the billing integration, trigger from the CRM stage through Zapier or the REST API, or call the trigger from the backend when the action completes.", docs: ["support 188", "support 289"] },
        { cause: "The referred friend signed up on a different domain than the Share URL, so the referral cookie was absent.", fix: "Keep the Share URL and signup pages on one domain, or pass the referrer id when adding the participant from another domain.", docs: ["support 272", "support 481"] },
        { cause: "Participants are added through the REST API without `referredBy`.", fix: "Pass the referrer's id or email on Add Participant.", docs: ["docs developer-tools/rest-api"] },
        { cause: "The credit expiration window passed before the qualifying action.", fix: "Lengthen `referralCreditWindowDays` to match the sales cycle.", docs: ["support 278"] },
        { cause: "A single case needs a manual correction.", fix: "Use Assign Referrer, then Trigger Referral.", tool: "trigger_referral", docs: ["support 189", "support 191"] },
      ],
    },
    {
      key: "participants_not_added",
      label: "People sign up but do not appear as participants",
      aliases: ["form not detected", "participants missing", "signups not tracked", "no referral link sent"],
      checks: [
        { step: 1, tool: "installation", field: "signupEvent", question: "Which tracking method is configured: automatic form detection (`FORM_DETECTION`) or `PROGRAMMATIC`?" },
        { step: 2, tool: "installation", question: "Is the signup form standard HTML on the customer's own page? Iframe embeds, multi-step forms, injected third-party forms, and social login buttons cannot be detected automatically." },
        { step: 3, tool: "installation", question: "Is the Universal Code installed in the head of every page, including the Share URL, and only once?" },
        { step: 4, tool: "options", field: "fraud", question: "Is `autoBlockFraud` on while testing, or is the tester's own participant flagged high risk?" },
      ],
      causes: [
        { cause: "Automatic detection cannot see the form.", fix: "Switch to the programmatic method and add participants from the signup success callback with the JavaScript call or the REST API.", docs: ["support 203", "support 466", "support 345"] },
        { cause: "The Universal Code loads only on the signup page.", fix: "Install it globally so it loads on the Share URL and every signup page.", docs: ["support 200", "support 267"] },
        { cause: "Signups land on a confirmation page GrowSurf does not know about.", fix: "Set that page as the redirect URL under Installation > URLs.", docs: ["support 301"] },
        { cause: "Anti-fraud blocked the test signup.", fix: "Set `autoBlockFraud: false` while testing and use real addresses in a private window; switch it back on at launch.", docs: ["support 209", "support 195"] },
      ],
    },
    {
      key: "universal_code_not_detected",
      label: "The Universal Code is not detected or elements do not load",
      aliases: ["script not detected", "403 error", "CORS error", "embedded element blank", "installation check fails"],
      checks: [
        { step: 1, tool: "installation", question: "Is the code in the head of the page, once, on every page where GrowSurf is used?" },
        { step: 2, tool: "installation", field: "allowedUrls", question: "Is the page's origin the Share URL or listed in `allowedUrls`, including staging and preview hosts?" },
        { step: 3, question: "Is the code loaded directly, not through a tag manager? Ad blockers commonly block tag-manager payloads." },
        { step: 4, question: "Is the site a single-page app? GrowSurf must be re-initialized after client-side navigation." },
      ],
      causes: [
        { cause: "Script missing from the head or present only on some pages.", fix: "Paste the Universal Code from the Installation step into the head of the site template.", docs: ["support 267", "support 200"] },
        { cause: "Origin not whitelisted.", fix: "Add the origin to `allowedUrls` under Installation > URLs.", docs: ["support 285", "support 206"] },
        { cause: "Loaded through a tag manager.", fix: "Install the script directly in the page head.", docs: ["support 370"] },
        { cause: "Too many requests from one origin triggered a temporary block, which surfaces as `403` or CORS errors.", fix: "Reduce request volume and contact support to lift the block.", docs: ["support 483"] },
        { cause: "Content-security-policy or Rocket Loader interferes.", fix: "Allow the GrowSurf script host in the policy; exclude the script from Rocket Loader.", docs: ["support 460", "support 370"] },
      ],
    },
    {
      key: "platform_specific_install",
      label: "Installing on a specific platform or form builder",
      aliases: ["Typeform", "HubSpot form", "Webflow", "Squarespace", "Wix", "WordPress", "Shopify", "Calendly", "Google Tag Manager"],
      checks: [
        { step: 1, tool: "installation", question: "Which platform hosts the site, and which tool renders the signup form?" },
        { step: 2, question: "Is the form embedded as raw HTML on the customer's page, or as an iframe or stand-alone hosted page?" },
      ],
      causes: [
        { cause: "Typeform, HubSpot, or another embedded form builder.", fix: "Embed the form on your own page as raw HTML, not an iframe, and follow the platform-specific instructions under the tracking method step.", docs: ["support 367", "support 345", "docs integrations/typeform"] },
        { cause: "Wix or Squarespace.", fix: "Wix forms are iframes: add participants with JavaScript or the REST API. Squarespace: use Code Injection in the header.", docs: ["support 212", "docs getting-started"] },
        { cause: "Shopify or another store checkout.", fix: "Trigger on the thank-you page, or connect orders through Zapier.", docs: ["support 272", "support 258"] },
        { cause: "Google Tag Manager.", fix: "Install directly in the head instead; ad blockers block tag-manager payloads and tracking fails silently.", docs: ["support 370"] },
      ],
    },
    {
      key: "numbers_do_not_match",
      label: "Dashboard numbers do not match expectations",
      aliases: ["impressions vs referrals", "analytics differ", "participant count wrong", "who referred most this month"],
      checks: [
        { step: 1, tool: "analytics", question: "Which metric: participants, leads (pending referrals), referrals (completed qualifying actions), impressions, or unique impressions? Each has a different definition." },
        { step: 2, question: "Which period filter is selected: all time, current month, or previous month?" },
      ],
      causes: [
        { cause: "Metric definitions differ from other analytics tools.", fix: "A visit to a referral link is an impression, not a referral; leads are pending referrals; referrals are completed qualifying actions.", docs: ["support 463", "support 211", "support 270"] },
        { cause: "A monthly leaderboard is wanted.", fix: "Use the period filters on the dashboard instead of creating a new program.", docs: ["support 493"] },
      ],
    },
  ],
};

// Symptom keys the default playbook answers. A hosted bundle may add more; the tool catalog
// advertises whichever playbook is loaded.
export const TROUBLESHOOT_SYMPTOMS = DEFAULT_TROUBLESHOOTING_PLAYBOOK.symptoms!.map((symptom) => symptom.key);

export const playbookSymptomKeys = (bundle: GrowSurfInsightsBundle | undefined): string[] => {
  const symptoms = bundle?.troubleshootingPlaybook?.symptoms;
  return [...new Set([...(symptoms ?? []).map((symptom) => symptom.key), ...TROUBLESHOOT_SYMPTOMS])];
};

export const troubleshootReferralTrackingInputSchema = z
  .object({
    symptom: inputText(1, 100).optional(),
    description: inputText(3, 2000).optional(),
    campaignId: inputText(1).optional(),
    participantId: inputText(1).optional(),
    participantEmail: inputText(3).optional(),
  })
  .strict()
  .refine((value) => value.symptom || value.description, {
    message: "Pass `symptom` or describe the problem in `description`.",
  });

export type TroubleshootReferralTrackingInput = z.infer<typeof troubleshootReferralTrackingInputSchema>;

export type TroubleshootContext = { campaignId?: string | undefined };

// Matches a symptom by key, or by a label or alias phrase that appears verbatim in the
// description. Anything looser mis-routes, so an unmatched description returns the list instead.
export const matchPlaybookSymptom = (
  playbook: TroubleshootingPlaybook,
  input: { symptom?: string | undefined; description?: string | undefined },
): { symptom: PlaybookSymptom; matchedBy: "key" | "description" } | null => {
  const symptoms = playbook.symptoms ?? [];
  if (input.symptom) {
    const symptom = symptoms.find((entry) => entry.key === input.symptom);
    return symptom ? { symptom, matchedBy: "key" } : null;
  }
  const description = (input.description ?? "").toLowerCase();
  if (!description) return null;
  let best: { symptom: PlaybookSymptom; length: number } | null = null;
  for (const symptom of symptoms) {
    for (const phrase of [symptom.label, ...(symptom.aliases ?? [])]) {
      const needle = phrase.toLowerCase();
      if (needle.length >= 4 && description.includes(needle) && needle.length > (best?.length ?? 0)) best = { symptom, length: needle.length };
    }
  }
  return best ? { symptom: best.symptom, matchedBy: "description" } : null;
};

const renderSymptomList = (playbook: TroubleshootingPlaybook, heading: string, reason: string): string =>
  [
    heading,
    "",
    reason,
    "",
    ...(playbook.symptoms ?? []).map((symptom) => `- \`${symptom.key}\`: ${symptom.label}${symptom.aliases?.length ? ` (${symptom.aliases.join("; ")})` : ""}`),
    "",
  ].join("\n");

/** Separates reported symptoms and possible causes from facts established by affected records. */
export const renderTroubleshootingGuide = (
  input: TroubleshootReferralTrackingInput,
  bundle: GrowSurfInsightsBundle | undefined,
  context: TroubleshootContext = {},
): string => {
  const hosted = bundle?.troubleshootingPlaybook?.symptoms?.length ? bundle.troubleshootingPlaybook : undefined;
  const playbook = hosted ?? DEFAULT_TROUBLESHOOTING_PLAYBOOK;
  const availableSymptoms = {
    ...playbook,
    symptoms: [...(playbook.symptoms ?? []), ...(DEFAULT_TROUBLESHOOTING_PLAYBOOK.symptoms ?? []).filter((symptom) => !playbook.symptoms?.some((entry) => entry.key === symptom.key))],
  };
  const campaignId = input.campaignId ?? context.campaignId;
  const target = campaignId ? ` for program \`${campaignId}\`` : "";
  const heading = `# Referral-tracking troubleshooting${target}`;
  let note = hosted ? "" : `${NO_INSIGHTS_NOTE}\n\n`;

  // A key the loaded playbook lacks still gets the documentation-based answer when one exists.
  let matchedIn = playbook;
  let match = matchPlaybookSymptom(playbook, input);
  if (!match && input.symptom) {
    match = matchPlaybookSymptom(DEFAULT_TROUBLESHOOTING_PLAYBOOK, input);
    matchedIn = DEFAULT_TROUBLESHOOTING_PLAYBOOK;
    if (match && hosted) note = "This symptom uses documentation-based guidance because the loaded playbook has no matching section.\n\n";
  }
  if (!match) {
    const reason = input.symptom
      ? `Unknown symptom \`${input.symptom}\`. Pick one of these and call the tool again with \`symptom\`:`
      : `No symptom matched the description${input.description ? ` "${tableCell(input.description).slice(0, 200)}"` : ""}. Pick the closest one and call the tool again with \`symptom\`:`;
    return note + renderSymptomList(availableSymptoms, heading, reason);
  }

  const { symptom } = match;
  const toolMap = matchedIn.toolMap ?? TOOL_MAP;
  const links = matchedIn.docLinks;
  const toolName = (key: string | undefined) => (key ? toolMap[key] : undefined);
  const participantHint = input.participantId
    ? ` for participant \`${input.participantId}\``
    : input.participantEmail
      ? ` for participant \`${input.participantEmail}\``
      : " for the affected participant";

  const lines = [
    `# ${symptom.label}${target}`,
    "",
    note.trim(),
    match.matchedBy === "description" ? `Matched from the description. Symptom \`${symptom.key}\`.` : `Symptom \`${symptom.key}\`.`,
    symptom.aliases?.length ? `Also described as: ${symptom.aliases.join("; ")}.` : "",
    "",
    "The title names the reported symptom. Confirm it from the affected records before treating it as a finding.",
    symptom.key === "reward_not_issued" ? REWARD_DIAGNOSTIC_GUIDANCE : "",
    symptom.key === "rest_api_errors" || symptom.key === "participants_not_added"
      ? "Browser JavaScript `growsurf.addParticipant` uses the JavaScript SDK, not the server REST API. Never put a REST API key in browser code. For that call, check the JavaScript error, Universal Code, allowed origin, and participant payload; REST key ownership and REST rate limits do not diagnose it."
      : "",
    "",
    "## Check, in order",
    "",
    "Run each check with the named tool before you conclude. A setting can suggest the next check; confirm the affected record before naming a cause.",
    "",
  ];
  for (const check of symptom.checks ?? []) {
    const tool = toolName(check.tool);
    const hint = check.tool && PARTICIPANT_SCOPED_TOOL_KEYS.has(check.tool) ? participantHint : "";
    const via = tool ? ` Tool: \`${tool}\`${check.field ? `, field \`${check.field}\`` : ""}${hint}.` : "";
    lines.push(`${check.step}. ${check.question}${via}`);
  }
  lines.push(
    "",
    "## Possible causes to check",
    "",
    "Treat these causes as possibilities until an observed record supports one.",
    "",
    table(
      ["Cause", "Fix", "Docs"],
      (symptom.causes ?? []).map((cause) => {
        const tool = toolName(cause.tool);
        return [cause.cause, `${cause.fix}${tool ? ` Tool: \`${tool}\`.` : ""}`, (cause.docs ?? []).map((ref) => docLink(ref, links)).join(", ")];
      }),
    ),
    "",
    "## Report back",
    "",
    "Report the observed values and events with the source tool. Separate confirmed facts, possible explanations, and missing evidence. A failed read is an unknown result, not a failed reward or referral. Name a cause only when the affected record supports it, and link the recommended next step to its docs. If no cause is established, say what remains unchecked and give GrowSurf support the results.",
  );
  return lines.filter((line, index, all) => !(line === "" && all[index - 1] === "")).join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
};
