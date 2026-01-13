/**
 * MCP Handler Context Types
 *
 * Local type definitions for @platformatic/mcp handler context.
 * These match the internal types from the library since they're not exported.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Authorization context extracted from OAuth2 tokens.
 */
export interface AuthorizationContext {
  userId?: string;
  clientId?: string;
  scopes?: string[];
  audience?: string[];
  tokenType?: string;
  tokenHash?: string;
  expiresAt?: Date;
  issuedAt?: Date;
  refreshToken?: string;
  authorizationServer?: string;
  sessionBoundToken?: string;
}

/**
 * Context passed to MCP tool/resource/prompt handlers.
 * Mirrors HandlerContext from @platformatic/mcp/types.
 */
export interface HandlerContext {
  sessionId?: string;
  request: FastifyRequest;
  reply: FastifyReply;
  authContext?: AuthorizationContext;
}

/**
 * Re-export CallToolResult and ReadResourceResult from @platformatic/mcp.
 */
export type { CallToolResult, ReadResourceResult } from '@platformatic/mcp';
