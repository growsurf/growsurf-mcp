type GrowSurfPrompt = {
  name: string;
  title: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
  render: (args: Record<string, string | undefined>) => string;
};

const value = (args: Record<string, string | undefined>, key: string, fallback: string) => {
  const raw = args[key]?.trim();
  return raw ? raw : fallback;
};

const programContext = (args: Record<string, string | undefined>) => {
  const companyName = value(args, "companyName", "the company");
  const websiteUrl = value(args, "websiteUrl", "the company's website");
  const goal = value(args, "goal", "grow qualified customers through word of mouth");
  return { companyName, websiteUrl, goal };
};

export const GROWSURF_PROMPTS: GrowSurfPrompt[] = [
  {
    name: "growsurf_create_referral_program",
    title: "Create a referral program",
    description: "Create and configure a GrowSurf referral program from the proven referral template.",
    arguments: [
      { name: "companyName", description: "Company or product name." },
      { name: "websiteUrl", description: "Website where the program will be installed." },
      { name: "goal", description: "Business goal for the referral program." },
      { name: "campaignName", description: "Optional program name to use in GrowSurf." },
    ],
    render: (args) => {
      const { companyName, websiteUrl, goal } = programContext(args);
      const campaignName = value(args, "campaignName", `${companyName} referral program`);
      return [
        `Create a GrowSurf referral program for ${companyName}.`,
        "",
        `Goal: ${goal}.`,
        `Website: ${websiteUrl}.`,
        "",
        "Use this sequence:",
        "1. Create a REFERRAL campaign with growsurf_create_campaign. Use the campaignName, companyName, and USD unless the user asks for another currency.",
        "2. Capture the returned id and pass it as campaignId on every campaign-scoped tool call.",
        "3. Review the seeded starter Design, Emails, Options, Installation, rewards, and GrowSurf Window content before changing anything. Treat this starter content as the default source for Window copy, referred-friend copy, email copy, share settings, landing-page content, and rewards.",
        "4. Keep rewards in a non-awarding or disabled state until the user confirms the incentive, funding, and fulfillment method.",
        "5. Preserve starter content unless the user asks for a specific override. Tune only the copy and options needed for the user's goal, then fetch the Design, Emails, and Options tabs again and summarize the defaults plus your changes.",
        "6. Generate installation guidance with growsurf_client_snippets.",
        "7. Call growsurf_get_referral_flow_screenshots and inspect the returned images. The proof must show the referrer GrowSurf Window and the referred-friend landing page, not a long HTML page or config JSON.",
        "8. Before reporting back, confirm normal share options are visible, the referred-friend banner and inline heading are both enabled, the browser title motivator is configured, Window header spacing is readable, and there is no rough placeholder copy.",
        "",
        `Preferred program name: ${campaignName}.`,
      ].join("\n");
    },
  },
  {
    name: "growsurf_create_affiliate_program",
    title: "Create an affiliate program",
    description: "Create and configure a GrowSurf affiliate program from the proven affiliate template.",
    arguments: [
      { name: "companyName", description: "Company or product name." },
      { name: "websiteUrl", description: "Website where affiliate tracking will be installed." },
      { name: "goal", description: "Affiliate program business goal." },
      { name: "campaignName", description: "Optional program name to use in GrowSurf." },
      { name: "commissionModel", description: "Preferred commission structure, such as 20% recurring or $100 per sale." },
    ],
    render: (args) => {
      const { companyName, websiteUrl, goal } = programContext(args);
      const campaignName = value(args, "campaignName", `${companyName} affiliate program`);
      const commissionModel = value(args, "commissionModel", "ask the user before enabling payouts");
      return [
        `Create a GrowSurf affiliate program for ${companyName}.`,
        "",
        `Goal: ${goal}.`,
        `Website: ${websiteUrl}.`,
        `Commission preference: ${commissionModel}.`,
        "",
        "Use this sequence:",
        "1. Create an AFFILIATE campaign with growsurf_create_campaign. Use the campaignName, companyName, and USD unless the user asks for another currency.",
        "2. Capture the returned id and pass it as campaignId on every campaign-scoped tool call.",
        "3. Review the seeded affiliate reward config and starter content before changing it, including Design, Emails, Options, Installation, and GrowSurf Window content. Treat this starter content as the default source for Window copy, referred-friend copy, email copy, share settings, landing-page content, and affiliate portal content. Do not enable payout exposure until the user confirms commission terms and payout operations.",
        "4. Preserve starter content unless the user asks for a specific override. Tune only the fields needed for the user's affiliate motion, especially affiliate portal sections, commissions, payouts, participant settings, and email templates.",
        "5. Generate tracking and install guidance with growsurf_client_snippets and growsurf_api_library_snippets. If the user's stack has Stripe or PayPal, use growsurf_get_integration_connect_link and hand them the matching integration connect link.",
        "6. Call growsurf_get_referral_flow_screenshots and inspect the returned images. The proof must show the referrer GrowSurf Window and the referred-friend landing page, not a long HTML page or config JSON.",
        "7. Before reporting back, confirm normal share options are visible, the referred-friend banner and inline heading are both enabled, the browser title motivator is configured, Window header spacing is readable, payout exposure is still conservative, and there is no rough placeholder copy.",
        "",
        `Preferred program name: ${campaignName}.`,
      ].join("\n");
    },
  },
  {
    name: "growsurf_embed_referral_widget",
    title: "Embed the referral widget",
    description: "Produce the installation plan and snippets for adding GrowSurf to a web app.",
    arguments: [
      { name: "campaignId", description: "GrowSurf campaign id." },
      { name: "websiteUrl", description: "Website or app URL." },
      { name: "framework", description: "Frontend framework or stack." },
      { name: "participantAuth", description: "Whether participant auto-auth is required." },
    ],
    render: (args) => {
      const campaignId = value(args, "campaignId", "the target campaignId");
      const websiteUrl = value(args, "websiteUrl", "the target website");
      const framework = value(args, "framework", "the user's frontend stack");
      const participantAuth = value(args, "participantAuth", "ask whether participant auto-auth is required");
      return [
        `Embed GrowSurf for campaign ${campaignId} on ${websiteUrl}.`,
        "",
        `Stack: ${framework}.`,
        `Participant auth: ${participantAuth}.`,
        "",
        "Use growsurf_client_snippets for the happy-path web snippets, growsurf_embeddable_element_snippet for the exact embeddable element, and growsurf_grsf_config_snippet when participant auto-auth is needed.",
        "Inspect the app before choosing placement. Put referral UI where a real user naturally shares: post-signup, account, dashboard, billing success, or invite flows.",
        "If your agent environment has a frontend-design skill or equivalent design workflow, use it before placing or styling GrowSurf Window launchers or embeddable elements in the user's app.",
        "After implementation, verify that GrowSurf loads once, the campaign id is literal, referral attribution survives navigation, and share events can be tracked.",
      ].join("\n");
    },
  },
  {
    name: "growsurf_set_rewards",
    title: "Set or adjust rewards",
    description: "Safely review and adjust GrowSurf reward configs.",
    arguments: [
      { name: "campaignId", description: "GrowSurf campaign id." },
      { name: "programType", description: "REFERRAL or AFFILIATE." },
      { name: "rewardGoal", description: "The incentive the user wants." },
    ],
    render: (args) => {
      const campaignId = value(args, "campaignId", "the target campaignId");
      const programType = value(args, "programType", "the program type");
      const rewardGoal = value(args, "rewardGoal", "the user's incentive goal");
      return [
        `Review and adjust rewards for ${programType} campaign ${campaignId}.`,
        "",
        `Reward goal: ${rewardGoal}.`,
        "",
        "Use growsurf_list_campaign_rewards first. For referral programs, only use referral-compatible reward types. For affiliate programs, use AFFILIATE rewards and a commissionStructure.",
        "Keep money-moving rewards disabled or non-awarding until the user confirms the final incentive, payout or fulfillment method, funding, tax treatment, and approval flow.",
        "After updating, list rewards again and summarize the exact enabled state, visible state, commission terms, and any remaining manual setup.",
      ].join("\n");
    },
  },
  {
    name: "growsurf_wire_webhooks",
    title: "Wire webhooks",
    description: "Plan and configure GrowSurf webhooks for product automation.",
    arguments: [
      { name: "campaignId", description: "GrowSurf campaign id." },
      { name: "endpointUrl", description: "Webhook endpoint URL." },
      { name: "events", description: "Comma-separated event names or use-case description." },
    ],
    render: (args) => {
      const campaignId = value(args, "campaignId", "the target campaignId");
      const endpointUrl = value(args, "endpointUrl", "the user's webhook endpoint");
      const events = value(args, "events", "the events required by the user's workflow");
      return [
        `Wire GrowSurf webhooks for campaign ${campaignId}.`,
        "",
        `Endpoint: ${endpointUrl}.`,
        `Events/use case: ${events}.`,
        "",
        "Create or update the webhook with the minimum event set required. Use a secret when the endpoint supports signature validation.",
        "Tell the user to store the secret server-side only. Never put webhook secrets in client code, public docs, screenshots, or committed files.",
        "After configuration, run growsurf_test_campaign_webhook and summarize the delivery result plus any endpoint response details.",
      ].join("\n");
    },
  },
  {
    name: "growsurf_read_analytics",
    title: "Read analytics",
    description: "Analyze GrowSurf campaign or participant performance.",
    arguments: [
      { name: "campaignId", description: "GrowSurf campaign id." },
      { name: "timeframe", description: "Window to analyze, such as last 30 days." },
      { name: "question", description: "Question the user wants answered." },
    ],
    render: (args) => {
      const campaignId = value(args, "campaignId", "the target campaignId");
      const timeframe = value(args, "timeframe", "the relevant timeframe");
      const question = value(args, "question", "what changed and what should we do next?");
      return [
        `Analyze campaign ${campaignId}.`,
        "",
        `Timeframe: ${timeframe}.`,
        `Question: ${question}.`,
        "",
        "Use growsurf_get_campaign_analytics with interval and include values that fit the question. Start with totals, then request series data when trend or pacing matters.",
        "When diagnosing one participant, use growsurf_get_participant_analytics and growsurf_get_participant_activity_logs.",
        "Report plain-language findings, likely causes, and the next concrete action. Separate measured facts from hypotheses.",
      ].join("\n");
    },
  },
];

export const listGrowSurfPrompts = () =>
  GROWSURF_PROMPTS.map(({ name, title, description, arguments: args }) => ({
    name,
    title,
    description,
    arguments: args,
  }));

export const getGrowSurfPrompt = (name: string, args: Record<string, string | undefined> = {}) => {
  const prompt = GROWSURF_PROMPTS.find((item) => item.name === name);
  if (!prompt) {
    throw new Error(`Unknown prompt: ${name}`);
  }
  return {
    description: prompt.description,
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: prompt.render(args),
        },
      },
    ],
  };
};
