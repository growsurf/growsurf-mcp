# Progress

## 2026-06-03 - Mobile SDK guide: per-provider deferred deep-linking guidance (iOS + Android)

- Added per-provider **iOS deferred** guidance to `src/growsurf/mobileSdkGuide.ts` `iosAttributionText` (Branch NativeLink note already existed; added the iOS-16 `BranchPasteControl` mention). New per-provider branches: **Adjust LinkMe** (optional clipboard — `ADJConfig.enableLinkMe()` v5 / `setLinkMeEnabled(true)` v4 + `adj_linkme=1`/`linkme=1`), **AppsFlyer** (NO clipboard — server-side Unified Deep Linking via `deepLinkDelegate`/`didResolveDeepLink`, ~15-min lookback, `grsf` in `deep_link_value`/`deep_link_sub1-10`), **Singular Clipboard-Based DDL** (optional, enterprise — `SingularConfig.clipboardAttribution=true` + WebSDK via CSM). The `all` iOS branch now notes deferred is provider-specific/not interchangeable.
- Clarified **Android deferred** in `androidAttributionText` (`google_play`, `all`, and per-provider callback branches): Android's native deterministic channel is the **Google Play Install Referrer** (`handleDeferredDeepLink()`), so the iOS clipboard mechanisms (NativeLink/LinkMe/Clipboard-Based DDL) are **not needed** on Android; the referrer is delivered only for genuine Play Store installs (sideload/`adb` returns none). This is the verified answer to "are there Android equivalents?" — there are none because Android doesn't need the workaround.
- Grounding: provider mechanisms were web-researched and adversarially fact-checked against official vendor + Google docs (Branch/Adjust/AppsFlyer use Play Install Referrer = yes-primary, no Android clipboard; Singular's Clipboard-Based DDL can also run on Android but is secondary to the Play Referrer). Provider-side APIs flagged as version-specific ("confirm against your SDK version"). Mirrors the customer-facing guidance now in `../growsurf-docs/integrations/{branch,adjust,appsflyer,singular}.md` + `developer-tools/ios-sdk/attribution-providers.md`.
- Tests: added two `it(...)` cases to `test/mobileSdkGuide.test.ts` asserting the iOS LinkMe/UDL/Clipboard-Based DDL guidance and the Android Play-Install-Referrer (no-clipboard) note. `npm run typecheck` clean; `npm run test` = 16 passed. No SDK version change (still `0.3.0`); `src/index.ts` has no attribution/deferred text, so nothing to sync there.

## 2026-05-29 - Mobile SDK guide bumped to 0.3.0 (drop participantId)

- Bumped `MOBILE_SDK_GUIDANCE_VERSION` in `src/growsurf/mobileSdkGuide.ts` from `0.2.1` to `0.3.0` (Phase 5 of the cross-repo Mobile SDK 0.3.0 public API cleanup).
- Removed the redundant `participantId` argument from the participant-scoped `trackShare` samples in both the iOS (Swift) and Android (Kotlin) guide sections. The mobile SDKs now derive the participant from the participant JWT, so participant-scoped methods take no `participantId`. `addReferredParticipant`/`addParticipant` inputs were unchanged and left as-is.
- Updated the two SDK-version mentions in `src/index.ts` (the `growsurf_mobile_sdk_guide` tool description and the integration-guide "guides implementation … iOS/Android SDK" line) from `0.2.1` to `0.3.0`. The REST API tools' `participantId` args (`growsurf_trigger_referral`, `growsurf_record_sale`, client/`apiLibrarySnippets`) were deliberately left untouched — they map to the REST API, not the mobile SDK.
- Updated `test/mobileSdkGuide.test.ts`: version assertions (guidance string, podspec path, Maven coordinate, test titles) now expect `0.3.0`, and added a regression test asserting the `trackShare` samples contain no `participantId`.
- Verified: `npm run build` (tsc) clean and `npm test` green.

## 2026-05-24

- Added website-style `.ai/CONTEXT.md`, `.ai/rules.md`, and memory files.
- Current coordination requirement: MCP public guidance should stay aligned with API contracts, docs examples, app install snippets, and native mobile SDK behavior.
