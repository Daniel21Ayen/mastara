#!/usr/bin/env node
// integration/link-admin.mjs
// Run from the repository root:   node integration/link-admin.mjs          (check only)
//                                 node integration/link-admin.mjs --write  (apply the additive fixes)
// It never replaces a file. It only adds missing lines, and it reports what it cannot fix by itself.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const WRITE = process.argv.includes('--write');
const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');
const has = (p) => existsSync(join(root, p));
let problems = 0;
const say = (icon, text) => console.log(`${icon} ${text}`);
const todo = (text) => { problems += 1; say('✗', text); };

if (!has('apps/admin-web/package.json') || !has('packages')) {
  console.error('Run this from the repository root, after copying the zip into it.');
  process.exit(2);
}

// 1. One-line additions to the shared barrels ------------------------------------------------------
const barrels = [
  ['packages/domain/src/index.ts', "export * from './adminExports';"],
  ['packages/contracts/src/index.ts', "export * from './adminExports';"],
  ['packages/i18n/src/index.ts', "export * from './adminStrings';"],
];
for (const [file, line] of barrels) {
  if (!has(file)) { todo(`${file} is missing (shared package not found)`); continue; }
  const text = read(file);
  if (text.includes(line)) { say('✓', `${file} already exports the admin entry`); continue; }
  if (WRITE) { writeFileSync(join(root, file), `${text.replace(/\s*$/, '')}\n${line}\n`); say('+', `${file}: added  ${line}`); }
  else todo(`${file} needs the line:  ${line}`);
}

// 2. Root tooling: additive only --------------------------------------------------------------------
function editJson(file, change, label) {
  if (!has(file)) { todo(`${file} is missing`); return; }
  const data = JSON.parse(read(file));
  const changed = change(data);
  if (!changed) { say('✓', `${file}: ${label} present`); return; }
  if (WRITE) { writeFileSync(join(root, file), `${JSON.stringify(data, null, 2)}\n`); say('+', `${file}: added ${label}`); }
  else todo(`${file} needs ${label}`);
}
editJson('package.json', (p) => {
  p.scripts ??= {};
  if (p.scripts['dev:admin']) return false;
  p.scripts['dev:admin'] = 'npm run dev --workspace @mastara/admin-web';
  return true;
}, 'script "dev:admin"');
editJson('turbo.json', (t) => {
  t.tasks ??= {};
  let changed = false;
  if (!t.tasks.typecheck) { t.tasks.typecheck = { dependsOn: ['^typecheck'] }; changed = true; }
  if (!t.tasks.dev) { t.tasks.dev = { cache: false, persistent: true }; changed = true; }
  if (!t.tasks.build) { t.tasks.build = { dependsOn: ['^build'], outputs: ['.next/**', '!.next/cache/**'] }; changed = true; }
  else if (!(t.tasks.build.outputs ?? []).includes('.next/**')) {
    t.tasks.build.outputs = [...(t.tasks.build.outputs ?? []), '.next/**', '!.next/cache/**']; changed = true;
  }
  return changed;
}, 'tasks typecheck / dev / build (.next outputs)');

function ensureLines(file, lines) {
  const text = has(file) ? read(file) : '';
  const missing = lines.filter((l) => !text.split(/\r?\n/).includes(l));
  if (missing.length === 0) { say('✓', `${file}: ignore lines present`); return; }
  if (WRITE) { writeFileSync(join(root, file), `${text.replace(/\s*$/, '')}\n${missing.join('\n')}\n`); say('+', `${file}: added ${missing.join(', ')}`); }
  else todo(`${file} needs: ${missing.join(', ')}`);
}
ensureLines('.gitignore', ['.next/']);
ensureLines('.prettierignore', ['.next', 'next-env.d.ts']);

