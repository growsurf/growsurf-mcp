import { z } from "zod";
import { DOCS_SITE_URL } from "./insights.js";
import { kotlinString } from "./snippetLiterals.js";

const MOBILE_SDK_GUIDANCE_VERSION = "0.10.0";
const IOS_DISTRIBUTION_REPO = "growsurf/growsurf-ios-sdk-distribution";
const IOS_DISTRIBUTION_URL = `https://github.com/${IOS_DISTRIBUTION_REPO}.git`;
const IOS_PODSPEC_URL = `https://raw.githubusercontent.com/${IOS_DISTRIBUTION_REPO}/v${MOBILE_SDK_GUIDANCE_VERSION}/GrowSurfSDK.podspec`;
// The React Native package has its own version and pins its native SDK versions itself.
const REACT_NATIVE_SDK_GUIDANCE_VERSION = "0.1.1";
const REACT_NATIVE_PACKAGE_NAME = "growsurf-react-native-sdk";
const REACT_NATIVE_SDK_DOCS_URL = `${DOCS_SITE_URL}/developer-tools/react-native-sdk`;
// Device-specific SDK preferences that must not move to another installation through Android backup.
const ANDROID_BACKUP_EXCLUDED_PREFERENCES = [
  "growsurf_tokens.xml",
  "growsurf_window_cache_encrypted.xml",
  "growsurf_attribution.xml",
  "growsurf_identity.xml",
  "growsurf_window_cache.xml",
  "growsurf_participant_engagement.xml",
];
const FIXTURE_EMAIL = "gavin@hooli.com";
const FIXTURE_FIRST_NAME = "Gavin";
const FIXTURE_LAST_NAME = "Belson";

const codeBlock = (language: string, code: string): string => ["```" + language, code, "```"].join("\n");

const placeholder = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

