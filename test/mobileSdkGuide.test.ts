import { describe, expect, it } from "vitest";
import { mobileSdkGuideInputSchema, renderMobileSdkGuide } from "../src/growsurf/mobileSdkGuide.js";

describe("renderMobileSdkGuide", () => {
  it("renders SDK 0.3.2 native window guidance for both mobile platforms", () => {
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

    expect(text).toContain("SDK version `0.3.2`");
    expect(text).toContain("GrowSurf.configure");
    expect(text).toContain("GrowSurfSdk.configure");
    expect(text).toContain("addReferredParticipant");
    expect(text).toContain("validateReferrer()");
    expect(text).toContain("the SDK stores it automatically");
    expect(text).toContain("presentGrowSurfWindow");
    expect(text).not.toContain("mobileShareUrl");
    expect(text).toContain("iosNativeShare");
    expect(text).toContain("androidNativeShare");
    expect(text).toContain("pk_mobile_test");
    expect(text).toContain("abc123");
  });

  it("emits released public SDK 0.3.2 install coordinates", () => {
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
    expect(text).toContain("/v0.3.2/GrowSurfSDK.podspec");
    expect(text).toContain("com.growsurf:growsurf-android-sdk:0.3.2");
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
    expect(text).toContain("https://grow.surf/share/:campaignId/:participantId");
    expect(text).not.toContain("handleAttributionParameters");
    expect(text).not.toContain("handleDeferredDeepLink");
  });

  it("recommends addReferredParticipant for new mobile signups", () => {
    const text = renderMobileSdkGuide(
      {
        platform: "both",
        attributionProvider: "all",
        participantState: "new_participant",
        serverVerifiedQualifyingAction: true,
        includeInstallSnippets: false,
      },
      { campaignId: "abc123" },
    );

    expect(text).toContain("referral-only signup tracking");
    expect(text).toContain("let result = try await growsurf.addReferredParticipant");
    expect(text).toContain("val result = growsurf.addReferredParticipant");
  });

  it("renders per-provider iOS deferred guidance (LinkMe / UDL / Clipboard-Based DDL)", () => {
    const adjust = renderMobileSdkGuide(
      { platform: "ios", attributionProvider: "adjust", participantState: "both", serverVerifiedQualifyingAction: true, includeInstallSnippets: false },
      { campaignId: "abc123" },
    );
    expect(adjust).toContain("LinkMe");

    const appsflyer = renderMobileSdkGuide(
      { platform: "ios", attributionProvider: "appsflyer", participantState: "both", serverVerifiedQualifyingAction: true, includeInstallSnippets: false },
      { campaignId: "abc123" },
    );
    expect(appsflyer).toContain("Unified Deep Linking");
    expect(appsflyer).toContain("deep_link_value");

    const singular = renderMobileSdkGuide(
      { platform: "ios", attributionProvider: "singular", participantState: "both", serverVerifiedQualifyingAction: true, includeInstallSnippets: false },
      { campaignId: "abc123" },
    );
    expect(singular).toContain("Clipboard-Based DDL");
    expect(singular).toContain("clipboardAttribution");
  });

  it("notes iOS deferred is best-effort and recommends a manual-code fallback for deferred-bearing providers", () => {
    for (const provider of ["all", "branch", "adjust", "appsflyer", "singular"] as const) {
      const text = renderMobileSdkGuide(
        { platform: "ios", attributionProvider: provider, participantState: "both", serverVerifiedQualifyingAction: true, includeInstallSnippets: false },
        { campaignId: "abc123" },
      );
      expect(text).toContain("best-effort");
      expect(text).toContain("manual referral-code entry");
    }
  });

  it("does not attach the deferred best-effort caveat to direct-link-only or none configs", () => {
    const directLink = renderMobileSdkGuide(
      { platform: "ios", attributionProvider: "direct_link", participantState: "both", serverVerifiedQualifyingAction: true, includeInstallSnippets: false },
      { campaignId: "abc123" },
    );
    expect(directLink).not.toContain("best-effort");
  });

  it("explains that Android deferred uses the Play Install Referrer, not the iOS clipboard mechanisms", () => {
    const android = renderMobileSdkGuide(
      { platform: "android", attributionProvider: "all", participantState: "both", serverVerifiedQualifyingAction: true, includeInstallSnippets: false },
      { campaignId: "abc123" },
    );
    expect(android).toContain("Google Play Install Referrer");
    expect(android).toContain("are NOT needed on Android");
    expect(android).not.toContain("checkPasteboardOnInstall");
  });

  it("emits trackShare samples without a participantId (SDK derives it from the JWT)", () => {
    const text = renderMobileSdkGuide(
      {
        platform: "both",
        attributionProvider: "all",
        participantState: "new_participant",
        serverVerifiedQualifyingAction: true,
        includeInstallSnippets: false,
      },
      { campaignId: "abc123" },
    );

    expect(text).not.toContain("trackShare(participantId");
  });
});
