import { Validator, type OutputUnit, type Schema } from "@cfworker/json-schema";

import {
  createToolInputValidationError,
  type ToolInputValidationDetail,
} from "./toolError.js";

type ToolInputSchema = Schema & {
  additionalProperties?: unknown;
  properties?: Record<string, unknown>;
};

export type ToolInputGuard = (argumentsValue: unknown) => void;

// The validator interprets each schema instead of compiling it into a function. Edge runtimes such
// as Cloudflare Workers refuse dynamic code generation, so a compiling validator would throw on the
// first tool call there while `tools/list` kept working.
const JSON_SCHEMA_DRAFT = "2020-12";

// Keywords that only restate a failure reported more precisely by one of their children.
const AGGREGATE_KEYWORDS = new Set(["properties", "patternProperties", "items", "prefixItems", "allOf", "if", "then", "else", "$ref", "false"]);

// Converts one JSON Pointer into the dotted field names used by GrowSurf validation errors.
const decodePointerPath = (pointer: string): string =>
  pointer
    .replace(/^#\/?/, "")
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"))
    .join(".");

// Walks a JSON Pointer into the schema so a message can quote the constraint that rejected the
// value. `keywordLocation` ends with the failing keyword, so the parent holds the whole subschema.
const resolvePointer = (root: unknown, pointer: string): unknown => {
  let node: unknown = root;
  for (const rawSegment of pointer.replace(/^#\/?/, "").split("/")) {
    if (!rawSegment) continue;
    if (!node || typeof node !== "object") return undefined;
    const segment = rawSegment.replace(/~1/g, "/").replace(/~0/g, "~");
    node = (node as Record<string, unknown>)[segment];
  }
  return node;
};

const owningSubschema = (root: unknown, keywordLocation: string): Record<string, unknown> => {
  const parent = resolvePointer(root, keywordLocation.replace(/\/[^/]*$/, ""));
  return parent && typeof parent === "object" && !Array.isArray(parent)
    ? (parent as Record<string, unknown>)
    : {};
};

const quotedName = (errorText: string): string | undefined =>
  errorText.match(/"([^"]+)"/)?.[1];

// Collects the property names a `not` subschema forbids, so a rejected combination can name the
// field to drop instead of reporting that the input "must NOT be valid".
const forbiddenProperties = (notSubschema: unknown): string[] => {
  if (!notSubschema || typeof notSubschema !== "object" || Array.isArray(notSubschema)) return [];
  const node = notSubschema as { required?: unknown; anyOf?: unknown };
  const fromRequired = Array.isArray(node.required) ? node.required.filter((n): n is string => typeof n === "string") : [];
  const fromAnyOf = Array.isArray(node.anyOf) ? node.anyOf.flatMap((branch) => forbiddenProperties(branch)) : [];
  return [...new Set([...fromRequired, ...fromAnyOf])];
};

// Uses declared numeric bounds when both are available, so either rejected edge reports the full
// valid range instead of only the limit that one value crossed.
const numericRangeMessage = (subschema: Record<string, unknown>): string | undefined => {
  const { minimum, maximum } = subschema;
  return typeof minimum === "number" && typeof maximum === "number"
    ? `Must be between ${minimum} and ${maximum}.`
    : undefined;
};

const messageForKeyword = (unit: OutputUnit, subschema: Record<string, unknown>): string => {
  const value = subschema[unit.keyword];
  switch (unit.keyword) {
    case "required":
      return `Must have required property '${quotedName(unit.error) ?? "(unknown)"}'`;
    case "type":
      return `Must be ${Array.isArray(value) ? value.join(" or ") : String(value)}`;
    case "enum":
      return "Must be equal to one of the allowed values";
    case "const":
      return `Must be equal to ${JSON.stringify(value)}`;
    case "pattern":
      return `Must match pattern "${String(value)}"`;
    case "minLength":
      return `Must NOT have fewer than ${String(value)} characters`;
    case "maxLength":
      return `Must NOT have more than ${String(value)} characters`;
    case "minimum":
      return numericRangeMessage(subschema) ?? `Must be >= ${String(value)}`;
    case "maximum":
      return numericRangeMessage(subschema) ?? `Must be <= ${String(value)}`;
    case "exclusiveMinimum":
      return `Must be > ${String(value)}`;
    case "exclusiveMaximum":
      return `Must be < ${String(value)}`;
    case "multipleOf":
      return `Must be a multiple of ${String(value)}`;
    case "minItems":
      return `Must NOT have fewer than ${String(value)} items`;
    case "maxItems":
      return `Must NOT have more than ${String(value)} items`;
    case "uniqueItems":
      return "Must NOT have duplicate items";
    case "minProperties":
      return `Must NOT have fewer than ${String(value)} properties`;
    case "maxProperties":
      return `Must NOT have more than ${String(value)} properties`;
    case "anyOf":
      return "Must match a schema in anyOf";
    case "oneOf":
      return "Must match exactly one schema in oneOf";
    case "not": {
      const forbidden = forbiddenProperties(value);
      if (forbidden.length === 0) return "Must NOT be valid";
      const quoted = forbidden.map((name) => `\`${name}\``);
      const list = quoted.length > 1 ? `${quoted.slice(0, -1).join(", ")} or ${quoted[quoted.length - 1]}` : quoted[0];
      return `Must NOT include ${list}`;
    }
    default:
      return unit.error;
  }
};

// Turns one validator output unit into a field-addressable detail, or drops it when a child unit
// already reports the same failure more precisely.
const toDetail = (
  unit: OutputUnit,
  schema: ToolInputSchema,
): ToolInputValidationDetail | undefined => {
  if (AGGREGATE_KEYWORDS.has(unit.keyword)) return undefined;

  if (unit.keyword === "additionalProperties") {
    // The root object's undeclared keys are already reported by the guard's own pre-check, and this
    // validator repeats the root rule for any declared property that failed its own schema. Only a
    // nested `additionalProperties` still carries new information.
    if (unit.keywordLocation === "#/additionalProperties") return undefined;
    const property = quotedName(unit.error);
    if (!property) return undefined;
    const prefix = decodePointerPath(unit.instanceLocation);
    return {
      field: prefix ? `${prefix}.${property}` : property,
      code: "unrecognized_key",
      message: `Unexpected field. This tool does not accept \`${property}\`.`,
    };
  }

  const subschema = owningSubschema(schema, unit.keywordLocation);
  const path = decodePointerPath(unit.instanceLocation);
  const forbidden = unit.keyword === "not" ? forbiddenProperties(subschema.not) : [];
  const field = unit.keyword === "required"
    ? [path, quotedName(unit.error)].filter(Boolean).join(".") || "(root)"
    : forbidden.length === 1
      ? [path, forbidden[0]].filter(Boolean).join(".")
      : path || "(root)";
  return { field, code: "invalid_argument", message: messageForKeyword(unit, subschema) };
};

/**
 * Builds one lazy per-tool guard from the exact JSON Schema advertised through `tools/list`. This
 * makes the public schema authoritative before a handler can perform a REST request.
 */
export const createToolInputGuard = (inputSchema: unknown): ToolInputGuard => {
  const schema = inputSchema as ToolInputSchema;
  const validator = new Validator(schema, JSON_SCHEMA_DRAFT, false);
  const allowedFields = new Set(Object.keys(schema.properties ?? {}));

  return (argumentsValue: unknown): void => {
    const input = argumentsValue ?? {};
    if (schema.additionalProperties === false && input && typeof input === "object" && !Array.isArray(input)) {
      const unexpectedFields = Object.keys(input).filter((field) => !allowedFields.has(field));
      if (unexpectedFields.length > 0) {
        throw createToolInputValidationError(unexpectedFields.map((field) => ({
          field,
          code: "unrecognized_key",
          message: `Unexpected field. This tool does not accept \`${field}\`.`,
        })));
      }
    }

    const result = validator.validate(input);
    if (result.valid) return;

    const details = result.errors.flatMap((unit) => toDetail(unit, schema) ?? []);
    throw createToolInputValidationError(
      details.length > 0
        ? details
        : [{ field: "(root)", code: "invalid_argument", message: "Must match the tool's input schema" }],
    );
  };
};
