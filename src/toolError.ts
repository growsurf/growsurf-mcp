import type { GrowSurfRequestError } from "./growsurf/client.js";

const INTERNAL_SOURCE_LOCATION_PATTERN =
  /(?:file:\/\/\/|[A-Za-z]:[\\/]|\/)(?:[^/\\\s()'"]+[\\/])*[^/\\\s()'"]+\.(?:[cm]?[jt]sx?|map):\d+(?::\d+)?/g;

// Removes source locations and stack frames before an error crosses the MCP trust boundary.
const sanitizeToolErrorString = (value: string): string =>
  value
    .split(/\r?\n/)
    .filter((line) => !/^\s*at(?:\s|$)/.test(line))
    .join("\n")
    .replace(INTERNAL_SOURCE_LOCATION_PATTERN, "[internal source location]");

// Keeps the documented validation fields while dropping arbitrary downstream diagnostic data.
const sanitizeValidationErrors = (value: unknown): Array<Record<string, string>> | undefined => {
  if (!Array.isArray(value)) return undefined;

  const sanitized = value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const detail = entry as Record<string, unknown>;
    const publicDetail: Record<string, string> = {};
    for (const key of ["field", "code", "message"] as const) {
      if (typeof detail[key] === "string") {
        publicDetail[key] = sanitizeToolErrorString(detail[key]);
      }
    }
    return Object.keys(publicDetail).length > 0 ? [publicDetail] : [];
  });

  return sanitized.length > 0 ? sanitized : undefined;
};

// Formats only the public API error contract; unknown diagnostic fields never reach MCP clients.
export const toToolErrorText = (err: unknown): string => {
  if (!err) return "Unknown error.";
  if (typeof err === "string") return sanitizeToolErrorString(err);
  if (err instanceof Error) return sanitizeToolErrorString(err.message);
  if (typeof err === "object") {
    const maybe = err as GrowSurfRequestError;
    const publicError: Record<string, unknown> = {};
    for (const key of ["name", "code", "message", "supportUrl", "policyName", "level", "timestamp"] as const) {
      if (typeof maybe[key] === "string") {
        publicError[key] = sanitizeToolErrorString(maybe[key]);
      }
    }
    if (typeof maybe.status === "number" && Number.isFinite(maybe.status)) {
      publicError.status = maybe.status;
    }
    const validationErrors = sanitizeValidationErrors(maybe.errors);
    if (validationErrors) publicError.errors = validationErrors;
    return Object.keys(publicError).length > 0 ? JSON.stringify(publicError, null, 2) : "Request failed.";
  }
  return sanitizeToolErrorString(String(err));
};
