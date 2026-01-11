#!/usr/bin/env node
import * as esbuild from 'esbuild';
import { readFile, rm } from 'node:fs/promises';

const pkg = JSON.parse(await readFile('./package.json', 'utf-8'));

// Clean old bundle files (preserve tsc output for dev)
await rm('dist/stdio.bundle.js', { force: true });
await rm('dist/stdio.bundle.js.map', { force: true });
await rm('dist/server.bundle.js', { force: true });
await rm('dist/server.bundle.js.map', { force: true });

// Plugin to strip shebang from source files (esbuild will add it back via banner)
const stripShebangPlugin = {
  name: 'strip-shebang',
  setup(build) {
    build.onLoad({ filter: /\.(js|ts)$/ }, async (args) => {
      let contents = await readFile(args.path, 'utf-8');
      if (contents.startsWith('#!')) {
        contents = contents.replace(/^#![^\n]*\n/, '');
      }
      return { contents, loader: args.path.endsWith('.ts') ? 'ts' : 'js' };
    });
  },
};

// Banner to provide require() in ESM context for CommonJS dependencies
const requireBanner = `
import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __pathDirname } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
`.trim();

// Common build options
const commonOptions = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  // Bundle everything - MCP SDK is NOT provided by Claude Code in plugin context
  minify: false,
  sourcemap: true,
  logLevel: 'info',
};

// Bundle the STDIO server
await esbuild.build({
  ...commonOptions,
  entryPoints: ['src/stdio.ts'],
  outfile: 'dist/stdio.bundle.js',
  plugins: [stripShebangPlugin],
  banner: {
    js: `#!/usr/bin/env node\n// @getlarge/aip-openapi-reviewer-mcp v${pkg.version}\n// Bundled with esbuild\n${requireBanner}`,
  },
});

// Bundle the HTTP server
await esbuild.build({
  ...commonOptions,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/server.bundle.js',
  plugins: [stripShebangPlugin],
  banner: {
    js: `// @getlarge/aip-openapi-reviewer-mcp v${pkg.version}\n// Bundled with esbuild\n${requireBanner}`,
  },
});

console.log('✅ mcp-server bundled successfully');
