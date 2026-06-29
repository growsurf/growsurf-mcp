import { describe, expect, it } from "vitest";
import { renderInstallKit } from "../src/growsurf/installKit.js";

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
});
