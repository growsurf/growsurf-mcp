import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

export type GrowSurfClientOptions = {
  // Optional: the unauthenticated createAccount endpoint runs without a key, so the client can be
  // constructed keyless. All other methods require a key (enforced by the caller before use).
  apiKey?: string | undefined;
  campaignId?: string | undefined;
  baseUrl?: string; // defaults to https://api.growsurf.com/v2
  uploadAllowedOrigins?: string | undefined;
};

type GrowSurfRequestOptions = {
  auth?: boolean;
  idempotencyKey?: string;
  retryNetworkErrors?: boolean;
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
  isAffiliate?: boolean;
  referredBy?: string;
  referralStatus?: "CREDIT_PENDING" | "CREDIT_AWARDED";
  firstName?: string;
  lastName?: string;
  ipAddress?: string;
  fingerprint?: string;
  mobileInstanceId?: string;
  metadata?: Record<string, unknown>;
};

export type PrepareProgramResourceFileInput = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type PreparedProgramResourceFile = {
  uploadTicket: string;
  uploadResult: {
    public_id: string;
    version: number;
    signature: string;
    resource_type: "image" | "raw";
    type: "authenticated";
    bytes: number;
    secure_url: string;
  };
};

const DEFAULT_BASE_URL = "https://api.growsurf.com/v2";
const PROGRAM_RESOURCE_UPLOAD_RESPONSE_MAX_BYTES = 256 * 1024;

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
  private readonly uploadAllowedOrigins: string | undefined;

  constructor(options: GrowSurfClientOptions) {
    this.apiKey = options.apiKey ?? "";
    this.campaignId = options.campaignId ?? "";
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.mcpBaseUrl = toMcpBaseUrl(this.baseUrl);
    this.uploadAllowedOrigins = options.uploadAllowedOrigins;
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

  async listProgramResources(): Promise<unknown> {
    return this.requestJson("GET", `/campaign/${encodeURIComponent(this.campaignId)}/resources`);
  }

  /**
   * Requests a one-time upload ticket, uploads the supplied bytes only to the API-selected HTTPS
   * destination, and returns the minimal signed confirmation needed by create/update.
   */
  async prepareProgramResourceFile(input: PrepareProgramResourceFileInput): Promise<PreparedProgramResourceFile> {
    const allowedUploadOrigins = parseProgramResourceUploadAllowedOrigins(this.uploadAllowedOrigins);
    const ticketResponse = await this.requestJson(
      "POST",
      `/campaign/${encodeURIComponent(this.campaignId)}/resource-upload-tickets`,
      { fileName: input.fileName, mimeType: input.mimeType, bytes: input.bytes.byteLength },
    );
    const ticket = parseProgramResourceUploadTicket(ticketResponse);
    const uploadUrl = parseSecureProgramResourceUploadUrl(ticket.uploadUrl);
    if (!allowedUploadOrigins.has(uploadUrl.origin)) {
      throw programResourceUploadError("GrowSurf returned an invalid secure upload destination.");
    }

    const form = new FormData();
    for (const [name, value] of Object.entries(ticket.uploadParameters)) {
      if (name === "file") {
        throw programResourceUploadError("GrowSurf returned invalid secure upload parameters.");
      }
      if (!["string", "number", "boolean"].includes(typeof value)) {
        throw programResourceUploadError("GrowSurf returned invalid secure upload parameters.");
      }
      form.append(name, String(value));
    }
    form.append("file", new Blob([input.bytes], { type: input.mimeType }), input.fileName);

    let uploadResponse: Response;
    try {
      // Uploads are never retried. A network failure can have an ambiguous provider outcome, so a
      // replay could create a second asset. The caller must request a fresh preparation instead.
      uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: form,
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw programResourceUploadError(
        "The file upload could not be confirmed. Do not replay it; prepare the file again with a new ticket.",
      );
    }
    if (!uploadResponse.ok) {
      throw programResourceUploadError(
        "The file upload failed before confirmation. Prepare the file again with a new ticket.",
        uploadResponse.status,
      );
    }

    let uploadJson: unknown;
    try {
      uploadJson = await readBoundedProgramResourceUploadJson(uploadResponse);
    } catch {
      throw programResourceUploadError(
        "The file upload response could not be confirmed. Do not replay it; prepare the file again with a new ticket.",
      );
    }
    return {
      uploadTicket: ticket.ticket,
      uploadResult: parseProgramResourceUploadResult(uploadJson, input.bytes.byteLength),
    };
  }

  async createProgramResource(resource: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("POST", `/campaign/${encodeURIComponent(this.campaignId)}/resources`, resource);
  }

  async updateProgramResource(resourceId: string, fields: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(
      "PATCH",
      `/campaign/${encodeURIComponent(this.campaignId)}/resources/${encodeURIComponent(resourceId)}`,
      fields,
    );
  }

  async deleteProgramResource(resourceId: string): Promise<unknown> {
    return this.requestJson(
      "DELETE",
      `/campaign/${encodeURIComponent(this.campaignId)}/resources/${encodeURIComponent(resourceId)}`,
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

  // Account onboarding and Team operations are not campaign-scoped. See the GrowSurf REST API
  // reference for the full field-level schemas. Every method except createAccount authenticates.

  // createAccount is the ONLY unauthenticated endpoint. It creates a new account and returns a
  // one-time API key (locked with 403 EMAIL_NOT_VERIFIED_ERROR until the account's email is
  // verified; verification unlocks that same key, and it is replaced only on the owner's first
  // dashboard sign-in), so it is sent WITHOUT an Authorization header even when one is configured.
  async createAccount(body: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("POST", `/accounts`, body, { auth: false });
  }

  async getTeam(): Promise<unknown> {
    return this.requestJson("GET", `/team`);
  }

  async updateTeam(fields: { name: string }): Promise<unknown> {
    return this.requestJson("PATCH", `/team`, fields);
  }

  /**
   * Rotates the current API key. A caller can supply an idempotency key to recover the same
   * result across separate attempts; otherwise one stable key is generated for this invocation.
   */
  async rotateApiKey(options: { idempotencyKey?: string } = {}): Promise<unknown> {
    const idempotencyKey = options.idempotencyKey ?? `growsurf-mcp-rotation-${randomUUID()}`;
    return this.requestJson("POST", `/api-key/rotate`, undefined, {
      idempotencyKey,
      retryNetworkErrors: true,
    });
  }

  async requestTeamVerification(): Promise<unknown> {
    return this.requestJson("POST", `/team/verification-request`);
  }

  async resendTeamOwnerVerificationEmail(): Promise<unknown> {
    return this.requestJson("POST", `/team/owner/verification-email`);
  }

  // Campaign analytics. Pass `interval` (day|week|month) to also receive a per-period `series`
  // alongside the totals; pass `include` to add optional email, comparison, or participant
  // engagement data; scope the timeframe with `days` or an explicit startDate/endDate window.
  async getCampaignAnalytics(
    query: {
      interval?: string;
      include?: string;
      days?: number;
      startDate?: number;
      endDate?: number;
      timezone?: string;
      platform?: string;
    } = {},
  ): Promise<unknown> {
    return this.requestJson(
      "GET",
      `/campaign/${encodeURIComponent(this.campaignId)}/analytics${toQueryString(query)}`,
    );
  }

  // Activation cohorts group participants by the program-specific eligibility date and apply one
  // fixed observation window. Omitting both bounds requests the latest fully matured cohort.
  async getCampaignActivationAnalytics(
    query: {
      cohortFrom?: number;
      cohortTo?: number;
      cohortInterval?: string;
      observationWindowDays?: number;
      timezone?: string;
    } = {},
  ): Promise<unknown> {
    return this.requestJson(
      "GET",
      `/campaign/${encodeURIComponent(this.campaignId)}/analytics/activation${toQueryString(query)}`,
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

  // Pass `include=series` for per-period referral activity, `include=email` for email metrics, or
  // `include=activation` for covered first milestones. Combine activation and series for covered
  // portal-view and share-action buckets.
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

  // Payout-destination status across every provider enabled for the program (PayPal and/or Wise).
  async getPayoutDestinationById(participantId: string): Promise<unknown> {
    return this.requestJson("GET", this.participantPath(participantId, "/payout-destination"));
  }

  async getPayoutDestinationByEmail(participantEmail: string): Promise<unknown> {
    return this.requestJson("GET", this.participantPath(participantEmail, "/payout-destination"));
  }

  // Sends the participant a one-time link to confirm their payout destination for the chosen
  // provider. Only the participant can open the link and confirm; this just triggers the message.
  async requestPayoutDestinationConfirmationById(
    participantId: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    return this.requestJson(
      "POST",
      this.participantPath(participantId, "/payout-destination/request-confirmation"),
      body,
    );
  }

  async requestPayoutDestinationConfirmationByEmail(
    participantEmail: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    return this.requestJson(
      "POST",
      this.participantPath(participantEmail, "/payout-destination/request-confirmation"),
      body,
    );
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
    options?: GrowSurfRequestOptions,
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    return this.requestUrlJson(method, url, body, options);
  }

  private async requestMcpJson(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
    options?: GrowSurfRequestOptions,
  ): Promise<unknown> {
    const url = `${this.mcpBaseUrl}${path}`;
    return this.requestUrlJson(method, url, body, options);
  }

  private async requestUrlJson(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    url: string,
    body?: unknown,
    options?: GrowSurfRequestOptions,
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    // Attach the bearer token unless the endpoint is explicitly unauthenticated (createAccount).
    // Guarding on this.apiKey lets a keyless client hit /accounts without sending an empty token.
    if (options?.auth !== false && this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    if (options?.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
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
      let response: Response;
      try {
        response = await fetch(url, init);
      } catch (error) {
        // Rotation is idempotent only when every retry carries the same Idempotency-Key. Other
        // writes retain the conservative no-network-retry behavior because their outcome may be
        // ambiguous after a transport failure.
        if (options?.retryNetworkErrors && options.idempotencyKey && attempt < maxAttempts) {
          continue;
        }
        throw error;
      }
      if (response.ok) {
        try {
          return await response.json();
        } catch (error) {
          // A rotation may have committed even when its successful response body was interrupted.
          // Replaying with the same key recovers the original replacement instead of rotating again.
          if (options?.retryNetworkErrors && options.idempotencyKey && attempt < maxAttempts) {
            continue;
          }
          throw error;
        }
      }

      if ((response.status === 429 || response.status === 503) && attempt < maxAttempts) {
        // Release the discarded body before retrying; cleanup failures must not change retry behavior.
        try {
          const cancellation = response.body?.cancel();
          void cancellation?.catch(() => undefined);
        } catch {
          // Best-effort cleanup only.
        }
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

type ProgramResourceUploadTicket = {
  ticket: string;
  uploadUrl: string;
  uploadParameters: Record<string, string | number | boolean>;
};

const programResourceUploadError = (message: string, status?: number): GrowSurfRequestError => ({
  name: "ProgramResourceUploadError",
  code: "PROGRAM_RESOURCE_UPLOAD_ERROR",
  message,
  ...(status === undefined ? {} : { status }),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Parses a private, comma-separated list of canonical HTTPS origins and fails closed. */
const parseProgramResourceUploadAllowedOrigins = (value: string | undefined): Set<string> => {
  if (!value) {
    throw programResourceUploadError(
      "Program Resource file upload is disabled because no upload origin allowlist is configured.",
    );
  }

  const origins = new Set<string>();
  for (const rawOrigin of value.split(",")) {
    const origin = rawOrigin.trim();
    if (!origin || origin.includes("*")) {
      throw programResourceUploadError("Program Resource file upload origin configuration is invalid.");
    }
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw programResourceUploadError("Program Resource file upload origin configuration is invalid.");
    }
    if (
      parsed.protocol !== "https:" || parsed.username || parsed.password ||
      parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.origin !== origin
    ) {
      throw programResourceUploadError("Program Resource file upload origin configuration is invalid.");
    }
    origins.add(origin);
  }
  if (origins.size === 0) {
    throw programResourceUploadError("Program Resource file upload origin configuration is invalid.");
  }
  return origins;
};

/** Parses one API-selected upload URL without exposing it through validation errors. */
const parseSecureProgramResourceUploadUrl = (value: string): URL => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" && !parsed.username && !parsed.password) return parsed;
  } catch {
    // The public error below intentionally omits the API-selected URL.
  }
  throw programResourceUploadError("GrowSurf returned an invalid secure upload destination.");
};

/** Reads one upload confirmation as JSON without buffering more than 256 KiB. */
const readBoundedProgramResourceUploadJson = async (response: Response): Promise<unknown> => {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > PROGRAM_RESOURCE_UPLOAD_RESPONSE_MAX_BYTES) {
    try {
      await response.body?.cancel();
    } catch {
      // Best-effort body cleanup only.
    }
    throw programResourceUploadError("The file upload returned an oversized confirmation.");
  }

  const reader = response.body?.getReader();
  if (!reader) throw programResourceUploadError("The file upload returned an invalid confirmation.");
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > PROGRAM_RESOURCE_UPLOAD_RESPONSE_MAX_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // Best-effort body cleanup only.
        }
        throw programResourceUploadError("The file upload returned an oversized confirmation.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), totalBytes);
  return JSON.parse(bytes.toString("utf8")) as unknown;
};

const parseProgramResourceUploadTicket = (value: unknown): ProgramResourceUploadTicket => {
  if (!isRecord(value)) throw programResourceUploadError("GrowSurf returned an invalid upload ticket.");
  const { ticket, uploadUrl, uploadParameters } = value;
  if (
    typeof ticket !== "string" || ticket.length < 20 ||
    typeof uploadUrl !== "string" || !isRecord(uploadParameters)
  ) {
    throw programResourceUploadError("GrowSurf returned an invalid upload ticket.");
  }
  for (const [name, parameter] of Object.entries(uploadParameters)) {
    if (!name || !["string", "number", "boolean"].includes(typeof parameter)) {
      throw programResourceUploadError("GrowSurf returned an invalid upload ticket.");
    }
  }
  return {
    ticket,
    uploadUrl,
    uploadParameters: uploadParameters as Record<string, string | number | boolean>,
  };
};

const parseProgramResourceUploadResult = (
  value: unknown,
  expectedBytes: number,
): PreparedProgramResourceFile["uploadResult"] => {
  if (!isRecord(value)) throw programResourceUploadError("The file upload returned an invalid confirmation.");
  const result = value;
  const secureUrl = typeof result.secure_url === "string" ? result.secure_url : "";
  let isSecureUrl = false;
  try {
    const parsed = new URL(secureUrl);
    isSecureUrl = parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    isSecureUrl = false;
  }
  if (
    typeof result.public_id !== "string" || !result.public_id ||
    !Number.isInteger(result.version) || Number(result.version) < 1 ||
    typeof result.signature !== "string" || !result.signature ||
    !["image", "raw"].includes(String(result.resource_type)) ||
    result.type !== "authenticated" ||
    result.bytes !== expectedBytes ||
    !isSecureUrl
  ) {
    throw programResourceUploadError("The file upload returned an invalid confirmation.");
  }
  return {
    public_id: result.public_id,
    version: Number(result.version),
    signature: result.signature,
    resource_type: result.resource_type as "image" | "raw",
    type: "authenticated",
    bytes: expectedBytes,
    secure_url: secureUrl,
  };
};
