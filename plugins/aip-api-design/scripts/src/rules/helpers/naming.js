// @ts-check
/**
 * Naming and grammar utilities
 * @module rules/helpers/naming
 */

/**
 * Common action verbs used in custom methods (AIP-136)
 * @type {Set<string>}
 */
export const CUSTOM_METHOD_VERBS = new Set([
  'validate',
  'verify',
  'check',
  'test',
  'export',
  'import',
  'download',
  'upload',
  'clear',
  'reset',
  'restore',
  'backup',
  'start',
  'stop',
  'pause',
  'resume',
  'enable',
  'disable',
  'toggle',
  'send',
  'publish',
  'notify',
  'archive',
  'unarchive',
  'approve',
  'reject',
  'cancel',
  'encrypt',
  'decrypt',
  'hash',
  'sync',
  'refresh',
  'reload',
  'train',
  'predict',
]);

/**
 * Known compound nouns that start with verb prefixes but are nouns
 * @type {Set<string>}
 */
export const NOUN_EXCEPTIONS = new Set([
  // Words starting with "add-"
  'address',
  'addresses',
  'addendum',
  'addenda',
  'addition',
  'additions',
  // Words starting with "check-"
  'checklist',
  'checklists',
  'checkout',
  'checkouts',
  'checkup',
  'checkups',
  'checksum',
  'checksums',
  'checkpoint',
  'checkpoints',
  // Words starting with "process-"
  'process',
  'processes', // as noun: "the process"
  // Words starting with "run-"
  'runtime',
  'runtimes',
  'runbook',
  'runbooks',
  // Words starting with "send-"
  'sender',
  'senders',
  // Words starting with "submit-"
  'submission',
  'submissions',
  // Verb-noun homographs (words that can be both verb and noun)
  'update',
  'updates', // as noun: "the update"
  'search',
  'searches', // as noun: "the search results"
  'download',
  'downloads', // as noun: "the download"
  'upload',
  'uploads',
  'listing',
  'listings',
  'insert',
  'inserts', // as noun: "the database insert"
  'edit',
  'edits', // as noun: "the edit history"
  'fetch',
  'fetches', // as noun: "the fetch operation"
]);

/**
 * Check if a path segment looks like a custom method (AIP-136)
 * Custom methods are verb-based actions, often hyphenated
 *
 * @param {string} segment - Path segment to check
 * @param {string} path - Full path for context
 * @param {Set<string>} singletons - Set of singleton resource paths
 * @returns {boolean}
 */
export function isCustomMethod(segment, path, singletons) {
  // Colon-prefixed custom methods are already handled
  if (segment.includes(':')) return true;

  const lower = segment.toLowerCase();

  // Check for hyphenated custom methods (e.g., validate-hash)
  if (lower.includes('-')) {
    const parts = lower.split('-');
    // If first part is a verb, it's likely a custom method
    if (CUSTOM_METHOD_VERBS.has(parts[0])) return true;
  }

  // Check for verb-only segments on singletons or as terminal actions
  if (CUSTOM_METHOD_VERBS.has(lower)) {
    // Get parent path by removing last segment
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    // If parent is a singleton, this is likely a custom method
    if (singletons.has(parentPath)) return true;
    // If parent has an {id} parameter, this could be an action on a resource
    if (parentPath.includes('{')) return true;
  }

  return false;
}

/**
 * Check if a word looks like a verb
 * @param {string} word - Word to check
 * @returns {boolean}
 */
export function looksLikeVerb(word) {
  const lower = word.toLowerCase();

  // First check noun exceptions
  if (NOUN_EXCEPTIONS.has(lower)) return false;

  const verbPrefixes = [
    'get',
    'fetch',
    'retrieve',
    'list',
    'create',
    'add',
    'insert',
    'update',
    'modify',
    'edit',
    'delete',
    'remove',
    'destroy',
    'find',
    'search',
    'check',
    'validate',
    'process',
    'execute',
    'run',
    'do',
    'perform',
    'send',
    'submit',
  ];

  return verbPrefixes.some(
    (v) => lower.startsWith(v) && lower.length > v.length
  );
}

/**
 * Check if a word is likely singular (simple heuristic)
 * @param {string} word - Word to check
 * @returns {boolean}
 */
export function isSingular(word) {
  const exceptions = new Set([
    // Uncountable or mass nouns
    'status',
    'address',
    'metadata',
    'info',
    'health',
    'auth',
    'config',
    'settings',
    'data',
    'media',
    'analytics',
    'news',
    'series',
    'software',
    'hardware',
    'firmware',
    // Technical terms
    'api',
    'graphql',
    'grpc',
    'oauth',
    'oidc',
    // Already plural or irregular
    'index',
    'matrix',
    'vertex',
    // Common API endpoints
    'ping',
    'proxy',
    'registry',
    'wizard',
  ]);

  const lower = word.toLowerCase();
  if (exceptions.has(lower)) return false;

  // Very simple: doesn't end in 's'
  return !lower.endsWith('s');
}
