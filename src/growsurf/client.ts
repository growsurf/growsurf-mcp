import { setTimeout as delay } from "node:timers/promises";

export type GrowSurfClientOptions = {
  // Optional: the unauthenticated createAccount endpoint runs without a key, so the client can be
  // constructed keyless. All other methods require a key (enforced by the caller before use).
  apiKey?: string | undefined;
  campaignId: string;
  baseUrl?: string; // defaults to https://api.growsurf.com/v2
};

export type GrowSurfRequestError = {
  name?: string;
  code?: string;
  message?: string;
  status?: number;
  supportUrl?: string;
  errors?: unknown;
  [key: string]: unknown;
};

export type GrowSurfParticipantInput = {
  email: string;
  referredBy?: string;
  referralStatus?: "CREDIT_PENDING" | "CREDIT_AWARDED";
  firstName?: string;
  lastName?: string;
  ipAddress?: string;
  fingerprint?: string;
  mobileInstanceId?: string;
  metadata?: Record<string, unknown>;
};

const DEFAULT_BASE_URL = "https://api.growsurf.com/v2";

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "");

const toMcpBaseUrl = (baseUrl: string): string => {
  const normalized = normalizeBaseUrl(baseUrl);
  if (normalized.endsWith("/api/v2")) return `${normalized}/mcp`;
  if (normalized.endsWith("/v2")) return `${normalized.slice(0, -"/v2".length)}/api/v2/mcp`;
  return `${normalized}/api/v2/mcp`;
};

// Builds a `?a=1&b=2` query suffix from a params object, skipping undefined values.
// Returns "" when no params are present so callers can append it unconditionally.
const toQueryString = (params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

const toError = async (response: Response): Promise<GrowSurfRequestError> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {
      name: "HttpError",
      status: response.status,
      code: "HTTP_ERROR",
      message: `GrowSurf API error (non-JSON): HTTP ${response.status}`,
    };
  }

  try {
    const json = (await response.json()) as unknown;
    if (json && typeof json === "object") {
      return { status: response.status, ...(json as Record<string, unknown>) };
    }
    return {
      name: "HttpError",
      status: response.status,
      code: "HTTP_ERROR",
      message: `GrowSurf API error: HTTP ${response.status}`,
      body: json,
    };
  } catch {
    return {
      name: "HttpError",
      status: response.status,
      code: "HTTP_ERROR",
      message: `GrowSurf API error (invalid JSON): HTTP ${response.status}`,
    };
  }
};

/**
 * GrowSurf REST client with conservative retries for 429/503.
 */
export class GrowSurfClient {
  private readonly apiKey: string;
  private readonly campaignId: string;
  private readonly baseUrl: string;
  private readonly mcpBaseUrl: string;

  constructor(options: GrowSurfClientOptions) {
    this.apiKey = options.apiKey ?? "";
    this.campaignId = options.campaignId;
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.mcpBaseUrl = toMcpBaseUrl(this.baseUrl);
  }

  getCampaignId(): string {
    return this.campaignId;
  }

  async getCampaign(): Promise<unknown> {
    return this.requestJson("GET", `/campaign/${encodeURIComponent(this.campaignId)}`);
  }

  async listParticipants(query: { limit?: number; nextId?: string } = {}): Promise<unknown> {
    return this.requestJson(
      "GET",
      `/campaign/${encodeURIComponent(this.campaignId)}/participants${toQueryString(query)}`,
    );
  }

  async addParticipant(input: GrowSurfParticipantInput): Promise<unknown> {
    return this.requestJson("POST", `/campaign/${encodeURIComponent(this.campaignId)}/participant`, input);
  }

  async triggerReferralByParticipantId(participantId: string, delayInDays?: number): Promise<unknown> {
    return this.requestJson(
      "POST",
      `/campaign/${encodeURIComponent(this.campaignId)}/participant/${encodeURIComponent(participantId)}/ref`,
      delayInDays === undefined ? undefined : { delayInDays },
    );
  }

  async triggerReferralByParticipantEmail(participantEmail: string, delayInDays?: number): Promise<unknown> {
    return this.requestJson(
      "POST",
      `/campaign/${encodeURIComponent(this.campaignId)}/participant/${encodeURIComponent(participantEmail)}/ref`,
      delayInDays === undefined ? undefined : { delayInDays },
    );
  }

