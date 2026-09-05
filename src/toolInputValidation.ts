import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import type { JsonSchemaType, JsonSchemaValidator } from "@modelcontextprotocol/sdk/validation";

import {
  createToolInputValidationError,
  type ToolInputValidationDetail,
} from "./toolError.js";

type ToolInputSchema = JsonSchemaType & {
  additionalProperties?: unknown;
  properties?: Record<string, unknown>;
};

export type ToolInputGuard = (argumentsValue: unknown) => void;

const validatorProvider = new AjvJsonSchemaValidator();

// Converts one JSON Pointer segment into the dotted field names used by GrowSurf validation errors.
const decodePointerPath = (path: string): string =>
  path
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"))
    .join(".");

// Uses declared numeric bounds when both are available, so either rejected edge reports the full
// valid range instead of only the limit that one value crossed.
const numericRangeMessage = (schema: ToolInputSchema, field: string): string | undefined => {
  const property = schema.properties?.[field];
  if (!property || typeof property !== "object" || Array.isArray(property)) return undefined;
  const { minimum, maximum } = property as Record<string, unknown>;
  return typeof minimum === "number" && typeof maximum === "number"
    ? `Must be between ${minimum} and ${maximum}.`
    : undefined;
};

// Converts the SDK validator's public error text into field-addressable validation details.
const validationDetailsFromMessage = (
  errorMessage: string,
  schema: ToolInputSchema,
): ToolInputValidationDetail[] =>
  errorMessage.split(/,\s+(?=data(?:\/|\s))/).map((fragment) => {
    const path = fragment.match(/^data\/([^\s]+)/)?.[1];
    const requiredField = fragment.match(/required property '([^']+)'/)?.[1];
    const field = path ? decodePointerPath(path) : requiredField ?? "(root)";
    const message = numericRangeMessage(schema, field) ?? fragment
        .replace(/^data(?:\/[^\s]+)?\s*/, "")
        .replace(/^must\s+/, "Must ");
    return { field, code: "invalid_argument", message };
  });

// Builds one lazy per-tool guard from the exact JSON Schema advertised through `tools/list`. This
// makes the public schema authoritative before a handler can perform a REST request.
export const createToolInputGuard = (inputSchema: unknown): ToolInputGuard => {
  const schema = inputSchema as ToolInputSchema;
  const validate: JsonSchemaValidator<unknown> = validatorProvider.getValidator(schema);
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

    const result = validate(input);
    if (!result.valid) {
      throw createToolInputValidationError(validationDetailsFromMessage(result.errorMessage, schema));
    }
  };
};
