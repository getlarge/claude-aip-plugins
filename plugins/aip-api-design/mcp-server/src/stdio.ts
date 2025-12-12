#!/usr/bin/env node
/**
 * AIP OpenAPI Reviewer MCP Server - STDIO Transport
 *
 * Runs the MCP server over standard input/output for local integration
 * with Claude Code and Claude Desktop.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from './mcp.js';
import {
  initTempStorage,
  shutdownTempStorage,
} from './services/temp-storage.js';

async function main() {
  // Initialize temp storage (memory store with FS for STDIO)
  await initTempStorage({
    type: 'memory',
    memory: { useFileSystem: true },
    ttlMs: 5 * 60 * 1000, // 5 minutes
  });

  const mcpServer = createMcpServer();
  const transport = new StdioServerTransport();

  // Log to stderr to avoid interfering with MCP protocol on stdout
  console.error(`${SERVER_NAME} v${SERVER_VERSION} starting in STDIO mode...`);

  // Cleanup on exit
  process.on('SIGINT', async () => {
    await shutdownTempStorage();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await shutdownTempStorage();
    process.exit(0);
  });

  await mcpServer.connect(transport);

  console.error(`${SERVER_NAME} connected and ready`);
}

main().catch((err) => {
  console.error('Failed to start STDIO server:', err);
  process.exit(1);
});
