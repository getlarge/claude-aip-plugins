#!/usr/bin/env node
import * as esbuild from 'esbuild';
import { readFile, rm } from 'node:fs/promises';

const pkg = JSON.parse(await readFile('./package.json', 'utf-8'));

// Clean only bundle files, preserve type declarations from tsc
await rm('dist/reviewer.bundle.js', { force: true });
await rm('dist/reviewer.bundle.js.map', { force: true });
await rm('dist/cli.bundle.js', { force: true });
await rm('dist/cli.bundle.js.map', { force: true });
await rm('dist/discover.bundle.js', { force: true });
await rm('dist/discover.bundle.js.map', { force: true });

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
  minify: false,
  sourcemap: true,
  logLevel: 'info',
};

// Bundle the library for use as a module (includes all dependencies)
await esbuild.build({
  ...commonOptions,
  entryPoints: ['src/index.js'],
  outfile: 'dist/reviewer.bundle.js',
  banner: {
    js: `// @getlarge/aip-openapi-reviewer v${pkg.version}\n// Bundled with esbuild\n${requireBanner}`,
  },
});

// Bundle the CLI separately (fully self-contained)
await esbuild.build({
  ...commonOptions,
  entryPoints: ['src/cli.js'],
  outfile: 'dist/cli.bundle.js',
  plugins: [stripShebangPlugin],
  banner: {
    js: `#!/usr/bin/env node\n${requireBanner}`,
  },
});

// Bundle the discover CLI (fully self-contained)
await esbuild.build({
  ...commonOptions,
  entryPoints: ['src/discover.js'],
  outfile: 'dist/discover.bundle.js',
  plugins: [stripShebangPlugin],
  banner: {
    js: `#!/usr/bin/env node\n${requireBanner}`,
  },
});

console.log('✅ openapi-reviewer bundled successfully');
