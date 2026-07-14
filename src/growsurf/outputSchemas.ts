// Output schemas (JSON Schema) for the MCP tools that return structured JSON, mirrored from the
// public GrowSurf REST API response contract. They are lean by design: top-level fields, enums,
// and short descriptions, with deep configuration blobs kept as `type: "object"` plus a one-line
// description. Each response shape is documented in full exactly once, on its canonical read
// tool; tools that return the same shape advertise a compact schema whose description points at
// that tool (see `sameShapeAs`), which keeps the tools/list payload small. They are also
// drift-tolerant by design: no `required` lists and no `additionalProperties: false`, so an
// additive change to an API response never fails a client that validates structured tool results
// against these schemas. Keep them in sync with the public GrowSurf REST API documentation
// whenever a response shape changes.

export type ToolOutputSchema = { type: "object"; [key: string]: unknown };

// A permissive stand-in for tools that return a shape another tool already documents in full.
// Each response shape is described once in the tool list (on its canonical read tool) instead of
// being duplicated on every tool that returns it; the description says where the full shape lives.
const sameShapeAs = (description: string): ToolOutputSchema => ({ type: "object", description });

const MONEY_MINOR_UNITS = "in minor currency units (e.g. cents)";

const METADATA = {
  type: "object",
  description: "Custom key/value metadata (single level).",
  additionalProperties: true,
} as const;

const PARTICIPANT_REWARD = {
  type: "object",
  description:
    "A reward earned by the participant (`ParticipantReward`), distinct from the program-level reward config (`CampaignReward`).",
  properties: {
    id: { type: "string", description: "The participant reward id." },
    rewardId: { type: "string", description: "Id of the program reward (`CampaignReward`) that was earned." },
    status: { type: "string", enum: ["PENDING", "FULFILLED"], description: "Fulfillment status of the earned reward." },
    unread: { type: "boolean", description: "`true` until the participant sees the reward in a GrowSurf window." },
    approved: { type: "boolean", description: "`true` once the reward is approved." },
    approvedAt: {
      type: ["integer", "null"],
      description: "When the reward was approved, as a Unix timestamp in milliseconds. `null` until approved.",
    },
    fulfilledAt: {
      type: ["integer", "null"],
      description: "When the reward was fulfilled, as a Unix timestamp in milliseconds. `null` until fulfilled.",
    },
    isReferrer: {
      type: "boolean",
      description: "`true` if earned as the referrer, `false` if earned as the referred friend (double-sided rewards).",
    },
    isAvailable: { type: "boolean", description: "`true` if the reward is available for the participant to claim or redeem." },
    isFulfilled: { type: "boolean", description: "`true` once the reward has been fulfilled." },
    referredId: { type: "string", description: "Id of the friend that was referred." },
    referrerId: { type: "string", description: "Id of the participant that made the referral." },
    commissionStructure: {
      type: ["object", "null"],
      description: "Commission configuration attached to this reward. Present only for affiliate programs.",
    },
  },
} as const;

const PARTICIPANT: ToolOutputSchema = {
  type: "object",
  description: "A program participant.",
  properties: {
    id: { type: "string", description: "The participant's unique id." },
    firstName: { type: ["string", "null"], description: "The participant's first name." },
    lastName: { type: ["string", "null"], description: "The participant's last name." },
    email: { type: "string", description: "The participant's email address." },
    paypalEmailAddress: {
      type: "string",
      description: "PayPal email address on file, used for affiliate or PayPal reward payouts.",
    },
    referralCount: { type: "integer", description: "All-time referrals credited to the participant." },
    monthlyReferralCount: { type: "integer", description: "Referrals credited this month (resets monthly)." },
    prevMonthlyReferralCount: { type: "integer", description: "Referrals credited the previous month." },
    rank: { type: "integer", description: "All-time leaderboard rank." },
    monthlyRank: { type: "integer", description: "Current-month leaderboard rank (resets monthly)." },
    prevMonthlyRank: { type: "integer", description: "Previous-month leaderboard rank." },
    shareUrl: { type: "string", description: "The participant's unique referral link." },
    createdAt: { type: "integer", description: "When the participant joined, as a Unix timestamp in milliseconds." },
    referralSource: {
      type: "string",
      enum: ["DIRECT", "PARTICIPANT"],
      description: "How the participant joined the program.",
    },
    referralStatus: {
      type: "string",
      enum: ["CREDIT_PENDING", "CREDIT_AWARDED", "CREDIT_EXPIRED", "INVITE_SENT"],
      description: "The referrer's credit status for this participant. Present only when the participant was referred.",
    },
    referredBy: { type: "string", description: "Id of the referrer. Present only when the participant was referred." },
    fraudRiskLevel: {
      type: "string",
      enum: ["LOW", "MEDIUM", "HIGH"],
      description: "The participant's fraud risk level.",
    },
    fraudReasonCode: {
      type: "string",
      description: "Reason code behind `fraudRiskLevel` (e.g. `UNIQUE_IDENTITY`, `DUPLICATE_EMAIL`, `MANUAL_UPDATE`).",
    },
    isWinner: { type: "boolean", description: "`true` once the participant has earned at least one reward." },
    shareCount: {
      type: "object",
      additionalProperties: { type: "integer" },
      description: "Share counts keyed by channel (e.g. `email`, `facebook`, `twitter`, `copyRefLink`, `iosNativeShare`).",
    },
    impressionCount: { type: "integer", description: "Total views of the participant's referral link." },
    uniqueImpressionCount: { type: "integer", description: "Unique views of the participant's referral link." },
    inviteCount: { type: "integer", description: "Invites sent by the participant." },
    referrals: {
      type: "array",
      items: { type: "string" },
      description: "Ids of participants they successfully referred (100 most recent).",
    },
    monthlyReferrals: {
      type: "array",
      items: { type: "string" },
      description: "Ids of participants they successfully referred this month (100 most recent).",
    },
    referrer: {
      type: ["object", "null"],
      description:
        "Summary of the participant's referrer (same core fields as a participant). Present only when the participant was referred.",
    },
    ipAddress: { type: ["string", "null"], description: "IP address used for anti-fraud matching." },
    fingerprint: { type: ["string", "null"], description: "Browser fingerprint used for anti-fraud matching." },
    mobileInstanceId: {
      type: ["string", "null"],
      description: "App-install scoped mobile identifier used for anti-fraud matching.",
    },
    metadata: METADATA,
    notes: { type: ["string", "null"], description: "Internal notes. Never shown to participants." },
    unsubscribed: { type: "boolean", description: "`true` if the participant unsubscribed from program emails." },
    rewards: {
      type: "array",
      items: PARTICIPANT_REWARD,
      description: "Rewards the participant has earned.",
    },
    vanityKeys: { type: "array", items: { type: "string" }, description: "The participant's vanity keys." },
    unreadCommissionsCount: {
      type: "integer",
      description: "Commissions the participant has not yet viewed. Affiliate programs only.",
    },
    unreadPayoutsCount: {
      type: "integer",
      description: "Payouts the participant has not yet viewed. Affiliate programs only.",
    },
    isNew: {
      type: "boolean",
      description: "`true` when the request created the participant. Returned by participant creation calls.",
    },
    allMatchingFraudsters: {
      type: "array",
      items: { type: "object" },
      description: "Other participants flagged as matching this participant during anti-fraud checks.",
    },
    payoutSettings: {
      type: "object",
      description: "Actions the participant must complete before a payout can be released. Always present.",
      properties: {
        requiredActions: {
          type: "array",
          items: { type: "string", enum: ["PAYPAL_EMAIL", "TAX_INFO"] },
          description: "Actions required before payouts can be sent. Empty when no action is required.",
        },
      },
    },
  },
};

