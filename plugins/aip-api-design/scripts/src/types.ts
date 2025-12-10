/**
 * AIP-based OpenAPI Reviewer - Type Definitions
 * @module types
 */

/** Severity levels for findings */
export type Severity = 'error' | 'warning' | 'suggestion';

/** Categories of AIP rules */
export type RuleCategory =
  | 'naming'
  | 'standard-methods'
  | 'errors'
  | 'pagination'
  | 'filtering'
  | 'lro'
  | 'idempotency'
  | 'versioning'
  | 'security';

/**
 * A single finding from the review process
 */
export interface Finding {
  /** Unique identifier for this finding type */
  ruleId: string;
  /** Severity level */
  severity: Severity;
  /** Category of the rule */
  category: RuleCategory;
  /** Location in the spec (e.g., "GET /users/{id}") */
  path: string;
  /** Human-readable description of the issue */
  message: string;
  /** Reference to relevant AIP (e.g., "AIP-158") */
  aip?: string;
  /** Suggested fix description */
  suggestion?: string;
  /** JSONPath to the problematic location in the spec */
  jsonPath?: string;
  /** Additional context for framework-specific fixers */
  context?: Record<string, unknown>;
}

/**
 * Result of reviewing a spec
 */
export interface ReviewResult {
  /** Path to the reviewed spec */
  specPath: string;
  /** OpenAPI spec title */
  specTitle?: string;
  /** OpenAPI spec version */
  specVersion?: string;
  /** All findings */
  findings: Finding[];
  /** Summary counts */
  summary: {
    errors: number;
    warnings: number;
    suggestions: number;
    byCategory: Record<RuleCategory, number>;
  };
  /** Review metadata */
  metadata: {
    reviewedAt: string;
    reviewerVersion: string;
    rulesApplied: string[];
  };
}

/**
 * Configuration for the reviewer
 */
export interface ReviewerConfig {
  /** Treat warnings as errors */
  strict?: boolean;
  /** Only run specific rule categories */
  categories?: RuleCategory[];
  /** Skip specific rule IDs */
  skipRules?: string[];
  /** Custom rules to add */
  customRules?: Rule[];
}

/**
 * A single review rule
 */
export interface Rule {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Category */
  category: RuleCategory;
  /** Default severity */
  severity: Severity;
  /** AIP reference */
  aip?: string;
  /** Description of what this rule checks */
  description: string;
  /** The check function */
  check: RuleChecker;
}

/**
 * Function signature for rule checkers
 */
export type RuleChecker = (
  spec: OpenAPISpec,
  context: RuleContext
) => Finding[];

/**
 * Context passed to rule checkers
 */
export interface RuleContext {
  /** Full spec for cross-referencing */
  spec: OpenAPISpec;
  /** Helper to create findings */
  createFinding: (
    partial: Partial<Finding> & { path: string; message: string }
  ) => Finding;
}

// ============================================
// OpenAPI Types (simplified for our use case)
// ============================================

export interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  paths?: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, Schema>;
    parameters?: Record<string, Parameter>;
    responses?: Record<string, Response>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
  servers?: Server[];
  tags?: Tag[];
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  patch?: Operation;
  delete?: Operation;
  options?: Operation;
  head?: Operation;
  trace?: Operation;
  parameters?: Parameter[];
  summary?: string;
  description?: string;
}

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, Response>;
  security?: SecurityRequirement[];
  deprecated?: boolean;
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: Schema;
  style?: string;
  explode?: boolean;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, MediaType>;
}

export interface Response {
  description?: string;
  headers?: Record<string, Header>;
  content?: Record<string, MediaType>;
  $ref?: string;
}

export interface MediaType {
  schema?: Schema;
  example?: unknown;
  examples?: Record<string, Example>;
}

export interface Schema {
  type?: string;
  format?: string;
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
  enum?: unknown[];
  $ref?: string;
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  nullable?: boolean;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | Schema;
}

export interface Header {
  description?: string;
  schema?: Schema;
}

export interface Example {
  summary?: string;
  description?: string;
  value?: unknown;
}

export interface SecurityScheme {
  type: string;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: Record<string, unknown>;
  openIdConnectUrl?: string;
}

export interface SecurityRequirement {
  [name: string]: string[];
}

export interface Server {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

export interface ServerVariable {
  default: string;
  description?: string;
  enum?: string[];
}

export interface Tag {
  name: string;
  description?: string;
}
