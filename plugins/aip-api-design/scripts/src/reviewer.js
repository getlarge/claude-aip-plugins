// @ts-check
/**
 * AIP-based OpenAPI Reviewer
 * @module reviewer
 */

import { defaultRules, getRulesByCategory } from './rules.js';

/**
 * @typedef {import('./types.js').OpenAPISpec} OpenAPISpec
 * @typedef {import('./types.js').Finding} Finding
 * @typedef {import('./types.js').ReviewResult} ReviewResult
 * @typedef {import('./types.js').ReviewerConfig} ReviewerConfig
 * @typedef {import('./types.js').Rule} Rule
 * @typedef {import('./types.js').RuleContext} RuleContext
 * @typedef {import('./types.js').RuleCategory} RuleCategory
 */

const REVIEWER_VERSION = '1.0.0';

/**
 * OpenAPI Reviewer that checks specs against AIP principles
 */
export class OpenAPIReviewer {
  /** @type {Rule[]} */
  #rules;

  /** @type {ReviewerConfig} */
  #config;

  /**
   * Create a new reviewer instance
   * @param {ReviewerConfig} [config={}] - Configuration options
   */
  constructor(config = {}) {
    this.#config = config;
    this.#rules = this.#buildRuleSet(config);
  }

  /**
   * Build the set of rules to apply based on config
   * @param {ReviewerConfig} config
   * @returns {Rule[]}
   */
  #buildRuleSet(config) {
    let rules = [...defaultRules];

    // Filter by category if specified
    if (config.categories && config.categories.length > 0) {
      rules = getRulesByCategory(config.categories);
    }

    // Remove skipped rules
    if (config.skipRules && config.skipRules.length > 0) {
      const skipSet = new Set(config.skipRules);
      rules = rules.filter((r) => !skipSet.has(r.id));
    }

    // Add custom rules
    if (config.customRules) {
      rules = [...rules, ...config.customRules];
    }

    return rules;
  }

  /**
   * Review an OpenAPI spec
   * @param {OpenAPISpec} spec - The OpenAPI specification to review
   * @param {string} [specPath='<inline>'] - Path to the spec file (for reporting)
   * @returns {ReviewResult}
   */
  review(spec, specPath = '<inline>') {
    /** @type {Finding[]} */
    const allFindings = [];

    // Run each rule
    for (const rule of this.#rules) {
      const context = this.#createRuleContext(rule, spec);

      try {
        const findings = rule.check(spec, context);
        allFindings.push(...findings);
      } catch (error) {
        // Rule threw an error - log but continue
        if (error instanceof Error) {
          console.error(`Rule ${rule.id} threw error:`, error.message);
        } else {
          console.error(`Rule ${rule.id} threw unknown error:`, error);
        }
      }
    }

    // Promote warnings to errors in strict mode
    if (this.#config.strict) {
      for (const finding of allFindings) {
        if (finding.severity === 'warning') {
          finding.severity = 'error';
        }
      }
    }

    // Build summary
    const summary = this.#buildSummary(allFindings);

    return {
      specPath,
      specTitle: spec.info?.title,
      specVersion: spec.info?.version,
      findings: allFindings,
      summary,
      metadata: {
        reviewedAt: new Date().toISOString(),
        reviewerVersion: REVIEWER_VERSION,
        rulesApplied: this.#rules.map((r) => r.id),
      },
    };
  }

  /**
   * Create context for a rule
   * @param {Rule} rule
   * @param {OpenAPISpec} spec
   * @returns {RuleContext}
   */
  #createRuleContext(rule, spec) {
    return {
      spec,
      createFinding: (partial) => ({
        ruleId: rule.id,
        severity: rule.severity,
        category: rule.category,
        aip: rule.aip,
        ...partial,
      }),
    };
  }

  /**
   * Build summary from findings
   * @param {Finding[]} findings
   * @returns {ReviewResult['summary']}
   */
  #buildSummary(findings) {
    /** @type {Record<RuleCategory, number>} */
    const byCategory = {
      naming: 0,
      'standard-methods': 0,
      errors: 0,
      pagination: 0,
      filtering: 0,
      lro: 0,
      idempotency: 0,
      versioning: 0,
      security: 0,
    };

    let errors = 0;
    let warnings = 0;
    let suggestions = 0;

    for (const finding of findings) {
      byCategory[finding.category]++;

      switch (finding.severity) {
        case 'error':
          errors++;
          break;
        case 'warning':
          warnings++;
          break;
        case 'suggestion':
          suggestions++;
          break;
      }
    }

    return { errors, warnings, suggestions, byCategory };
  }

  /**
   * Get the list of rules this reviewer will apply
   * @returns {Rule[]}
   */
  getRules() {
    return [...this.#rules];
  }
}

/**
 * Convenience function to review a spec with default config
 * @param {OpenAPISpec} spec
 * @param {string} [specPath]
 * @returns {ReviewResult}
 */
export function reviewSpec(spec, specPath) {
  const reviewer = new OpenAPIReviewer();
  return reviewer.review(spec, specPath);
}

/**
 * Convenience function to review with strict mode
 * @param {OpenAPISpec} spec
 * @param {string} [specPath]
 * @returns {ReviewResult}
 */
export function reviewSpecStrict(spec, specPath) {
  const reviewer = new OpenAPIReviewer({ strict: true });
  return reviewer.review(spec, specPath);
}
