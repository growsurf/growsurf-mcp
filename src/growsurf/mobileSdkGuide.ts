import { z } from "zod";

const MOBILE_SDK_GUIDANCE_VERSION = "0.3.3";
const IOS_DISTRIBUTION_URL = "https://github.com/growsurf/growsurf-ios-sdk-distribution.git";

const codeBlock = (language: string, code: string): string => ["```" + language, code, "```"].join("\n");

const placeholder = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

export const mobileSdkGuideInputSchema = z.object({
  platform: z.enum(["ios", "android", "both"]).default("both"),
  attributionProvider: z
    .enum(["all", "direct_link", "google_play", "branch", "adjust", "appsflyer", "singular", "none"])
    .default("all"),
  participantState: z.enum(["new_participant", "existing_signed_in_user", "both"]).default("both"),
  serverVerifiedQualifyingAction: z.boolean().default(true),
  includeInstallSnippets: z.boolean().default(true),
  campaignId: z.string().min(1).optional(),
  mobilePublicKey: z.string().min(1).optional(),
});

export type MobileSdkGuideInput = z.infer<typeof mobileSdkGuideInputSchema>;

export type MobileSdkGuideContext = {
  campaignId?: string | undefined;
};

type AttributionProvider = MobileSdkGuideInput["attributionProvider"];
type ProviderCallback = Extract<AttributionProvider, "branch" | "adjust" | "appsflyer" | "singular">;

const shouldRenderPlatform = (input: MobileSdkGuideInput, platform: "ios" | "android") =>
  input.platform === "both" || input.platform === platform;

const providerCallbackFor = (provider: AttributionProvider): ProviderCallback | undefined => {
  if (provider === "branch" || provider === "adjust" || provider === "appsflyer" || provider === "singular") {
    return provider;
  }
  if (provider === "all") return "branch";
  return undefined;
};

const providerDisplayName = (provider: ProviderCallback) =>
  ({
    appsflyer: "AppsFlyer",
    adjust: "Adjust",
    branch: "Branch",
    singular: "Singular",
  })[provider];

const IOS_DEFERRED_BEST_EFFORT =
  " iOS deferred is best-effort even when configured — clipboard providers (Branch/Adjust/Singular) can miss if the user declines the iOS paste prompt or overwrites the clipboard before first launch, AppsFlyer (server-side UDL) can miss outside its ~15-minute window, and an in-app/non-Safari browser can break the click — so always pair it with a fallback such as manual referral-code entry. Android's Play Install Referrer is deterministic.";

