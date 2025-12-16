/**
 * Tool context types for dependency injection.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { WorkerPool } from './worker-pool.js';

/**
 * Context passed to tools during registration.
 * Contains shared dependencies like the worker pool.
 */
export interface ToolContext {
  workerPool: WorkerPool;
}

/**
 * Extended context for tools that need MCP server capabilities
 * (e.g., sampling, logging).
 */
export interface ExtendedToolContext extends ToolContext {
  /**
   * The underlying MCP Server instance for sampling/logging.
   */
  server: Server;

  /**
   * HTTP request headers (for API key extraction from X-Anthropic-Key).
   * Only available when running via HTTP transport.
   */
  httpHeaders?: Record<string, string | string[] | undefined>;
}
