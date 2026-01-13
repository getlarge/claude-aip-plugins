/**
 * MCP Resource Registration
 *
 * Registers AIP resources with @platformatic/mcp using:
 * 1. Custom list handler for dynamic resource enumeration from storage
 * 2. Pattern-based handlers via mcpAddResource for resource read
 * 3. Custom templates handler for URI template discovery
 *
 * Resources exposed:
 * - aip://findings/{reviewId} - AIP review findings (may include code locations)
 * - aip://specs/{specId} - Modified OpenAPI specs
 */

import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';

import type {
  HandlerContext,
  ReadResourceResult,
  Resource,
  ResourceTemplate,
} from '../types/mcp-context.js';

import { getFindingsStorage } from '../services/findings-storage.js';
import { getTempStorage } from '../services/temp-storage.js';

/**
 * Parse AIP resource URI to extract type and ID.
 * Supports formats:
 * - aip://findings/{id}
 * - aip://specs/{id}
 * - aip://findings?id={id}
 * - aip://specs?id={id}
 */
function parseAipUri(
  uri: string
): { type: 'findings' | 'specs'; id: string } | null {
  // Try path format: aip://findings/{id}
  const pathMatch = uri.match(/^aip:\/\/(findings|specs)\/(.+)$/);
  if (pathMatch) {
    return {
      type: pathMatch[1] as 'findings' | 'specs',
      id: pathMatch[2],
    };
  }

  // Try query format: aip://findings?id={id}
  try {
    const url = new URL(uri);
    const host = url.host || url.pathname.split('/')[0];
    if (host === 'findings' || host === 'specs') {
      const id = url.searchParams.get('id');
      if (id) {
        return { type: host as 'findings' | 'specs', id };
      }
    }
  } catch {
    // Not a valid URL format
  }

  return null;
}

// URI schema for findings resources
const FindingsUriSchema = Type.String({
  pattern: '^aip://findings/.+',
  description: 'URI for AIP review findings',
});

// URI schema for specs resources
const SpecsUriSchema = Type.String({
  pattern: '^aip://specs/.+',
  description: 'URI for modified OpenAPI specs',
});

/**
 * Resource templates for AIP resources.
 */
const RESOURCE_TEMPLATES: ResourceTemplate[] = [
  {
    uriTemplate: 'aip://findings/{reviewId}',
    name: 'AIP Review Findings',
    description:
      'Access cached AIP review findings by reviewId. May include code locations if correlated.',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'aip://specs/{specId}',
    name: 'Modified OpenAPI Specs',
    description: 'Access modified OpenAPI specs by specId.',
    mimeType: 'application/octet-stream',
  },
];

/**
 * Register AIP resources with the Fastify instance.
 */