  async cancelDelayedReferralByParticipantId(participantId: string): Promise<unknown> {
    return this.requestJson(
      "DELETE",
      `/campaign/${encodeURIComponent(this.campaignId)}/participant/${encodeURIComponent(participantId)}/ref`,
    );
  }

  async cancelDelayedReferralByParticipantEmail(participantEmail: string): Promise<unknown> {
    return this.requestJson(
      "DELETE",
      `/campaign/${encodeURIComponent(this.campaignId)}/participant/${encodeURIComponent(participantEmail)}/ref`,
    );
  }

  async getParticipantById(participantId: string): Promise<unknown> {
    return this.requestJson(
      "GET",
      `/campaign/${encodeURIComponent(this.campaignId)}/participant/${encodeURIComponent(participantId)}`,
    );
  }

  async getParticipantByEmail(participantEmail: string): Promise<unknown> {
    return this.requestJson(
      "GET",
      `/campaign/${encodeURIComponent(this.campaignId)}/participant/${encodeURIComponent(participantEmail)}`,
    );
  }

  async createMobileParticipantToken(input: GrowSurfParticipantInput): Promise<unknown> {
    return this.requestJson(
      "POST",
      `/campaign/${encodeURIComponent(this.campaignId)}/mobile-participant-token`,
      input,
    );
  }

  async recordSaleByParticipantId(participantId: string, sale: Record<string, unknown>): Promise<unknown> {
    return this.recordSale(`/participant/${encodeURIComponent(participantId)}`, sale);
  }

  async recordSaleByParticipantEmail(participantEmail: string, sale: Record<string, unknown>): Promise<unknown> {
    return this.recordSale(`/participant/${encodeURIComponent(participantEmail)}`, sale);
  }

  async refundTransactionByParticipantId(participantId: string, amendment: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(
      "POST",
      `/campaign/${encodeURIComponent(this.campaignId)}/participant/${encodeURIComponent(participantId)}/transaction/refund`,
      amendment,
    );
  }

  async refundTransactionByParticipantEmail(participantEmail: string, amendment: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(
      "POST",
      `/campaign/${encodeURIComponent(this.campaignId)}/participant/${encodeURIComponent(participantEmail)}/transaction/refund`,
      amendment,
    );
  }

  async createCampaign(body: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("POST", `/campaigns`, body);
  }

  async listCampaigns(): Promise<unknown> {
    return this.requestJson("GET", `/campaigns`);
  }

  async updateCampaign(fields: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("PATCH", `/campaign/${encodeURIComponent(this.campaignId)}`, fields);
  }

  async cloneCampaign(): Promise<unknown> {
    return this.requestJson("POST", `/campaign/${encodeURIComponent(this.campaignId)}/clone`);
  }

  async listCampaignRewards(): Promise<unknown> {
    return this.requestJson("GET", `/campaign/${encodeURIComponent(this.campaignId)}/reward-configs`);
  }

  async createCampaignReward(reward: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("POST", `/campaign/${encodeURIComponent(this.campaignId)}/reward-configs`, reward);
  }

  async updateCampaignReward(campaignRewardId: string, fields: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(
      "PATCH",
      `/campaign/${encodeURIComponent(this.campaignId)}/reward-configs/${encodeURIComponent(campaignRewardId)}`,
      fields,
    );
  }

  async deleteCampaignReward(campaignRewardId: string): Promise<unknown> {
    return this.requestJson(
      "DELETE",
      `/campaign/${encodeURIComponent(this.campaignId)}/reward-configs/${encodeURIComponent(campaignRewardId)}`,
    );
  }

  // Campaign config sub-resources — one GET/PATCH pair per dashboard Program Editor tab
  // (design, emails, options, installation). Bodies/responses are large nested objects.
  // PATCH changes only the fields you send; anything left out is untouched (arrays such as
  // signup.fields replace wholesale). To see the full object with every field and its current
  // value, GET the resource, then PATCH back only the fields you want to change.

  async getCampaignDesign(): Promise<unknown> {
    return this.requestJson("GET", `/campaign/${encodeURIComponent(this.campaignId)}/design`);
  }

  async updateCampaignDesign(fields: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("PATCH", `/campaign/${encodeURIComponent(this.campaignId)}/design`, fields);
  }

  async getCampaignEmails(): Promise<unknown> {
    return this.requestJson("GET", `/campaign/${encodeURIComponent(this.campaignId)}/emails`);
  }

  async updateCampaignEmails(fields: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("PATCH", `/campaign/${encodeURIComponent(this.campaignId)}/emails`, fields);
  }

