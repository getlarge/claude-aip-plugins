/**
 * AIP Review Tool
 *
 * Analyzes an OpenAPI spec against Google AIP guidelines.
 * Supports three input modes:
 * - specPath: Local file path (STDIO transport only)
 * - specUrl: HTTP(S) URL to fetch spec (works with remote HTTP transport)
 * - spec: Inline JSON object (fallback, inefficient for large specs)
 */

import { z } from 'zod';
import { OpenAPIReviewer, formatJSON } from '@getlarge/aip-openapi-reviewer';
import type { RuleCategory } from '@getlarge/aip-openapi-reviewer/types';
import { loadSpec } from './spec-loader.js';

// Zod schema for MCP SDK
export const ReviewInputSchema = z
  .object({
    specPath: z
      .string()
      .optional()
      .describe(
        'Path to local OpenAPI spec file (YAML/JSON). Preferred for STDIO transport.'
      ),
    specUrl: z
      .url()
      .optional()
      .describe(
        'URL to fetch OpenAPI spec from (HTTP/HTTPS). Works with remote HTTP transport.'
      ),
    spec: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'OpenAPI specification as inline JSON object. Use specPath or specUrl instead for large specs.'
      ),
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
  })
  .refine((data) => data.specPath || data.specUrl || data.spec, {
    message: 'One of specPath, specUrl, or spec must be provided',
  });

export type ReviewInput = z.infer<typeof ReviewInputSchema>;

export const reviewTool = {
  name: 'aip-review',
  description:
    'Analyze an OpenAPI spec against Google AIP guidelines. Provide spec via: specPath (local file), specUrl (HTTP URL), or spec (inline JSON). Returns findings with severity, rule ID, path, message, and fix suggestions.',
  inputSchema: ReviewInputSchema,

  async execute(input: ReviewInput) {
    const { specPath, specUrl, spec, strict, categories, skipRules } = input;

    const loaded = await loadSpec({ specPath, specUrl, spec });
    if (!loaded) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'No spec provided. Use specPath, specUrl, or spec.',
            }),
          },
        ],
        isError: true,
      };
    }

    const reviewer = new OpenAPIReviewer({
      strict,
      categories: categories as RuleCategory[] | undefined,
      skipRules,
    });

    const result = reviewer.review(loaded.spec, loaded.sourcePath);

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
