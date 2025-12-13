/**
 * MCP Server Factory
 *
 * Creates MCP server with all tools registered.
 * Used by both HTTP and STDIO transports.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools/index.js';
import type { ToolContext } from './tools/types.js';

export const SERVER_NAME = 'aip-openapi-reviewer';
export const SERVER_VERSION = '1.0.0';

/**
 * Create and configure the MCP server with all AIP tools.
 *
 * @param context - Tool context containing shared dependencies (worker pool)
 */
export function createMcpServer(context: ToolContext) {
  const mcpServer = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerTools(mcpServer, context);

  return mcpServer;
}
