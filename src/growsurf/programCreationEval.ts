import { z } from "zod";

export const agentProgramCreationEvalInputSchema = z.object({
  programType: z.enum(["referral", "affiliate", "both"]).default("both"),
  includeOneShotPrompts: z.boolean().default(true),
});

type ProgramType = "referral" | "affiliate";

const ONE_SHOT_PROMPTS: Array<{ programType: ProgramType; title: string; prompt: string }> = [
  {
    programType: "referral",
    title: "Developer-tools referral",
    prompt:
      "Create a GrowSurf referral program for DevTrace, an AI developer tool at https://devtrace.example. Goal: drive qualified developer signups from existing users. Use a double-sided $25 credit concept, keep rewards disabled until I confirm funding, and show me referrer and referred-friend screenshots.",
  },
  {
    programType: "affiliate",
    title: "Voice AI affiliate",
    prompt:
      "Create a GrowSurf affiliate program for EchoKit, a voice AI API at https://echokit.example. Goal: let integration consultants refer qualified customers. Use a 20% recurring commission concept, keep payouts disabled until I confirm payout operations, and show me referrer and referred-friend screenshots.",
  },
  {
    programType: "referral",
    title: "B2B SaaS referral",
    prompt:
      "Create a GrowSurf referral program for AtlasDesk, a B2B support platform at https://atlasdesk.example. Goal: turn power users into referrals for team trials. Use a give-$100-get-$100 account credit concept, keep rewards conservative, and prove the referrer Window plus referred-friend page visually.",
  },
  {
    programType: "affiliate",
    title: "Founder-led SaaS affiliate",
    prompt:
      "Create a GrowSurf affiliate program for LaunchBoard, a founder analytics app at https://launchboard.example. Goal: recruit operators and newsletter writers as affiliates. Use a $150 per paid customer concept, leave payout exposure off, and verify the end-user referral flow with screenshots.",
  },
];

const filterPrompts = (programType: z.infer<typeof agentProgramCreationEvalInputSchema>["programType"]) =>
  ONE_SHOT_PROMPTS.filter((item) => programType === "both" || item.programType === programType);

export const renderAgentProgramCreationEval = (
  input: z.infer<typeof agentProgramCreationEvalInputSchema>,
): string => {
  const lines: string[] = [
    "## GrowSurf program-creation steering eval",
    "",
    "Use this to check whether an agent can create a referral or affiliate program in one shot, preserve GrowSurf's starter content, and prove the end-user experience visually.",
    "",
    "### Required tool sequence",
    "",
    "1. Call `growsurf_create_campaign` first. Use `REFERRAL` or `AFFILIATE`; include `name`, `companyName`, `companyLogoImageUrl` when the user provides it, and `currencyISO` when it is not `USD`.",
    "2. Save the returned `id` and pass it as `campaignId` to every campaign-scoped tool.",
    "3. Fetch `growsurf_get_campaign_design`, `growsurf_get_campaign_emails`, `growsurf_get_campaign_options`, `growsurf_get_campaign_installation`, and `growsurf_list_campaign_rewards` before patching.",
    "4. Treat the type-specific starter content as the default source for Window copy, referred-friend copy, email copy, share settings, landing-page content, and rewards. Patch only what the user's goal requires.",
    "5. Keep rewards and payout exposure disabled or conservative until the user confirms incentive value, funding, fulfillment, tax treatment, and approval settings.",
    "6. Call `growsurf_get_referral_flow_screenshots` after changes. Inspect the returned images before reporting back.",
    "",
    "### Visual acceptance checks",
    "",
    "- The proof shows the actual referrer GrowSurf Window and the actual referred-friend landing page, not a long HTML page, config JSON, or dashboard-only screenshot.",
    "- The referrer Window shows normal share options, not a QR-only or text-only setup.",
    "- The GrowSurf Window header has readable spacing before and after the headline and body copy.",
    "- The referred-friend page has both visible motivators: the sticky banner and the inline heading. The browser tab title should also be configured, but it does not need to appear in screenshots.",
    "- The screenshot has a logo when `companyLogoImageUrl` is provided. If no logo is available, there should be no broken-image placeholder.",
    "- Public copy is clean: no `!!`, rough placeholder copy, duplicate invite lines, or customer-specific scratch text.",
    "",
    "### Install acceptance checks",
    "",
    "- If the agent places a GrowSurf Window launcher or embeddable element inside the user's app, it should use `frontend-design` or the closest design-focused workflow available before editing UI.",
    "- Verify the Universal Code loads once, the literal campaign id is present, attribution survives navigation, and the selected embeddable element renders for the right participant state.",
    "- For SPAs, check that GrowSurf is initialized again only when the user/session state changes.",
  ];

  if (input.includeOneShotPrompts) {
    lines.push("", "### One-shot eval prompts", "");
    for (const item of filterPrompts(input.programType)) {
      lines.push(`#### ${item.title}`, "", item.prompt, "");
    }
  }

  return lines.join("\n").trimEnd();
};
