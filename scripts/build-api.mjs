import { promises as fs } from 'node:fs';
import path from 'node:path';
import { transform } from 'esbuild';

const root = path.resolve(process.cwd());

async function readFileIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) return null;
    throw err;
  }
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function loadFromManifest(manifestAbs, partsBaseAbs) {
  const raw = await readFileIfExists(manifestAbs);
  if (!raw) throw new Error(`Missing manifest: ${path.relative(root, manifestAbs)}`);

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    throw new Error(`${path.relative(root, manifestAbs)} is not valid JSON`);
  }

  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error(`${path.relative(root, manifestAbs)} must be a non-empty array`);
  }

  const parts = [];
  for (const rel of manifest) {
    const relPath = String(rel || '').trim();
    if (!relPath) continue;
    const abs = path.join(partsBaseAbs, relPath);
    const content = await readFileIfExists(abs);
    if (content == null) throw new Error(`Missing part: ${path.relative(root, abs)}`);
    parts.push(content);
  }

  return parts.join('\n');
}

async function buildEndpoint({ name, srcDir, outFile }) {
  const manifestAbs = path.join(root, srcDir, 'manifest.json');
  const combined = await loadFromManifest(manifestAbs, path.join(root, srcDir));

  const result = await transform(combined, {
    loader: 'js',
    target: 'es2020',
    format: 'esm',
    minify: true,
    legalComments: 'none',
    sourcemap: false,
  });

  const outAbs = path.join(root, outFile);
  await ensureDir(outAbs);
  await fs.writeFile(outAbs, result.code + '\n', 'utf8');

  const lines = result.code.split('\n').length;
  process.stdout.write(`Built ${outFile} (${name}) lines=${lines}\n`);
}

async function main() {
  await buildEndpoint({ name: 'orders-handler', srcDir: 'api-src/orders-handler', outFile: 'api/orders-handler.js' });
  await buildEndpoint({ name: 'products', srcDir: 'api-src/products', outFile: 'api/products.js' });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