const TAX_VALUATION = {
  type: ["object", "null"],
  description: "Tax valuation used by tax documentation and 1099 reporting. `null` when no valuation is set.",
  properties: {
    fairMarketValueUSD: {
      type: ["number", "null"],
      description: "Manual fair-market value in USD (major units). `null` when no manual value is set.",
    },
    isTaxReportable: {
      type: ["boolean", "null"],
      description: "Whether the reward's value counts toward 1099 thresholds. `null` uses the smart default.",
    },
  },
} as const;

const REWARD: ToolOutputSchema = {
  type: "object",
  description:
    "A campaign reward config (`CampaignReward`), distinct from a `ParticipantReward` earned by a participant.",
  properties: {
    id: { type: "string", description: "The campaign reward id." },
    type: {
      type: "string",
      enum: ["SINGLE_SIDED", "DOUBLE_SIDED", "MILESTONE", "LEADERBOARD", "AFFILIATE"],
      description: "The reward type.",
    },
    title: { type: ["string", "null"], description: "The reward title (internal only, never shown to participants)." },
    isVisible: {
      type: "boolean",
      description: "Whether the reward is enabled. When `false` it is no longer awarded and is hidden from participants.",
    },
    description: { type: ["string", "null"], description: "The reward description shown to the referrer." },
    referralDescription: {
      type: ["string", "null"],
      description: "The reward description shown to the referred friend (double-sided rewards only).",
    },
    referredRewardUpfront: {
      type: "boolean",
      description: "Double-sided rewards only. When `true`, the referred friend's reward is delivered upfront as a discount.",
    },
    isUnlimited: { type: "boolean", description: "`true` if a participant can earn this reward an unlimited number of times." },
    limit: {
      type: ["integer", "null"],
      description: "How many times a participant can earn this reward. `-1` represents unlimited in REST responses.",
    },
    conversionsRequired: {
      type: ["integer", "null"],
      description: "Referrals required to earn this reward.",
    },
    numberOfWinners: {
      type: ["integer", "null"],
      description: "Maximum number of winners. `LEADERBOARD` rewards only.",
    },
    limitDuration: {
      type: ["string", "null"],
      enum: ["IN_TOTAL", "PER_MONTH", "PER_YEAR", null],
      description: "The window over which `limit` applies.",
    },
    imageUrl: { type: ["string", "null"], description: "The reward image URL." },
    couponCode: {
      type: ["string", "null"],
      description:
        "Static coupon code shown to the referrer in the reward-won email and webhook. Display text only; superseded by a connected billing integration's issued coupon.",
    },
    referralCouponCode: {
      type: ["string", "null"],
      description:
        "Static coupon code shown to the referred friend (double-sided rewards). Display text only; superseded by a connected billing integration's issued coupon.",
    },
    order: { type: ["integer", "null"], description: "Display order when there are multiple rewards." },
    nextMilestonePrefix: {
      type: ["string", "null"],
      description: "Text shown before the referral count in milestone progress copy. `MILESTONE` rewards only.",
    },
    nextMilestoneSuffix: {
      type: ["string", "null"],
      description: "Text shown after the referral count in milestone progress copy. `MILESTONE` rewards only.",
    },
    metadata: METADATA,
    commissionStructure: {
      type: ["object", "null"],
      description:
        "Affiliate commission configuration: `type` (`PERCENT` or `FIXED`), `percent` or `amount` + `amountISO` " +
        `(${MONEY_MINOR_UNITS}), \`event\`, \`minPaidReferrals\`, \`holdDuration\` (days), \`duration\` and ` +
        "`durationInMonths`, `approvalRequired`, plus optional cap (`maxAmount`) and intro rate (`intro*`) fields. " +
        "Present only for affiliate programs.",
    },
    value: TAX_VALUATION,
    referredValue: TAX_VALUATION,
  },
};