const iosAttributionText = (provider: AttributionProvider) => {
  if (provider === "none") return "Skip attribution handling only if this app never accepts referred installs.";
  if (provider === "direct_link") return "Use `handleDeepLink(_:)` for installed-app links that already contain `grsf`, `ref`, or `referredBy`, or a GrowSurf-hosted share URL like `https://grow.surf/share/:campaignId/:participantId`.";
  if (provider === "google_play") {
    return "Google Play Install Referrer is Android-only. Skip iOS attribution handling unless you also support direct links or a provider callback on iOS.";
  }
  if (provider === "all") {
    return "Use `handleDeepLink(_:)` for installed-app links and provider callback payloads from Branch, AppsFlyer, Adjust, or Singular before calling `addReferredParticipant()`. If GrowSurf-hosted referral links are enabled, configure the campaign's iOS attribution URL so iOS clicks route through the provider with `grsf` attached. For Branch DEFERRED (no-app-installed) referrals on iOS, also enable Branch NativeLink (dashboard) and call `Branch.getInstance().checkPasteboardOnInstall()` before `initSession()` — iOS 14+ requires NativeLink's clipboard token for deferred matching. iOS deferred is provider-specific and not interchangeable: Adjust uses LinkMe (optional clipboard), Singular uses Clipboard-Based DDL (optional, enterprise), and AppsFlyer uses server-side Unified Deep Linking (no clipboard); see the per-provider guidance." + IOS_DEFERRED_BEST_EFFORT;
  }
  const callbackProvider = providerCallbackFor(provider);
  if (callbackProvider) {
    const base = `Use ${providerDisplayName(callbackProvider)} callback payloads with \`handleAttributionParameters(_:provider:)\` before calling \`addReferredParticipant()\`. Provider payloads may contain \`grsf\`, \`ref\`, \`referredBy\`, or a GrowSurf-hosted share URL.`;
    if (callbackProvider === "branch") {
      return `${base} For Branch DEFERRED (no-app-installed) referrals on iOS you must use Branch NativeLink, because iOS 14+ removed the device matching Branch previously used for deferred installs: (1) enable NativeLink in the Branch dashboard (Configuration → Enable NativeLink) with a link that is NOT web-only (the iOS redirect must be allowed to open the app), and (2) call \`Branch.getInstance().checkPasteboardOnInstall()\` BEFORE \`initSession()\` so the SDK reads the NativeLink clipboard token on first launch (iOS 16+ shows a one-time "Pasted from …" prompt, or use \`BranchPasteControl\`). Without NativeLink, an iOS user who installs from a referral link opens the app with no referral data. The installed-app flow does not need this.${IOS_DEFERRED_BEST_EFFORT}`;
    }
    if (callbackProvider === "adjust") {
      return `${base} For Adjust DEFERRED (no-app-installed) referrals on iOS, enable Adjust LinkMe — the optional clipboard equivalent of Branch NativeLink (off by default): call \`ADJConfig.enableLinkMe()\` (Adjust SDK v5) / \`setLinkMeEnabled(true)\` (v4) and tag the link \`adj_linkme=1\` (Universal/branded) or \`linkme=1\`. Without LinkMe, deferred falls back to Adjust's server-side/probabilistic matching, which is unreliable on modern iOS. Confirm the exact API against your installed Adjust SDK version. The installed-app flow does not need this.${IOS_DEFERRED_BEST_EFFORT}`;
    }
    if (callbackProvider === "appsflyer") {
      return `${base} For AppsFlyer DEFERRED (no-app-installed) referrals on iOS there is NO clipboard path: the referral arrives via server-side Unified Deep Linking (set \`AppsFlyerLib.shared().deepLinkDelegate\` and implement \`didResolveDeepLink\`) within a ~15-minute click-to-install window, and \`grsf\` must ride in \`deep_link_value\` or \`deep_link_sub1\`–\`deep_link_sub10\` (a query-string-only \`grsf\` is not guaranteed to survive a cold install). Confirm the exact delegate API against your installed AppsFlyer SDK version.${IOS_DEFERRED_BEST_EFFORT}`;
    }
    if (callbackProvider === "singular") {
      return `${base} For Singular DEFERRED (no-app-installed) referrals on iOS, Clipboard-Based DDL is optional and enterprise-gated: set \`SingularConfig.clipboardAttribution = true\` and run the Singular WebSDK on the landing page (enable via your Singular CSM). Without it, deferred is server-side/probabilistic. Confirm the exact API against your installed Singular SDK version. The installed-app flow does not need this.${IOS_DEFERRED_BEST_EFFORT}`;
    }
    return base;
  }
  return "";
};

