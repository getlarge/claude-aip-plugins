/**
 * MCP Tool Registration
 *
 * Registers all AIP OpenAPI reviewer tools with the MCP server.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { reviewTool, ReviewInputSchema } from './review.js';
import { listRulesTool, ListRulesInputSchema } from './list-rules.js';
import { getInfoTool, GetInfoInputSchema } from './get-info.js';
import { applyFixesTool, ApplyFixesInputSchema } from './apply-fixes.js';

/**
 * Register all AIP tools with the MCP server.
 */
export function registerTools(server: McpServer) {
  // aip-review: Analyze an OpenAPI spec against AIP guidelines
  server.tool(
    reviewTool.name,
    reviewTool.description,
    ReviewInputSchema.shape,
    async (args) => reviewTool.execute(args)
  );

  // aip-list-rules: List available AIP rules
  server.tool(
    listRulesTool.name,
    listRulesTool.description,
    ListRulesInputSchema.shape,
    async (args) => listRulesTool.execute(args)
  );

  // aip-get-info: Get information about a specific AIP
  server.tool(
    getInfoTool.name,
    getInfoTool.description,
    GetInfoInputSchema.shape,
    async (args) => getInfoTool.execute(args)
  );

  // aip-apply-fixes: Apply suggested fixes to an OpenAPI spec
  server.tool(
    applyFixesTool.name,
    applyFixesTool.description,
    ApplyFixesInputSchema.shape,
    async (args) => applyFixesTool.execute(args)
  );
}

// Re-export tools for testing
export { reviewTool, listRulesTool, getInfoTool, applyFixesTool };