const CAMPAIGN: ToolOutputSchema = {
  type: "object",
  description: "A GrowSurf program (campaign).",
  properties: {
    id: { type: "string", description: "The program's unique id." },
    name: { type: "string", description: "The program name (internal only, never shown to participants)." },
    type: { type: "string", enum: ["REFERRAL", "AFFILIATE"], description: "The program type." },
    referralCount: { type: "integer", description: "Total referrals." },
    participantCount: { type: "integer", description: "Total participants." },
    impressionCount: { type: "integer", description: "Total referral-link views across participants." },
    inviteCount: { type: "integer", description: "Total invites sent by participants." },
    winnerCount: { type: "integer", description: "Participants with at least one approved reward." },
    currencyISO: { type: ["string", "null"], description: "The program currency as an ISO 4217 code (e.g. `USD`)." },
    status: {
      type: "string",
      enum: ["DRAFT", "IN_PROGRESS", "COMPLETE", "DELETED"],
      description: "The program status.",
    },
    rewards: {
      type: "array",
      items: { type: "object" },
      description:
        "The program's reward configs (`CampaignReward`). Item shape is documented on the `growsurf_list_campaign_rewards` tool.",
    },
  },
};

const CAMPAIGN_LIST_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    campaigns: {
      type: "array",
      items: {
        type: "object",
        description: "A program. Shape is documented on the `growsurf_get_campaign` tool.",
      },
      description: "Programs available to the API key's bound team.",
    },
  },
};

const CAMPAIGN_REWARD_LIST_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    rewards: { type: "array", items: REWARD, description: "The program's active, visible, and enabled reward configs." },
  },
};

const DELETE_REWARD_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    id: { type: "string", description: "The deleted campaign reward id." },
    success: { type: "boolean", description: "Whether the campaign reward was deleted." },
  },
};

const CAMPAIGN_DESIGN: ToolOutputSchema = {
  type: "object",
  description:
    "A program's design configuration, organized by section. The sections available depend on the program type. `GET` returns the full object with every field; `PATCH` back only the sections or fields you want to change.",
  properties: {
    window: { type: "object", description: "Layout of the GrowSurf window (`navigationMode`: `TABS` or `LIST`)." },
    header: { type: "object", description: "Header content for participants (`postText`) and non-participants (`preText`)." },
    stats: { type: "object", description: "The participant's referral-progress stats panel. Only `title` is editable." },
    share: { type: "object", description: "Share channels, invite settings, and share-button styling." },
    signup: { type: "object", description: "Signup form fields, GDPR consent, and button and login text." },
    referralStatus: {
      type: "object",
      description: "The section listing who a participant invited and each invite's progress.",
    },
    leaderboard: { type: "object", description: "The leaderboard section: labels, selectors, and name masking." },
    referredExperience: {
      type: "object",
      description: "The banner and headline shown to a visitor who arrives through a referral link.",
    },
    referralSummary: {
      type: "object",
      description: "Referral programs only. The participant's row of summary tiles (clicks, leads, referrals, rewards).",
    },
    affiliateSummary: {
      type: "object",
      description: "Affiliate programs only. The affiliate's row of summary tiles (clicks, revenue, payouts).",
    },
    commissions: { type: "object", description: "Affiliate programs only. The Commissions section of the participant portal." },
    payouts: { type: "object", description: "Affiliate programs only. The Payouts section of the participant portal." },
    rewards: { type: "object", description: "Heading, icon, and empty-state text of the rewards panel." },
    participantSettings: {
      type: "object",
      description: "The participant's account settings area (logout, PayPal payout email, tax details).",
    },
    landingPages: {
      type: "object",
      description: "Portal and landing pages: company info, `content`, `styles`, third-party script ids, and SEO meta tags.",
    },
    theme: { type: "object", description: "Visual theme styling (colors, shadows, and similar)." },
  },
};