const androidAttributionText = (provider: AttributionProvider) => {
  if (provider === "none") return "Skip attribution handling only if this app never accepts referred installs.";
  if (provider === "direct_link") return "Use `handleDeepLink(uri)` for installed-app links that already contain `grsf`, `ref`, or `referredBy`, or a GrowSurf-hosted share URL like `https://grow.surf/share/:campaignId/:participantId`.";
  if (provider === "google_play") return "Call `handleDeferredDeepLink()` before referral-only signup tracking, or let `addReferredParticipant()` check Google Play Install Referrer once when no pending attribution exists. This is Android's native, deterministic deferred channel — no clipboard workaround is needed (unlike iOS NativeLink/LinkMe). The referrer is delivered only for genuine Google Play Store installs; sideloaded/`adb`/non-Play installs return no referrer.";
  if (provider === "all") {
    return "Use `handleDeepLink(uri)` for installed-app links, `handleDeferredDeepLink()` for Google Play installs, and provider callback payloads from Branch, AppsFlyer, Adjust, or Singular before calling `addReferredParticipant()`. Provider payloads may contain `grsf`, `ref`, `referredBy`, or a GrowSurf-hosted share URL. On Android, deferred (no-app-installed) referrals are carried by the Google Play Install Referrer — a native, deterministic channel that the providers also use — so the iOS clipboard mechanisms (Branch NativeLink, Adjust LinkMe, Singular Clipboard-Based DDL) are NOT needed on Android; the referrer is delivered only for genuine Google Play Store installs.";
  }
  const callbackProvider = providerCallbackFor(provider);
  if (callbackProvider) {
    return `Use ${providerDisplayName(callbackProvider)} callback payloads with \`handleAttributionParameters(parameters, provider = "${callbackProvider}")\` before calling \`addReferredParticipant()\`. Provider payloads may contain \`grsf\`, \`ref\`, \`referredBy\`, or a GrowSurf-hosted share URL. For DEFERRED (no-app-installed) referrals on Android, the Google Play Install Referrer is the native deterministic channel — call \`handleDeferredDeepLink()\` to read it via GrowSurf, or let ${providerDisplayName(callbackProvider)} resolve it. No clipboard is needed on Android (the iOS NativeLink/LinkMe/Clipboard-Based DDL workarounds do not apply); the referrer is delivered only for genuine Google Play Store installs.`;
  }
  return "";
};

const renderIosAttributionSnippet = (provider: AttributionProvider) => {
  const snippets: string[] = [];

  if (provider === "all" || provider === "direct_link") {
    snippets.push(
      [
        "if let url {",
        "    try await growsurf.handleDeepLink(url)",
        "}",
      ].join("\n"),
    );
  }

  const callbackProvider = providerCallbackFor(provider);
  if (callbackProvider) {
    snippets.push(
      [
        "try await growsurf.handleAttributionParameters(",
        "    [",
        '        "grsf": "referrer_id",',
        '        "click_id": "click_123",',
        '        "unique": "true",',
        "    ],",
        `    provider: "${callbackProvider}"`,
        ")",
      ].join("\n"),
    );
  }

  return snippets.length > 0 ? codeBlock("swift", snippets.join("\n\n")) : undefined;
};

const renderAndroidAttributionSnippet = (provider: AttributionProvider) => {
  const snippets: string[] = [];

  if (provider === "all" || provider === "direct_link") {
    snippets.push(
      [
        "intent.data?.let { uri ->",
        "    growsurf.handleDeepLink(uri)",
        "}",
      ].join("\n"),
    );
  }

  if (provider === "all" || provider === "google_play") {
    snippets.push("growsurf.handleDeferredDeepLink()");
  }

  const callbackProvider = providerCallbackFor(provider);
  if (callbackProvider) {
    snippets.push(
      [
        "growsurf.handleAttributionParameters(",
        "    mapOf(",
        '        "grsf" to "referrer_id",',
        '        "click_id" to "click_123",',
        '        "unique" to "true",',
        "    ),",
        `    provider = "${callbackProvider}",`,
        ")",
      ].join("\n"),
    );
  }

  return snippets.length > 0 ? codeBlock("kotlin", snippets.join("\n\n")) : undefined;
};

