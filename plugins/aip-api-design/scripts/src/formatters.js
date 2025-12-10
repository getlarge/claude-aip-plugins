// @ts-check
/**
 * Output Formatters for Review Results
 * @module formatters
 */

/**
 * @typedef {import('./types.js').ReviewResult} ReviewResult
 * @typedef {import('./types.js').Finding} Finding
 */

/**
 * Format result as JSON
 * @param {ReviewResult} result
 * @returns {string}
 */
export function formatJSON(result) {
  return JSON.stringify(result, null, 2);
}

/**
 * Format result as Markdown report
 * @param {ReviewResult} result
 * @returns {string}
 */
export function formatMarkdown(result) {
  const lines = [];

  // Header
  lines.push(`## API Review: ${result.specPath}`);
  lines.push('');

  if (result.specTitle) {
    lines.push(`**Title:** ${result.specTitle}`);
  }
  if (result.specVersion) {
    lines.push(`**Version:** ${result.specVersion}`);
  }
  lines.push(`**Reviewed:** ${result.metadata.reviewedAt}`);
  lines.push('');

  // Group findings by severity
  const errors = result.findings.filter((f) => f.severity === 'error');
  const warnings = result.findings.filter((f) => f.severity === 'warning');
  const suggestions = result.findings.filter(
    (f) => f.severity === 'suggestion'
  );

  // Errors
  if (errors.length > 0) {
    lines.push('### 🔴 Errors (MUST fix)');
    lines.push('');
    for (const finding of errors) {
      lines.push(formatFindingMarkdown(finding));
    }
    lines.push('');
  }

  // Warnings
  if (warnings.length > 0) {
    lines.push('### 🟡 Warnings (SHOULD fix)');
    lines.push('');
    for (const finding of warnings) {
      lines.push(formatFindingMarkdown(finding));
    }
    lines.push('');
  }

  // Suggestions
  if (suggestions.length > 0) {
    lines.push('### 💡 Suggestions (MAY improve)');
    lines.push('');
    for (const finding of suggestions) {
      lines.push(formatFindingMarkdown(finding));
    }
    lines.push('');
  }

  // No issues
  if (result.findings.length === 0) {
    lines.push('### ✅ No issues found!');
    lines.push('');
  }

  // Summary
  lines.push('---');
  lines.push('');
  lines.push(
    `**Summary:** ${result.summary.errors} errors, ${result.summary.warnings} warnings, ${result.summary.suggestions} suggestions`
  );

  return lines.join('\n');
}

/**
 * Format a single finding as Markdown
 * @param {Finding} finding
 * @returns {string}
 */
function formatFindingMarkdown(finding) {
  const lines = [];
  lines.push(`- \`${finding.path}\` — ${finding.message}`);

  if (finding.aip) {
    lines.push(`  - **Reference:** ${finding.aip}`);
  }
  if (finding.suggestion) {
    lines.push(`  - **Fix:** ${finding.suggestion}`);
  }

  return lines.join('\n');
}

/**
 * Format result for console output (with ANSI colors)
 * @param {ReviewResult} result
 * @param {boolean} [useColors=true]
 * @returns {string}
 */
export function formatConsole(result, useColors = true) {
  const c = useColors ? colors : noColors;
  const lines = [];

  // Header
  lines.push('');
  lines.push(`${c.bold}API Review: ${result.specPath}${c.reset}`);
  lines.push('');

  // Group findings by severity
  const errors = result.findings.filter((f) => f.severity === 'error');
  const warnings = result.findings.filter((f) => f.severity === 'warning');
  const suggestions = result.findings.filter(
    (f) => f.severity === 'suggestion'
  );

  // Errors
  if (errors.length > 0) {
    lines.push(`${c.red}${c.bold}Errors (${errors.length})${c.reset}`);
    for (const finding of errors) {
      lines.push(formatFindingConsole(finding, c));
    }
    lines.push('');
  }

  // Warnings
  if (warnings.length > 0) {
    lines.push(`${c.yellow}${c.bold}Warnings (${warnings.length})${c.reset}`);
    for (const finding of warnings) {
      lines.push(formatFindingConsole(finding, c));
    }
    lines.push('');
  }

  // Suggestions
  if (suggestions.length > 0) {
    lines.push(
      `${c.blue}${c.bold}Suggestions (${suggestions.length})${c.reset}`
    );
    for (const finding of suggestions) {
      lines.push(formatFindingConsole(finding, c));
    }
    lines.push('');
  }

  // No issues
  if (result.findings.length === 0) {
    lines.push(`${c.green}${c.bold}✓ No issues found!${c.reset}`);
    lines.push('');
  }

  // Summary line
  const summaryParts = [];
  if (result.summary.errors > 0) {
    summaryParts.push(`${c.red}${result.summary.errors} errors${c.reset}`);
  }
  if (result.summary.warnings > 0) {
    summaryParts.push(
      `${c.yellow}${result.summary.warnings} warnings${c.reset}`
    );
  }
  if (result.summary.suggestions > 0) {
    summaryParts.push(
      `${c.blue}${result.summary.suggestions} suggestions${c.reset}`
    );
  }

  if (summaryParts.length > 0) {
    lines.push(`Summary: ${summaryParts.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Format a single finding for console
 * @param {Finding} finding
 * @param {typeof colors} c
 * @returns {string}
 */
function formatFindingConsole(finding, c) {
  const lines = [];
  lines.push(`  ${c.dim}${finding.ruleId}${c.reset}`);
  lines.push(`    ${c.cyan}${finding.path}${c.reset}`);
  lines.push(`    ${finding.message}`);

  if (finding.suggestion) {
    lines.push(`    ${c.dim}→ ${finding.suggestion}${c.reset}`);
  }

  return lines.join('\n');
}

/**
 * Format result for SARIF output (Static Analysis Results Interchange Format)
 * Useful for integration with CI/CD tools and IDEs
 * @param {ReviewResult} result
 * @returns {string}
 */
export function formatSARIF(result) {
  const sarif = {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'aip-openapi-reviewer',
            version: result.metadata.reviewerVersion,
            informationUri: 'https://google.aip.dev',
            rules: result.metadata.rulesApplied.map((ruleId) => ({
              id: ruleId,
              shortDescription: { text: ruleId },
            })),
          },
        },
        results: result.findings.map((finding) => ({
          ruleId: finding.ruleId,
          level: severityToSARIF(finding.severity),
          message: { text: finding.message },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: result.specPath },
              },
              logicalLocations: [{ name: finding.path }],
            },
          ],
          properties: {
            aip: finding.aip,
            category: finding.category,
            suggestion: finding.suggestion,
          },
        })),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

/**
 * Convert severity to SARIF level
 * @param {import('./types.js').Severity} severity
 * @returns {string}
 */
function severityToSARIF(severity) {
  switch (severity) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'suggestion':
      return 'note';
    default:
      return 'none';
  }
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// No colors (for non-TTY output)
const noColors = {
  reset: '',
  bold: '',
  dim: '',
  red: '',
  green: '',
  yellow: '',
  blue: '',
  cyan: '',
};
