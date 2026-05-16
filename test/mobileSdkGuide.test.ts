import { describe, expect, it } from "vitest";
import { mobileSdkGuideInputSchema, renderMobileSdkGuide } from "../src/growsurf/mobileSdkGuide.js";

describe("renderMobileSdkGuide", () => {
  it("renders SDK 0.2.0 native window guidance for both mobile platforms", () => {
    const text = renderMobileSdkGuide(
      {
        platform: "both",
        attributionProvider: "all",
        participantState: "both",
        serverVerifiedQualifyingAction: true,
        includeInstallSnippets: true,
        mobilePublicKey: "pk_mobile_test",
      },
      { campaignId: "abc123" },
    );

    expect(text).toContain("SDK version `0.2.0`");
    expect(text).toContain("GrowSurf.configure");
    expect(text).toContain("GrowSurfSdk.configure");
    expect(text).toContain("presentGrowSurfWindow");
    expect(text).toContain("mobileShareUrl");
    expect(text).toContain("iosNativeShare");
    expect(text).toContain("androidNativeShare");
    expect(text).toContain("pk_mobile_test");
    expect(text).toContain("abc123");
  });

  it("emits released public SDK 0.2.0 install coordinates", () => {
    const text = renderMobileSdkGuide(
      {
        platform: "both",
        attributionProvider: "all",
        participantState: "existing_signed_in_user",
        serverVerifiedQualifyingAction: true,
        includeInstallSnippets: true,
      },
      { campaignId: "abc123" },
    );

    expect(text).toContain("growsurf-ios-sdk-distribution");
    expect(text).toContain("/v0.2.0/GrowSurfSDK.podspec");
    expect(text).toContain("com.growsurf:growsurf-android-sdk:0.2.0");
  });

  it("includes install snippets by default", () => {
    const input = mobileSdkGuideInputSchema.parse({});
    const text = renderMobileSdkGuide(input, { campaignId: "abc123" });

    expect(input.includeInstallSnippets).toBe(true);
    expect(text).toContain("growsurf-ios-sdk-distribution");
    expect(text).toContain("com.growsurf:growsurf-android-sdk");
  });

  it("renders selected provider callbacks instead of hard-coded Branch callbacks", () => {
    const text = renderMobileSdkGuide(
      {
        platform: "both",
        attributionProvider: "singular",
        participantState: "existing_signed_in_user",
        serverVerifiedQualifyingAction: true,
        includeInstallSnippets: false,
      },
      { campaignId: "abc123" },
    );

    expect(text).toContain('provider: "singular"');
    expect(text).toContain('provider = "singular"');
    expect(text).not.toContain('provider: "branch"');
    expect(text).not.toContain('provider = "branch"');
  });

  it("omits attribution code when attribution handling is disabled", () => {
    const text = renderMobileSdkGuide(
      {
        platform: "both",
        attributionProvider: "none",
        participantState: "existing_signed_in_user",
        serverVerifiedQualifyingAction: true,
        includeInstallSnippets: false,
      },
      { campaignId: "abc123" },
    );

    expect(text).not.toContain("handleAttributionParameters");
    expect(text).not.toContain("handleDeepLink");
    expect(text).not.toContain("handleDeferredDeepLink");
  });

  it("renders direct-link attribution without provider or Google Play code", () => {
    const text = renderMobileSdkGuide(
      {
        platform: "both",
        attributionProvider: "direct_link",
        participantState: "existing_signed_in_user",
        serverVerifiedQualifyingAction: true,
        includeInstallSnippets: false,
      },
      { campaignId: "abc123" },
    );

    expect(text).toContain("handleDeepLink");
    expect(text).not.toContain("handleAttributionParameters");
    expect(text).not.toContain("handleDeferredDeepLink");
  });
});