const renderIos = (input: MobileSdkGuideInput, campaignId: string, mobilePublicKey: string) => {
  const sections: string[] = [`### iOS SDK ${MOBILE_SDK_GUIDANCE_VERSION}`];

  if (input.includeInstallSnippets) {
    sections.push(
      "Install via Swift Package Manager or the tag-pinned public podspec:",
      codeBlock(
        "swift",
        [
          "dependencies: [",
          `    .package(url: "${IOS_DISTRIBUTION_URL}", from: "${MOBILE_SDK_GUIDANCE_VERSION}"),`,
          "],",
          "targets: [",
          "    .target(",
          '        name: "YourApp",',
          "        dependencies: [",
          '            .product(name: "GrowSurfSDK", package: "growsurf-ios-sdk-distribution"),',
          "        ]",
          "    ),",
          "]",
        ].join("\n"),
      ),
      codeBlock(
        "ruby",
        [
          `growsurf_podspec = 'https://raw.githubusercontent.com/growsurf/growsurf-ios-sdk-distribution/v${MOBILE_SDK_GUIDANCE_VERSION}/GrowSurfSDK.podspec'`,
          "",
          "pod 'GrowSurfSDK', :podspec => growsurf_podspec",
        ].join("\n"),
      ),
    );
  }

  sections.push(
    "Configure the SDK with the program ID and public Mobile SDK key:",
    codeBlock(
      "swift",
      [
        "import GrowSurfSDK",
        "",
        "let growsurf = GrowSurf.configure(",
        `    campaignId: ${JSON.stringify(campaignId)},`,
        `    publicKey: ${JSON.stringify(mobilePublicKey)}`,
        ")",
      ].join("\n"),
    ),
    iosAttributionText(input.attributionProvider),
  );
  const attributionSnippet = renderIosAttributionSnippet(input.attributionProvider);
  if (attributionSnippet) sections.push(attributionSnippet);

  if (input.participantState === "new_participant" || input.participantState === "both") {
    sections.push(
      "For referral-only signup tracking, add the participant only after GrowSurf validates a referrer:",
      codeBlock(
        "swift",
        [
          "let result = try await growsurf.addReferredParticipant(",
          "    .init(email: \"person@example.com\", firstName: \"Ada\", lastName: \"Lovelace\")",
          ")",
          "",
          "if result.added,",
          "   let participant = result.participant {",
          "    // Use participant",
          "}",
        ].join("\n"),
      ),
    );
  }

  sections.push(
    "Recommended sharing path: present the native GrowSurf Window from your own app button or menu. Use a backend-minted token for signed-in users, or `result.participantToken` from a just-created SDK participant if opening the window immediately. The SDK already stores returned participant tokens; keep one yourself only when you need this explicit window handoff.",
    codeBlock(
      "swift",
      [
        "let participantToken = \"participant_token_from_your_backend\"",
        "",
        "growsurf.presentGrowSurfWindow(",
        "    from: viewController,",
        "    identity: .existingParticipantToken(participantToken),",
        "    theme: GrowSurfWindowTheme(primaryColorHex: \"#13795B\", presentationStyle: .automatic),",
        "    callbacks: GrowSurfWindowCallbacks(",
        "        onShareTracked: { type in",
        "            print(\"Share tracked: \\(type)\")",
        "        },",
        "        onError: { error in",
        "            print(error.localizedDescription)",
        "        }",
        "    )",
        ")",
      ].join("\n"),
    ),
  );

  return sections.join("\n\n");
};

const renderAndroid = (input: MobileSdkGuideInput, campaignId: string, mobilePublicKey: string) => {
  const sections: string[] = [`### Android SDK ${MOBILE_SDK_GUIDANCE_VERSION}`];

  if (input.includeInstallSnippets) {
    sections.push(
      "Install from Maven Central:",
      codeBlock(
        "kotlin",
        [
          "repositories {",
          "    mavenCentral()",
          "}",
          "",
          "dependencies {",
          `    implementation("com.growsurf:growsurf-android-sdk:${MOBILE_SDK_GUIDANCE_VERSION}")`,
          "}",
        ].join("\n"),
      ),
      "If you use Branch, Adjust, or AppsFlyer, add the matching adapter artifact at the same version.",
    );
  }

  sections.push(
    "Configure the SDK with the program ID and public Mobile SDK key:",
    codeBlock(
      "kotlin",
      [
        "import com.growsurf.sdk.GrowSurfSdk",
        "",
        "val growsurf = GrowSurfSdk.configure(",
        "    context = context,",
        `    campaignId = ${JSON.stringify(campaignId)},`,
        `    publicKey = ${JSON.stringify(mobilePublicKey)},`,
        ")",
      ].join("\n"),
    ),
    androidAttributionText(input.attributionProvider),
  );
  const attributionSnippet = renderAndroidAttributionSnippet(input.attributionProvider);
  if (attributionSnippet) sections.push(attributionSnippet);

  if (input.participantState === "new_participant" || input.participantState === "both") {
    sections.push(
      "For referral-only signup tracking, add the participant only after GrowSurf validates a referrer:",
      codeBlock(
        "kotlin",
        [
          "val result = growsurf.addReferredParticipant(",
          "    GrowSurfParticipantInput(email = \"person@example.com\", firstName = \"Ada\", lastName = \"Lovelace\")",
          ")",
          "",
          "if (result.added) {",
          "    result.participant?.let { participant ->",
          "         // Use participant",
          "    }",
          "}",
        ].join("\n"),
      ),
    );
  }

  sections.push(
    "Recommended sharing path: present the native GrowSurf Window from your own app button or menu. Use a backend-minted token for signed-in users, or `result.participantToken` from a just-created SDK participant if opening the window immediately. The SDK already stores returned participant tokens; keep one yourself only when you need this explicit window handoff.",
    codeBlock(
      "kotlin",
      [
        "val participantToken = \"participant_token_from_your_backend\"",
        "",
        "growsurf.presentGrowSurfWindow(",
        "    activity = activity,",
        "    identity = GrowSurfWindowIdentity.ExistingParticipantToken(participantToken),",
        "    theme = GrowSurfWindowTheme(primaryColor = 0xFF13795B, presentationStyle = GrowSurfWindowPresentationStyle.AUTOMATIC),",
        "    callbacks = GrowSurfWindowCallbacks(",
        "        onShareTracked = { type -> Log.d(\"GrowSurf\", \"Share tracked: $type\") },",
        "        onError = { error -> Log.e(\"GrowSurf\", \"GrowSurf window error\", error) },",
        "    ),",
        ")",
      ].join("\n"),
    ),
  );

  return sections.join("\n\n");
};