const CAMPAIGN_EMAILS: ToolOutputSchema = {
  type: "object",
  description:
    "A program's email configuration. Each template property is an object with `subject`, `preheader`, `body` (HTML), and `isEnabled` (plus `useCompanyReplyTo` on the invite email). The templates available depend on the program type. `GET` returns the full object; `PATCH` back only the fields you want to change.",
  properties: {
    welcomeNonReferred: {
      type: "object",
      description: "Welcome email for a participant who joins without being referred. Referral and affiliate programs.",
    },
    welcomeReferred: {
      type: "object",
      description: "Welcome email for someone who signs up through a referral link. Referral programs only.",
    },
    referralLinkViewedFirstTime: {
      type: "object",
      description: "Sent the first time a participant's referral link is viewed. Referral and affiliate programs.",
    },
    referralLinkUsed: {
      type: "object",
      description: "Sent to a referrer when they earn referral credit. Referral programs only.",
    },
    referredSignup: {
      type: "object",
      description: "Sent to a referrer each time someone signs up using their link. Referral and affiliate programs.",
    },
    goalAchieved: { type: "object", description: "Sent when a participant unlocks a reward. Referral programs only." },
    campaignEndedWinners: {
      type: "object",
      description: "Sent to reward winners when the program ends. Referral programs only.",
    },
    campaignEndedNonWinners: {
      type: "object",
      description: "Sent to non-winners when the program ends. Referral programs only.",
    },
    progressUpdateMonthly: {
      type: "object",
      description: "Month-end progress recap for participants. Referral and affiliate programs.",
    },
    commissionGenerated: {
      type: "object",
      description: "Sent to an affiliate when they earn a new commission. Affiliate programs only.",
    },
    commissionAdjusted: {
      type: "object",
      description: "Sent when a commission is adjusted after a refund or chargeback. Affiliate programs only.",
    },
    payoutPending: { type: "object", description: "Sent when a payout is on the way. Affiliate programs only." },
    payoutSentSuccess: { type: "object", description: "Sent when a payout completes. Affiliate programs only." },
    invite: {
      type: "object",
      description: "The invitation email a participant sends to friends. `useCompanyReplyTo` sets who receives replies.",
    },
    loginLink: {
      type: "object",
      description: "One-time sign-in link for returning participants. Transactional; its toggle cannot be changed.",
    },
    paypalEmailConfirmation: {
      type: "object",
      description: "Asks a participant to confirm their PayPal payout email. Transactional; its toggle cannot be changed.",
    },
    taxInfoMissing: {
      type: "object",
      description: "Asks a participant to submit required tax information. Transactional; its toggle cannot be changed.",
    },
    taxInfoReceived: {
      type: "object",
      description: "Confirms submitted tax information was received. Transactional; its toggle cannot be changed.",
    },
    taxInfoApproved: {
      type: "object",
      description: "Tells a participant their tax form is complete and approved. Transactional; its toggle cannot be changed.",
    },
    taxInfoRejected: {
      type: "object",
      description: "Tells a participant their tax information needs to be resubmitted. Transactional; its toggle cannot be changed.",
    },
    settings: {
      type: "object",
      description: "Sender (`sender`), physical contact address (`contact`), and shared design (`design`) settings.",
    },
  },
};

const CAMPAIGN_OPTIONS: ToolOutputSchema = {
  type: "object",
  description:
    "A program's options. Some fields are program-type specific. `GET` returns the full object; `PATCH` back only the fields you want to change.",
  properties: {
    requireManualRewardApproval: {
      type: "boolean",
      description: "Referral programs only. Hold each earned reward for manual approval before it unlocks.",
    },
    autoFulfillRewards: {
      type: "boolean",
      description: "Referral programs only. Automatically mark earned rewards as fulfilled.",
    },
    requireManualFraudApproval: {
      type: "boolean",
      description: "Flag suspected fraud for review instead of blocking signups automatically.",
    },
    autoBlockFraud: { type: "boolean", description: "Automatically block signups flagged as high fraud risk." },
    requireParticipantAuth: {
      type: "boolean",
      description: "Require returning participants to authenticate. Affiliate programs require `true`.",
    },
    enforceGdprCompliance: {
      type: "boolean",
      description: "Store only the minimum participant data (no IP addresses, fingerprints, or mobile instance ids).",
    },
    blockPaidAdsTraffic: {
      type: "boolean",
      description: "Do not attribute referrals from visitors who arrived through paid ads.",
    },
    referralCookieWindowDays: {
      type: "integer",
      enum: [1, 3, 7, 14, 30, 60, 90, 180, 365, 400],
      description: "How long a referral-link click is remembered in the visitor's browser, in days.",
    },
    referralCreditWindowDays: {
      type: ["integer", "null"],
      enum: [1, 3, 7, 14, 30, 60, 90, 180, 365, null],
      description:
        "How long a referred friend has to complete the qualifying action, in days. `null` means the credit never expires.",
    },
    payoutThreshold: {
      type: ["integer", "null"],
      description: `Affiliate programs only. Minimum payout ${MONEY_MINOR_UNITS}. \`0\` or \`null\` means no minimum.`,
    },
    fraud: {
      type: "object",
      description:
        "Anti-fraud settings: `blockedEmails`/`blockedIps`/`blockedCountries` and matching allow lists, `blockBurnerEmails`, `blockDataCenterIps`, `blockHighRiskReferrers`, `autoBlockHighRiskIps`, per-IP signup rate limits, and `recaptcha`.",
    },
    taxDocumentation: {
      type: "object",
      description:
        "Affiliate programs only. Company billing details (name, address, VAT number) used on affiliate payout invoices and for VAT handling.",
    },
    notificationEmails: {
      type: "object",
      description: "Owner notification settings: `recipients` plus per-event `events` toggles.",
    },
  },
};