  async getCampaignOptions(): Promise<unknown> {
    return this.requestJson("GET", `/campaign/${encodeURIComponent(this.campaignId)}/options`);
  }

  async updateCampaignOptions(fields: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("PATCH", `/campaign/${encodeURIComponent(this.campaignId)}/options`, fields);
  }

  async getCampaignInstallation(): Promise<unknown> {
    return this.requestJson("GET", `/campaign/${encodeURIComponent(this.campaignId)}/installation`);
  }

  async updateCampaignInstallation(fields: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("PATCH", `/campaign/${encodeURIComponent(this.campaignId)}/installation`, fields);
  }

  async captureReferralFlowScreenshots(): Promise<unknown> {
    return this.requestMcpJson(
      "POST",
      `/campaign/${encodeURIComponent(this.campaignId)}/referral-flow-screenshots`,
    );
  }

  // Account (account-level, not campaign-scoped). See the GrowSurf REST API reference for the
  // full field-level schemas. Every method except createAccount authenticates with the API key.

  // createAccount is the ONLY unauthenticated endpoint. It creates a new account and returns a
  // one-time API key (locked with 403 EMAIL_NOT_VERIFIED_ERROR until the account's email is
  // verified, and rotated on the owner's first dashboard sign-in), so it is sent WITHOUT an
  // Authorization header even when one is configured.
  async createAccount(body: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("POST", `/accounts`, body, { auth: false });
  }

  async getAccount(): Promise<unknown> {
    return this.requestJson("GET", `/account`);
  }

  async updateAccount(fields: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("PATCH", `/account`, fields);
  }

  async rotateApiKey(): Promise<unknown> {
    return this.requestJson("POST", `/account/api-key`);
  }

  async requestAccountVerification(): Promise<unknown> {
    return this.requestJson("POST", `/account/verification-request`);
  }

  async resendVerificationEmail(): Promise<unknown> {
    return this.requestJson("POST", `/account/verification-email`);
  }

  // Campaign analytics. Pass `interval` (day|week|month) to also receive a per-period `series`
  // alongside the totals; pass `include` (comma-separated: previousPeriod, statusCounts, rates) to
  // enrich the response; scope the timeframe with `days` or an explicit startDate/endDate window.
  async getCampaignAnalytics(
    query: { interval?: string; include?: string; days?: number; startDate?: number; endDate?: number } = {},
  ): Promise<unknown> {
    return this.requestJson(
      "GET",
      `/campaign/${encodeURIComponent(this.campaignId)}/analytics${toQueryString(query)}`,
    );
  }

  // Campaign webhooks — mirrors the campaign-reward CRUD shape. Secrets are write-only and never
  // returned; the webhook id is `primary` for the program's primary webhook.
  async listWebhooks(): Promise<unknown> {
    return this.requestJson("GET", `/campaign/${encodeURIComponent(this.campaignId)}/webhooks`);
  }

  async createWebhook(webhook: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("POST", `/campaign/${encodeURIComponent(this.campaignId)}/webhooks`, webhook);
  }

  async updateWebhook(webhookId: string, fields: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(
      "PATCH",
      `/campaign/${encodeURIComponent(this.campaignId)}/webhooks/${encodeURIComponent(webhookId)}`,
      fields,
    );
  }

  async deleteWebhook(webhookId: string): Promise<unknown> {
    return this.requestJson(
      "DELETE",
      `/campaign/${encodeURIComponent(this.campaignId)}/webhooks/${encodeURIComponent(webhookId)}`,
    );
  }

  async testWebhook(webhookId: string, body?: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(
      "POST",
      `/campaign/${encodeURIComponent(this.campaignId)}/webhooks/${encodeURIComponent(webhookId)}/test`,
      body,
    );
  }

  // Participant sub-resources (email / analytics / activity-logs / update). Each is exposed as an
  // ById / ByEmail pair mirroring the existing trigger/record participant methods; both resolve to
  // the same `participantIdOrEmail` path parameter.
  private participantPath(participantIdOrEmail: string, suffix = ""): string {
    return `/campaign/${encodeURIComponent(this.campaignId)}/participant/${encodeURIComponent(participantIdOrEmail)}${suffix}`;
  }

  async emailParticipantById(participantId: string, body: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("POST", this.participantPath(participantId, "/email"), body);
  }

