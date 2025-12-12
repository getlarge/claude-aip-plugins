/**
 * AIP OpenAPI Reviewer MCP Server
 *
 * MCP integration code adapted from fastify-mcp
 * https://github.com/haroldadmin/fastify-mcp
 * Licensed under MIT
 */

import Fastify, { FastifyReply } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

import { createMcpServer, SERVER_VERSION } from './mcp.js';
import { securityPlugin } from './plugins/security.js';
import { rateLimitPlugin } from './plugins/rate-limit.js';

// ============================================================================
// Session Storage (adapted from fastify-mcp)
// ============================================================================

type SessionEvents = {
  connected: [string];
  terminated: [string];
  error: [unknown];
};

export class Sessions<T extends Transport>
  extends EventEmitter<SessionEvents>
  implements Iterable<T>
{
  private readonly sessions: Map<string, T>;

  constructor() {
    super({ captureRejections: true });
    this.sessions = new Map();
  }

  add = (id: string, transport: T) => {
    if (this.sessions.has(id)) {
      throw new Error('Session already exists');
    }
    this.sessions.set(id, transport);
    this.emit('connected', id);
  };

  remove = (id: string) => {
    this.sessions.delete(id);
    this.emit('terminated', id);
  };

  get = (id: string): T | undefined => {
    return this.sessions.get(id);
  };

  get count() {
    return this.sessions.size;
  }

  [Symbol.iterator]() {
    return this.sessions.values();
  }
}

// ============================================================================
// Transport Helpers (adapted from fastify-mcp)
// ============================================================================

function createStatefulTransport(
  sessions: Sessions<StreamableHTTPServerTransport>
): StreamableHTTPServerTransport {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      sessions.add(id, transport);
    },
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      sessions.remove(transport.sessionId);
    }
  };

  return transport;
}

function invalidSessionId(reply: FastifyReply): void {
  reply.status(400).send({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Bad Request: No valid session ID provided',
    },
    id: null,
  });
}

function methodNotAllowed(reply: FastifyReply): void {
  reply.status(405).send({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Method not allowed.',
    },
    id: null,
  });
}

// ============================================================================
// Server Configuration
// ============================================================================

export interface ServerConfig {
  port?: number;
  host?: string;
  stateful?: boolean;
  mcpEndpoint?: string;
}

const DEFAULT_CONFIG: Required<ServerConfig> = {
  port: 4000,
  host: '0.0.0.0',
  stateful: true,
  mcpEndpoint: '/mcp',
};

// ============================================================================
// Main Server Setup
// ============================================================================

export async function createServer(config: ServerConfig = {}) {
  const { port, host, stateful, mcpEndpoint } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const fastify = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Register plugins
  await fastify.register(securityPlugin);
  await fastify.register(rateLimitPlugin);
  // await fastify.register(authPlugin);

  // Session storage for stateful mode
  const sessions = new Sessions<StreamableHTTPServerTransport>();

  // Log session events
  sessions.on('connected', (id) => {
    fastify.log.info({ sessionId: id }, 'MCP session connected');
  });
  sessions.on('terminated', (id) => {
    fastify.log.info({ sessionId: id }, 'MCP session terminated');
  });

  // Health check endpoint
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      version: SERVER_VERSION,
      sessions: sessions.count,
    };
  });

  if (stateful) {
    // Stateful MCP routes (session persistence)
    fastify.post(mcpEndpoint, async (req, reply) => {
      const sessionId = req.headers['mcp-session-id'];
      if (Array.isArray(sessionId)) {
        return invalidSessionId(reply);
      }

      if (!sessionId) {
        if (!isInitializeRequest(req.body)) {
          return invalidSessionId(reply);
        }

        const transport = createStatefulTransport(sessions);
        const server = createMcpServer();
        await server.connect(transport);
        await transport.handleRequest(req.raw, reply.raw, req.body);
      } else {
        const transport = sessions.get(sessionId);
        if (!transport) {
          return invalidSessionId(reply);
        }
        await transport.handleRequest(req.raw, reply.raw, req.body);
      }
    });

    fastify.get(mcpEndpoint, async (req, reply) => {
      const sessionId = req.headers['mcp-session-id'];
      if (!sessionId || Array.isArray(sessionId)) {
        return invalidSessionId(reply);
      }

      const transport = sessions.get(sessionId);
      if (!transport) {
        return invalidSessionId(reply);
      }
      await transport.handleRequest(req.raw, reply.raw, req.body);
    });

    fastify.delete(mcpEndpoint, async (req, reply) => {
      const sessionId = req.headers['mcp-session-id'];
      if (!sessionId || Array.isArray(sessionId)) {
        return invalidSessionId(reply);
      }

      const transport = sessions.get(sessionId);
      if (!transport) {
        return invalidSessionId(reply);
      }

      await transport.handleRequest(req.raw, reply.raw, req.body);
      sessions.remove(sessionId);
    });
  } else {
    // Stateless MCP routes (new server per request)
    fastify.post(mcpEndpoint, async (req, reply) => {
      const server = await createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      reply.raw.on('close', async () => {
        await transport.close();
        await server.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req.raw, reply.raw, req.body);
    });

    fastify.get(mcpEndpoint, async (_req, reply) => {
      return methodNotAllowed(reply);
    });

    fastify.delete(mcpEndpoint, async (_req, reply) => {
      return methodNotAllowed(reply);
    });
  }

  return {
    fastify,
    sessions,
    async start() {
      await fastify.listen({ port, host });
      fastify.log.info(`MCP server listening on http://${host}:${port}`);
      fastify.log.info(`MCP endpoint: ${mcpEndpoint}`);
      fastify.log.info(`Mode: ${stateful ? 'stateful' : 'stateless'}`);
    },
    async stop() {
      await fastify.close();
    },
  };
}