const CAMPAIGN_INSTALLATION: ToolOutputSchema = {
  type: "object",
  description:
    "A program's installation configuration. `referralTrigger` is only present for referral programs. `GET` returns the full object; `PATCH` back only the fields you want to change.",
  properties: {
    referralTrigger: {
      type: "string",
      enum: ["CUSTOM", "ON_SIGNUP"],
      description:
        "Referral programs only. `ON_SIGNUP` counts a referral as soon as the friend signs up; `CUSTOM` also requires a qualifying action.",
    },
    signupEvent: {
      type: "string",
      enum: ["FORM_DETECTION", "PROGRAMMATIC"],
      description:
        "The signup tracking method: automatic form detection, or participants added via the SDKs and REST API.",
    },
    shareUrl: { type: "string", description: "The landing page referred friends reach from a referral link." },
    useGrowSurfHostedLinks: {
      type: "boolean",
      description: "Use GrowSurf-hosted referral links that route clicks by the visitor's device. Mainly for mobile apps.",
    },
    allowedUrls: {
      type: "array",
      items: { type: "string" },
      description: "Extra domains, beyond the share URL, where the GrowSurf window and SDK are allowed to run.",
    },
    signup: {
      type: "object",
      description: "Custom signup-form settings (used with `FORM_DETECTION`).",
      properties: {
        isCustomForm: { type: "boolean", description: "Whether signups come from your own form." },
        url: { type: ["string", "null"], description: "The custom signup form URL." },
        redirectAfterSignup: { type: "boolean", description: "Whether the form redirects after submission." },
        redirectUrl: { type: ["string", "null"], description: "URL the signup form redirects to." },
        trackInputFields: { type: "boolean", description: "Whether signup form fields are watched for referral attribution." },
      },
    },
    mobile: {
      type: "object",
      description: "GrowSurf iOS and Android SDK settings.",
      properties: {
        isEnabled: { type: "boolean", description: "Whether the mobile SDK is enabled for the program." },
        publicKey: { type: "string", description: "The publishable mobile SDK key. Read-only." },
        iosAttributionUrl: { type: ["string", "null"], description: "iOS attribution URL for mobile referral links." },
        iosAppStoreUrl: { type: ["string", "null"], description: "iOS App Store URL for mobile referral links." },
        androidPackageName: { type: ["string", "null"], description: "Android package name (e.g. `com.example.app`)." },
        androidAppStoreUrl: { type: ["string", "null"], description: "Google Play Store URL for mobile referral links." },
      },
    },
  },
};

const TEAM: ToolOutputSchema = {
  type: "object",
  description: "The team bound to the API key or OAuth connection.",
  properties: {
    name: { type: "string", description: "The team's display name." },
    verificationStatus: {
      type: "string",
      enum: ["NOT_REQUESTED", "REQUESTED", "VERIFIED"],
      description: "Team verification state. `VERIFIED` is required before a program can send participant emails.",
    },
    verificationRequestedAt: {
      type: ["integer", "null"],
      description: "When verification was last requested, as a Unix timestamp in milliseconds.",
    },
  },
};

const CREATE_ACCOUNT_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    email: { type: "string", description: "Email address for the new account." },
    apiKey: {
      type: "string",
      description:
        "An API key for the new account. Shown once, locked (`403` `EMAIL_NOT_VERIFIED_ERROR`) until the account's email is verified, and rotated when the owner first signs in to the dashboard.",
    },
    verificationStatus: {
      type: "string",
      enum: ["NOT_REQUESTED", "REQUESTED", "VERIFIED"],
      description: "Team verification state for the new account.",
    },
  },
};

const VERIFICATION_EMAIL_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", description: "Whether the verification email request was accepted." },
    status: { type: "string", enum: ["SENT"], description: "Status of the verification email request." },
  },
};

const CAMPAIGN_ANALYTICS_TOTALS = {
  type: "object",
  description:
    "Analytics totals: `invites`, `impressions`, `uniqueImpressions`, `participants`, `referrals`, `referralCreditPendings`, `referralCreditExpireds`, per-channel share counts (`emailShares`, `twitterShares`, `copyRefLinkShares`, ...), and for affiliate programs `totalRevenue` and `totalCommissions` " +
    `(${MONEY_MINOR_UNITS}) plus \`totalCommissionCount\`.`,
  additionalProperties: { type: "integer" },
} as const;

const CAMPAIGN_ANALYTICS_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    analytics: CAMPAIGN_ANALYTICS_TOTALS,
    startDate: { type: "integer", description: "Start of the analytics timeframe, as a Unix timestamp in milliseconds." },
    endDate: { type: "integer", description: "End of the analytics timeframe, as a Unix timestamp in milliseconds." },
    series: {
      type: "array",
      items: { type: "object", description: "Per-period analytics totals plus `periodStart` (Unix ms, UTC)." },
      description: "Per-period totals in ascending order. Present only when `interval` is `day`, `week`, or `month`.",
    },
    previousPeriod: {
      type: "object",
      description:
        "Totals for the equal-length window immediately before the requested one (`analytics`, `startDate`, `endDate`). Present only when `include` contains `previousPeriod`.",
    },
    statusCounts: {
      type: "object",
      description:
        "Status-count breakdowns: `rewardStatus` (`pending`/`approved` counts), and for affiliate programs `affiliateStatus`, `commissionStatus`, and `payoutStatus` " +
        `(counts and amounts ${MONEY_MINOR_UNITS}). Present only when \`include\` contains \`statusCounts\`.`,
    },
    rates: {
      type: "object",
      description: "Derived referral rates, each a ratio from 0 to 1. Present only when `include` contains `rates`.",
      properties: {
        referralConversionRate: { type: "number", description: "`referrals` divided by `uniqueImpressions`." },
        participationRate: { type: "number", description: "`participants` divided by `uniqueImpressions`." },
        sharesPerParticipant: { type: "number", description: "Total shares across channels divided by `participants`." },
      },
    },
  },
};