if (has('eslint.config.mjs')) {
  const text = read('eslint.config.mjs');
  const need = ["'**/.next/**'", "'**/next-env.d.ts'"].filter((s) => !text.includes(s));
  if (need.length === 0) say('✓', 'eslint.config.mjs ignores .next and next-env.d.ts');
  else if (WRITE && /ignores:\s*\[/.test(text)) {
    writeFileSync(join(root, 'eslint.config.mjs'), text.replace(/ignores:\s*\[/, (m) => `${m}\n      ${need.join(',\n      ')},`));
    say('+', `eslint.config.mjs: added ignores ${need.join(', ')}`);
  } else todo(`eslint.config.mjs: add to the ignores list: ${need.join(', ')}`);
}

// 3. Student-owned things the admin portal reads ---------------------------------------------------
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}
function exportedNames(dir) {
  const names = new Set();
  for (const file of walk(join(root, dir))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/export\s+(?:declare\s+)?(?:const|let|function|class|interface|type|enum)\s+(\w+)/g)) names.add(m[1]);
    for (const m of text.matchAll(/export\s*(?:type\s*)?\{([^}]*)\}/g))
      for (const part of m[1].split(',')) { const n = part.trim().split(/\s+as\s+/).pop(); if (n) names.add(n.replace(/^type\s+/, '')); }
  }
  return names;
}
const needs = {
  'packages/domain/src': ['STREAMS', 'Stream', 'STUDENT_STREAMS', 'StudentStream', 'QUIZ_NUMBERS', 'QuizNumber', 'EXAM_KINDS', 'ExamKind',
    'CONTENT_LANGS', 'ContentLang', 'RENEWAL_WINDOW_DAYS', 'QuestionType', 'latexToUnicode', 'parseMath', 'timeAgo'],
  'packages/contracts/src': ['University', 'Program', 'Semester', 'Course', 'loginSchema', 'identifierSchema', 'VALIDATION'],
  'packages/ui-tokens/src': ['palette', 'withAlpha', 'spacing', 'radius', 'fontSize'],
};
for (const [dir, list] of Object.entries(needs)) {
  if (!has(dir)) { todo(`${dir} not found`); continue; }
  const found = exportedNames(dir);
  const missing = list.filter((n) => !found.has(n));
  if (missing.length) todo(`${dir} no longer exports: ${missing.join(', ')} (the admin portal imports them)`);
  else say('✓', `${dir}: all ${list.length} symbols the admin portal reads exist`);
}
if (has('packages/ui-tokens/src')) {
  const f = exportedNames('packages/ui-tokens/src');
  if (!f.has('lightColors') && !f.has('colors')) todo('packages/ui-tokens exports neither lightColors nor colors');
  else say('✓', `ui-tokens colours: ${f.has('lightColors') ? 'lightColors (light/dark theme)' : 'colors'}`);
}

// 4. Shared ERROR_CODES must still cover every code the student app uses ------------------------------
const errorsFile = 'packages/domain/src/constants/errors.ts';
if (has(errorsFile)) {
  const defined = new Set([...read(errorsFile).matchAll(/^\s+([A-Z_]+):/gm)].map((m) => m[1]));
  const used = new Map();
  for (const file of [...walk(join(root, 'apps')), ...walk(join(root, 'packages'))]) {
    if (file.includes('apps/admin-web') || file.includes('apps\\admin-web')) continue;
    for (const m of readFileSync(file, 'utf8').matchAll(/ERROR_CODES\.([A-Z_]+)/g)) used.set(m[1], file.replace(root, ''));
  }
  const gone = [...used].filter(([code]) => !defined.has(code));
  if (gone.length) todo(`constants/errors.ts lacks codes the code uses (an older errors.ts was copied over yours?): ${gone.map(([c, f]) => `${c} (used in ${f})`).join('; ')}. Add them back to ERROR_CODES.`);
  else say('✓', 'constants/errors.ts covers every ERROR_CODES.* used outside the admin portal');
}

console.log(problems === 0 ? '\nAll good.' : `\n${problems} item(s) need attention${WRITE ? '' : ' (run with --write to apply the automatic ones)'}.`);
process.exit(problems === 0 ? 0 : 1);
