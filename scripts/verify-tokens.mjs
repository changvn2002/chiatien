#!/usr/bin/env node
/**
 * tokens:verify — CHIATIEN REDESIGN-V4 (D9, LK4-51)
 *
 * Usage:
 *   node scripts/verify-tokens.mjs
 *   node scripts/verify-tokens.mjs --extra <path> [--extra <path> ...]
 *     --extra adds an additional sink file (used for the strip-comment
 *     fixture in v4-measure/). Type is chosen by extension:
 *     .svg -> XML comments, .css -> CSS comments, .ts/.tsx/.js -> TS comments.
 *
 * Checks (pure Node, no dependencies):
 *  1. design/tokens.chiatien-v4.json is byte-identical to the design dossier
 *     tokens.json (../redesign-v4/chiatien/assets/tokens.json) when it exists.
 *  2. Every #RRGGBB literal found in the sinks AFTER comment stripping must
 *     belong to the valid set = every colour $value in tokens.json.
 *     Sinks: app/globals.css, app/layout.tsx, app/manifest.ts,
 *            public/**\/*.svg, public/sw.js,
 *            components/**\/*.{ts,tsx} excluding *.spec.*
 *     Comment stripping (LK4-51): SVG <!-- ... -->, CSS /* ... *\/,
 *            TS/TSX /* ... *\/ and // ... — the TS stripper is string-aware
 *            (single/double/template literals are preserved, so a URL such
 *            as 'https://schema.org' in app/layout.tsx is NOT cut).
 *  3. V3 banned hexes (list below, source: V4-IMPL task W1 / V3 tokens)
 *     found after stripping -> separate FAIL group "hex cam".
 *  4. globals.css: every declared --brand-* / --grey-* / --ink / --canvas /
 *     --avatar-* variable must match its tokens.json counterpart, and
 *     globals.css must declare the full expected set (incl. all 16 --avatar-*).
 *
 * Exit code: 0 = PASS, 1 = FAIL (any group).
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoTokensPath = path.join(repoRoot, 'design', 'tokens.chiatien-v4.json');
const dossierTokensPath = path.resolve(
  repoRoot,
  '..',
  'redesign-v4',
  'chiatien',
  'assets',
  'tokens.json',
);

// --- V3 banned hexes (source: W1 task brief — V3 seed/scale/paper/identity/
//     neutral/semantic tokens, all dead in V4) ---
const BANNED = new Set(
  [
    // seed V3
    '#A5482F',
    // brand scale V3
    '#FFF2EE',
    '#FFE0D7',
    '#FBC6B7',
    '#EBA38F',
    '#D67D65',
    '#8C361E',
    '#702612',
    '#511707',
    '#3A0F04',
    '#1F0401',
    // paper V3
    '#FAF3F1',
    '#FDF5F2',
    // 12 identity cells V3
    '#CF284D',
    '#353C1D',
    '#607200',
    '#4C654C',
    '#00423F',
    '#224A71',
    '#006CD3',
    '#061D9D',
    '#5E56DE',
    '#5637A7',
    '#9F43C3',
    '#8A5673',
    // neutral V3
    '#F1E5E1',
    '#DDD1CE',
    '#C0B4B1',
    '#A19592',
    '#7E7370',
    '#685E5B',
    '#534946',
    '#140F0E',
    // semantic V3
    '#E4FDE3',
    '#9CCD9B',
    '#1D7725',
    '#004F09',
    '#FFF2F0',
    '#FFA096',
    '#A80011',
    '#6B0006',
    '#FFF3E9',
    '#F1AD76',
    '#AB5E00',
    '#783F00',
    '#255EA6',
    '#E4F0FF',
  ].map((h) => h.toUpperCase()),
);

const failures = { copy: [], banned: [], unknown: [], globals: [] };
const notes = [];

// ---------- helpers ----------
function walkFiles(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkFiles(p, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

function blankPreservingNewlines(s) {
  return s.replace(/[^\n]/g, ' ');
}

// Strip /* ... */ preserving newlines (CSS; also used for plain JS block part)
function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => blankPreservingNewlines(m));
}

// Strip <!-- ... --> preserving newlines (SVG/XML, LK4-51)
function stripXmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, (m) => blankPreservingNewlines(m));
}

