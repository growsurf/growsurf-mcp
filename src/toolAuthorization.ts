import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

export const CREDENTIAL_TYPES = {
  MCP_OAUTH: "MCP_OAUTH",
  TEAM_API_KEY: "TEAM_API_KEY",
  LEGACY_API_KEY: "LEGACY_API_KEY",
} as const;

export type CredentialType = (typeof CREDENTIAL_TYPES)[keyof typeof CREDENTIAL_TYPES];

export const MACHINE_SCOPES = {
  TEAM_READ: "team:read",
  TEAM_WRITE: "team:write",
  PROGRAM_READ: "program:read",
  PROGRAM_WRITE: "program:write",
  PARTICIPANT_READ: "participant:read",
  PARTICIPANT_WRITE: "participant:write",
  PARTICIPANT_DELETE: "participant:delete",
  REWARD_WRITE: "reward:write",
  ANALYTICS_READ: "analytics:read",
} as const;

export type MachineScope = (typeof MACHINE_SCOPES)[keyof typeof MACHINE_SCOPES];

export type VerifiedCredentialContext = {
  credentialType: CredentialType;
  scopes: readonly string[];
};

export type ResolveVerifiedCredentialContext = () =>
  | VerifiedCredentialContext
  | null
  | Promise<VerifiedCredentialContext | null>;

export const TOOL_RISK_TIERS = {
  READ: "READ",
  CONTENT: "CONTENT",
  DESTRUCTIVE: "DESTRUCTIVE",
  MONEY: "MONEY",
} as const;

export type ToolRiskTier = (typeof TOOL_RISK_TIERS)[keyof typeof TOOL_RISK_TIERS];

export const TOOL_RISK_META_KEY = "growsurf/riskTier";

type ToolSafetyAnnotations = Required<
  Pick<ToolAnnotations, "readOnlyHint" | "destructiveHint" | "idempotentHint" | "openWorldHint">
>;

type ToolBehavior = {
  riskTier: ToolRiskTier;
  annotations: ToolSafetyAnnotations;
};

export type ToolAuthorizationRequirement = ToolBehavior & {
  scopes: readonly MachineScope[];
  allowedCredentialTypes: readonly CredentialType[];
};

const ALL_CREDENTIAL_TYPES = Object.values(CREDENTIAL_TYPES);
const SINGLE_TEAM_CREDENTIAL_TYPES: readonly CredentialType[] = [
  CREDENTIAL_TYPES.MCP_OAUTH,
  CREDENTIAL_TYPES.TEAM_API_KEY,
];

