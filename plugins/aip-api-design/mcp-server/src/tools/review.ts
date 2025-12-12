/**
 * AIP Review Tool
 *
 * Analyzes an OpenAPI spec against Google AIP guidelines.
 */

import { z } from 'zod';
import { OpenAPIReviewer, formatJSON } from '@getlarge/aip-openapi-reviewer';
import type { RuleCategory } from '@getlarge/aip-openapi-reviewer/types';

// Zod schema for MCP SDK
export const ReviewInputSchema = z.object({
  spec: z
    .record(z.string(), z.unknown())
    .describe('OpenAPI specification as JSON object'),
  specPath: z
    .string()
    .optional()
    .default('spec.json')
    .describe('Optional path/name for the spec (used in output)'),
  strict: z
    .boolean()
    .optional()
    .default(false)
    .describe('Treat warnings as errors'),
  categories: z
    .array(z.string())
    .optional()
    .describe(
      'Only run rules from these categories (naming, pagination, errors, standard-methods, idempotency, filtering)'
    ),
  skipRules: z
    .array(z.string())
    .optional()
    .describe('Skip specific rule IDs (e.g., aip122/plural-resources)'),
});

export type ReviewInput = z.infer<typeof ReviewInputSchema>;

export const reviewTool = {
  name: 'aip-review',
  description:
    'Analyze an OpenAPI spec against Google AIP guidelines. Returns findings with severity, rule ID, path, message, and fix suggestions.',
  inputSchema: ReviewInputSchema,

  async execute(input: ReviewInput) {
    const { spec, specPath, strict, categories, skipRules } = input;

    const reviewer = new OpenAPIReviewer({
      strict,
      categories: categories as RuleCategory[] | undefined,
      skipRules,
    });

    const result = reviewer.review(spec, specPath ?? 'spec.json');

    return {
      content: [
        {
          type: 'text' as const,
          text: formatJSON(result),
        },
      ],
    };
  },
};