// String-aware TS/TSX comment stripper: // and /* */ are only recognised in
// code context, never inside '...', "..." or `...` literals (so URLs keep
// their //). Template ${ ... } expressions re-enter code context.
function stripTsComments(text) {
  let out = '';
  let i = 0;
  // stack: {type:'code'} | {type:'str', quote} | {type:'tpl'} ; brace depth for tpl exprs
  const stack = [{ type: 'code', braceDepth: 0, fromTpl: false }];
  const top = () => stack[stack.length - 1];
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1] ?? '';
    const ctx = top();
    if (ctx.type === 'str') {
      out += c;
      if (c === '\\') {
        out += n;
        i += 2;
        continue;
      }
      if (c === ctx.quote) stack.pop();
      i += 1;
      continue;
    }
    if (ctx.type === 'tpl') {
      if (c === '\\') {
        out += c + n;
        i += 2;
        continue;
      }
      if (c === '`') {
        out += c;
        stack.pop();
        i += 1;
        continue;
      }
      if (c === '$' && n === '{') {
        out += '${';
        stack.push({ type: 'code', braceDepth: 1, fromTpl: true });
        i += 2;
        continue;
      }
      out += c;
      i += 1;
      continue;
    }
    // code context
    if (c === '/' && n === '/') {
      let j = i;
      while (j < text.length && text[j] !== '\n') j += 1;
      out += ' '.repeat(j - i);
      i = j;
      continue;
    }
    if (c === '/' && n === '*') {
      let j = text.indexOf('*/', i + 2);
      j = j === -1 ? text.length : j + 2;
      out += blankPreservingNewlines(text.slice(i, j));
      i = j;
      continue;
    }
    if (c === "'" || c === '"') {
      out += c;
      stack.push({ type: 'str', quote: c });
      i += 1;
      continue;
    }
    if (c === '`') {
      out += c;
      stack.push({ type: 'tpl' });
      i += 1;
      continue;
    }
    if (ctx.fromTpl) {
      if (c === '{') ctx.braceDepth += 1;
      if (c === '}') {
        ctx.braceDepth -= 1;
        if (ctx.braceDepth === 0) {
          out += c;
          stack.pop();
          i += 1;
          continue;
        }
      }
    }
    out += c;
    i += 1;
  }
  return out;
}

function stripForFile(file, text) {
  if (file.endsWith('.svg')) return stripXmlComments(text);
  if (file.endsWith('.css')) return stripCssComments(text);
  return stripTsComments(text);
}

function collectColorValues(node, out) {
  if (node && typeof node === 'object') {
    if (typeof node.$value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(node.$value)) {
      out.add(node.$value.toUpperCase());
    }
    for (const v of Object.values(node)) collectColorValues(v, out);
  }
  return out;
}

// ---------- 1. tokens copy + valid set ----------
if (!existsSync(repoTokensPath)) {
  failures.copy.push(`missing repo tokens copy: ${path.relative(repoRoot, repoTokensPath)}`);
  console.error('tokens:verify FAIL — repo tokens copy missing');
  process.exit(1);
}
const repoTokensBuf = readFileSync(repoTokensPath);
const tokens = JSON.parse(repoTokensBuf.toString('utf8'));
const valid = collectColorValues(tokens, new Set());

if (existsSync(dossierTokensPath)) {
  const dossierBuf = readFileSync(dossierTokensPath);
  if (!repoTokensBuf.equals(dossierBuf)) {
    failures.copy.push(
      'design/tokens.chiatien-v4.json is NOT byte-identical to dossier tokens.json',
    );
  } else {
    notes.push('copy: design/tokens.chiatien-v4.json byte-identical to dossier tokens.json');
  }
} else {
  notes.push('copy: dossier tokens.json not found — byte-identical check skipped');
}

// ---------- 2/3. sink scan ----------
const extraFiles = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--extra' && argv[i + 1]) {
    extraFiles.push(path.resolve(argv[i + 1]));
    i += 1;
  }
}

const sinkFiles = [
  path.join(repoRoot, 'app', 'globals.css'),
  path.join(repoRoot, 'app', 'layout.tsx'),
  path.join(repoRoot, 'app', 'manifest.ts'),
  path.join(repoRoot, 'public', 'sw.js'),
  ...walkFiles(path.join(repoRoot, 'public'), ['.svg']),
  ...walkFiles(path.join(repoRoot, 'components'), ['.ts', '.tsx']).filter(
    (f) => !f.includes('.spec.'),
  ),
  ...extraFiles,
].filter((f, idx, a) => a.indexOf(f) === idx && existsSync(f));