export const mobileSdkGuideInputSchema = z.object({
  // `both` means the native iOS and Android SDKs. `react_native` renders the React Native SDK, which covers both.
  platform: z.enum(["ios", "android", "both", "react_native"]).default("both"),
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

// Listed in the order the guide names them.
const PROVIDER_IOS_DEFERRED_SETUP: Record<ProviderCallback, string> = {
  branch: "Branch NativeLink",
  adjust: "Adjust LinkMe",
  appsflyer: "AppsFlyer Unified Deep Linking",
  singular: "Singular Clipboard-Based DDL",
};
const providerIosDeferredSetup = (provider: ProviderCallback) => PROVIDER_IOS_DEFERRED_SETUP[provider];
const orList = (items: readonly string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}` : items.join("");

const IOS_DEFERRED_BEST_EFFORT =
  " iOS deferred is best-effort even when configured — clipboard providers (Branch/Adjust/Singular) can miss if the user declines the iOS paste prompt or overwrites the clipboard before first launch, AppsFlyer (server-side UDL) can miss outside its ~15-minute window, and an in-app/non-Safari browser can break the click — so always pair it with a fallback such as manual referral-code entry. Android's Play Install Referrer is deterministic.";
const VISIT_CAPTURE_TEXT =
  " The handler captures `utm_id`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_source_platform`, `utm_term`, `utm_content`, `utm_creative_format`, and `utm_marketing_tactic`. It queues one stable visit automatically, retries after an offline launch, and keeps only the origin and path for destination and referrer URLs.";
const WINDOW_FOLLOW_UP_TEXT =
  "The native Window offers Follow up only for outstanding direct invitations with Company as the Invite Email sender and when sending is available. Confirmation sends the configured invitation email; a three-day cooldown applies. Popup-only claims never qualify. The optional `displayStatus` value `OFFER_CLAIMED` uses the editable Claimed Offer label, with completed signup taking precedence. When Follow-Up Reminder is enabled, new invitations automatically qualify for a reminder to the referrer after the configured delay (2–30 days, default 3). No participant opt-in or `sendInvites` parameter is needed. This never schedules email to invited contacts.";

const iosAttributionText = (provider: AttributionProvider) => {
  if (provider === "none") return "Skip attribution handling only if this app never accepts referred installs.";
  if (provider === "direct_link") return "Use `handleDeepLink(_:)` for installed-app links that contain referral identity, supported UTM values, or a GrowSurf-hosted share URL like `https://grow.surf/share/:campaignId/:participantId`." + VISIT_CAPTURE_TEXT;
  if (provider === "google_play") {
    return "Google Play Install Referrer is Android-only. Skip iOS attribution handling unless you also support direct links or a provider callback on iOS.";
  }
  if (provider === "all") {
    return "Use `handleDeepLink(_:)` for installed-app links and provider callback payloads from Branch, AppsFlyer, Adjust, or Singular before calling `addReferredParticipant()`. If GrowSurf-hosted referral links are enabled, configure the campaign's iOS attribution URL so iOS clicks route through the provider with `grsf` attached. For Branch DEFERRED (no-app-installed) referrals on iOS, also enable Branch NativeLink (dashboard) and call `Branch.getInstance().checkPasteboardOnInstall()` before `initSession()` — iOS 14+ requires NativeLink's clipboard token for deferred matching. iOS deferred is provider-specific and not interchangeable: Adjust uses LinkMe (optional clipboard), Singular uses Clipboard-Based DDL (optional, enterprise), and AppsFlyer uses server-side Unified Deep Linking (no clipboard); see the per-provider guidance." + VISIT_CAPTURE_TEXT + IOS_DEFERRED_BEST_EFFORT;
  }
  const callbackProvider = providerCallbackFor(provider);
  if (callbackProvider) {
    const base = `Use ${providerDisplayName(callbackProvider)} callback payloads with \`handleAttributionParameters(_:provider:)\` before calling \`addReferredParticipant()\`. Provider payloads may contain \`grsf\`, \`ref\`, \`referredBy\`, supported UTM values, or a GrowSurf-hosted share URL.${VISIT_CAPTURE_TEXT}`;
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
  if (provider === "direct_link") return "Use `handleDeepLink(uri)` for installed-app links that contain referral identity, supported UTM values, or a GrowSurf-hosted share URL like `https://grow.surf/share/:campaignId/:participantId`." + VISIT_CAPTURE_TEXT;
  if (provider === "google_play") return "Call `handleDeferredDeepLink()` before referral-only signup tracking, or let `addReferredParticipant()` check Google Play Install Referrer once when no pending attribution exists. This is Android's native, deterministic deferred channel — no clipboard workaround is needed (unlike iOS NativeLink/LinkMe). The referrer is delivered only for genuine Google Play Store installs; sideloaded/`adb`/non-Play installs return no referrer." + VISIT_CAPTURE_TEXT;
  if (provider === "all") {
    return "Use `handleDeepLink(uri)` for installed-app links, `handleDeferredDeepLink()` for Google Play installs, and provider callback payloads from Branch, AppsFlyer, Adjust, or Singular before calling `addReferredParticipant()`. Provider payloads may contain `grsf`, `ref`, `referredBy`, supported UTM values, or a GrowSurf-hosted share URL. On Android, deferred (no-app-installed) referrals are carried by the Google Play Install Referrer — a native, deterministic channel that the providers also use — so the iOS clipboard mechanisms (Branch NativeLink, Adjust LinkMe, Singular Clipboard-Based DDL) are NOT needed on Android; the referrer is delivered only for genuine Google Play Store installs." + VISIT_CAPTURE_TEXT;
  }
  const callbackProvider = providerCallbackFor(provider);
  if (callbackProvider) {
    return `Use ${providerDisplayName(callbackProvider)} callback payloads with \`handleAttributionParameters(parameters, provider = "${callbackProvider}")\` before calling \`addReferredParticipant()\`. Provider payloads may contain \`grsf\`, \`ref\`, \`referredBy\`, supported UTM values, or a GrowSurf-hosted share URL. For DEFERRED (no-app-installed) referrals on Android, the Google Play Install Referrer is the native deterministic channel — call \`handleDeferredDeepLink()\` to read it via GrowSurf, or let ${providerDisplayName(callbackProvider)} resolve it. No clipboard is needed on Android (the iOS NativeLink/LinkMe/Clipboard-Based DDL workarounds do not apply); the referrer is delivered only for genuine Google Play Store installs.${VISIT_CAPTURE_TEXT}`;
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
        '        "utm_source": "newsletter",',
        '        "utm_campaign": "launch",',
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
        '        "utm_source" to "newsletter",',
        '        "utm_campaign" to "launch",',
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
      "Install via Swift Package Manager or CocoaPods:",
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
        `pod 'GrowSurfSDK', :podspec => '${IOS_PODSPEC_URL}'`,
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
          `    .init(email: ${JSON.stringify(FIXTURE_EMAIL)}, firstName: ${JSON.stringify(FIXTURE_FIRST_NAME)}, lastName: ${JSON.stringify(FIXTURE_LAST_NAME)})`,
          ")",
          "",
          "if result.added,",
          "   let participant = result.participant {",
          "    // Use participant",
          "}",
        ].join("\n"),
      ),
      "For a public signup flow that intentionally creates every user, call `addParticipant()`. For direct signup to an `OPEN_ENROLLMENT` affiliate program with configured Terms, show those Terms and set `termsAccepted: true` only after consent. If `affiliateApplicationMode` is `MANUAL_REVIEW` or `AUTO_APPROVE`, send applicants through the configured GrowSurf Program Page instead of direct signup:",
      codeBlock(
        "swift",
        [
          "let directSignup = try await growsurf.addParticipant(",
          "    .init(",
          `        email: ${JSON.stringify(FIXTURE_EMAIL)},`,
          `        firstName: ${JSON.stringify(FIXTURE_FIRST_NAME)},`,
          `        lastName: ${JSON.stringify(FIXTURE_LAST_NAME)},`,
          "        termsAccepted: true",
          "    )",
          ")",
        ].join("\n"),
      ),
    );
  }

  sections.push(
    WINDOW_FOLLOW_UP_TEXT,
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
      "Your app must use `minSdk` 24 or higher and `compileSdk` 36 or higher. Set `targetSdk` separately, to the level Google Play currently requires for app updates.",
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
        `    campaignId = ${kotlinString(campaignId)},`,
        `    publicKey = ${kotlinString(mobilePublicKey)},`,
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
          `    GrowSurfParticipantInput(email = ${kotlinString(FIXTURE_EMAIL)}, firstName = ${kotlinString(FIXTURE_FIRST_NAME)}, lastName = ${kotlinString(FIXTURE_LAST_NAME)})`,
          ")",
          "",
          "if (result.added) {",
          "    result.participant?.let { participant ->",
          "         // Use participant",
          "    }",
          "}",
        ].join("\n"),
      ),
      "For a public signup flow that intentionally creates every user, call `addParticipant()`. For direct signup to an `OPEN_ENROLLMENT` affiliate program with configured Terms, show those Terms and set `termsAccepted = true` only after consent. If `affiliateApplicationMode` is `MANUAL_REVIEW` or `AUTO_APPROVE`, send applicants through the configured GrowSurf Program Page instead of direct signup:",
      codeBlock(
        "kotlin",
        [
          "val directSignup = growsurf.addParticipant(",
          "    GrowSurfParticipantInput(",
          `        email = ${kotlinString(FIXTURE_EMAIL)},`,
          `        firstName = ${kotlinString(FIXTURE_FIRST_NAME)},`,
          `        lastName = ${kotlinString(FIXTURE_LAST_NAME)},`,
          "        termsAccepted = true,",
          "    )",
          ")",
        ].join("\n"),
      ),
    );
  }

  sections.push(
    WINDOW_FOLLOW_UP_TEXT,
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

const reactNativeAttributionText = (provider: AttributionProvider) => {
  if (provider === "none") return "Skip attribution handling only if this app never accepts referred installs.";
  const parts: string[] = [];
  if (provider === "all" || provider === "direct_link") {
    parts.push("Pass the cold-start URL from `Linking.getInitialURL()` and every warm `Linking` `url` event to `handleDeepLink(url)`. Links can contain referral identity, supported UTM values, or a GrowSurf-hosted share URL like `https://grow.surf/share/:campaignId/:participantId`. Call `links.remove()` when the component that added the listener unmounts.");
  }
  if (provider === "all" || provider === "google_play") {
    parts.push("On Android, `handleDeferredDeepLink()` reads the Google Play Install Referrer, which arrives only for genuine Google Play Store installs. `addReferredParticipant()` also checks it once when no pending attribution exists. iOS rejects `handleDeferredDeepLink()` with `UNSUPPORTED_PLATFORM`, so call it only when `Platform.OS` is `\"android\"`.");
  }
  const callbackProvider = providerCallbackFor(provider);
  if (callbackProvider) {
    const names = provider === "all" ? "Branch, AppsFlyer, Adjust, or Singular" : providerDisplayName(callbackProvider);
    const iosSetup = provider === "all"
      ? orList(Object.values(PROVIDER_IOS_DEFERRED_SETUP))
      : providerIosDeferredSetup(callbackProvider);
    parts.push(`Pass ${names} callback parameters from that provider's React Native SDK to \`handleAttributionParameters(parameters, provider)\`. Provider payloads may contain \`grsf\`, \`ref\`, \`referredBy\`, supported UTM values, or a GrowSurf-hosted share URL. Deferred (no-app-installed) iOS referrals still need the provider's iOS setup (${iosSetup}); call this guide with \`platform: "ios"\` for those steps.${IOS_DEFERRED_BEST_EFFORT}`);
  }
  parts.push(`Capture attribution before calling \`addReferredParticipant()\`. The native SDK keeps pending attribution and applies it during signup.${VISIT_CAPTURE_TEXT}`);
  return parts.join("\n\n");
};

const renderReactNativeAttributionSnippet = (provider: AttributionProvider) => {
  const imports: string[] = [];
  const snippets: string[] = [];

  if (provider === "all" || provider === "direct_link") {
    imports.push("Linking");
    snippets.push(
      [
        "const initialUrl = await Linking.getInitialURL();",
        "if (initialUrl) await GrowSurf.handleDeepLink(initialUrl);",
        "",
        "const links = Linking.addEventListener(\"url\", ({ url }) => {",
        "  void GrowSurf.handleDeepLink(url);",
        "});",
      ].join("\n"),
    );
  }

  if (provider === "all" || provider === "google_play") {
    imports.push("Platform");
    snippets.push(
      [
        "if (Platform.OS === \"android\") {",
        "  await GrowSurf.handleDeferredDeepLink();",
        "}",
      ].join("\n"),
    );
  }

  const callbackProvider = providerCallbackFor(provider);
  if (callbackProvider) {
    snippets.push(
      [
        "await GrowSurf.handleAttributionParameters(",
        "  {",
        '    grsf: "referrer_id",',
        '    click_id: "click_123",',
        '    unique: "true",',
        '    utm_source: "newsletter",',
        '    utm_campaign: "launch",',
        "  },",
        `  "${callbackProvider}",`,
        ");",
      ].join("\n"),
    );
  }

  if (snippets.length === 0) return undefined;
  if (imports.length > 0) snippets.unshift(`import { ${imports.join(", ")} } from "react-native";`);
  return codeBlock("ts", snippets.join("\n\n"));
};

const renderAndroidBackupRules = () => {
  const excludes = (indent: string) =>
    ANDROID_BACKUP_EXCLUDED_PREFERENCES.map((name) => `${indent}<exclude domain="sharedpref" path="${name}" />`);
  return [
    "Create `res/xml/growsurf_backup_rules.xml`:",
    codeBlock("xml", ["<full-backup-content>", ...excludes("  "), "</full-backup-content>"].join("\n")),
    "Create `res/xml/growsurf_data_extraction_rules.xml`:",
    codeBlock(
      "xml",
      [
        "<data-extraction-rules>",
        "  <cloud-backup>",
        ...excludes("    "),
        "  </cloud-backup>",
        "  <device-transfer>",
        ...excludes("    "),
        "  </device-transfer>",
        "</data-extraction-rules>",
      ].join("\n"),
    ),
  ];
};

const renderReactNative = (input: MobileSdkGuideInput, campaignId: string, mobilePublicKey: string) => {
  const sections: string[] = [
    `### React Native SDK ${REACT_NATIVE_SDK_GUIDANCE_VERSION}`,
    `Full reference: ${REACT_NATIVE_SDK_DOCS_URL}`,
    "The SDK supports bare React Native apps and Expo development builds on React Native 0.74 and newer, with the old or New Architecture where that React Native version offers both. React Native 0.82 and newer run only the New Architecture. Expo Go cannot load this native module. The package installs the native GrowSurf iOS and Android SDK versions it pins and presents the native GrowSurf Window.",
  ];

  if (input.includeInstallSnippets) {
    sections.push(
      "Install from npm:",
      codeBlock("sh", `npm install ${REACT_NATIVE_PACKAGE_NAME}`),
      "In a bare app, run `pod install` in the `ios` directory. If CocoaPods cannot resolve the pinned GrowSurf SDK, run `pod install --repo-update`. iOS requires iOS 15 or newer. Android requires `minSdk` 24, `compileSdk` 36, and Kotlin 2.1.21 or newer.",
      "For Expo, add the config plugin, then rebuild the development client. The plugin merges the Android backup exclusions below into your app's rules. If the manifest refers to another library's backup XML, copy that XML into your app's `res/xml` directory first so the plugin can merge it.",
      codeBlock(
        "json",
        [
          "{",
          '  "expo": {',
          `    "plugins": ["${REACT_NATIVE_PACKAGE_NAME}"]`,
          "  }",
          "}",
        ].join("\n"),
      ),
      `React Native 0.74 needs newer build tools than its app template: JDK 21, Gradle 8.13, Android Gradle Plugin 8.13.0, Kotlin 2.1.21, Android build tools 36.0.0, and an iOS 15 deployment target. Follow the React Native 0.74 setup in the SDK reference (${REACT_NATIVE_SDK_DOCS_URL}) or the package README before you build.`,
    );
  }

  sections.push(
    "Configure the SDK once at app start with the program ID and public Mobile SDK key:",
    codeBlock(
      "ts",
      [
        `import GrowSurf from "${REACT_NATIVE_PACKAGE_NAME}";`,
        "",
        "await GrowSurf.configure({",
        `  campaignId: ${JSON.stringify(campaignId)},`,
        `  publicKey: ${JSON.stringify(mobilePublicKey)},`,
        "});",
      ].join("\n"),
    ),
    reactNativeAttributionText(input.attributionProvider),
  );
  const attributionSnippet = renderReactNativeAttributionSnippet(input.attributionProvider);
  if (attributionSnippet) sections.push(attributionSnippet);

  if (input.participantState === "new_participant" || input.participantState === "both") {
    sections.push(
      "For referral-only signup tracking, add the participant only after GrowSurf validates a referrer. `addReferredParticipant()` returns the API's JSON, or `null` when no participant-create request succeeds. A response can ask for a participant token (`requiresParticipantToken`) instead of returning participant data:",
      codeBlock(
        "ts",
        [
          "const response = await GrowSurf.addReferredParticipant({",
          `  email: ${JSON.stringify(FIXTURE_EMAIL)},`,
          `  firstName: ${JSON.stringify(FIXTURE_FIRST_NAME)},`,
          `  lastName: ${JSON.stringify(FIXTURE_LAST_NAME)},`,
          "});",
          "",
          "if (response && \"participant\" in response) {",
          "  const participant = response.participant;",
          "  // Use participant",
          "}",
        ].join("\n"),
      ),
      "For a public signup flow that intentionally creates every user, call `addParticipant()`. For direct signup to an `OPEN_ENROLLMENT` affiliate program with configured Terms, show those Terms and set `termsAccepted: true` only after consent. If `affiliateApplicationMode` is `MANUAL_REVIEW` or `AUTO_APPROVE`, send applicants through the configured GrowSurf Program Page instead of direct signup:",
      codeBlock(
        "ts",
        [
          "const directSignup = await GrowSurf.addParticipant({",
          `  email: ${JSON.stringify(FIXTURE_EMAIL)},`,
          `  firstName: ${JSON.stringify(FIXTURE_FIRST_NAME)},`,
          `  lastName: ${JSON.stringify(FIXTURE_LAST_NAME)},`,
          "  termsAccepted: true,",
          "});",
        ].join("\n"),
      ),
    );
  }

  sections.push(
    WINDOW_FOLLOW_UP_TEXT,
    "Recommended sharing path: present the native GrowSurf Window from your own app button or menu. Use `{ type: \"existingParticipantToken\", token }` with a backend-minted token for signed-in users, `{ type: \"participantFields\", input: { email, termsAccepted } }` for signup, or `{ type: \"anonymous\" }`. `addWindowListener` receives `open`, `close`, `participantCreated`, `shareTracked`, `inviteSent`, `payoutOrSettingsAction`, and `error` events, and each event's `windowId` matches the returned Window's `id`. Do not log participant tokens.",
    codeBlock(
      "ts",
      [
        "const participantToken = \"participant_token_from_your_backend\";",
        "",
        "const events = GrowSurf.addWindowListener((event) => {",
        "  if (event.type === \"shareTracked\") console.log(\"Share tracked:\", event.data.shareType);",
        "  if (event.type === \"error\") console.warn(\"GrowSurf Window error:\", event.data.code);",
        "});",
        "",
        "const growsurfWindow = await GrowSurf.presentGrowSurfWindow({",
        "  identity: { type: \"existingParticipantToken\", token: participantToken },",
        "  theme: { primaryColorHex: \"#13795B\", presentationStyle: \"automatic\" },",
        "});",
        "",
        "// Later, to close this Window and stop listening:",
        "await growsurfWindow.close();",
        "events.remove();",
      ].join("\n"),
    ),
    "Data methods return the Mobile API's JSON with generated TypeScript types. Promise errors expose `code` and `httpStatus`; `httpStatus` is `null` for a local SDK error.",
    "Android backup: exclude the SDK's " + ANDROID_BACKUP_EXCLUDED_PREFERENCES.length + " preference files from backup and device transfer so participant tokens and attribution never move to another installation. The Expo config plugin merges these exclusions for you. In a bare app, add `android:fullBackupContent=\"@xml/growsurf_backup_rules\"` and `android:dataExtractionRules=\"@xml/growsurf_data_extraction_rules\"` to the manifest's `<application>` element. Merge the exclusions into any existing rules, including qualified XML resources, and keep exclusions other SDKs require.",
  );
  // The exclusion list is configuration the app needs, not an install example, so it always renders.
  sections.push(...renderAndroidBackupRules());

  sections.push(
    "When the app's user logs out, close any open Window and call `shutdown()` to clear SDK state:",
    codeBlock("ts", ["await GrowSurf.closeGrowSurfWindow();", "await GrowSurf.shutdown();"].join("\n")),
  );

  return sections.join("\n\n");
};

export const renderMobileSdkGuide = (input: MobileSdkGuideInput, context: MobileSdkGuideContext = {}) => {
  const campaignId = placeholder(input.campaignId ?? context.campaignId, "YOUR_CAMPAIGN_ID");
  const mobilePublicKey = placeholder(input.mobilePublicKey, "YOUR_MOBILE_SDK_PUBLIC_KEY");
  const reactNative = input.platform === "react_native";
  const sections: string[] = [
    reactNative ? "## GrowSurf React Native SDK guide" : "## GrowSurf native mobile SDK guide",
    "",
    reactNative
      ? `- Use React Native SDK version \`${REACT_NATIVE_SDK_GUIDANCE_VERSION}\` (npm package \`${REACT_NATIVE_PACKAGE_NAME}\`).`
      : `- Use SDK version \`${MOBILE_SDK_GUIDANCE_VERSION}\`.`,
    "- Native apps use a public Mobile SDK key, not the secret REST API key.",
    "- The recommended mobile referral or affiliate portal is the native GrowSurf Window opened from your own app UI.",
    "- For signed-in users, mint a participant-scoped mobile token on your backend and pass it to the SDK.",
    "- The built-in GrowSurf Window can email a returning participant a sign-in link. The link opens the hosted web portal; it does not authenticate the native app. Continue creating the participant token on your backend for native sessions.",
    "- Deep-link, deferred-link, and provider handlers queue a versioned visit automatically. Do not call `recordAttribution()` after a handler. Use it only for a visit the app constructs itself.",
    "- GrowSurf keeps server-signed first-visit and last-visit receipts and sends them during participant creation. The server applies the program's first-click or last-click setting.",
    "- Use `validateReferrer()` when you only need to check referral identity without creating a participant.",
    reactNative
      ? "- Use `addReferredParticipant()` for referral-only signup tracking. GrowSurf uses captured attribution with the program’s first-click or last-click setting, with a validated referral code as fallback. A missing or invalid later code does not discard a valid earlier referral. For a newly added participant, `participant.referredBy` in the returned API JSON identifies the credited referrer. Existing-participant responses do not disclose that participant’s stored referral credit. If no valid referral remains, GrowSurf does not create a direct participant and the method returns `null`."
      : "- Use `addReferredParticipant()` for referral-only signup tracking. GrowSurf applies stored signed receipts using the program’s first-click or last-click setting, with a validated referral code as fallback. A missing or invalid later code does not discard a valid receipt. For a newly added participant, the result’s `referredBy` identifies the referrer the server credited. `validReferral` can be true even when `referredBy` is absent. Existing-participant responses do not disclose that participant’s stored referral credit. If no valid referral remains, GrowSurf does not create a direct participant.",
    "- Use `addParticipant()` only when the app intentionally creates every signup. Check `affiliateApplicationMode` first so reviewed affiliate applicants use the configured GrowSurf Program Page.",
    "- When `addReferredParticipant()` or `addParticipant()` returns a `participantToken`, the SDK stores it automatically.",
    "- When the program offers more than one language, GrowSurf picks one for each request: the `language` configure option, then the participant's saved language, then the device languages (sent in the `Accept-Language` header), then the program's base language.",
    "- To set the language from your app, pass `language` when you configure the SDK, using a code the program offers, such as `es` or `pt-BR`. It is a configure option only; to change it, configure the SDK again. When it is set, the native GrowSurf Window hides its Language setting. Otherwise participants can pick a language there, and a custom UI can save one with `updateParticipant` and a `language` value. GrowSurf rejects a language the program does not offer.",
  ];

  if (input.serverVerifiedQualifyingAction) {
    sections.push("- For purchases, subscriptions, or other server-verified qualifying actions, trigger referral credit from your backend.");
  } else {
    sections.push("- For low-risk client-side milestones, the SDK can call `triggerReferral` after the qualifying action.");
  }

  sections.push("");
  if (shouldRenderPlatform(input, "ios")) sections.push(renderIos(input, campaignId, mobilePublicKey));
  if (shouldRenderPlatform(input, "android")) sections.push(renderAndroid(input, campaignId, mobilePublicKey));
  if (reactNative) sections.push(renderReactNative(input, campaignId, mobilePublicKey));

  sections.push(
    [
      "### Backend handoff",
      "",
      "- Use the REST API or official REST API libraries to call `Create Mobile Participant Token` with the same participant fields as Add Participant.",
      "- For signed-in referred users, read the SDK's pending attribution in the app and send its `referredBy` value to your backend before minting the token; also include the SDK mobile instance ID as `mobileInstanceId` for anti-fraud. Server-to-server REST calls cannot access app-local attribution or storage automatically.",
      reactNative
        ? "- In React Native, read those values with `getPendingAttribution()` and `getMobileInstanceId()`. Pass the returned `participantToken` to the Window identity `{ type: \"existingParticipantToken\", token }`, or store it with `setParticipantToken(token)`. Keep your REST API key on the backend."
        : "- Pass the returned `participantToken` to `.existingParticipantToken(...)` on iOS or `GrowSurfWindowIdentity.ExistingParticipantToken(...)` on Android.",
      reactNative
        ? "- Share types for `trackShare()` include `copyRefLink`, `email`, `sms`, or a social channel type from the GrowSurf Window data."
        : "- Share tracking types used by the native SDK are `copyRefLink`, `iosNativeShare`, and `androidNativeShare`.",
    ].join("\n"),
  );

  return sections.join("\n");
};
