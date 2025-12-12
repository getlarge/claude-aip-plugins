/**
 * Rate Limiting Plugin
 *
 * Uses @fastify/rate-limit for production-ready rate limiting.
 * For high-scale deployments, configure Redis as the store.
 */

import rateLimit from '@fastify/rate-limit';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

// Configuration from environment
const WINDOW_MS = parseInt(
  process.env['RATE_LIMIT_WINDOW_MS'] ?? String(60 * 1000),
  10
); // 1 minute
const MAX_REQUESTS = parseInt(process.env['RATE_LIMIT_MAX'] ?? '60', 10); // 60 requests per window

const rateLimitPluginImpl: FastifyPluginAsync = async (fastify) => {
  fastify.log.info(
    { windowMs: WINDOW_MS, maxRequests: MAX_REQUESTS },
    'Rate limit plugin: configured'
  );

  await fastify.register(rateLimit, {
    max: MAX_REQUESTS,
    timeWindow: WINDOW_MS,
    // Skip rate limiting for health endpoint
    allowList: (request) => request.url === '/health',
    // Custom error response in JSON-RPC format
    errorResponseBuilder: (request, context) => {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: `Rate limit exceeded. Retry after ${Math.ceil(context.ttl / 1000)} seconds.`,
        },
        id: null,
      };
    },
    // Key generator (default uses IP)
    keyGenerator: (request) => {
      // Use session ID if available, otherwise fall back to IP
      const sessionId = request.headers['mcp-session-id'];
      if (sessionId && typeof sessionId === 'string') {
        return sessionId;
      }
      return request.ip;
    },
  });
};

export const rateLimitPlugin = fp(rateLimitPluginImpl, {
  name: 'rate-limit',
  fastify: '5.x',
});
