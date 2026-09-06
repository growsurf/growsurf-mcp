import { describe, expect, it } from "vitest";
import { buildRewardAssessment, renderRewardOptionsEvidence } from "../src/growsurf/rewardEvidence.js";

// Incorrect delivery claims can cause duplicate fulfillment or unnecessary money-related
// setting changes. Protect the setting-to-evidence distinction, not the document layout.
describe("reward option evidence", () => {
  it("keeps disabled automation separate from approval and delivery outcomes", () => {
    const options = Object.freeze({ requireManualRewardApproval: false, autoFulfillRewards: false });
    const text = renderRewardOptionsEvidence(options);
    expect(text).toContain("`requireManualRewardApproval: false`");
    expect(text).toContain("does not establish that any particular reward was earned or approved");
    expect(text).toContain("`autoFulfillRewards: false`");
    expect(text).toContain("Manual fulfillment remains possible");
    expect(text).toContain("not proof that rewards were never fulfilled or delivered");
    expect(text).toContain("Marking a reward fulfilled does not itself send a reward or email");
    expect(options).toEqual({ requireManualRewardApproval: false, autoFulfillRewards: false });
  });

  it("does not turn enabled automation into proof of receipt", () => {
    const text = renderRewardOptionsEvidence({ requireManualRewardApproval: true, autoFulfillRewards: true });
    expect(text).toContain("`requireManualRewardApproval: true`");
    expect(text).toContain("an individual reward may already be approved");
    expect(text).toContain("`autoFulfillRewards: true`");
    expect(text).toContain("not proof that a reward was sent or received");
  });

  it.each([{}, null, [], { requireManualRewardApproval: null, autoFulfillRewards: "false" }])(
    "does not replace unavailable settings with defaults: %j",
    (input) => {
      const text = renderRewardOptionsEvidence(input);
      expect(text).not.toContain("Observed setting:");
      expect(text).toContain("leave the delivery outcome unknown");
      expect(text).toContain("failed read leaves that fact unknown");
      expect(buildRewardAssessment(input, "options")).toMatchObject({
        approvalPolicy: "unknown",
        automaticFulfillmentMarking: null,
        deliveryStatus: "unknown",
      });
    },
  );

  it.each([
    [false, false, "automatic"],
    [false, true, "automatic"],
    [true, false, "manual"],
    [true, true, "manual"],
  ] as const)("reports approval and marking settings independently without inventing delivery: %j", (manualApproval, autoMark, approvalPolicy) => {
    const options = Object.freeze({ requireManualRewardApproval: manualApproval, autoFulfillRewards: autoMark });
    expect(buildRewardAssessment(options, "options")).toMatchObject({
      basis: "this_response_only",
      approvalPolicy,
      automaticFulfillmentMarking: autoMark,
      deliveryStatus: "unknown",
      integrationConnection: "not_established",
      programReferralTrigger: "not_established",
    });
    expect(options).toEqual({ requireManualRewardApproval: manualApproval, autoFulfillRewards: autoMark });
  });

  it.each(["configuration", "participant"] as const)("does not infer settings or delivery from a %s response", (kind) => {
    const record = Object.freeze({
      requireManualRewardApproval: false,
      autoFulfillRewards: true,
      couponCode: null,
      event: "CONVERSION",
      rewards: [{ approved: true, status: "FULFILLED", isFulfilled: true }],
    });
    const assessment = buildRewardAssessment(record, kind);
    expect(assessment).toMatchObject({
      approvalPolicy: "unknown",
      automaticFulfillmentMarking: null,
      deliveryStatus: "unknown",
      integrationConnection: "not_established",
      programReferralTrigger: "not_established",
    });
    expect(assessment).not.toHaveProperty("rewards");
  });
});
