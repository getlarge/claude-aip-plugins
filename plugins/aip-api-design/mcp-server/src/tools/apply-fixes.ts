/**
 * Apply Fixes Tool
 *
 * Applies suggested fixes to an OpenAPI spec.
 */

import { z } from 'zod';
import { OpenAPIFixer } from '@getlarge/aip-openapi-reviewer';
import type { Finding } from '@getlarge/aip-openapi-reviewer/types';

const SpecChangeSchema = z.object({
  operation: z.enum(['rename-key', 'set', 'add', 'remove', 'merge']),
  path: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
  value: z.unknown().optional(),
});

const FixSchema = z.object({
  type: z.string(),
  jsonPath: z.string(),
  specChanges: z.array(SpecChangeSchema),
});

const FindingWithFixSchema = z.object({
  ruleId: z.string(),
  severity: z.enum(['error', 'warning', 'suggestion']),
  category: z.string(),
  path: z.string(),
  message: z.string(),
  aip: z.string().optional(),
  suggestion: z.string().optional(),
  fix: FixSchema.optional(),
});

export const ApplyFixesInputSchema = z.object({
  spec: z
    .record(z.string(), z.unknown())
    .describe('OpenAPI specification as JSON object'),
  findings: z
    .array(FindingWithFixSchema)
    .describe(
      'Array of finding objects from aip-review (only those with fix property will be applied)'
    ),
  dryRun: z
    .boolean()
    .optional()
    .default(false)
    .describe('Validate changes without modifying the spec'),
});

export type ApplyFixesInput = z.infer<typeof ApplyFixesInputSchema>;

export const applyFixesTool = {
  name: 'aip-apply-fixes',
  description:
    'Apply suggested fixes to an OpenAPI spec. Returns the modified spec and a log of applied changes.',
  inputSchema: ApplyFixesInputSchema,

  async execute(input: ApplyFixesInput) {
    const { spec, findings, dryRun } = input;

    const fixer = new OpenAPIFixer(spec as Record<string, unknown>, { dryRun });

    // Apply each finding that has a fix
    const results = fixer.applyFixes(findings as unknown as Finding[]);
    const summary = fixer.getSummary();

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              modifiedSpec: fixer.getSpec(),
              results,
              summary,
              errors: fixer.getErrors(),
            },
            null,
            2
          ),
        },
      ],
    };
  },
};
