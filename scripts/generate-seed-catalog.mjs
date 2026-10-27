#!/usr/bin/env node
// scripts/generate-seed-catalog.mjs
// Generates the catalog seed bundled with the mobile app so the first launch works with no network (SRS 6.4).
//
// Source: packages/database/data/curriculum.json (the same file the server seed reads).
// Ids are deterministic UUID v5 values, identical to the ones packages/database/src/seed-reference.ts writes to
// PostgreSQL, so a profile saved offline from this seed is valid on the server.
//
// Contains metadata only: universities, programs, semesters and courses. No fake chapters, exams or questions.
// Limit: at most about 150 KB compressed. Run with:  npm run generate:seed   (add --check to verify only)

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const curriculumPath = path.resolve(rootDir, 'packages/database/data/curriculum.json');
const outputPath = path.resolve(rootDir, 'apps/mobile/assets/seedCatalog.json');
const checkOnly = process.argv.includes('--check');

/** UUID v5 (SHA-1, RFC 4122). Must stay identical to stableId() in packages/database/src/seed-reference.ts. */
function stableId(namespace, name) {
  const ns = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(ns).update(name, 'utf8').digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Known-answer test from RFC 4122 (DNS namespace, "www.example.com"). Fails loudly if the function is ever changed.
const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
if (stableId(DNS_NAMESPACE, 'www.example.com') !== '2ed6657d-e927-568b-95e1-2665a8aea6a2') {
  console.error('stableId() no longer matches the UUID v5 reference vector.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(curriculumPath, 'utf8'));
const ns = data.idNamespace;
const now = Date.now();

const universities = [];
const programs = [];
const semesters = [];
const items = [];

for (const u of data.universities) {
  const universityId = stableId(ns, `university:${u.code}`);
  universities.push({ id: universityId, code: u.code, nameEn: u.nameEn, nameAm: u.nameAm });

  for (const p of data.programs) {
    const programId = stableId(ns, `program:${u.code}:${p.code}`);
    programs.push({ id: programId, universityId, code: p.code, nameEn: p.nameEn, nameAm: p.nameAm });

    for (const s of data.semesters) {
      const semesterId = stableId(ns, `semester:${u.code}:${p.code}:${s.code}`);
      semesters.push({ id: semesterId, programId, number: s.number, code: s.code });

      data.courses
        .filter((c) => c.semester === s.number)
        .forEach((c, index) => {
          const id = stableId(ns, `course:${u.code}:${p.code}:${s.code}:${c.code}`);
          items.push({
            id,
            kind: 'COURSE',
            courseId: id,
            parentId: semesterId,
            title: { en: c.titleEn, am: c.titleAm },
            order: index + 1,
            type: c.stream,
            isFree: c.promotional,
            updatedAt: now,
            meta: {
              code: c.code,
              semesterId,
              stream: c.stream,
              accent: c.accent,
              icon: c.icon,
              freeAccess: false,
            },
          });
        });
    }
  }
}

const seed = {
  version: 'v-seed-curriculum-1',
  generatedAt: new Date(now).toISOString(),
  metadata: { universities, programs, semesters },
  items,
};

const json = JSON.stringify(seed);
const compressed = zlib.gzipSync(Buffer.from(json, 'utf8'), { level: 9 });

console.log(
  `${universities.length} universities, ${programs.length} programs, ${semesters.length} semesters, ${items.length} courses`,
);
console.log(`Uncompressed: ${(json.length / 1024).toFixed(1)} KB, gzip: ${(compressed.length / 1024).toFixed(1)} KB`);

const MAX_TARGET_KB = 150;
if (compressed.length > MAX_TARGET_KB * 1024) {
  console.error(`ERROR: compressed seed catalog exceeds the ${MAX_TARGET_KB} KB limit.`);
  process.exit(1);
}

if (checkOnly) {
  const strip = (value) =>
    JSON.stringify({ ...value, generatedAt: '', items: value.items.map((item) => ({ ...item, updatedAt: 0 })) });
  const existing = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, 'utf8')) : null;
  if (!existing || strip(existing) !== strip(seed)) {
    console.error('apps/mobile/assets/seedCatalog.json is out of date. Run: npm run generate:seed');
    process.exit(1);
  }
  console.log('OK: bundled seed matches curriculum.json.');
} else {
  fs.writeFileSync(outputPath, json, 'utf8');
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
}