const PARTICIPANT_ANALYTICS_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    analytics: {
      type: "object",
      description: "Participant analytics totals.",
      properties: {
        referrals: { type: "integer", description: "All-time referrals credited to this participant." },
        monthlyReferrals: { type: "integer", description: "Referrals credited in the current month." },
        leads: { type: "integer", description: "Pending referral credits." },
        expiredReferrals: { type: "integer", description: "Expired referral credits." },
        impressions: { type: "integer", description: "Total referral-link views." },
        uniqueImpressions: { type: "integer", description: "Unique referral-link views." },
        invitesSent: { type: "integer", description: "Invites sent by this participant." },
        rewardsEarned: { type: "integer", description: "Approved rewards earned." },
        pendingRewards: { type: "integer", description: "Earned rewards awaiting approval." },
        referralRevenue: {
          type: "integer",
          description: `Affiliate only. Revenue attributed to this participant's referrals, ${MONEY_MINOR_UNITS}.`,
        },
        totalCommissions: { type: "integer", description: `Affiliate only. Total commissions earned, ${MONEY_MINOR_UNITS}.` },
        totalPaidOut: { type: "integer", description: `Affiliate only. Total paid out, ${MONEY_MINOR_UNITS}.` },
        upcomingPayout: {
          type: "integer",
          description: `Affiliate only. Approved commissions ready to pay, ${MONEY_MINOR_UNITS}.`,
        },
        currencyISO: { type: "string", description: "Program currency for the money metrics." },
      },
    },
    ranks: {
      type: "object",
      description: "Leaderboard ranks for this participant.",
      properties: {
        rank: { type: ["integer", "null"], description: "All-time rank (1-indexed), or `null` when unranked." },
        monthlyRank: { type: ["integer", "null"], description: "Current-month rank, or `null` when unranked." },
        prevMonthlyRank: { type: ["integer", "null"], description: "Previous-month rank, or `null` when unranked." },
      },
    },
    shareCount: {
      type: "object",
      additionalProperties: { type: "integer" },
      description: "Per-channel share counts (e.g. `email`, `facebook`, `twitter`).",
    },
    series: {
      type: "array",
      items: { type: "object", description: "Per-period activity totals plus `periodStart` (Unix ms, UTC)." },
      description: "This participant's referral-link activity per period. Present only when `include` is `series`.",
    },
    startDate: { type: "integer", description: "Window start (Unix ms). Present only with `include=series`." },
    endDate: { type: "integer", description: "Window end (Unix ms). Present only with `include=series`." },
  },
};

const PARTICIPANT_LIST_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    participants: {
      type: "array",
      items: {
        type: "object",
        description: "A participant. Shape is documented on the `growsurf_get_participant` tool.",
      },
      description: "Participants returned for this page.",
    },
    limit: { type: "integer", description: "Maximum number of participants requested for this page." },
    nextId: {
      type: ["string", "null"],
      description: "Participant id to pass as `nextId` for the next page, or `null` when there are no more results.",
    },
  },
};

const BULK_DELETE_PARTICIPANTS_RESPONSE: ToolOutputSchema = {
  type: "object",
  description:
    "Bulk delete outcome. A `200` response can still include `NOT_FOUND` or `ERROR` rows, so check the summary.",
  properties: {
    summary: {
      type: "object",
      description: "Counts across all submitted entries.",
      properties: {
        total: { type: "integer", description: "Entries submitted in this request." },
        deletedCount: { type: "integer", description: "Entries that resolved to a participant and were deleted." },
        notFoundCount: { type: "integer", description: "Entries that did not match any participant." },
        duplicateCount: { type: "integer", description: "Entries that resolved to the same participant as an earlier entry." },
        errorCount: { type: "integer", description: "Entries that failed to look up or delete." },
      },
    },
    results: {
      type: "array",
      description: "One entry per submitted identifier, in request order.",
      items: {
        type: "object",
        properties: {
          index: { type: "integer", description: "Zero-based position of this entry in the submitted list." },
          identifier: { type: "string", description: "The submitted participant id or email, echoed back." },
          status: {
            type: "string",
            enum: ["DELETED", "NOT_FOUND", "DUPLICATE", "ERROR"],
            description: "Per-row outcome.",
          },
          participantId: { type: "string", description: "The resolved participant id. Present when the entry resolved." },
          email: { type: "string", description: "The resolved participant's email. Present on `DELETED` rows." },
          message: { type: "string", description: "Detail for `NOT_FOUND`, `DUPLICATE`, and `ERROR` rows." },
        },
      },
    },
  },
};

const EMAIL_PARTICIPANT_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", description: "Whether the email request was accepted." },
    status: { type: "string", enum: ["queued"], description: "The email was accepted for delivery." },
  },
};

const PARTICIPANT_ACTIVITY_LOGS_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    activityLogs: {
      type: "array",
      description: "Activity log entries for the participant.",
      items: {
        type: "object",
        properties: {
          type: { type: "string", description: "The activity family (e.g. `REFERRAL`, `SHARE`, `REWARD`, `EMAIL`, `COMMON`)." },
          text: { type: "string", description: "A human-readable description of the activity." },
          createdAt: { type: "integer", description: "When the activity occurred, as a Unix timestamp in milliseconds." },
        },
      },
    },
    offset: { type: ["integer", "null"], description: "Offset for the next page, or `null` when there are no more logs." },
    limit: { type: "integer", description: "Number of activity logs returned per page." },
  },
};

const REFERRAL_TRIGGER_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", description: "Whether referral credit was awarded, scheduled, or cancelled." },
    message: {
      type: "string",
      description: "Human-readable result message. Present when credit was not awarded immediately.",
    },
  },
};

