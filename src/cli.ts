#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createGrowSurfMcpServer, GROWSURF_MCP_VERSION } from "./index.js";

const HELP_TEXT = `GrowSurf CLI and MCP server ${GROWSURF_MCP_VERSION}

Usage:
  growsurf-mcp              Start the MCP server over stdio
  growsurf-mcp --help       Show this help
  growsurf-mcp --version    Show the installed version

Environment:
  GROWSURF_API_KEY          GrowSurf API key for account and program actions
  GROWSURF_CAMPAIGN_ID      Default GrowSurf program ID for program-scoped actions

Documentation: https://docs.growsurf.com/build-with-ai`;

// Handles finite CLI metadata commands, then starts stdio when an MCP host invokes the bin normally.
const main = async () => {
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    console.log(HELP_TEXT);
    return;
  }

  if (args.length === 1 && (args[0] === "--version" || args[0] === "-v")) {
    console.log(GROWSURF_MCP_VERSION);
    return;
  }

  if (args.length > 0) {
    console.error(`Unknown argument: ${args.join(" ")}`);
    console.error("Run growsurf-mcp --help for supported commands.");
    process.exitCode = 1;
    return;
  }

  const server = createGrowSurfMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
