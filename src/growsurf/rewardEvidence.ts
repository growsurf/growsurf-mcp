// Explain the limits of reward reads beside their results. Configuration and reward records
// answer different questions, and neither proves that a participant received the benefit.
export const REWARD_CONFIGURATION_GUIDANCE =
  "These are program details and reward settings. Report any aggregate counts using their documented meaning; they do not identify an individual reward's status or prove delivery. Approval and fulfillment are separate: `autoFulfillRewards` controls automatic fulfillment marking, not approval or reward delivery. Manually marking a reward fulfilled does not itself send a reward or email. A reward's `event` does not establish the program's referral trigger; read `growsurf_get_campaign_installation` to check it. A null `couponCode` does not establish whether an integration is connected or delivery is automated. Read the affected participant with `growsurf_get_participant` and inspect `rewards`; use `growsurf_get_participant_activity_logs` for recorded events. If no participant is identified, report the settings and leave the delivery outcome unknown.";

export const REWARD_RECORD_GUIDANCE =
  "A `ParticipantReward` records an earned reward. Its `approved` field records approval; `status`, `isFulfilled`, and `fulfilledAt` record whether it is marked fulfilled. These are separate states. Marking a reward fulfilled does not itself send a reward or email, and an unfulfilled record does not prove the benefit was never delivered outside GrowSurf. Confirm delivery through the relevant reward integration or the customer's own fulfillment records. A missing field, incomplete log, or failed read leaves that fact unknown.";

export const REWARD_DIAGNOSTIC_GUIDANCE =
  "Separate the customer's reported symptom, the records you observed, and what remains unknown. `autoFulfillRewards` controls automatic fulfillment marking; `false` does not prevent manual fulfillment or prove that rewards were never sent. `requireManualRewardApproval` configures approval; read the affected participant's `rewards` to establish an individual reward's approval and fulfillment state. Marking fulfilled and confirming delivery are separate checks. Do not change a setting merely to clear a fulfillment marker or treat a failed read as a failed reward.";

export type RewardAssessmentKind = "configuration" | "options" | "participant";

export type RewardAssessment = {
  basis: "this_response_only";
  conclusion: string;
  deliveryStatus: "unknown";
  integrationConnection: "not_established";
  programReferralTrigger: "not_established";
  approvalPolicy: "manual" | "automatic" | "unknown";
  automaticFulfillmentMarking: boolean | null;
  nextStep: string;
};

// Report only the settings this read can establish. Program and participant records are not
// options reads, and fulfillment markers never establish delivery or integration connectivity.
export const buildRewardAssessment = (result: unknown, kind: RewardAssessmentKind): RewardAssessment => {
  const options = kind === "options" && result && typeof result === "object" && !Array.isArray(result)
    ? result as Record<string, unknown>
    : {};
  return {
    basis: "this_response_only",
    conclusion: kind === "participant"
      ? "Recorded approval and fulfillment marking do not confirm that a reward was received."
      : "These configuration details do not establish whether a reward was delivered.",
    deliveryStatus: "unknown",
    integrationConnection: "not_established",
    programReferralTrigger: "not_established",
    approvalPolicy: typeof options.requireManualRewardApproval === "boolean"
      ? options.requireManualRewardApproval ? "manual" : "automatic"
      : "unknown",
    automaticFulfillmentMarking: typeof options.autoFulfillRewards === "boolean" ? options.autoFulfillRewards : null,
    nextStep: kind === "participant"
      ? "Compare the participant's reward records with the relevant integration or fulfillment records to confirm delivery."
      : "Read the affected participant with `growsurf_get_participant`, then confirm delivery in the relevant fulfillment records.",
  };
};

// Preserve the distinction between an observed boolean setting and an individual reward state.
// Only render values actually returned by the API; absent or malformed values stay unknown.
export const renderRewardOptionsEvidence = (result: unknown): string => {
  const options = result && typeof result === "object" && !Array.isArray(result)
    ? result as Record<string, unknown>
    : {};
  const facts: string[] = [];
  if (typeof options.requireManualRewardApproval === "boolean") {
    facts.push(options.requireManualRewardApproval
      ? "Observed setting: `requireManualRewardApproval: true`. Manual approval is configured; an individual reward may already be approved."
      : "Observed setting: `requireManualRewardApproval: false`. Automatic approval is configured; this does not establish that any particular reward was earned or approved.");
  }
  if (typeof options.autoFulfillRewards === "boolean") {
    facts.push(options.autoFulfillRewards
      ? "Observed setting: `autoFulfillRewards: true`. Automatic fulfillment marking is configured; this is not proof that a reward was sent or received."
      : "Observed setting: `autoFulfillRewards: false`. Automatic fulfillment marking is off. Manual fulfillment remains possible; this is not proof that rewards were never fulfilled or delivered.");
  }
  return ["", "", ...facts, REWARD_CONFIGURATION_GUIDANCE, REWARD_RECORD_GUIDANCE].join("\n");
};
