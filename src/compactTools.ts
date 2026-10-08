import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { TOOL_TITLES, withToolAuthorizationMetadata } from "./toolAuthorization.js";
import { TOOL_OUTPUT_SCHEMAS } from "./growsurf/outputSchemas.js";

export const SUPPORTED_TOOL_SURFACES = ["full", "compact"] as const;
export type ToolSurface = (typeof SUPPORTED_TOOL_SURFACES)[number];

// Keep recommendations and troubleshooting distinct from static documentation and code examples.
const GUIDANCE_TOPICS = {
  integration: "growsurf_integration_guide",
  program_creation_checks: "growsurf_agent_program_creation_eval",
  mobile_sdk: "growsurf_mobile_sdk_guide",
  api_libraries: "growsurf_api_library_snippets",
  browser: "growsurf_client_snippets",
  embeddable_element: "growsurf_embeddable_element_snippet",
  participant_auto_auth: "growsurf_grsf_config_snippet",
} as const;
const SETTINGS_SECTIONS = ["design", "emails", "options", "installation"] as const;

const GROUPS = [
  {
    name: "growsurf_get_guidance", selector: "topic",
    description: "Get installation guidance or code examples. Choose `integration` for a web integration plan, `browser` for browser JavaScript, `api_libraries` for backend code, `mobile_sdk` for native apps, `embeddable_element` for HTML, `participant_auto_auth` for automatic sign-in code, or `program_creation_checks` for evaluation prompts. Pass the chosen topic's inputs under `input`. Returns Markdown; does not inspect or change a program.",
    targets: GUIDANCE_TOPICS,
  },
  {
    name: "growsurf_get_program_settings", selector: "section",
    description: "Read one program settings section: `design`, `emails`, `options`, or `installation`. Pass `campaignId` under `input`, or use the configured default. Returns that section's current fields. Read the section before updating it.",
    targets: Object.fromEntries(SETTINGS_SECTIONS.map(section => [section, `growsurf_get_campaign_${section}`])),
  },
  {
    name: "growsurf_update_program_settings", selector: "section",
    description: "Update one program settings section: `design`, `emails`, `options`, or `installation`. Pass `campaignId` and the `fields` patch under `input`. Only supplied fields change; arrays replace wholesale. Read the section first. This can change live participant content and notifications. Reward actions use separate tools.",
    targets: Object.fromEntries(SETTINGS_SECTIONS.map(section => [section, `growsurf_update_campaign_${section}`])),
  },
] as const;

// Retain individual actions where combining them would hide a read/write or money boundary.
const RETAINED_TOOLS = new Set([
  "growsurf_program_design_advisor", "growsurf_troubleshoot_referral_tracking",
  "growsurf_list_campaigns", "growsurf_get_campaign", "growsurf_create_campaign", "growsurf_update_campaign",
  "growsurf_list_campaign_rewards", "growsurf_create_campaign_reward", "growsurf_update_campaign_reward", "growsurf_delete_campaign_reward",
  "growsurf_list_participants", "growsurf_get_participant", "growsurf_add_participant", "growsurf_update_participant",
  "growsurf_bulk_delete_participants", "growsurf_get_participant_activity_logs", "growsurf_get_participant_analytics",
  "growsurf_trigger_referral", "growsurf_cancel_delayed_referral", "growsurf_record_sale", "growsurf_refund_transaction",
  "growsurf_get_campaign_analytics", "growsurf_get_campaign_activation_analytics",
  "growsurf_list_campaign_webhooks", "growsurf_list_integrations", "growsurf_get_integration_connect_link",
  "growsurf_capture_referral_flow_screenshots", "growsurf_create_mobile_participant_token", "growsurf_participant_auth_hash",
]);

export const COMPACT_TOOL_NAMES: readonly string[] = [...RETAINED_TOOLS, ...GROUPS.map(group => group.name)];