// Standard MCP hints and hosted-agent risk tiers stay paired so every tool declares one reusable
// behavior profile instead of maintaining separate safety maps that can drift.
const TOOL_BEHAVIOR = {
  READ: {
    riskTier: TOOL_RISK_TIERS.READ,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  CONTENT_ADD: {
    riskTier: TOOL_RISK_TIERS.CONTENT,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  CONTENT_SET: {
    riskTier: TOOL_RISK_TIERS.CONTENT,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
  CONTENT_IDEMPOTENT: {
    riskTier: TOOL_RISK_TIERS.CONTENT,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  CONTENT_EXTERNAL: {
    riskTier: TOOL_RISK_TIERS.CONTENT,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  DESTRUCTIVE: {
    riskTier: TOOL_RISK_TIERS.DESTRUCTIVE,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
  MONEY_CREATE: {
    riskTier: TOOL_RISK_TIERS.MONEY,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  MONEY_IDEMPOTENT: {
    riskTier: TOOL_RISK_TIERS.MONEY,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  MONEY_EXTERNAL: {
    riskTier: TOOL_RISK_TIERS.MONEY,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  MONEY_SET: {
    riskTier: TOOL_RISK_TIERS.MONEY,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
} as const satisfies Record<string, ToolBehavior>;

// Creates an explicit manifest entry for tools that never call an authenticated REST endpoint.
const unrestricted = (behavior: ToolBehavior): ToolAuthorizationRequirement => ({
  ...behavior,
  scopes: [],
  allowedCredentialTypes: ALL_CREDENTIAL_TYPES,
});

// Creates the common requirement for REST-backed tools that support every credential type.
const requiresScopes = (behavior: ToolBehavior, ...scopes: MachineScope[]): ToolAuthorizationRequirement => ({
  ...behavior,
  scopes,
  allowedCredentialTypes: ALL_CREDENTIAL_TYPES,
});

// Team resources exist only for credentials bound to exactly one team. Legacy API keys retain
// their cross-membership compatibility behavior and therefore cannot identify one Team resource.
const requiresSingleTeamScopes = (
  behavior: ToolBehavior,
  ...scopes: MachineScope[]
): ToolAuthorizationRequirement => ({
  ...behavior,
  scopes,
  allowedCredentialTypes: SINGLE_TEAM_CREDENTIAL_TYPES,
});

// Every listed MCP tool is represented here so new tools fail the completeness test until their
// discoverability rules are deliberate. REST remains the authorization enforcement boundary.
export const TOOL_AUTHORIZATION_MANIFEST = {
  growsurf_integration_guide: unrestricted(TOOL_BEHAVIOR.READ),
  growsurf_agent_program_creation_eval: unrestricted(TOOL_BEHAVIOR.READ),
  growsurf_mobile_sdk_guide: unrestricted(TOOL_BEHAVIOR.READ),
  growsurf_api_library_snippets: unrestricted(TOOL_BEHAVIOR.READ),
  growsurf_get_campaign: requiresScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.PROGRAM_READ),
  growsurf_list_campaigns: requiresScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.PROGRAM_READ),
  growsurf_create_campaign: requiresScopes(TOOL_BEHAVIOR.CONTENT_ADD, MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_update_campaign: requiresScopes(TOOL_BEHAVIOR.CONTENT_SET, MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_clone_campaign: requiresScopes(TOOL_BEHAVIOR.CONTENT_ADD, MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_list_campaign_rewards: requiresScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.PROGRAM_READ),
  growsurf_create_campaign_reward: requiresScopes(TOOL_BEHAVIOR.MONEY_CREATE, MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_update_campaign_reward: requiresScopes(TOOL_BEHAVIOR.MONEY_SET, MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_delete_campaign_reward: requiresScopes(TOOL_BEHAVIOR.MONEY_SET, MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_get_campaign_design: requiresScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.PROGRAM_READ),
  growsurf_update_campaign_design: requiresScopes(TOOL_BEHAVIOR.CONTENT_SET, MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_get_campaign_emails: requiresScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.PROGRAM_READ),
  growsurf_update_campaign_emails: requiresScopes(TOOL_BEHAVIOR.CONTENT_SET, MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_get_campaign_options: requiresScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.PROGRAM_READ),
  growsurf_update_campaign_options: requiresScopes(TOOL_BEHAVIOR.CONTENT_SET, MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_get_campaign_installation: requiresScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.PROGRAM_READ),
  growsurf_update_campaign_installation: requiresScopes(TOOL_BEHAVIOR.CONTENT_SET, MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_capture_referral_flow_screenshots: requiresScopes(TOOL_BEHAVIOR.CONTENT_ADD, MACHINE_SCOPES.PROGRAM_READ),
  growsurf_create_account: unrestricted(TOOL_BEHAVIOR.CONTENT_EXTERNAL),
  growsurf_get_team: requiresSingleTeamScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.TEAM_READ),
  growsurf_update_team: requiresSingleTeamScopes(TOOL_BEHAVIOR.CONTENT_SET, MACHINE_SCOPES.TEAM_WRITE),
  growsurf_request_team_verification: requiresSingleTeamScopes(
    TOOL_BEHAVIOR.CONTENT_IDEMPOTENT,
    MACHINE_SCOPES.TEAM_WRITE,
  ),
  growsurf_resend_team_owner_verification_email: requiresSingleTeamScopes(
    TOOL_BEHAVIOR.CONTENT_EXTERNAL,
    MACHINE_SCOPES.TEAM_WRITE,
  ),
  growsurf_get_campaign_analytics: requiresScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.ANALYTICS_READ),
  growsurf_list_campaign_webhooks: requiresScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.PROGRAM_READ),
  growsurf_create_campaign_webhook: requiresScopes(TOOL_BEHAVIOR.CONTENT_ADD, MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_update_campaign_webhook: requiresScopes(TOOL_BEHAVIOR.CONTENT_SET, MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_delete_campaign_webhook: requiresScopes(TOOL_BEHAVIOR.DESTRUCTIVE, MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_test_campaign_webhook: requiresScopes(TOOL_BEHAVIOR.CONTENT_EXTERNAL, MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_list_participants: requiresScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.PARTICIPANT_READ),
  growsurf_get_participant: requiresScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.PARTICIPANT_READ),
  growsurf_add_participant: requiresScopes(TOOL_BEHAVIOR.CONTENT_ADD, MACHINE_SCOPES.PARTICIPANT_WRITE),
  growsurf_update_participant: requiresScopes(TOOL_BEHAVIOR.CONTENT_SET, MACHINE_SCOPES.PARTICIPANT_WRITE),
  growsurf_bulk_delete_participants: requiresScopes(TOOL_BEHAVIOR.DESTRUCTIVE, MACHINE_SCOPES.PARTICIPANT_DELETE),
  growsurf_email_participant: requiresScopes(TOOL_BEHAVIOR.CONTENT_EXTERNAL, MACHINE_SCOPES.PARTICIPANT_WRITE),
  growsurf_get_participant_analytics: requiresScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.ANALYTICS_READ),
  growsurf_get_participant_activity_logs: requiresScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.PARTICIPANT_READ),
  growsurf_trigger_referral: requiresScopes(TOOL_BEHAVIOR.MONEY_EXTERNAL, MACHINE_SCOPES.PARTICIPANT_WRITE),
  growsurf_cancel_delayed_referral: requiresScopes(TOOL_BEHAVIOR.DESTRUCTIVE, MACHINE_SCOPES.PARTICIPANT_WRITE),
  growsurf_get_participant_payout_destination: requiresScopes(TOOL_BEHAVIOR.READ, MACHINE_SCOPES.PARTICIPANT_READ),
  growsurf_request_participant_payout_destination_confirmation: requiresScopes(
    TOOL_BEHAVIOR.CONTENT_EXTERNAL,
    MACHINE_SCOPES.PARTICIPANT_WRITE,
  ),
  growsurf_record_sale: requiresScopes(TOOL_BEHAVIOR.MONEY_IDEMPOTENT, MACHINE_SCOPES.REWARD_WRITE),
  growsurf_refund_transaction: requiresScopes(TOOL_BEHAVIOR.MONEY_SET, MACHINE_SCOPES.REWARD_WRITE),
  growsurf_create_mobile_participant_token: requiresScopes(TOOL_BEHAVIOR.CONTENT_ADD, MACHINE_SCOPES.PARTICIPANT_WRITE),
  growsurf_participant_auth_hash: unrestricted(TOOL_BEHAVIOR.READ),
  growsurf_webhook_normalize: unrestricted(TOOL_BEHAVIOR.READ),
  growsurf_client_snippets: unrestricted(TOOL_BEHAVIOR.READ),
  growsurf_embeddable_element_snippet: unrestricted(TOOL_BEHAVIOR.READ),
  growsurf_grsf_config_snippet: unrestricted(TOOL_BEHAVIOR.READ),
  growsurf_get_integration_connect_link: unrestricted(TOOL_BEHAVIOR.READ),
} as const satisfies Record<string, ToolAuthorizationRequirement>;

// Adds the manifest-owned standard MCP annotations to one listed tool. Throwing preserves the
// completeness guarantee if a future tool bypasses the manifest.
export const withToolAuthorizationMetadata = <T extends { name: string; _meta?: Record<string, unknown> }>(
  tool: T,
): T & { annotations: ToolSafetyAnnotations; _meta: Record<string, unknown> } => {
  const requirement = TOOL_AUTHORIZATION_MANIFEST[tool.name as keyof typeof TOOL_AUTHORIZATION_MANIFEST];
  if (!requirement) throw new Error(`Missing authorization metadata for MCP tool: ${tool.name}`);
  return {
    ...tool,
    annotations: requirement.annotations,
    _meta: { ...(tool._meta ?? {}), [TOOL_RISK_META_KEY]: requirement.riskTier },
  };
};

const MACHINE_SCOPE_ORDER = Object.values(MACHINE_SCOPES);
const hostedMcpScopeSet = new Set<MachineScope>();

// Normalizes the manifest's intentionally narrow credential arrays for membership checks.
const allowsCredentialType = (
  requirement: ToolAuthorizationRequirement,
  credentialType: CredentialType,
): boolean => requirement.allowedCredentialTypes.includes(credentialType);

for (const requirement of Object.values(TOOL_AUTHORIZATION_MANIFEST)) {
  if (!allowsCredentialType(requirement, CREDENTIAL_TYPES.MCP_OAUTH)) continue;
  for (const scope of requirement.scopes) hostedMcpScopeSet.add(scope);
}

// The hosted OAuth consent request stays synchronized with OAuth-compatible MCP tools. Scopes with
// no MCP tool cannot accidentally expand the hosted OAuth consent screen.
export const HOSTED_MCP_REQUESTED_SCOPES: readonly MachineScope[] = MACHINE_SCOPE_ORDER.filter((scope) =>
  hostedMcpScopeSet.has(scope),
);

// Filters tool discovery only. Unknown tools fail closed when credential-aware filtering is active;
// REST still decides whether any tools/call request is authorized.
export const filterToolsForCredential = <T extends { name: string }>(
  tools: readonly T[],
  context: VerifiedCredentialContext | null,
): T[] => {
  const grantedScopes = new Set(context?.scopes ?? []);

  return tools.filter((tool) => {
    const requirement = TOOL_AUTHORIZATION_MANIFEST[tool.name as keyof typeof TOOL_AUTHORIZATION_MANIFEST];
    if (!requirement) return false;
    if (requirement.scopes.length === 0) return true;
    if (!context || !allowsCredentialType(requirement, context.credentialType)) return false;
    return requirement.scopes.every((scope) => grantedScopes.has(scope));
  });
};
