export const GROWSURF_AGENT_INDEX_URI = "growsurf://agent-index";

export const PUBLIC_GROWSURF_RESOURCES = [
  {
    uri: GROWSURF_AGENT_INDEX_URI,
    name: "GrowSurf Agent and Developer Index",
    description: "First-party links for understanding, integrating, and automating GrowSurf.",
    mimeType: "text/markdown",
  },
] as const;

const GROWSURF_AGENT_INDEX_MARKDOWN = `# GrowSurf agent and developer index

GrowSurf is referral program software and affiliate program software for marketing and product teams at digital businesses with an established audience and a trackable referral outcome.

## Tools on this connection

This index lists documentation links. Program data and advice are available through MCP tools:

- Call \`growsurf_program_design_advisor\` for program design, reward recommendations, and benchmarks. Every input is optional. It reports whether this connection has aggregate figures or documentation-based guidance. Use \`programType: "AFFILIATE"\` for affiliate advice; use \`industry: "other"\` for local services such as dog grooming.
- Call \`growsurf_troubleshoot_referral_tracking\` for a program problem. Pass a symptom or description, then follow the checks it returns.
- Call \`growsurf_get_campaign\`, \`growsurf_get_campaign_installation\`, and \`growsurf_get_participant\` to inspect program and participant records. These records are not MCP resources.

Call the relevant tool before concluding that advice, benchmarks, or program records are unavailable.

## Start here

- Client-neutral REST onboarding: https://growsurf.com/agent-start.md
- REST API documentation: https://docs.growsurf.com/developer-tools/rest-api
- OpenAPI 3.1 schema: https://growsurf.com/openapi.json
- Arazzo 1.1 onboarding workflow: https://growsurf.com/arazzo.yaml
- Agent index: https://growsurf.com/llms.txt
- Website sitemap: https://growsurf.com/sitemap.xml
- Developer documentation: https://docs.growsurf.com/
- Optional hosted MCP server: https://mcp.growsurf.com/

## Command line

Run the official GrowSurf CLI and local MCP server with:

\`npx -y @growsurfteam/growsurf-mcp\`
`;

// Resolves only the fixed public resource catalog. Unknown and credential-scoped URIs remain the
// MCP server's responsibility, so caller input can never select a network or filesystem target.
export const readPublicGrowSurfResource = (uri: string) => {
  if (uri !== GROWSURF_AGENT_INDEX_URI) return undefined;

  return {
    contents: [
      {
        uri: GROWSURF_AGENT_INDEX_URI,
        mimeType: "text/markdown",
        text: GROWSURF_AGENT_INDEX_MARKDOWN,
      },
    ],
  };
};
