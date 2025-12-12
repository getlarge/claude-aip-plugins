/**
 * MCP Server Factory
 *
 * Creates MCP server with all tools registered.
 * Used by both HTTP and STDIO transports.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools/index.js';

export const SERVER_NAME = 'aip-openapi-reviewer';
export const SERVER_VERSION = '1.0.0';

/**
 * Create and configure the MCP server with all AIP tools.
 */
export function createMcpServer() {
  const mcpServer = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerTools(mcpServer);

  return mcpServer;
}
