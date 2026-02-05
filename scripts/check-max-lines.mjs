import { execSync } from 'node:child_process';
import fs from 'node:fs';

const MAX_LINES = Number(process.env.MAX_LINES || 500);

function getTrackedFiles() {
  const out = execSync('git ls-files', { stdio: ['ignore', 'pipe', 'inherit'] }).toString('utf8');
  return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function countLines(text) {
  // Match PowerShell Measure-Object -Line behavior for normal text files.
  return text.split('\n').length;
}

const offenders = [];
for (const p of getTrackedFiles()) {
  try {
    const buf = fs.readFileSync(p);
    // Skip likely-binary files (very small heuristic): contains NUL.
    if (buf.includes(0)) continue;
    const text = buf.toString('utf8');
    const lines = countLines(text);
    if (lines > MAX_LINES) offenders.push({ lines, path: p });
  } catch {
    // Ignore unreadable files.
  }
}

if (offenders.length) {
  offenders.sort((a, b) => b.lines - a.lines);
  console.error(`Found ${offenders.length} tracked files over ${MAX_LINES} lines:`);
  for (const o of offenders) console.error(`${String(o.lines).padStart(6)}  ${o.path}`);
  process.exitCode = 1;
} else {
  console.log(`OK: no tracked files over ${MAX_LINES} lines`);
}