export function registerAipResources(fastify: FastifyInstance) {
  // Register custom list handler for dynamic resource enumeration
  fastify.mcpSetResourcesListHandler(
    async (
      _params,
      _context
    ): Promise<{ resources: Resource[]; nextCursor?: string }> => {
      const findingsStore = getFindingsStorage();
      const tempStore = getTempStorage();

      // Get all resources from storage
      const [findingsResult, specsResult] = await Promise.all([
        findingsStore.listAll(),
        tempStore.listAll(),
      ]);

      const findingsList = findingsResult.items;
      const specsList = specsResult.items;

      const resources: Resource[] = [
        // Map findings to resources
        ...findingsList.map((f) => ({
          uri: `aip://findings/${f.id}`,
          name: `AIP Review ${f.id.slice(0, 8)}`,
          description: `AIP review findings (created ${new Date(f.createdAt).toISOString()})`,
          mimeType: 'application/json',
          annotations: {
            audience: ['assistant'] as string[],
            priority: 0.8,
          },
        })),
        // Map specs to resources
        ...specsList.map((s) => ({
          uri: `aip://specs/${s.id}`,
          name: `Spec ${s.id.slice(0, 8)}`,
          description: `Modified OpenAPI spec (${s.contentType})`,
          mimeType:
            s.contentType === 'yaml'
              ? 'application/x-yaml'
              : 'application/json',
          annotations: {
            audience: ['assistant'] as string[],
            priority: 0.6,
          },
        })),
      ];

      return { resources, nextCursor: undefined };
    }
  );

  // Register custom templates handler
  fastify.mcpSetResourcesTemplatesListHandler(
    async (
      _params,
      _context
    ): Promise<{
      resourceTemplates: ResourceTemplate[];
      nextCursor?: string;
    }> => {
      return { resourceTemplates: RESOURCE_TEMPLATES, nextCursor: undefined };
    }
  );

  // Register findings resource handler for pattern-based read
  fastify.mcpAddResource(
    {
      uriPattern: 'aip://findings/{reviewId}',
      name: 'AIP Review Findings',
      description:
        'Access cached AIP review findings by reviewId. May include code locations if correlated.',
      mimeType: 'application/json',
      uriSchema: FindingsUriSchema,
    },
    async (
      uri: string,
      _context: HandlerContext
    ): Promise<ReadResourceResult> => {
      const parsed = parseAipUri(uri);
      if (!parsed || parsed.type !== 'findings') {
        return {
          contents: [
            {
              uri,
              text: JSON.stringify({ error: `Invalid findings URI: ${uri}` }),
              mimeType: 'application/json',
            },
          ],
        };
      }

      const findingsStore = getFindingsStorage();
      const resource = await findingsStore.get(parsed.id);

      if (!resource) {
        return {
          contents: [
            {
              uri,
              text: JSON.stringify({
                error: 'Findings not found',
                reviewId: parsed.id,
              }),
              mimeType: 'application/json',
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: resource.content,
          },
        ],
      };
    }
  );

  // Register specs resource
  fastify.mcpAddResource(
    {
      uriPattern: 'aip://specs/{specId}',
      name: 'Modified OpenAPI Specs',
      description: 'Access modified OpenAPI specs by specId.',
      mimeType: 'application/octet-stream',
      uriSchema: SpecsUriSchema,
    },
    async (
      uri: string,
      _context: HandlerContext
    ): Promise<ReadResourceResult> => {
      const parsed = parseAipUri(uri);
      if (!parsed || parsed.type !== 'specs') {
        return {
          contents: [
            {
              uri,
              text: JSON.stringify({ error: `Invalid specs URI: ${uri}` }),
              mimeType: 'application/json',
            },
          ],
        };
      }

      const tempStore = getTempStorage();
      const resource = await tempStore.get(parsed.id);

      if (!resource) {
        return {
          contents: [
            {
              uri,
              text: JSON.stringify({
                error: 'Spec not found',
                specId: parsed.id,
              }),
              mimeType: 'application/json',
            },
          ],
        };
      }

      const mimeType =
        resource.contentType === 'yaml'
          ? 'application/x-yaml'
          : 'application/json';

      return {
        contents: [
          {
            uri,
            mimeType,
            text: resource.content,
          },
        ],
      };
    }
  );

  fastify.log.info('AIP resources registered with custom handlers');
}

/**
 * Helper to notify subscribed sessions when a resource is updated.
 * Uses existing platformatic notification patterns.
 */
export async function notifyResourceUpdated(
  fastify: FastifyInstance,
  uri: string
): Promise<void> {
  const subscriptions = fastify.mcpGetResourceSubscriptions();
  const notification = {
    jsonrpc: '2.0' as const,
    method: 'notifications/resources/updated',
    params: { uri },
  };

  for (const [sessionId, uris] of subscriptions.entries()) {
    if (uris.has(uri)) {
      await fastify.mcpSendToSession(sessionId, notification);
    }
  }
}

/**
 * Helper to broadcast that the resource list has changed.
 * Uses existing platformatic notification patterns.
 */
export async function notifyResourceListChanged(
  fastify: FastifyInstance
): Promise<void> {
  await fastify.mcpBroadcastNotification({
    jsonrpc: '2.0',
    method: 'notifications/resources/list_changed',
  });
}
