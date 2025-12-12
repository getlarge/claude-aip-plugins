/**
 * Shared utilities for loading OpenAPI specs from various sources.
 */

import { readFile, writeFile } from 'node:fs/promises';

export interface LoadedSpec {
  spec: Record<string, unknown>;
  sourcePath: string;
}

/**
 * Parse spec content from string (handles both JSON and YAML)
 */
export async function parseSpec(
  content: string,
  sourcePath: string
): Promise<Record<string, unknown>> {
  // Try JSON first
  try {
    return JSON.parse(content);
  } catch {
    // Try YAML if file extension suggests it
    if (sourcePath.endsWith('.yaml') || sourcePath.endsWith('.yml')) {
      try {
        const yaml = await import('yaml');
        return yaml.parse(content);
      } catch {
        throw new Error(
          `Failed to parse YAML spec. Ensure 'yaml' package is installed.`
        );
      }
    }
    throw new Error(`Failed to parse spec as JSON from ${sourcePath}`);
  }
}

/**
 * Load spec from local file path
 */
export async function loadSpecFromPath(specPath: string): Promise<LoadedSpec> {
  try {
    const content = await readFile(specPath, 'utf-8');
    const spec = await parseSpec(content, specPath);
    return { spec, sourcePath: specPath };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Spec file not found: ${specPath}`);
    }
    throw error;
  }
}

/**
 * Load spec from HTTP(S) URL
 */
export async function loadSpecFromUrl(specUrl: string): Promise<LoadedSpec> {
  const response = await fetch(specUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch spec from ${specUrl}: ${response.status}`);
  }
  const content = await response.text();
  const spec = await parseSpec(content, specUrl);
  return { spec, sourcePath: specUrl };
}

/**
 * Load spec from any supported source
 */
export async function loadSpec(options: {
  specPath?: string;
  specUrl?: string;
  spec?: Record<string, unknown>;
}): Promise<LoadedSpec | null> {
  const { specPath, specUrl, spec } = options;

  if (specPath) {
    return loadSpecFromPath(specPath);
  }
  if (specUrl) {
    return loadSpecFromUrl(specUrl);
  }
  if (spec) {
    return { spec, sourcePath: 'inline-spec.json' };
  }
  return null;
}

/**
 * Serialize spec back to string (JSON or YAML based on path extension)
 */
export async function serializeSpec(
  spec: Record<string, unknown>,
  sourcePath: string
): Promise<string> {
  if (sourcePath.endsWith('.yaml') || sourcePath.endsWith('.yml')) {
    try {
      const yaml = await import('yaml');
      return yaml.stringify(spec);
    } catch {
      // Fall back to JSON if yaml not available
      return JSON.stringify(spec, null, 2);
    }
  }
  return JSON.stringify(spec, null, 2);
}

/**
 * Write spec back to file
 */
export async function writeSpecToPath(
  spec: Record<string, unknown>,
  specPath: string
): Promise<void> {
  const serialized = await serializeSpec(spec, specPath);
  await writeFile(specPath, serialized, 'utf-8');
}