const RECORD_TRANSACTION_RESPONSE: ToolOutputSchema = {
  type: "object",
  description:
    "Result of recording a sale. A new sale returns `success: true` with `firstSale`; a sale matching an existing transaction returns `success: false` with `duplicate: true` and the matching details.",
  properties: {
    success: { type: "boolean", description: "`true` when the sale was recorded; `false` when it matched an existing transaction." },
    firstSale: { type: "boolean", description: "Whether this was the referred customer's first recorded sale." },
    duplicate: { type: "boolean", description: "`true` when the sale matched an existing transaction." },
    commissionsCreated: { type: "integer", description: "Commissions created by this duplicate request." },
    duplicateFields: {
      type: "array",
      items: { type: "string" },
      description: "Identifier fields that matched an existing transaction.",
    },
    matchingCommissionIds: {
      type: "array",
      items: { type: "string" },
      description: "Commission ids that matched the submitted identifiers.",
    },
    message: { type: "string", description: "Human-readable result message." },
  },
};

const REFUND_TRANSACTION_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    success: {
      type: "boolean",
      description: "`true` when the amendment was processed; `false` when no matching transaction was found.",
    },
    notFound: { type: "boolean", description: "Present and `true` when no commission matched the provided identifiers." },
    amendmentType: {
      type: "string",
      enum: ["REFUND", "CHARGEBACK"],
      description: "Amendment type that was processed.",
    },
    matched: { type: "integer", description: "Commissions found for the provided identifiers." },
    reversed: { type: "integer", description: "Commissions reversed (set to zero amount)." },
    adjusted: { type: "integer", description: "Commissions partially adjusted." },
    deleted: { type: "integer", description: "Pending commissions deleted by the amendment." },
    matchingCommissionIds: {
      type: "array",
      items: { type: "string" },
      description: "Commission ids that matched the submitted identifiers.",
    },
    message: { type: "string", description: "Human-readable result message." },
  },
};

const MOBILE_PARTICIPANT_TOKEN_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    participantToken: {
      type: "string",
      description: "Participant-scoped bearer token for GrowSurf mobile SDK participant endpoints.",
    },
    expiresIn: { type: "integer", description: "Token lifetime in seconds." },
    participant: {
      type: "object",
      description: "The participant record (same shape as the `growsurf_get_participant` result).",
    },
    isNew: { type: "boolean", description: "Whether this request created a new participant." },
  },
};

const WEBHOOK: ToolOutputSchema = {
  type: "object",
  description: "A program webhook's configuration plus read-only delivery-health fields.",
  properties: {
    id: { type: "string", description: "The webhook id (`primary` for the program's primary webhook)." },
    payloadUrl: { type: ["string", "null"], description: "The URL that receives webhook deliveries." },
    events: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "PARTICIPANT_REACHED_A_GOAL",
          "NEW_PARTICIPANT_ADDED",
          "CAMPAIGN_ENDED",
          "PARTICIPANT_FRAUD_STATUS_UPDATED",
          "NEW_COMMISSION_ADDED",
          "COMMISSION_ADJUSTED",
          "NEW_PAYOUT_ISSUED",
        ],
      },
      description: "Webhook events this endpoint is subscribed to.",
    },
    isEnabled: { type: "boolean", description: "Whether deliveries to this webhook are enabled." },
    autoDisabledDueToFailures: {
      type: "boolean",
      description: "Read-only. Whether the webhook was auto-disabled after repeated delivery failures.",
    },
    failureCount: { type: "integer", description: "Read-only. Consecutive delivery failures." },
    lastFailureAt: {
      type: ["integer", "null"],
      description: "Read-only. When the last delivery failure occurred, as a Unix timestamp in milliseconds.",
    },
  },
};

const WEBHOOK_LIST_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    webhooks: { type: "array", items: WEBHOOK, description: "Webhooks configured for the program." },
  },
};

const DELETE_WEBHOOK_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    id: { type: "string", description: "Id of the webhook that was deleted." },
    success: { type: "boolean", description: "Whether the webhook was deleted." },
  },
};

const WEBHOOK_TEST_RESPONSE: ToolOutputSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", description: "Whether the test webhook request completed." },
    payload: { type: "object", additionalProperties: true, description: "The mock event payload that was sent." },
    response: {
      type: "object",
      description: "Response returned by the webhook endpoint during the test.",
      properties: {
        msg: { type: "string", description: "Response message returned by the webhook endpoint." },
        statusCode: { type: "integer", description: "HTTP status code returned by the webhook endpoint." },
      },
    },
  },
};

const WEBHOOK_NORMALIZATION_RESULT: ToolOutputSchema = {
  type: "object",
  description:
    "Webhook payload validation result. `ok: true` includes the normalized envelope and an idempotency key; `ok: false` includes `error`.",
  properties: {
    ok: { type: "boolean", description: "Whether the payload is a valid GrowSurf webhook envelope." },
    envelope: {
      type: "object",
      description: "The normalized webhook envelope. Present only when `ok` is `true`.",
      properties: {
        event: { type: "string", description: "The webhook event name (e.g. `NEW_PARTICIPANT_ADDED`)." },
        createdAt: { type: "integer", description: "When the event occurred, as a Unix timestamp in milliseconds." },
        data: { description: "The event payload." },
      },
    },
    idempotencyKey: {
      type: "string",
      description: "A deterministic key for ignoring duplicate deliveries. Present only when `ok` is `true`.",
    },
    error: { type: "string", description: "Why the payload failed validation. Present only when `ok` is `false`." },
  },
};

