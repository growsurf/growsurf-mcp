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
      "Create a GrowSurf referral program for DevTrace, an AI developer tool at https://devtrace.example. Goal: drive qualified developer signups from existing users. Use a double-sided $25 credit concept, keep rewards disabled until I confirm funding, and summarize the Design, Emails, Options, Installation, and Rewards settings.",
  },
  {
    programType: "affiliate",
    title: "Voice AI affiliate",
    prompt:
      "Create a GrowSurf affiliate program for EchoKit, a voice AI API at https://echokit.example. Goal: let integration consultants refer qualified customers. Use a 20% recurring commission concept, keep payouts disabled until I confirm payout operations, and summarize the Design, Emails, Options, Installation, and Rewards settings.",
  },
  {
    programType: "referral",
    title: "B2B SaaS referral",
    prompt:
      "Create a GrowSurf referral program for AtlasDesk, a B2B support platform at https://atlasdesk.example. Goal: turn power users into referrals for team trials. Use a give-$100-get-$100 account credit concept, keep rewards conservative, and summarize the referrer Window, referred-friend, Options, Installation, and Rewards settings.",
  },
  {
    programType: "affiliate",
    title: "Founder-led SaaS affiliate",
    prompt:
      "Create a GrowSurf affiliate program for LaunchBoard, a founder analytics app at https://launchboard.example. Goal: recruit operators and newsletter writers as affiliates. Use a $150 per paid customer concept, leave payout exposure off, and summarize the affiliate portal, referred-friend, payout, and reward settings.",
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
    "Use this to check whether an agent can create a referral or affiliate program in one shot, preserve GrowSurf's starter content, and review the resulting configuration before reporting back.",
    "",
    "### Required tool sequence",
    "",
    "1. Call `growsurf_create_campaign` first. Use `REFERRAL` or `AFFILIATE`; include `name`, `companyName`, `companyLogoImageUrl` when the user provides it, and `currencyISO` when it is not `USD`.",
    "2. Save the returned `id` and pass it as `campaignId` to every campaign-scoped tool.",
    "3. Fetch `growsurf_get_campaign_design`, `growsurf_get_campaign_emails`, `growsurf_get_campaign_options`, `growsurf_get_campaign_installation`, and `growsurf_list_campaign_rewards` before patching.",
    "4. Treat the type-specific starter content as the default source for Window copy, referred-friend copy, email copy, share settings, landing-page content, and rewards. Patch only what the user's goal requires.",
    "5. Keep rewards and payout exposure disabled or conservative until the user confirms incentive value, funding, fulfillment, tax treatment, and approval settings.",
    "6. Fetch the campaign, Design, Emails, Options, Installation, and Rewards again after changes. Review the returned configuration before reporting back.",
    "",
    "### Configuration acceptance checks",
    "",
    "- The Design config preserves the starter GrowSurf Window, share options, and referred-friend sections unless the user asked for a specific change.",
    "- The referrer Window settings keep normal share options available, not QR-only or text-only sharing.",
    "- The GrowSurf Window header, body copy, and button labels match the user's stated goal.",
    "- The referred-friend settings include the visible motivators the program needs, such as the sticky banner, inline heading, and browser tab title when configured.",
    "- Logo fields are either populated with the supplied logo or left empty. Do not report a broken-image placeholder as acceptable.",
    "- Public copy is clean: no `!!`, rough placeholder copy, duplicate invite lines, or customer-specific scratch text.",
    "",
    "### Install acceptance checks",
    "",
    "- If the agent places a GrowSurf Window launcher or embeddable element inside the user's app, it should use `frontend-design` or the closest design-focused workflow available before editing UI.",
    "- If the work changes or installs a browser-visible GrowSurf flow, ask whether the user wants screenshot proof unless they already asked for proof. Do not ask for screenshots on read-only lookups, pure config summaries, or server-only API tasks.",
    "- When the user wants GrowSurf preview screenshots, call `growsurf_capture_referral_flow_screenshots` and inspect the returned referrer Window and referred-friend images before reporting back.",
    "- When the user wants proof of their own installed site, use the host agent's browser automation tool, such as Playwright or a built-in browser tool, against the real installed page. Do not substitute an isolated mock page unless the real page is unavailable, and say that plainly if it happens.",
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
