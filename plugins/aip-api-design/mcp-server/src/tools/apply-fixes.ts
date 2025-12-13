/**
 * Apply Fixes Tool
 *
 * Applies suggested fixes to an OpenAPI spec.
 * Supports two input modes for the spec:
 * - specPath: Local file path (STDIO transport)
 * - specUrl: HTTP(S) URL to fetch spec (HTTP transport)
 *
 * Spec data is transferred to worker via SharedArrayBuffer for
 * zero-copy transfer. Parsing and fixing happens in the worker thread.
 *
 * For token efficiency, modified specs are stored temporarily and a
 * signed URL is returned instead of the full spec content.
 */

import { z } from 'zod';
import { loadSpecRaw, writeSpecToPath } from './spec-loader.js';
import { getTempStorage } from '../services/temp-storage.js';
import type { ToolContext } from './types.js';
import type { WorkerTask } from './worker-pool.js';

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

export const ApplyFixesInputSchema = z
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
        'URL to fetch OpenAPI spec from (HTTP/HTTPS). Note: cannot write back to URL.'
      ),
    findings: z
      .array(FindingWithFixSchema)
      .describe(
        'Array of finding objects from aip-review (only those with fix property will be applied)'
      ),
    dryRun: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Validate changes without modifying the spec or writing to file'
      ),
    writeBack: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Write modified spec back to specPath (only works with specPath, ignored for specUrl)'
      ),
  })
  .refine((data) => data.specPath || data.specUrl, {
    message: 'Either specPath or specUrl must be provided',
  });

export type ApplyFixesInput = z.infer<typeof ApplyFixesInputSchema>;

interface ApplyFixesResult {
  modifiedSpec: Record<string, unknown>;
  results: unknown;
  summary: unknown;
  errors: unknown;
  sourcePath: string;
}

/**
 * Create an apply-fixes tool with the given context (worker pool).
 */
export function createApplyFixesTool(context: ToolContext) {
  return {
    name: 'aip-apply-fixes',
    description:
      'Apply suggested fixes to an OpenAPI spec. Provide spec via: specPath (local file) or specUrl (HTTP URL). Use writeBack=true with specPath to save to disk. Returns a signed URL to download the modified spec (valid for 5 minutes).',
    inputSchema: ApplyFixesInputSchema,

    async execute(input: ApplyFixesInput) {
      const { specPath, specUrl, findings, dryRun, writeBack } = input;

      // Load spec as raw buffer (no parsing on main thread)
      const loaded = await loadSpecRaw({ specPath, specUrl });
      if (!loaded) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: 'No spec provided. Use specPath or specUrl.',
              }),
            },
          ],
          isError: true,
        };
      }

      // Copy to SharedArrayBuffer for zero-copy transfer to worker
      const sharedBuffer = new SharedArrayBuffer(loaded.buffer.byteLength);
      new Uint8Array(sharedBuffer).set(new Uint8Array(loaded.buffer));

      const task: WorkerTask = {
        type: 'apply-fixes',
        payload: {
          findings,
          dryRun,
        },
        specBuffer: sharedBuffer,
        contentType: loaded.contentType,
        sourcePath: loaded.sourcePath,
      };

      const result = await context.workerPool.execute(task);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: result.error }),
            },
          ],
          isError: true,
        };
      }

      const data = result.data as ApplyFixesResult;
      const { modifiedSpec, results, summary, errors, sourcePath } = data;

      // Write back to file if requested and using specPath
      let writtenTo: string | undefined;
      if (writeBack && specPath && !dryRun) {
        await writeSpecToPath(modifiedSpec, specPath);
        writtenTo = specPath;
      }

      // Store modified spec and get signed URL (token efficiency)
      const tempStorage = getTempStorage();
      const contentType = loaded.contentType;

      const stored = await tempStorage.store(modifiedSpec, {
        contentType,
        filename: `fixed-${Date.now()}.${contentType === 'yaml' ? 'yaml' : 'json'}`,
      });

      // Build response without full spec content
      const response: Record<string, unknown> = {
        results,
        summary,
        errors,
        specSource: sourcePath,
      };

      if (writtenTo) {
        response.writtenTo = writtenTo;
      }

      // Include URL or path to download the modified spec
      if (stored.url) {
        response.modifiedSpecUrl = stored.url;
        response.expiresAt = new Date(stored.expiresAt).toISOString();
      } else if (stored.path) {
        response.modifiedSpecPath = stored.path;
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    },
  };
}
