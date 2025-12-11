// @ts-check
/**
 * Path-related utility functions
 * @module rules/helpers/path-utils
 */

/**
 * Common version prefix patterns
 * @type {RegExp[]}
 */
export const VERSION_PATTERNS = [
  /^v\d+$/, // v1, v2, v3
  /^v\d+\.\d+$/, // v1.0, v2.1
  /^api$/, // /api/v1/...
];

/**
 * Extract path segments that are not parameters
 * @param {string} path - The URL path
 * @returns {string[]} Resource segments (excluding {params} and :custom)
 */
export function getResourceSegments(path) {
  return path
    .split('/')
    .filter((s) => s && !s.startsWith('{') && !s.includes(':'));
}

/**
 * Check if a segment is a version prefix
 * @param {string} segment - Path segment to check
 * @returns {boolean}
 */
export function isVersionPrefix(segment) {
  const lower = segment.toLowerCase();
  return VERSION_PATTERNS.some((pattern) => pattern.test(lower));
}

/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string}
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if path is a collection endpoint (no trailing parameter)
 * @param {string} path - The URL path
 * @returns {boolean}
 */
export function isCollectionEndpoint(path) {
  const segments = path.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  return !!last && !last.startsWith('{') && !last.includes(':');
}

/**
 * Detect casing style of a word
 * @param {string} word - Word to analyze
 * @returns {'snake_case' | 'kebab-case' | 'camelCase' | 'PascalCase' | 'lowercase'}
 */
export function detectCasingStyle(word) {
  if (word.includes('_')) return 'snake_case';
  if (word.includes('-')) return 'kebab-case';
  if (/^[a-z]/.test(word) && /[A-Z]/.test(word)) return 'camelCase';
  if (/^[A-Z]/.test(word)) return 'PascalCase';
  return 'lowercase';
}
