#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createGrowSurfMcpServer } from "./index.js";

// Starts the stdio transport from a dedicated executable so npm bin symlinks cannot bypass startup.
const main = async () => {
  const server = createGrowSurfMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
