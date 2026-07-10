export const CREDENTIAL_TYPES = {
  MCP_OAUTH: "MCP_OAUTH",
  TEAM_API_KEY: "TEAM_API_KEY",
  LEGACY_API_KEY: "LEGACY_API_KEY",
} as const;

export type CredentialType = (typeof CREDENTIAL_TYPES)[keyof typeof CREDENTIAL_TYPES];

export const MACHINE_SCOPES = {
  ACCOUNT_READ: "account:read",
  ACCOUNT_WRITE: "account:write",
  API_KEY_ROTATE: "api_key:rotate",
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

export type ToolAuthorizationRequirement = {
  scopes: readonly MachineScope[];
  allowedCredentialTypes: readonly CredentialType[];
};

const ALL_CREDENTIAL_TYPES = Object.values(CREDENTIAL_TYPES);

// Creates an explicit manifest entry for tools that never call an authenticated REST endpoint.
const unrestricted = (): ToolAuthorizationRequirement => ({
  scopes: [],
  allowedCredentialTypes: ALL_CREDENTIAL_TYPES,
});

// Creates the common requirement for REST-backed tools that support every credential type.
const requiresScopes = (...scopes: MachineScope[]): ToolAuthorizationRequirement => ({
  scopes,
  allowedCredentialTypes: ALL_CREDENTIAL_TYPES,
});

// Every listed MCP tool is represented here so new tools fail the completeness test until their
// discoverability rules are deliberate. REST remains the authorization enforcement boundary.
export const TOOL_AUTHORIZATION_MANIFEST = {
  growsurf_integration_guide: unrestricted(),
  growsurf_agent_program_creation_eval: unrestricted(),
  growsurf_mobile_sdk_guide: unrestricted(),
  growsurf_api_library_snippets: unrestricted(),
  growsurf_get_campaign: requiresScopes(MACHINE_SCOPES.PROGRAM_READ),
  growsurf_list_campaigns: requiresScopes(MACHINE_SCOPES.PROGRAM_READ),
  growsurf_create_campaign: requiresScopes(MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_update_campaign: requiresScopes(MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_clone_campaign: requiresScopes(MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_list_campaign_rewards: requiresScopes(MACHINE_SCOPES.PROGRAM_READ),
  growsurf_create_campaign_reward: requiresScopes(MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_update_campaign_reward: requiresScopes(MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_delete_campaign_reward: requiresScopes(MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_get_campaign_design: requiresScopes(MACHINE_SCOPES.PROGRAM_READ),
  growsurf_update_campaign_design: requiresScopes(MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_get_campaign_emails: requiresScopes(MACHINE_SCOPES.PROGRAM_READ),
  growsurf_update_campaign_emails: requiresScopes(MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_get_campaign_options: requiresScopes(MACHINE_SCOPES.PROGRAM_READ),
  growsurf_update_campaign_options: requiresScopes(MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_get_campaign_installation: requiresScopes(MACHINE_SCOPES.PROGRAM_READ),
  growsurf_update_campaign_installation: requiresScopes(MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_capture_referral_flow_screenshots: requiresScopes(MACHINE_SCOPES.PROGRAM_READ),
  growsurf_create_account: unrestricted(),
  growsurf_get_account: requiresScopes(MACHINE_SCOPES.ACCOUNT_READ),
  growsurf_update_account: requiresScopes(MACHINE_SCOPES.ACCOUNT_WRITE),
  growsurf_rotate_api_key: {
    scopes: [MACHINE_SCOPES.API_KEY_ROTATE],
    allowedCredentialTypes: [CREDENTIAL_TYPES.TEAM_API_KEY, CREDENTIAL_TYPES.LEGACY_API_KEY],
  },
  growsurf_request_account_verification: requiresScopes(MACHINE_SCOPES.ACCOUNT_WRITE),
  growsurf_resend_verification_email: requiresScopes(MACHINE_SCOPES.ACCOUNT_WRITE),
  growsurf_get_campaign_analytics: requiresScopes(MACHINE_SCOPES.ANALYTICS_READ),
  growsurf_list_campaign_webhooks: requiresScopes(MACHINE_SCOPES.PROGRAM_READ),
  growsurf_create_campaign_webhook: requiresScopes(MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_update_campaign_webhook: requiresScopes(MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_delete_campaign_webhook: requiresScopes(MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_test_campaign_webhook: requiresScopes(MACHINE_SCOPES.PROGRAM_WRITE),
  growsurf_list_participants: requiresScopes(MACHINE_SCOPES.PARTICIPANT_READ),
  growsurf_get_participant: requiresScopes(MACHINE_SCOPES.PARTICIPANT_READ),
  growsurf_add_participant: requiresScopes(MACHINE_SCOPES.PARTICIPANT_WRITE),
  growsurf_update_participant: requiresScopes(MACHINE_SCOPES.PARTICIPANT_WRITE),
  growsurf_bulk_delete_participants: requiresScopes(MACHINE_SCOPES.PARTICIPANT_DELETE),
  growsurf_email_participant: requiresScopes(MACHINE_SCOPES.PARTICIPANT_WRITE),
  growsurf_get_participant_analytics: requiresScopes(MACHINE_SCOPES.ANALYTICS_READ),
  growsurf_get_participant_activity_logs: requiresScopes(MACHINE_SCOPES.PARTICIPANT_READ),
  growsurf_trigger_referral: requiresScopes(MACHINE_SCOPES.PARTICIPANT_WRITE),
  growsurf_cancel_delayed_referral: requiresScopes(MACHINE_SCOPES.PARTICIPANT_WRITE),
  growsurf_record_sale: requiresScopes(MACHINE_SCOPES.REWARD_WRITE),
  growsurf_refund_transaction: requiresScopes(MACHINE_SCOPES.REWARD_WRITE),
  growsurf_create_mobile_participant_token: requiresScopes(MACHINE_SCOPES.PARTICIPANT_WRITE),
  growsurf_participant_auth_hash: unrestricted(),
  growsurf_webhook_normalize: unrestricted(),
  growsurf_client_snippets: unrestricted(),
  growsurf_embeddable_element_snippet: unrestricted(),
  growsurf_grsf_config_snippet: unrestricted(),
  growsurf_get_integration_connect_link: unrestricted(),
} as const satisfies Record<string, ToolAuthorizationRequirement>;

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

// The hosted OAuth consent request stays synchronized with OAuth-compatible MCP tools. API-key-only
// operations, such as key rotation, cannot accidentally expand the hosted OAuth consent screen.
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
