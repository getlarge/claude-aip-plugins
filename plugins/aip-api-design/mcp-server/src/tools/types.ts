/**
 * Tool context types for dependency injection.
 */

import type { WorkerPool } from './worker-pool.js';

/**
 * Context passed to tools during registration.
 * Contains shared dependencies like the worker pool.
 */
export interface ToolContext {
  workerPool: WorkerPool;
}
