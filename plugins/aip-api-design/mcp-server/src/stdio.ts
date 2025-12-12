#!/usr/bin/env node
/**
 * AIP OpenAPI Reviewer MCP Server - STDIO Transport
 *
 * Runs the MCP server over standard input/output for local integration
 * with Claude Code and Claude Desktop.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from './mcp.js';

async function main() {
  const mcpServer = createMcpServer();
  const transport = new StdioServerTransport();

  // Log to stderr to avoid interfering with MCP protocol on stdout
  console.error(`${SERVER_NAME} v${SERVER_VERSION} starting in STDIO mode...`);

  await mcpServer.connect(transport);

  console.error(`${SERVER_NAME} connected and ready`);
}

main().catch((err) => {
  console.error('Failed to start STDIO server:', err);
  process.exit(1);
});
