import { setTimeout as delay } from "node:timers/promises";

export type GrowSurfClientOptions = {
  apiKey: string;
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

const DEFAULT_BASE_URL = "https://api.growsurf.com/v2";

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "");

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

  constructor(options: GrowSurfClientOptions) {
    this.apiKey = options.apiKey;
    this.campaignId = options.campaignId;
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
  }

  getCampaignId(): string {
    return this.campaignId;
  }

  async getCampaign(): Promise<unknown> {
    return this.requestJson("GET", `/campaign/${encodeURIComponent(this.campaignId)}`);
  }

  async addParticipant(input: {
    email: string;
    referredBy?: string;
    referralStatus?: "CREDIT_PENDING" | "CREDIT_AWARDED" | "CREDIT_EXPIRED";
    firstName?: string;
    lastName?: string;
    ipAddress?: string;
    fingerprint?: string;
    metadata?: Record<string, unknown>;
  }): Promise<unknown> {
    return this.requestJson("POST", `/campaign/${encodeURIComponent(this.campaignId)}/participant`, input);
  }

  async triggerReferralByParticipantId(participantId: string): Promise<unknown> {
    return this.requestJson(
      "POST",
      `/campaign/${encodeURIComponent(this.campaignId)}/participant/${encodeURIComponent(participantId)}/ref`,
    );
  }

  async triggerReferralByParticipantEmail(participantEmail: string): Promise<unknown> {
    return this.requestJson(
      "POST",
      `/campaign/${encodeURIComponent(this.campaignId)}/participant/${encodeURIComponent(participantEmail)}/ref`,
    );
  }

  async getParticipantById(participantId: string): Promise<unknown> {
    return this.requestJson(
      "GET",
      `/campaign/${encodeURIComponent(this.campaignId)}/participant/${encodeURIComponent(participantId)}`,
    );
  }

  async recordSaleByParticipantId(participantId: string, sale: Record<string, unknown>): Promise<unknown> {
    return this.recordSale(`/participant/${encodeURIComponent(participantId)}`, sale);
  }

  async recordSaleByParticipantEmail(participantEmail: string, sale: Record<string, unknown>): Promise<unknown> {
    return this.recordSale(`/participant/${encodeURIComponent(participantEmail)}`, sale);
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

  private async requestJson(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };
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

