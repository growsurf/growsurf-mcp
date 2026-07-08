import { GrowSurfClient } from "./client.js";

// The subset of the MCP server environment the campaign-scope resolver needs.
export type CampaignScopeEnv = {
  GROWSURF_API_KEY?: string | undefined;
  GROWSURF_CAMPAIGN_ID?: string | undefined;
};

// Resolves the effective program (campaign) id for a campaign-scoped tool call. An explicit
// `campaignId` tool argument wins; otherwise the boot-time GROWSURF_CAMPAIGN_ID is used. This is
// what lets an agent create a program and immediately configure or operate the returned id in the
// same session, without editing the environment and restarting the server. It also makes every
// campaign-scoped tool usable from a stateless, multi-tenant host that has no per-campaign env.
// Throws a clear, actionable error when the API key is missing, or when neither a `campaignId`
// argument nor GROWSURF_CAMPAIGN_ID is available.
export const resolveCampaignId = (
  env: CampaignScopeEnv,
  params?: { campaignId?: string | undefined },
): string => {
  if (!env.GROWSURF_API_KEY) {
    throw new Error("Missing GrowSurf REST credentials. Set GROWSURF_API_KEY to use API-calling tools.");
  }
  const campaignId = params?.campaignId ?? env.GROWSURF_CAMPAIGN_ID;
  if (!campaignId) {
    throw new Error(
      "No program (campaign) id. Pass campaignId to this tool (for example the id returned by growsurf_create_campaign), or set GROWSURF_CAMPAIGN_ID.",
    );
  }
  return campaignId;
};

// Builds a per-call GrowSurf REST client scoped to the resolved program id (see resolveCampaignId).
export const resolveCampaignClient = (
  env: CampaignScopeEnv,
  params?: { campaignId?: string | undefined },
): GrowSurfClient => {
  const campaignId = resolveCampaignId(env, params);
  return new GrowSurfClient({ apiKey: env.GROWSURF_API_KEY, campaignId });
};
