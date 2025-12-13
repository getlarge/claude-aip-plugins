# AIP OpenAPI Reviewer MCP Server

MCP server exposing AIP OpenAPI reviewer as tools for AI agents (Claude Code, Claude Desktop, etc.).

## Quick Start

```bash
# Build
npm run build

# Run HTTP server (port 4000)
npm run start

# Run STDIO server (for Claude Desktop)
npm run start:stdio
```

## Transports

### HTTP (Streamable HTTP)

```bash
npm run start
# Server at http://localhost:4000
# MCP endpoint: POST /mcp
# Health check: GET /health
```

Supports stateful sessions via `mcp-session-id` header.

### STDIO

```bash
npm run start:stdio
# Or via the bin entry:
npx aip-mcp-server
```

For Claude Desktop, add to config:

```json
{
  "mcpServers": {
    "aip-reviewer": {
      "args": ["/path/to/dist/stdio.js"],
      "command": "node"
    }
  }
}
```

## Tools

| Tool              | Description                            |
| ----------------- | -------------------------------------- |
| `aip-review`      | Analyze OpenAPI spec against AIP rules |
| `aip-apply-fixes` | Apply suggested fixes to a spec        |
| `aip-list-rules`  | List available AIP rules               |
| `aip-get-info`    | Get information about a specific AIP   |

### aip-review

```json
{
  "arguments": {
    "categories": ["naming", "pagination"],
    "skipRules": ["aip122/plural-resources"],
    "specPath": "/path/to/openapi.yaml"
  },
  "name": "aip-review"
}
```

Parameters:

- `specPath` (string): Local file path to OpenAPI spec
- `specUrl` (string): URL to fetch OpenAPI spec from
- `categories` (string[]): Filter by categories (naming, pagination, errors, etc.)
- `skipRules` (string[]): Skip specific rule IDs
- `strict` (boolean): Treat warnings as errors

### aip-apply-fixes

```json
{
  "name": "aip-apply-fixes",
  "arguments": {
    "specPath": "/path/to/openapi.yaml",
    "findings": [...],
    "writeBack": true
  }
}
```

Parameters:

- `specPath` / `specUrl`: Source spec location
- `findings`: Array of findings from `aip-review` (only those with `fix` property are applied)
- `writeBack` (boolean): Write modified spec back to `specPath`
- `dryRun` (boolean): Validate without modifying

Returns a signed URL (valid 5 minutes) to download the modified spec.

## Architecture

### Worker Pool

Both HTTP and STDIO transports use a worker pool for CPU-intensive operations (spec parsing, review execution). This prevents blocking the main event loop.

```
Main Thread                              Worker Thread
============                              =============

1. HTTP fetch / file read
   │
2. ArrayBuffer (raw bytes)
   │
3. Copy to SharedArrayBuffer ─────────→ 4. Receive SAB reference (zero-copy)
   │                                        │
   │                                     5. TextDecoder.decode()
   │                                        │
   │                                     6. JSON.parse() / YAML.parse()
   │                                        │
   │                                     7. OpenAPIReviewer.review()
   │                                        │
   │                                     8. formatJSON(findings)
   │                                        │
9. Receive result ←────────────────────  postMessage(result)
   │
10. Return to client
```

**Key design decisions:**

1. **SharedArrayBuffer for zero-copy transfer**: Specs can be megabytes. Instead of serializing twice (JSON.stringify for postMessage, then parse in worker), we transfer raw bytes via SharedArrayBuffer.

2. **Parsing in worker thread**: All CPU-intensive work (TextDecoder, JSON/YAML parsing, rule execution) happens in the worker. Main thread only does I/O.

3. **Pool sizing**: Defaults to `availableParallelism() - 1` workers (leaves one core for main thread).

4. **No inline spec support**: Removed to avoid double-serialization. Use `specPath` or `specUrl` instead.

### Health Endpoint

```bash
curl http://localhost:4000/health
```

```json
{
  "sessions": 0,
  "status": "ok",
  "tempStorage": {
    "count": 0,
    "type": "sqlite+local-fs"
  },
  "version": "1.0.0",
  "workerPool": {
    "available": 11,
    "busy": 0,
    "queued": 0,
    "total": 11
  }
}
```

### Temp Storage

Modified specs are stored temporarily and served via signed URLs:

- **HTTP transport**: SQLite (multi-process safe)
- **STDIO transport**: In-memory with filesystem fallback

URLs expire after 5 minutes.

## Development

```bash
# Watch mode (rebuilds on change)
npm run dev        # HTTP server
npm run dev:stdio  # STDIO server

# Type check
npm run typecheck

# Lint
npm run lint
```

### Project Structure

```
src/
├── index.ts           # HTTP entry point
├── stdio.ts           # STDIO entry point
├── server.ts          # Fastify HTTP server setup
├── mcp.ts             # MCP server factory
├── tools/
│   ├── index.ts       # Tool registration
│   ├── types.ts       # ToolContext interface
│   ├── review.ts      # aip-review tool
│   ├── apply-fixes.ts # aip-apply-fixes tool
│   ├── list-rules.ts  # aip-list-rules tool
│   ├── get-info.ts    # aip-get-info tool
│   ├── spec-loader.ts # Load specs as raw buffers
│   ├── worker-pool.ts # Worker pool manager
│   └── worker.ts      # Worker thread implementation
├── plugins/
│   ├── security.ts    # CORS, security headers
│   └── rate-limit.ts  # Request rate limiting
└── services/
    └── temp-storage.ts # Temporary spec storage
```

## Environment Variables

| Variable    | Default | Description                              |
| ----------- | ------- | ---------------------------------------- |
| `PORT`      | 4000    | HTTP server port                         |
| `HOST`      | 0.0.0.0 | HTTP server host                         |
| `LOG_LEVEL` | info    | Logging level (debug, info, warn, error) |

## License

MIT
