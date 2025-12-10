// @ts-check
/**
 * AIP-based OpenAPI Reviewer
 *
 * A modular tool for reviewing OpenAPI specifications against
 * Google's API Improvement Proposals (AIP).
 *
 * @example
 * // As a library
 * import { OpenAPIReviewer, reviewSpec, defaultRules } from 'aip-openapi-reviewer';
 *
 * const spec = { openapi: '3.0.0', paths: { ... } };
 * const result = reviewSpec(spec);
 *
 * console.log(result.findings);
 *
 * @example
 * // Custom configuration
 * import { OpenAPIReviewer } from 'aip-openapi-reviewer';
 *
 * const reviewer = new OpenAPIReviewer({
 *   strict: true,
 *   categories: ['naming', 'pagination'],
 *   skipRules: ['naming/plural-resources'],
 * });
 *
 * const result = reviewer.review(spec, 'api.yaml');
 *
 * @example
 * // Custom output format
 * import { reviewSpec, formatMarkdown, formatSARIF } from 'aip-openapi-reviewer';
 *
 * const result = reviewSpec(spec);
 * const markdown = formatMarkdown(result);
 * const sarif = formatSARIF(result);
 *
 * @module aip-openapi-reviewer
 */

// Core reviewer
export { OpenAPIReviewer, reviewSpec, reviewSpecStrict } from './reviewer.js';

// Rules
export { defaultRules, getRulesByCategory, getRuleById } from './rules.js';

// Formatters
export {
  formatJSON,
  formatMarkdown,
  formatConsole,
  formatSARIF,
} from './formatters.js';

// Types are exported via TypeScript declaration files
// For JSDoc users, import types like:
// /** @typedef {import('aip-openapi-reviewer').Finding} Finding */
