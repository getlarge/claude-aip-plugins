#!/usr/bin/env node
// @ts-check
/**
 * AIP OpenAPI Reviewer CLI
 *
 * Review OpenAPI specifications against Google's API Improvement Proposals (AIP).
 *
 * @example
 * # Basic review
 * node cli.js openapi.yaml
 *
 * # Strict mode (warnings become errors)
 * node cli.js openapi.yaml --strict
 *
 * # JSON output for piping to other tools
 * node cli.js openapi.yaml --format json
 *
 * # SARIF output for CI integration
 * node cli.js openapi.yaml --format sarif > results.sarif
 *
 * @module cli
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { parseArgs as nodeParseArgs } from 'node:util';
import { OpenAPIReviewer } from './reviewer.js';
import {
  formatConsole,
  formatMarkdown,
  formatJSON,
  formatSARIF,
} from './formatters.js';

/**
 * @typedef {import('./types.ts').ReviewerConfig} ReviewerConfig
 * @typedef {import('./types.ts').RuleCategory} RuleCategory
 */

/** @type {import('node:util').ParseArgsConfig} */
const argsConfig = {
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    strict: { type: 'boolean', short: 's', default: false },
    format: { type: 'string', short: 'f', default: 'console' },
    category: { type: 'string', short: 'c', multiple: true, default: [] },
    skip: { type: 'string', short: 'x', multiple: true, default: [] },
    'no-color': { type: 'boolean', default: false },
  },
  allowPositionals: true,
  strict: false,
};

/**
 * @typedef {Object} ParsedValues
 * @property {boolean} [help]
 * @property {boolean} [strict]
 * @property {string} [format]
 * @property {string[]} [category]
 * @property {string[]} [skip]
 * @property {boolean} [no-color]
 */

/**
 * Parse command line arguments using Node.js built-in parseArgs
 * @param {string[]} args
 * @returns {{specPath: string, options: CLIOptions}}
 */
function parseArgs(args) {
  const { values, positionals } = nodeParseArgs({ ...argsConfig, args });
  const v = /** @type {ParsedValues} */ (values);

  return {
    specPath: positionals[0] ?? '',
    options: {
      help: v.help ?? false,
      strict: v.strict ?? false,
      format: /** @type {CLIOptions['format']} */ (v.format ?? 'console'),
      categories: v.category ?? [],
      skipRules: v.skip ?? [],
      noColor: v['no-color'] ?? false,
    },
  };
}

/**
 * @typedef {Object} CLIOptions
 * @property {'console' | 'json' | 'markdown' | 'sarif'} format
 * @property {boolean} strict
 * @property {string[]} categories
 * @property {string[]} skipRules
 * @property {boolean} noColor
 * @property {boolean} help
 */

/**
 * Print help message
 */
function printHelp() {
  console.log(`
AIP OpenAPI Reviewer
Review OpenAPI specifications against Google's API Improvement Proposals.

USAGE:
  aip-review <spec-file> [options]

ARGUMENTS:
  <spec-file>         Path to OpenAPI spec (YAML or JSON)

OPTIONS:
  -h, --help          Show this help message
  -s, --strict        Treat warnings as errors
  -f, --format <fmt>  Output format: console (default), json, markdown, sarif
  -c, --category <c>  Only run rules in category (can repeat)
  -x, --skip <rule>   Skip specific rule by ID (can repeat)
  --no-color          Disable colored output

CATEGORIES:
  naming              Resource naming conventions (AIP-122, AIP-123)
  standard-methods    HTTP method usage (AIP-131 to AIP-135)
  errors              Error response handling (AIP-193)
  pagination          List pagination (AIP-158)
  filtering           Filtering and ordering (AIP-160)
  lro                 Long-running operations (AIP-151)
  idempotency         Idempotency support (AIP-155)

EXAMPLES:
  # Basic review
  aip-review api.yaml

  # Strict mode with JSON output
  aip-review api.yaml --strict --format json

  # Only check naming and pagination
  aip-review api.yaml -c naming -c pagination

  # Skip specific rules
  aip-review api.yaml -x naming/plural-resources

EXIT CODES:
  0   No errors found
  1   Errors found (or warnings in strict mode)
  2   Invalid arguments or file not found
`);
}

/**
 * Load and parse spec file
 * @param {string} specPath
 * @returns {Promise<import('./types.js').OpenAPISpec>}
 */
async function loadSpec(specPath) {
  const resolved = resolve(specPath);

  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${specPath}`);
  }

  const content = readFileSync(resolved, 'utf-8');
  const ext = extname(specPath).toLowerCase();

  if (ext === '.json') {
    return JSON.parse(content);
  }

  // Assume YAML
  // Dynamic import for yaml since it might not be installed
  try {
    // Try to parse as JSON first (some .yaml files are valid JSON)
    return JSON.parse(content);
  } catch {
    // Fall back to yaml parsing
    return await parseSimpleYAML(content);
  }
}

/**
 * Very simple YAML parser for basic OpenAPI specs
 * For production, use 'yaml' or 'js-yaml' package
 * @param {string} content
 * @returns {Promise<any>}
 */
async function parseSimpleYAML(content) {
  // Try dynamic import for ES modules
  try {
    const yaml = await import('yaml');
    return yaml.parse(content);
  } catch {
    try {
      // @ts-expect-error - js-yaml doesn't have type declarations
      const jsYaml = await import('js-yaml');
      return jsYaml.default.load(content);
    } catch {
      throw new Error(
        'YAML parsing requires "yaml" or "js-yaml" package. Install with: npm install yaml'
      );
    }
  }
}

/**
 * Main CLI function
 * @param {string[]} args
 * @returns {Promise<number>} Exit code
 */
async function main(args) {
  const { specPath, options } = parseArgs(args);

  if (options.help || !specPath) {
    printHelp();
    return options.help ? 0 : 2;
  }

  // Load spec
  let spec;
  try {
    spec = await loadSpec(specPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error loading spec: ${message}`);
    return 2;
  }

  // Build reviewer config
  /** @type {ReviewerConfig} */
  const config = {
    strict: options.strict,
    categories:
      options.categories.length > 0
        ? /** @type {RuleCategory[]} */ (options.categories)
        : undefined,
    skipRules: options.skipRules.length > 0 ? options.skipRules : undefined,
  };

  // Run review
  const reviewer = new OpenAPIReviewer(config);
  const result = reviewer.review(spec, specPath);

  // Format and output
  let output;
  switch (options.format) {
    case 'json':
      output = formatJSON(result);
      break;
    case 'markdown':
      output = formatMarkdown(result);
      break;
    case 'sarif':
      output = formatSARIF(result);
      break;
    case 'console':
    default:
      output = formatConsole(result, !options.noColor && process.stdout.isTTY);
      break;
  }

  console.log(output);

  // Exit code based on findings
  if (result.summary.errors > 0) {
    return 1;
  }

  return 0;
}

// Run CLI
const exitCode = await main(process.argv.slice(2));
process.exit(exitCode);
