import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const value = argv[i + 1];
    if (value == null || value.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = value;
      i++;
    }
  }
  return args;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function usage() {
  console.log('Usage: node scripts/split-into-parts.mjs --input <file> --outDir <dir> [--maxLines 480] [--ext .js]');
}

const args = parseArgs(process.argv.slice(2));
const inputRel = args.input;
const outDirRel = args.outDir;
const maxLines = Number(args.maxLines || 480);
const ext = String(args.ext || path.extname(inputRel || '') || '.txt');

if (!inputRel || !outDirRel || !Number.isFinite(maxLines) || maxLines <= 0) {
  usage();
  process.exit(2);
}

const root = process.cwd();
const inputAbs = path.join(root, inputRel);
const outDirAbs = path.join(root, outDirRel);

if (!fs.existsSync(inputAbs)) {
  throw new Error(`Input not found: ${inputRel}`);
}

const src = fs.readFileSync(inputAbs, 'utf8');
const lines = src.split('\n');

ensureDir(outDirAbs);

const parts = [];
for (let start = 0, partIndex = 1; start < lines.length; start += maxLines, partIndex++) {
  const end = Math.min(lines.length, start + maxLines);
  const file = `part-${pad2(partIndex)}${ext}`;
  const slice = lines.slice(start, end).join('\n');
  fs.writeFileSync(path.join(outDirAbs, file), slice, 'utf8');
  parts.push(file);
}

fs.writeFileSync(path.join(outDirAbs, 'manifest.json'), JSON.stringify(parts, null, 2) + '\n', 'utf8');

// verify
const combined = parts.map((f) => fs.readFileSync(path.join(outDirAbs, f), 'utf8')).join('\n');
if (combined !== src) {
  // Find first difference for debugging.
  const minLen = Math.min(combined.length, src.length);
  let diffAt = -1;
  for (let i = 0; i < minLen; i++) {
    if (combined.charCodeAt(i) !== src.charCodeAt(i)) {
      diffAt = i;
      break;
    }
  }
  throw new Error(`Split verification failed for ${inputRel}. First diff at offset ${diffAt}. combinedLen=${combined.length} srcLen=${src.length}`);
}

console.log(`OK: split ${inputRel} -> ${outDirRel}/part-** (${parts.length} parts, maxLines=${maxLines})`);