const hexRe = /#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/g;
let scannedHexTotal = 0;
for (const file of sinkFiles) {
  const raw = readFileSync(file, 'utf8');
  const stripped = stripForFile(file, raw);
  const rel = path.relative(repoRoot, file) || file;
  const lines = stripped.split('\n');
  lines.forEach((line, idx) => {
    for (const m of line.matchAll(hexRe)) {
      scannedHexTotal += 1;
      const hex = m[0].toUpperCase();
      if (BANNED.has(hex)) failures.banned.push(`${rel}:${idx + 1} ${hex}`);
      else if (!valid.has(hex)) failures.unknown.push(`${rel}:${idx + 1} ${hex}`);
    }
  });
}

// ---------- 4. globals.css token mapping ----------
const expected = new Map();
for (const [k, v] of Object.entries(tokens.brand ?? {}))
  expected.set(`--brand-${k}`, v.$value.toUpperCase());
for (const [k, v] of Object.entries(tokens.neutral ?? {})) {
  if (/^\d+$/.test(k)) expected.set(`--grey-${k}`, v.$value.toUpperCase());
}
if (tokens.neutral?.canvas) expected.set('--canvas', tokens.neutral.canvas.$value.toUpperCase());
if (tokens.neutral?.['900']) expected.set('--ink', tokens.neutral['900'].$value.toUpperCase());
if (tokens.neutral?.['ink-on-seed'])
  expected.set('--ink-on-seed', tokens.neutral['ink-on-seed'].$value.toUpperCase());
for (const [k, v] of Object.entries(tokens['avatar-backgrounds'] ?? {})) {
  if (v && typeof v === 'object') expected.set(`--avatar-${k}`, v.$value.toUpperCase());
}

const globalsPath = path.join(repoRoot, 'app', 'globals.css');
if (existsSync(globalsPath)) {
  const stripped = stripCssComments(readFileSync(globalsPath, 'utf8'));
  const declRe = /(--[\w-]+)\s*:\s*([^;]+);/g;
  const declared = new Map();
  for (const m of stripped.matchAll(declRe)) declared.set(m[1], m[2].trim().toUpperCase());
  const watched = (name) =>
    name.startsWith('--brand-') ||
    name.startsWith('--grey-') ||
    name.startsWith('--avatar-') ||
    name === '--ink' ||
    name === '--canvas' ||
    name === '--ink-on-seed';
  for (const [name, value] of declared) {
    if (!watched(name)) continue;
    const hexM = value.match(/#[0-9A-F]{6}/);
    if (!hexM) continue; // var(...) aliases are not literal declarations
    if (!expected.has(name))
      failures.globals.push(`${name}: no tokens.json counterpart (declared ${hexM[0]})`);
    else if (expected.get(name) !== hexM[0])
      failures.globals.push(`${name}: globals ${hexM[0]} != tokens.json ${expected.get(name)}`);
  }
  for (const [name, value] of expected) {
    if (!declared.has(name))
      failures.globals.push(`${name}: MISSING in globals.css (expected ${value})`);
  }
} else {
  failures.globals.push('app/globals.css missing');
}

// ---------- report ----------
console.log(
  `tokens:verify — valid hex set: ${valid.size} values from design/tokens.chiatien-v4.json`,
);
console.log(
  `tokens:verify — sinks scanned: ${sinkFiles.length} files, ${scannedHexTotal} hex literals after comment-strip`,
);
for (const n of notes) console.log(`  OK ${n}`);
const groups = [
  ['copy byte-identical', failures.copy],
  ['hex cam (V3 banned)', failures.banned],
  ['hex la (not in tokens.json)', failures.unknown],
  ['globals.css token mapping', failures.globals],
];
let failed = false;
for (const [label, list] of groups) {
  if (list.length === 0) {
    console.log(`  PASS ${label}: 0`);
    continue;
  }
  failed = true;
  console.log(`  FAIL ${label}: ${list.length}`);
  for (const item of list) console.log(`    - ${item}`);
}
console.log(failed ? 'tokens:verify RESULT: FAIL' : 'tokens:verify RESULT: PASS');
process.exit(failed ? 1 : 0);
