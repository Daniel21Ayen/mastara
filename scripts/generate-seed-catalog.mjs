#!/usr/bin/env node
// scripts/generate-seed-catalog.mjs
// Generates a bundled catalog seed for mobile offline first launch (SRS 6.4)
// Target: at most 150 KB compressed

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputPath = path.resolve(rootDir, 'apps/mobile/assets/seedCatalog.json');

const universities = [
  { id: 'univ-aau', name: 'Addis Ababa University', amharic: 'አዲስ አበባ ዩኒቨርሲቲ', code: 'AAU' },
  { id: 'univ-ju', name: 'Jimma University', amharic: 'ጅማ ዩኒቨርሲቲ', code: 'JU' },
  { id: 'univ-hu', name: 'Hawassa University', amharic: 'ሀዋሳ ዩኒቨርሲቲ', code: 'HU' },
  { id: 'univ-amu', name: 'Arba Minch University', amharic: 'አርባ ምንጭ ዩኒቨርሲቲ', code: 'AMU' },
  { id: 'univ-bdu', name: 'Bahir Dar University', amharic: 'ባህር ዳር ዩኒቨርሲቲ', code: 'BDU' },
];

const programs = [
  { id: 'prog-eng', name: 'Engineering & Technology', amharic: 'ኢንጂነሪንግና ቴክኖሎጂ' },
  { id: 'prog-med', name: 'Health & Medical Sciences', amharic: 'ህክምናና ጤና ሳይንስ' },
  { id: 'prog-cs', name: 'Computing & Informatics', amharic: 'ኮምፒውቲንግና ኢንፎርማቲክስ' },
  { id: 'prog-nat', name: 'Natural & Computational Sciences', amharic: 'የተፈጥሮ ሳይንስ' },
];

const courses = [
  {
    id: 'course-math-101',
    code: 'MATH101',
    title: { en: 'Mathematics for Natural Sciences', am: 'የተፈጥሮ ሳይንስ ሂሳብ' },
    stream: 'NATURAL',
    accent: 'blue',
    icon: 'calculate',
    isFree: false,
    order: 1,
  },
  {
    id: 'course-phys-101',
    code: 'PHYS101',
    title: { en: 'General Physics', am: 'አጠቃላይ ፊዚክስ' },
    stream: 'NATURAL',
    accent: 'indigo',
    icon: 'atom',
    isFree: false,
    order: 2,
  },
  {
    id: 'course-eng-101',
    code: 'ENGL101',
    title: { en: 'Communicative English Skills', am: 'የመግባቢያ እንግሊዝኛ ክህሎት' },
    stream: 'COMMON',
    accent: 'teal',
    icon: 'book',
    isFree: true,
    order: 3,
  },
  {
    id: 'course-cs-101',
    code: 'COSC101',
    title: { en: 'Introduction to Computing', am: 'የኮምፒውተር መግቢያ' },
    stream: 'NATURAL',
    accent: 'purple',
    icon: 'code',
    isFree: false,
    order: 4,
  },
  {
    id: 'course-psyc-101',
    code: 'PSYC101',
    title: { en: 'General Psychology', am: 'አጠቃላይ ሳይኮሎጂ' },
    stream: 'COMMON',
    accent: 'amber',
    icon: 'brain',
    isFree: false,
    order: 5,
  },
  {
    id: 'course-crit-101',
    code: 'PHIL101',
    title: { en: 'Critical Thinking & Logic', am: 'ክሪቲካል ቲንኪንግና ሎጂክ' },
    stream: 'COMMON',
    accent: 'rose',
    icon: 'bulb',
    isFree: false,
    order: 6,
  },
];

const items = [];
const now = Date.now();

