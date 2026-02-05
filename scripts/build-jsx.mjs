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

async function readFileIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) return null;
    throw err;
  }
}

async function loadAdminSourceFromManifest() {
  const manifestAbs = path.join(root, 'admin-src', 'manifest.json');
  const raw = await readFileIfExists(manifestAbs);
  if (!raw) return null;

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    throw new Error('admin-src/manifest.json is not valid JSON');
  }

  if (!Array.isArray(manifest) || manifest.length === 0) return null;

  const parts = [];
  for (const rel of manifest) {
    const relPath = String(rel || '').trim();
    if (!relPath) continue;
    const abs = path.join(root, 'admin-src', relPath);
    const content = await readFileIfExists(abs);
    if (content == null) {
      throw new Error(`Missing admin source part: admin-src/${relPath}`);
    }
    parts.push(content);
  }
  return parts.join('\n');
}

async function loadSourceFromManifest({ manifestAbs, partsBaseAbs }) {
  const raw = await readFileIfExists(manifestAbs);
  if (!raw) return null;

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    throw new Error(`${path.relative(root, manifestAbs)} is not valid JSON`);
  }

  if (!Array.isArray(manifest) || manifest.length === 0) return null;

  const parts = [];
  for (const rel of manifest) {
    const relPath = String(rel || '').trim();
    if (!relPath) continue;
    const abs = path.join(partsBaseAbs, relPath);
    const content = await readFileIfExists(abs);
    if (content == null) {
      throw new Error(`Missing manifest part: ${path.relative(root, abs)}`);
    }
    parts.push(content);
  }
  return parts.join('\n');
}

async function loadSourceOverrideForInput(input) {
  // Admin: already supports admin-src/manifest.json
  if (input === 'admin.js') {
    return await loadAdminSourceFromManifest();
  }

  // App: allow splitting app.js into app-src/manifest.json
  if (input === 'app.js') {
    return await loadSourceFromManifest({
      manifestAbs: path.join(root, 'app-src', 'manifest.json'),
      partsBaseAbs: path.join(root, 'app-src'),
    });
  }

  // Components: allow splitting components/<Name>.js into components-src/<Name>/manifest.json
  if (input.startsWith('components/') && input.endsWith('.js')) {
    const baseName = path.basename(input, '.js');
    return await loadSourceFromManifest({
      manifestAbs: path.join(root, 'components-src', baseName, 'manifest.json'),
      partsBaseAbs: path.join(root, 'components-src', baseName),
    });
  }

  return null;
}

async function buildOne({ input, output }) {
  const inAbs = path.join(root, input);
  const outAbs = path.join(root, output);

  let source = null;

  // Allow splitting large classic-script inputs into many files without changing runtime loading.
  // If a relevant manifest exists, we concatenate the listed parts in order and build the output from that combined source.
  source = await loadSourceOverrideForInput(input);

  if (source == null) {
    source = await fs.readFile(inAbs, 'utf8');
  }

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
