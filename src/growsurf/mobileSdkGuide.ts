import { z } from "zod";

const MOBILE_SDK_GUIDANCE_VERSION = "0.2.0";
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

const iosAttributionText = (provider: AttributionProvider) => {
  if (provider === "none") return "Skip attribution handling only if this app never accepts referred installs.";
  if (provider === "direct_link") return "Use `handleDeepLink(_:)` for installed-app links that already contain `grsf`, `ref`, or `referredBy`.";
  if (provider === "google_play") {
    return "Google Play Install Referrer is Android-only. Skip iOS attribution handling unless you also support direct links or a provider callback on iOS.";
  }
  if (provider === "all") {
    return "Use `handleDeepLink(_:)` for installed-app links and provider callback payloads from Branch, AppsFlyer, Adjust, or Singular before participant creation.";
  }
  const callbackProvider = providerCallbackFor(provider);
  if (callbackProvider) {
    return `Use ${providerDisplayName(callbackProvider)} callback payloads with \`handleAttributionParameters(_:provider:)\` before participant creation.`;
  }
  return "";
};

const androidAttributionText = (provider: AttributionProvider) => {
  if (provider === "none") return "Skip attribution handling only if this app never accepts referred installs.";
  if (provider === "direct_link") return "Use `handleDeepLink(uri)` for installed-app links that already contain `grsf`, `ref`, or `referredBy`.";
  if (provider === "google_play") return "Call `handleDeferredDeepLink()` before participant creation so GrowSurf can read the Google Play Install Referrer payload.";
  if (provider === "all") {
    return "Use `handleDeepLink(uri)` for installed-app links, `handleDeferredDeepLink()` for Google Play installs, and provider callback payloads from Branch, AppsFlyer, Adjust, or Singular before participant creation.";
  }
  const callbackProvider = providerCallbackFor(provider);
  if (callbackProvider) {
    return `Use ${providerDisplayName(callbackProvider)} callback payloads with \`handleAttributionParameters(parameters, provider = "${callbackProvider}")\` before participant creation.`;
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
      "For new users, create the participant after attribution has been captured:",
      codeBlock(
        "swift",
        [
          "let created = try await growsurf.createParticipant(",
          "    .init(email: \"person@example.com\", firstName: \"Ada\", lastName: \"Lovelace\")",
          ")",
          "",
          "if let participant = created.participant,",
          "   let shareUrl = participant.shareUrl {",
          "    try await growsurf.trackShare(participantId: participant.id, type: \"iosNativeShare\")",
          "    // Present your native share sheet with shareUrl.",
          "}",
        ].join("\n"),
      ),
    );
  }

  sections.push(
    "Recommended sharing path: present the native GrowSurf Window from your own app button or menu.",
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
      "For new users, create the participant after attribution has been captured:",
      codeBlock(
        "kotlin",
        [
          "val created = growsurf.createParticipant(",
          "    GrowSurfParticipantInput(email = \"person@example.com\", firstName = \"Ada\", lastName = \"Lovelace\")",
          ")",
          "",
          "created.participant?.let { participant ->",
          "    participant.shareUrl?.let { shareUrl ->",
          "        growsurf.trackShare(participantId = participant.id, type = \"androidNativeShare\")",
          "        // Present your native share sheet with shareUrl.",
          "    }",
          "}",
        ].join("\n"),
      ),
    );
  }

  sections.push(
    "Recommended sharing path: present the native GrowSurf Window from your own app button or menu.",
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
      "- For signed-in referred users, read the SDK's pending attribution in the app and send its `referredBy` value to your backend before minting the token; server-to-server REST calls cannot access app-local attribution automatically.",
      "- Pass the returned `participantToken` to `.existingParticipantToken(...)` on iOS or `GrowSurfWindowIdentity.ExistingParticipantToken(...)` on Android.",
      "- Share tracking types used by the native SDK are `copyRefLink`, `iosNativeShare`, and `androidNativeShare`.",
    ].join("\n"),
  );

  return sections.join("\n");
};
