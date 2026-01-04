import { promises as fs } from 'node:fs';
import path from 'node:path';
import { transform } from 'esbuild';

const root = path.resolve(process.cwd());

const targets = [
  { input: 'admin-helpers.js', output: 'dist/admin-helpers.js' },
  { input: 'admin.js', output: 'dist/admin.js' },
  { input: 'app.js', output: 'dist/app.js' },

  // Home page components (order matters in HTML; output stays classic-script compatible)
  { input: 'components/ImageModal.js', output: 'dist/components/ImageModal.js' },
  { input: 'components/AiChatWidget.js', output: 'dist/components/AiChatWidget.js' },
  { input: 'components/GlobalSearchBar.js', output: 'dist/components/GlobalSearchBar.js' },
  { input: 'components/Layout.js', output: 'dist/components/Layout.js' },
  { input: 'components/ProductShowcase.js', output: 'dist/components/ProductShowcase.js' },
  { input: 'components/ProductComponents.js', output: 'dist/components/ProductComponents.js' },
  { input: 'components/MediaComponents.js', output: 'dist/components/MediaComponents.js' },
  { input: 'components/MiniGame.js', output: 'dist/components/MiniGame.js' },
  { input: 'components/AlbumGallery.js', output: 'dist/components/AlbumGallery.js' },
];

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function buildOne({ input, output }) {
  const inAbs = path.join(root, input);
  const outAbs = path.join(root, output);

  let source = await fs.readFile(inAbs, 'utf8');

  // These files are loaded as classic scripts (not ES modules). If multiple scripts
  // declare `const { useState } = React;` at top-level, the browser throws:
  // "Identifier 'useState' has already been declared".
  // Babel-standalone used to wrap each script in a function, avoiding this.
  // We keep the current multi-script architecture and make the declarations re-declarable.
  source = source.replace(
    /^([ \t]*)const(\s+\{[^}]*\}\s*=\s*React\s*;\s*)$/gm,
    '$1var$2'
  );

  const result = await transform(source, {
    loader: 'jsx',
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    target: 'es2018',
    minify: true,
    legalComments: 'none',
    sourcemap: false,
  });

  await ensureDir(outAbs);
  await fs.writeFile(outAbs, result.code + '\n', 'utf8');
}

async function main() {
  const startedAt = Date.now();
  for (const t of targets) {
    await buildOne(t);
    process.stdout.write(`Built ${t.output}\n`);
  }
  process.stdout.write(`Done in ${Date.now() - startedAt}ms\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