// Add Courses
for (const c of courses) {
  items.push({
    id: c.id,
    kind: 'COURSE',
    courseId: c.id,
    parentId: null,
    title: c.title,
    order: c.order,
    type: c.stream,
    isFree: c.isFree,
    updatedAt: now,
    meta: {
      code: c.code,
      stream: c.stream,
      accent: c.accent,
      icon: c.icon,
      freeAccess: c.isFree,
    },
  });

  // Modules & Topics per course
  for (let m = 1; m <= 3; m++) {
    const moduleId = `${c.id}-mod-${m}`;
    items.push({
      id: moduleId,
      kind: 'MODULE',
      courseId: c.id,
      parentId: c.id,
      title: { en: `Module ${m}: Core Principles`, am: `ሞጁል ${m}፡ መሰረታዊ መርሆዎች` },
      order: m,
      type: 'MODULE',
      isFree: m === 1, // First module is free trial
      updatedAt: now,
      meta: {
        number: m,
        isFreeTrial: m === 1,
      },
    });

    // 2 Topics per module
    for (let t = 1; t <= 2; t++) {
      const topicId = `${moduleId}-top-${t}`;
      items.push({
        id: topicId,
        kind: 'TOPIC',
        courseId: c.id,
        parentId: moduleId,
        title: { en: `Chapter ${m}.${t}: Detailed Analysis`, am: `ምዕራፍ ${m}.${t}፡ ዝርዝር ትንታኔ` },
        order: t,
        type: 'CHAPTER',
        isFree: m === 1 && t === 1, // First chapter is free
        updatedAt: now,
        meta: {
          number: t,
          isFreeTrial: m === 1 && t === 1,
        },
      });
    }
  }

  // Quiz Chapters (Quiz 1, 2, 3)
  for (let q = 1; q <= 3; q++) {
    const quizId = `${c.id}-quiz-${q}`;
    items.push({
      id: quizId,
      kind: 'QUIZ_CHAPTER',
      courseId: c.id,
      parentId: c.id,
      title: { en: `Quiz Chapter ${q}`, am: `የፈተና ምዕራፍ ${q}` },
      order: q,
      type: 'QUIZ',
      isFree: q === 1,
      updatedAt: now,
      meta: {
        quizNumber: q,
        questionCount: 15,
        durationMinutes: 20,
      },
    });
  }

  // Exams (Mid, Final, Mock)
  const examKinds = [
    { type: 'MID', name: 'Midterm Examination', am: 'የመካከለኛ ፈተና' },
    { type: 'FINAL', name: 'Final Examination', am: 'የፍፃሜ ፈተና' },
    { type: 'MOCK', name: 'Model Mock Exam', am: 'የሞዴል ፈተና' },
  ];
  examKinds.forEach((ex, idx) => {
    items.push({
      id: `${c.id}-exam-${ex.type.toLowerCase()}`,
      kind: 'EXAM',
      courseId: c.id,
      parentId: c.id,
      title: { en: ex.name, am: ex.am },
      order: idx + 1,
      type: ex.type,
      isFree: ex.type === 'MOCK', // Mock exam is free preview
      updatedAt: now,
      meta: {
        year: 2024,
        questionCount: 30,
        durationMinutes: 60,
      },
    });
  });
}

// COC Sets
const cocSets = [
  {
    id: 'coc-sample-set',
    title: { en: 'COC Sample Preparation Set', am: 'የሲኦሲ የሙከራ ጥያቄዎች' },
    isFree: true,
    year: 2024,
    order: 1,
  },
  {
    id: 'coc-2024-full',
    title: { en: 'National COC Comprehensive 2024', am: 'የብሔራዊ ሲኦሲ ሙሉ ፈተና 2024' },
    isFree: false,
    year: 2024,
    order: 2,
  },
  {
    id: 'coc-2023-full',
    title: { en: 'National COC Comprehensive 2023', am: 'የብሔራዊ ሲኦሲ ሙሉ ፈተና 2023' },
    isFree: false,
    year: 2023,
    order: 3,
  },
];

for (const coc of cocSets) {
  items.push({
    id: coc.id,
    kind: 'COC_SET',
    courseId: 'COC',
    parentId: null,
    title: coc.title,
    order: coc.order,
    type: 'COC',
    isFree: coc.isFree,
    updatedAt: now,
    meta: {
      year: coc.year,
      questionCount: 50,
      durationMinutes: 90,
    },
  });
}

const seedPayload = {
  version: 'v-seed-baseline-3.2',
  generatedAt: new Date().toISOString(),
  metadata: {
    universities,
    programs,
    semesters: [
      { id: 'sem-1', name: 'Semester 1', amharic: 'ሴሚስተር 1' },
      { id: 'sem-2', name: 'Semester 2', amharic: 'ሴሚስተር 2' },
    ],
  },
  items,
};

const jsonStr = JSON.stringify(seedPayload, null, 2);
fs.writeFileSync(outputPath, jsonStr, 'utf8');

const uncompressedBytes = Buffer.byteLength(jsonStr, 'utf8');
const compressed = zlib.gzipSync(Buffer.from(jsonStr, 'utf8'), { level: 9 });
const compressedBytes = compressed.byteLength;

console.log(`Generated Seed Catalog: ${items.length} items`);
console.log(`File: ${outputPath}`);
console.log(`Uncompressed size: ${(uncompressedBytes / 1024).toFixed(2)} KB`);
console.log(`Compressed (gzip) size: ${(compressedBytes / 1024).toFixed(2)} KB`);

const MAX_TARGET_KB = 150;
if (compressedBytes > MAX_TARGET_KB * 1024) {
  console.error(`ERROR: Compressed seed catalog exceeds ${MAX_TARGET_KB} KB limit!`);
  process.exit(1);
} else {
  console.log(`OK: Seed catalog is well within target limit of ${MAX_TARGET_KB} KB.`);
}