  async emailParticipantByEmail(participantEmail: string, body: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("POST", this.participantPath(participantEmail, "/email"), body);
  }

  // Pass `include=series` to also receive a per-period `series` of this participant's own activity;
  // bucket it with `interval` (day|week|month) and scope it with `days` or a startDate/endDate window.
  async getParticipantAnalyticsById(
    participantId: string,
    query: { include?: string; interval?: string; days?: number; startDate?: number; endDate?: number } = {},
  ): Promise<unknown> {
    return this.requestJson("GET", this.participantPath(participantId, `/analytics${toQueryString(query)}`));
  }

  async getParticipantAnalyticsByEmail(
    participantEmail: string,
    query: { include?: string; interval?: string; days?: number; startDate?: number; endDate?: number } = {},
  ): Promise<unknown> {
    return this.requestJson("GET", this.participantPath(participantEmail, `/analytics${toQueryString(query)}`));
  }

  async listParticipantActivityLogsById(
    participantId: string,
    query: { limit?: number; offset?: number } = {},
  ): Promise<unknown> {
    return this.requestJson("GET", this.participantPath(participantId, `/activity-logs${toQueryString(query)}`));
  }

  async listParticipantActivityLogsByEmail(
    participantEmail: string,
    query: { limit?: number; offset?: number } = {},
  ): Promise<unknown> {
    return this.requestJson("GET", this.participantPath(participantEmail, `/activity-logs${toQueryString(query)}`));
  }

  async updateParticipantById(participantId: string, fields: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("POST", this.participantPath(participantId), fields);
  }

  async updateParticipantByEmail(participantEmail: string, fields: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("POST", this.participantPath(participantEmail), fields);
  }

  // Bulk-deletes up to 200 participants in one request. Each entry is a GrowSurf participant ID or
  // an email address (mixed lists allowed). Deletion is permanent; the response reports a per-row
  // status (DELETED/NOT_FOUND/DUPLICATE/ERROR) plus a summary, so a 200 can include failed rows.
  async bulkDeleteParticipants(participants: string[]): Promise<unknown> {
    return this.requestJson(
      "POST",
      `/campaign/${encodeURIComponent(this.campaignId)}/participants/bulk-delete`,
      { participants },
    );
  }

  private async recordSale(participantPath: string, sale: Record<string, unknown>): Promise<unknown> {
    // Docs show ".../transaction" while some examples use ".../sales".
    // Prefer the documented endpoint and fall back to the legacy path if needed.
    const base = `/campaign/${encodeURIComponent(this.campaignId)}${participantPath}`;
    try {
      return await this.requestJson("POST", `${base}/transaction`, sale);
    } catch (err) {
      const maybe = err as GrowSurfRequestError;
      if (maybe && typeof maybe === "object" && (maybe.status === 404 || maybe.status === 405)) {
        return await this.requestJson("POST", `${base}/sales`, sale);
      }
      throw err;
    }
  }

  private async requestJson(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
    options?: { auth?: boolean },
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    return this.requestUrlJson(method, url, body, options);
  }

  private async requestMcpJson(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
    options?: { auth?: boolean },
  ): Promise<unknown> {
    const url = `${this.mcpBaseUrl}${path}`;
    return this.requestUrlJson(method, url, body, options);
  }

  private async requestUrlJson(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    url: string,
    body?: unknown,
    options?: { auth?: boolean },
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    // Attach the bearer token unless the endpoint is explicitly unauthenticated (createAccount).
    // Guarding on this.apiKey lets a keyless client hit /accounts without sending an empty token.
    if (options?.auth !== false && this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    const init: RequestInit = { method, headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    // Conservative retries: GrowSurf rate-limits (429) and may return 503.
    // Keep retries low to avoid worsening rate limits.
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await fetch(url, init);
      if (response.ok) return response.json();

      if ((response.status === 429 || response.status === 503) && attempt < maxAttempts) {
        const retryAfterMs =
          Number(response.headers.get("GrowSurf-Retry-After-Second-Milliseconds")) ||
          Number(response.headers.get("GrowSurf-Retry-After-Minute-Milliseconds")) ||
          Number(response.headers.get("Retry-After")) * 1000 ||
          250 * attempt;
        await delay(Math.min(Math.max(retryAfterMs, 250), 5000));
        continue;
      }

      throw await toError(response);
    }

    throw { name: "HttpError", code: "HTTP_ERROR", message: "Unreachable" } satisfies GrowSurfRequestError;
  }
}
