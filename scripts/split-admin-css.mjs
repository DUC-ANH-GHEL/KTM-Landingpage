import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function findUniqueIndex(haystack, needle) {
  const first = haystack.indexOf(needle);
  if (first < 0) throw new Error(`Marker not found: ${needle}`);
  const second = haystack.indexOf(needle, first + needle.length);
  if (second >= 0) throw new Error(`Marker not unique (found twice): ${needle}`);
  return first;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

const manifestPath = path.join(workspaceRoot, 'admin-css', 'manifest.json');
const manifest = readJson(manifestPath);

const sourcePath = path.join(workspaceRoot, manifest.source);
const partsDir = path.join(workspaceRoot, manifest.partsDir);

ensureDir(partsDir);

const src = fs.readFileSync(sourcePath, 'utf8');

const m = manifest.markers;

const idxMobile = findUniqueIndex(src, m.mobileFirst);
const idxOld = findUniqueIndex(src, m.oldStyles);
const idxPremium = findUniqueIndex(src, m.premiumShell);
const idxDrawer = findUniqueIndex(src, m.opsDrawer);
const idxSidebar = findUniqueIndex(src, m.sidebarMain);
const idxPalette = findUniqueIndex(src, m.commandPalette);
const idxRecon = findUniqueIndex(src, m.reconExcel);

const ranges = [
  { file: '00-base.css', start: 0, end: idxMobile },
  { file: '10-mobile-ui.css', start: idxMobile, end: idxOld },
  { file: '20-legacy-ops.css', start: idxOld, end: idxPremium },
  { file: '30-premium-shell.css', start: idxPremium, end: idxDrawer },
  { file: '40-ops-drawer.css', start: idxDrawer, end: idxSidebar },
  { file: '50-sidebar-layout.css', start: idxSidebar, end: idxPalette },
  { file: '60-command-palette.css', start: idxPalette, end: idxRecon },
  { file: '70-recon.css', start: idxRecon, end: src.length }
];

const expected = new Set(manifest.parts);
for (const r of ranges) {
  if (!expected.has(r.file)) {
    throw new Error(`Range file not in manifest.parts: ${r.file}`);
  }
}

for (const r of ranges) {
  const outPath = path.join(partsDir, r.file);
  const slice = src.slice(r.start, r.end);
  fs.writeFileSync(outPath, slice, 'utf8');
}

console.log(`Split ${path.basename(sourcePath)} into ${ranges.length} parts in ${path.relative(workspaceRoot, partsDir)}`);