const INTEGRATION_CONNECT_LINK: ToolOutputSchema = {
  type: "object",
  properties: {
    integration: { type: "string", description: "The integration key that was requested." },
    label: { type: "string", description: "Human-readable integration name." },
    category: { type: "string", description: "The integration's category." },
    referralOnly: { type: "boolean", description: "`true` when the integration applies to referral programs only." },
    url: { type: "string", description: "Dashboard link that opens the integration's connect panel." },
    note: { type: "string", description: "Instructions to relay to the user." },
  },
};

// Tool name -> output schema for every MCP tool that returns structured JSON. Tools that return
// markdown or plain text (guides, snippets, the participant auth hash) are intentionally absent:
// declaring an output schema obligates the tool to return matching `structuredContent` on every
// success, which only makes sense for JSON results.
export const TOOL_OUTPUT_SCHEMAS: Readonly<Record<string, ToolOutputSchema>> = {
  growsurf_get_campaign: CAMPAIGN,
  growsurf_list_campaigns: CAMPAIGN_LIST_RESPONSE,
  growsurf_create_campaign: sameShapeAs("The created program. Same shape as the `growsurf_get_campaign` result."),
  growsurf_update_campaign: sameShapeAs("The updated program. Same shape as the `growsurf_get_campaign` result."),
  growsurf_clone_campaign: sameShapeAs("The newly cloned program. Same shape as the `growsurf_get_campaign` result."),
  growsurf_list_campaign_rewards: CAMPAIGN_REWARD_LIST_RESPONSE,
  growsurf_create_campaign_reward: sameShapeAs(
    "The created campaign reward. Same shape as the items in the `growsurf_list_campaign_rewards` result.",
  ),
  growsurf_update_campaign_reward: sameShapeAs(
    "The updated campaign reward. Same shape as the items in the `growsurf_list_campaign_rewards` result.",
  ),
  growsurf_delete_campaign_reward: DELETE_REWARD_RESPONSE,
  growsurf_get_campaign_design: CAMPAIGN_DESIGN,
  growsurf_update_campaign_design: sameShapeAs(
    "The full updated design configuration. Same shape as the `growsurf_get_campaign_design` result.",
  ),
  growsurf_get_campaign_emails: CAMPAIGN_EMAILS,
  growsurf_update_campaign_emails: sameShapeAs(
    "The full updated email configuration. Same shape as the `growsurf_get_campaign_emails` result.",
  ),
  growsurf_get_campaign_options: CAMPAIGN_OPTIONS,
  growsurf_update_campaign_options: sameShapeAs(
    "The full updated options. Same shape as the `growsurf_get_campaign_options` result.",
  ),
  growsurf_get_campaign_installation: CAMPAIGN_INSTALLATION,
  growsurf_update_campaign_installation: sameShapeAs(
    "The full updated installation configuration. Same shape as the `growsurf_get_campaign_installation` result.",
  ),
  growsurf_create_account: CREATE_ACCOUNT_RESPONSE,
  growsurf_get_team: TEAM,
  growsurf_update_team: TEAM,
  growsurf_request_team_verification: TEAM,
  growsurf_resend_team_owner_verification_email: VERIFICATION_EMAIL_RESPONSE,
  growsurf_get_campaign_analytics: CAMPAIGN_ANALYTICS_RESPONSE,
  growsurf_list_campaign_webhooks: WEBHOOK_LIST_RESPONSE,
  growsurf_create_campaign_webhook: sameShapeAs(
    "The created webhook. Same shape as the items in the `growsurf_list_campaign_webhooks` result.",
  ),
  growsurf_update_campaign_webhook: sameShapeAs(
    "The updated webhook. Same shape as the items in the `growsurf_list_campaign_webhooks` result.",
  ),
  growsurf_delete_campaign_webhook: DELETE_WEBHOOK_RESPONSE,
  growsurf_test_campaign_webhook: WEBHOOK_TEST_RESPONSE,
  growsurf_list_participants: PARTICIPANT_LIST_RESPONSE,
  growsurf_get_participant: PARTICIPANT,
  growsurf_add_participant: sameShapeAs(
    "The created participant, or the existing participant when the email already exists (`isNew` is `false`). Same shape as the `growsurf_get_participant` result.",
  ),
  growsurf_update_participant: sameShapeAs(
    "The updated participant. Same shape as the `growsurf_get_participant` result.",
  ),
  growsurf_bulk_delete_participants: BULK_DELETE_PARTICIPANTS_RESPONSE,
  growsurf_email_participant: EMAIL_PARTICIPANT_RESPONSE,
  growsurf_get_participant_analytics: PARTICIPANT_ANALYTICS_RESPONSE,
  growsurf_get_participant_activity_logs: PARTICIPANT_ACTIVITY_LOGS_RESPONSE,
  growsurf_trigger_referral: REFERRAL_TRIGGER_RESPONSE,
  growsurf_cancel_delayed_referral: REFERRAL_TRIGGER_RESPONSE,
  growsurf_record_sale: RECORD_TRANSACTION_RESPONSE,
  growsurf_refund_transaction: REFUND_TRANSACTION_RESPONSE,
  growsurf_create_mobile_participant_token: MOBILE_PARTICIPANT_TOKEN_RESPONSE,
  growsurf_webhook_normalize: WEBHOOK_NORMALIZATION_RESULT,
  growsurf_get_integration_connect_link: INTEGRATION_CONNECT_LINK,
};