export const renderMobileSdkGuide = (input: MobileSdkGuideInput, context: MobileSdkGuideContext = {}) => {
  const campaignId = placeholder(input.campaignId ?? context.campaignId, "YOUR_CAMPAIGN_ID");
  const mobilePublicKey = placeholder(input.mobilePublicKey, "YOUR_MOBILE_SDK_PUBLIC_KEY");
  const sections: string[] = [
    "## GrowSurf native mobile SDK guide",
    "",
    `- Use SDK version \`${MOBILE_SDK_GUIDANCE_VERSION}\`.`,
    "- Native apps use a public Mobile SDK key, not the secret REST API key.",
    "- The recommended mobile referral portal is the native GrowSurf Window opened from your own app UI.",
    "- For signed-in users, mint a participant-scoped mobile token on your backend and pass it to the SDK.",
    "- Use `validateReferrer()` when you only need to check referral attribution. Use `recordAttribution()` only when you intentionally want to record an impression.",
    "- Use `addReferredParticipant()` for referral-only signup tracking.",
    "- When `addReferredParticipant()` or `addParticipant()` returns a `participantToken`, the SDK stores it automatically.",
  ];

  if (input.serverVerifiedQualifyingAction) {
    sections.push("- For purchases, subscriptions, or other server-verified qualifying actions, trigger referral credit from your backend.");
  } else {
    sections.push("- For low-risk client-side milestones, the SDK can call `triggerReferral` after the qualifying action.");
  }

  sections.push("");
  if (shouldRenderPlatform(input, "ios")) sections.push(renderIos(input, campaignId, mobilePublicKey));
  if (shouldRenderPlatform(input, "android")) sections.push(renderAndroid(input, campaignId, mobilePublicKey));

  sections.push(
    [
      "### Backend handoff",
      "",
      "- Use the REST API or official REST API libraries to call `Create Mobile Participant Token` with the same participant fields as Add Participant.",
      "- For signed-in referred users, read the SDK's pending attribution in the app and send its `referredBy` value to your backend before minting the token; also include the SDK mobile instance ID as `mobileInstanceId` for anti-fraud. Server-to-server REST calls cannot access app-local attribution or storage automatically.",
      "- Pass the returned `participantToken` to `.existingParticipantToken(...)` on iOS or `GrowSurfWindowIdentity.ExistingParticipantToken(...)` on Android.",
      "- Share tracking types used by the native SDK are `copyRefLink`, `iosNativeShare`, and `androidNativeShare`.",
    ].join("\n"),
  );

  return sections.join("\n");
};