export const COMPACT_CONNECTION_INSTRUCTIONS = "This is the compact connection. For guidance and settings tools, put the original arguments, including `campaignId` and `fields` when needed, under `input`. Other tools keep their existing argument shapes. For team administration, account creation, program cloning, participant resources, webhook changes or tests, participant emails, payout destinations, or webhook normalization, switch to the full connection: omit `--compact` for stdio or use `/mcp` on the hosted server. Do not call full-only tools here. Tool availability also depends on your granted permissions.";

type PlannedCall = { tool: string; arguments: Record<string, unknown> };

/** Translate a proposed legacy call without executing it or broadening its input contract. */
export function compactPlannedCall<T extends PlannedCall>(call: T): T {
  for (const group of GROUPS) {
    const entry = Object.entries(group.targets).find(([, target]) => target === call.tool);
    if (entry) return { ...call, tool: group.name, arguments: { [group.selector]: entry[0], input: call.arguments } };
  }
  return call;
}

/** Only call after validating the advertised group schema, including its exact selector branch. */
export function resolveCompactCall(name: string, args: Record<string, unknown>) {
  const group = GROUPS.find(candidate => candidate.name === name);
  if (!group) return { name, arguments: args };
  const target = (group.targets as Record<string, string>)[String(args[group.selector])];
  if (!target) throw new Error("Unknown compact tool selection.");
  return { name: target, arguments: (args.input ?? {}) as Record<string, unknown> };
}

/** Format literal authored references before interpolation. Never pass rendered code or caller data. */
export function compactAuthoredText(text: string): string {
  return text.replace(/\bgrowsurf_[a-z_]+\b/g, name => {
    const mapped = compactPlannedCall({ tool: name, arguments: {} });
    if (mapped.tool !== name) {
      const selector = Object.entries(mapped.arguments).find(([key]) => key !== "input")!;
      return `${mapped.tool} (${selector[0]}: "${selector[1]}", original arguments under input)`;
    }
    if (COMPACT_TOOL_NAMES.includes(name)) return name;
    const title = TOOL_TITLES[name as keyof typeof TOOL_TITLES];
    return title ? `${title} on the full connection` : name;
  });
}

function adaptSchemaDescriptions<T>(value: T): T {
  if (Array.isArray(value)) return value.map(adaptSchemaDescriptions) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key,
    key === "description" && typeof child === "string" ? compactAuthoredText(child) : adaptSchemaDescriptions(child),
  ])) as T;
}

export function buildCompactTools(fullTools: readonly Tool[]): Tool[] {
  const groups = GROUPS.map(group => {
    const variants = Object.entries(group.targets).map(([value, target]) => {
      const tool = fullTools.find(candidate => candidate.name === target);
      if (!tool) throw new Error(`Missing compact tool target: ${target}`);
      return { value, tool };
    });
    return withToolAuthorizationMetadata({
      name: group.name,
      description: group.description,
      inputSchema: {
        type: "object" as const,
        properties: {
          [group.selector]: { type: "string", enum: variants.map(({ value }) => value) },
          input: { type: "object", description: "Arguments for the selected topic or section; see its schema below." },
        },
        required: [group.selector, "input"],
        additionalProperties: false,
        oneOf: variants.map(({ value, tool }) => ({
          properties: { [group.selector]: { const: value }, input: tool.inputSchema },
          description: tool.description,
        })),
      },
      outputSchema: TOOL_OUTPUT_SCHEMAS[group.name]!,
    });
  });
  return [...fullTools.filter(tool => RETAINED_TOOLS.has(tool.name)), ...groups].map(tool => ({
    ...tool,
    ...(tool.description ? { description: compactAuthoredText(tool.description) } : {}),
    inputSchema: adaptSchemaDescriptions(tool.inputSchema),
    ...(tool.outputSchema ? { outputSchema: adaptSchemaDescriptions(tool.outputSchema) } : {}),
  }));
}
