# Progress

## 2026-05-29 - Mobile SDK guide bumped to 0.3.0 (drop participantId)

- Bumped `MOBILE_SDK_GUIDANCE_VERSION` in `src/growsurf/mobileSdkGuide.ts` from `0.2.1` to `0.3.0` (Phase 5 of the cross-repo Mobile SDK 0.3.0 public API cleanup).
- Removed the redundant `participantId` argument from the participant-scoped `trackShare` samples in both the iOS (Swift) and Android (Kotlin) guide sections. The mobile SDKs now derive the participant from the participant JWT, so participant-scoped methods take no `participantId`. `addReferredParticipant`/`addParticipant` inputs were unchanged and left as-is.
- Updated the two SDK-version mentions in `src/index.ts` (the `growsurf_mobile_sdk_guide` tool description and the integration-guide "guides implementation … iOS/Android SDK" line) from `0.2.1` to `0.3.0`. The REST API tools' `participantId` args (`growsurf_trigger_referral`, `growsurf_record_sale`, client/`apiLibrarySnippets`) were deliberately left untouched — they map to the REST API, not the mobile SDK.
- Updated `test/mobileSdkGuide.test.ts`: version assertions (guidance string, podspec path, Maven coordinate, test titles) now expect `0.3.0`, and added a regression test asserting the `trackShare` samples contain no `participantId`.
- Verified: `npm run build` (tsc) clean and `npm test` green.

## 2026-05-24

- Added website-style `.ai/CONTEXT.md`, `.ai/rules.md`, and memory files.
- Current coordination requirement: MCP public guidance should stay aligned with API contracts, docs examples, app install snippets, and native mobile SDK behavior.
