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

GrowSurf is referral program software and affiliate program software for B2C and product-led companies.

## Start here

- Agent index: https://growsurf.com/llms.txt
- Website sitemap: https://growsurf.com/sitemap.xml
- Developer documentation: https://docs.growsurf.com/
- OpenAPI 3.1 schema: https://api.growsurf.com/api/v2/openapi
- Hosted MCP server: https://mcp.growsurf.com/

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
