/**
 * MCP Tool Registration
 *
 * Registers all AIP OpenAPI reviewer tools with the MCP server.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createReviewTool, ReviewInputSchema } from './review.js';
import {
  listRulesTool,
  ListRulesInputSchema,
  ListRulesOutputSchema,
} from './list-rules.js';
import { getInfoTool, GetInfoInputSchema } from './get-info.js';
import { createApplyFixesTool, ApplyFixesInputSchema } from './apply-fixes.js';
import type { ToolContext } from './types.js';

/**
 * Register all AIP tools with the MCP server.
 *
 * @param server - MCP server instance
 * @param context - Tool context containing shared dependencies (worker pool)
 */
export function registerTools(server: McpServer, context: ToolContext) {
  // Create tools with context (worker pool)
  const reviewTool = createReviewTool(context);
  const applyFixesTool = createApplyFixesTool(context);

  // aip-review: Analyze an OpenAPI spec against AIP guidelines
  server.registerTool(
    reviewTool.name,
    {
      description: reviewTool.description,
      inputSchema: ReviewInputSchema,
      // TODO: outputSchema
    },
    async (args) => reviewTool.execute(args)
  );

  // aip-list-rules: List available AIP rules (no worker needed - fast operation)
  server.registerTool(
    listRulesTool.name,
    {
      description: listRulesTool.description,
      inputSchema: ListRulesInputSchema,
      outputSchema: ListRulesOutputSchema,
    },
    async (args) => listRulesTool.execute(args)
  );

  // aip-get-info: Get information about a specific AIP (no worker needed - fast operation)
  server.registerTool(
    getInfoTool.name,
    {
      description: getInfoTool.description,
      inputSchema: GetInfoInputSchema,
      // TODO: outputSchema
    },
    async (args) => getInfoTool.execute(args)
  );

  // aip-apply-fixes: Apply suggested fixes to an OpenAPI spec
  server.registerTool(
    applyFixesTool.name,
    {
      description: applyFixesTool.description,
      inputSchema: ApplyFixesInputSchema,
      // TODO: outputSchema
    },
    async (args) => applyFixesTool.execute(args)
  );
}

// Re-export for testing
export { listRulesTool, getInfoTool };
