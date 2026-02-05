import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const manifestPath = path.join(workspaceRoot, 'admin-css', 'manifest.json');
const manifest = readJson(manifestPath);

const sourcePath = path.join(workspaceRoot, manifest.source);
const partsDir = path.join(workspaceRoot, manifest.partsDir);

const src = fs.readFileSync(sourcePath);

const chunks = [];
for (const file of manifest.parts) {
  const partPath = path.join(partsDir, file);
  if (!fs.existsSync(partPath)) {
    throw new Error(`Missing part file: ${path.relative(workspaceRoot, partPath)}`);
  }
  chunks.push(fs.readFileSync(partPath));
}

const combined = Buffer.concat(chunks);

if (combined.equals(src)) {
  console.log('OK: admin.css matches concatenation of parts exactly');
  process.exit(0);
}

// Find first differing byte for actionable debugging.
const minLen = Math.min(combined.length, src.length);
let firstDiff = -1;
for (let i = 0; i < minLen; i++) {
  if (combined[i] !== src[i]) {
    firstDiff = i;
    break;
  }
}

const lenInfo = combined.length === src.length ? 'same length' : `length differs (combined=${combined.length}, source=${src.length})`;
throw new Error(`Mismatch: ${lenInfo}; first differing byte offset=${firstDiff}`);
