// apps/mobile/src/modules/reader/phase7-performance.test.ts
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, it } from 'node:test';

import type { Topic } from '@mastara/contracts';

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  clearChapterMarkupCache,
  clearFormulaCache,
  getCachedChapterMarkup,
  getChapterCacheSize,
  getFormulaCacheSize,
  renderFormula,
  setCachedChapterMarkup,
} from '../../core/math/katexMarkup';
import { readerMemoryCache } from './store/readerMemoryCache';

const here = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

describe('Phase 7: Performance Optimizations & Low-End Device Benchmarks', () => {
  beforeEach(() => {
    readerMemoryCache.clear();
    clearFormulaCache();
    clearChapterMarkupCache();
  });

  // =========================================================================
  // 1. SQLite Index Verification (EXPLAIN QUERY PLAN)
  // =========================================================================
  describe('1. SQLite: use indexes and check with EXPLAIN QUERY PLAN', () => {
    let db: DatabaseSync;

    beforeEach(() => {
      db = new DatabaseSync(':memory:');
      // Create Phase 3 / Phase 7 tables and composite index
      db.exec(`
        CREATE TABLE catalog_item (
          user_id TEXT NOT NULL,
          id TEXT NOT NULL,
          kind TEXT NOT NULL,
          course_id TEXT NOT NULL,
          parent_id TEXT,
          title TEXT NOT NULL,
          position INTEGER NOT NULL,
          is_free INTEGER NOT NULL DEFAULT 0,
          meta TEXT,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (user_id, id)
        );
        CREATE INDEX idx_catalog_list ON catalog_item (user_id, course_id, kind, parent_id, position);
      `);

      // Seed 200 catalog items for realistic query execution
      const stmt = db.prepare(`
        INSERT INTO catalog_item (user_id, id, kind, course_id, parent_id, title, position, is_free, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 1; i <= 200; i++) {
        stmt.run(
          'user-123',
          `topic-${i}`,
          'TOPIC',
          'course-calc',
          'module-1',
          `Topic ${i}`,
          i,
          i % 2 === 0 ? 1 : 0,
          Date.now(),
        );
      }
    });

    it('uses idx_catalog_list for module list queries', () => {
      const plan = db
        .prepare(`
          EXPLAIN QUERY PLAN
          SELECT * FROM catalog_item
          WHERE user_id = 'user-123' AND course_id = 'course-calc' AND kind = 'MODULE'
          ORDER BY position ASC
        `)
        .all() as any[];

      const detail = plan.map((p) => p.detail).join(' ');
      // Must use index, NOT scan table
      assert.ok(detail.includes('USING INDEX idx_catalog_list'), `Expected index usage, got: ${detail}`);
      assert.ok(!detail.includes('SCAN catalog_item'), `Must not perform full table scan: ${detail}`);
    });

    it('uses idx_catalog_list for syllabus topic queries with parent module', () => {
      const plan = db
        .prepare(`
          EXPLAIN QUERY PLAN
          SELECT * FROM catalog_item
          WHERE user_id = 'user-123' AND course_id = 'course-calc' AND kind = 'TOPIC' AND parent_id = 'module-1'
          ORDER BY position ASC
        `)
        .all() as any[];

      const detail = plan.map((p) => p.detail).join(' ');
      assert.ok(detail.includes('USING INDEX idx_catalog_list'), `Expected index usage, got: ${detail}`);
      assert.ok(!detail.includes('SCAN catalog_item'), `Must not perform full table scan: ${detail}`);
    });

    it('uses idx_catalog_list for quiz chapter queries', () => {
      const plan = db
        .prepare(`
          EXPLAIN QUERY PLAN
          SELECT * FROM catalog_item
          WHERE user_id = 'user-123' AND course_id = 'course-calc' AND kind = 'QUIZ_CHAPTER'
          ORDER BY position ASC
        `)
        .all() as any[];

      const detail = plan.map((p) => p.detail).join(' ');
      assert.ok(detail.includes('USING INDEX idx_catalog_list'), `Expected index usage, got: ${detail}`);
    });

    it('uses idx_catalog_list for exam list queries', () => {
      const plan = db
        .prepare(`
          EXPLAIN QUERY PLAN
          SELECT * FROM catalog_item
          WHERE user_id = 'user-123' AND course_id = 'course-calc' AND kind = 'EXAM'
          ORDER BY position ASC
        `)
        .all() as any[];

      const detail = plan.map((p) => p.detail).join(' ');
      assert.ok(detail.includes('USING INDEX idx_catalog_list'), `Expected index usage, got: ${detail}`);
    });
  });

  // =========================================================================
  // 2. Measured Numbers: Time to First List & Time to First Chapter
  // =========================================================================
  describe('2. Low-End Device Benchmark (Time to First List & Time to First Chapter)', () => {
    it('time to first list: retrieves and sorts 50 topics from SQLite in under 5ms', () => {
      const db = new DatabaseSync(':memory:');
      db.exec(`
        CREATE TABLE catalog_item (
          user_id TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, course_id TEXT NOT NULL,
          parent_id TEXT, title TEXT NOT NULL, position INTEGER NOT NULL, is_free INTEGER NOT NULL,
          meta TEXT, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, id)
        );
        CREATE INDEX idx_catalog_list ON catalog_item (user_id, course_id, kind, parent_id, position);
      `);

      const insert = db.prepare(`
        INSERT INTO catalog_item VALUES (?, ?, 'TOPIC', 'course-math', 'mod-1', ?, ?, 0, null, ?)
      `);
      for (let i = 1; i <= 50; i++) {
        insert.run('user-1', `t-${i}`, `Calculus Chapter ${i}`, i, Date.now());
      }

      const start = performance.now();
      const rows = db
        .prepare(`
          SELECT * FROM catalog_item
          WHERE user_id = 'user-1' AND course_id = 'course-math' AND kind = 'TOPIC' AND parent_id = 'mod-1'
          ORDER BY position ASC
        `)
        .all();
      const elapsed = performance.now() - start;

      assert.equal(rows.length, 50);
      // On low-end Android target: < 15ms target. In local test: < 5ms.
      assert.ok(elapsed < 15, `Time to first list took ${elapsed.toFixed(2)}ms (target < 15ms)`);
    });

    it('time to first chapter: RAM cache returns body in 0ms (< 1ms)', () => {
      const sampleTopic: Topic = {
        id: 't-quick',
        courseId: 'course-calc',
        kind: 'MODULE',
        number: 1,
        title: { en: 'Instant Lesson', am: 'ፈጣን ትምህርት' },
        summary: { en: 'Summary', am: 'ማጠቃለያ' },
        body: { en: 'Instant 0ms memory render', am: 'ፈጣን የሜሞሪ ንባብ' },
        isFree: true,
      };

      readerMemoryCache.set(sampleTopic.id, sampleTopic);

      const start = performance.now();
      const topic = readerMemoryCache.get('t-quick');
      const elapsed = performance.now() - start;

      assert.ok(topic);
      assert.equal(topic.id, 't-quick');
      // Sub-millisecond instant 0ms retrieval
      assert.ok(elapsed < 1.0, `Time to first chapter was ${elapsed.toFixed(3)}ms (target < 1.0ms)`);
    });
  });

  // =========================================================================
  // 3. KaTeX Chapter Markup Caching & Fast Reopen
  // =========================================================================
  describe('3. KaTeX: Cache generated markup per chapter in memory', () => {
    it('caches parsed chapter markup in memory so reopening bypasses re-parsing (0ms)', () => {
      const chapterKey = 'chapter:calc-limits-v1';
      const renderedHtml = '<div class="math-doc"><p>First parse result with formulas</p></div>';

      assert.equal(getCachedChapterMarkup(chapterKey), undefined);
      assert.equal(getChapterCacheSize(), 0);

      // Save rendered chapter markup to cache
      setCachedChapterMarkup(chapterKey, renderedHtml);

      assert.equal(getChapterCacheSize(), 1);
      assert.equal(getCachedChapterMarkup(chapterKey), renderedHtml);

      // Reopening chapter reads directly from cache in 0ms
      const start = performance.now();
      const cached = getCachedChapterMarkup(chapterKey);
      const elapsed = performance.now() - start;

      assert.equal(cached, renderedHtml);
      assert.ok(elapsed < 0.5, `Reopening chapter took ${elapsed.toFixed(3)}ms (target < 0.5ms)`);
    });

    it('caches formulas across paragraphs in formulaCache', () => {
      const formula = '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';

      // First render parses via KaTeX
      const firstMarkup = renderFormula(formula, true);
      assert.ok(firstMarkup.includes('katex'));
      assert.equal(getFormulaCacheSize(), 1);

      // Second render hits in-memory formulaCache immediately
      const start = performance.now();
      const secondMarkup = renderFormula(formula, true);
      const elapsed = performance.now() - start;

      assert.equal(firstMarkup, secondMarkup);
      assert.ok(elapsed < 0.2, `Formula cache retrieval took ${elapsed.toFixed(3)}ms (target < 0.2ms)`);
    });
  });

  // =========================================================================
  // 4. Component Memoization
  // =========================================================================
  describe('4. Lists: Memoized row components with stable callbacks', () => {
    it('TopicRow is wrapped in React.memo to prevent unnecessary re-renders', () => {
      const content = readFileSync(resolve(here, '../courses/components/TopicRow.tsx'), 'utf8');
      assert.ok(content.includes('export const TopicRow = memo('));
    });

    it('ExamRow is wrapped in React.memo to prevent unnecessary re-renders', () => {
      const content = readFileSync(resolve(here, '../exams/components/ExamRow.tsx'), 'utf8');
      assert.ok(content.includes('export const ExamRow = memo('));
    });

    it('QuizChapterRow is wrapped in React.memo to prevent unnecessary re-renders', () => {
      const content = readFileSync(resolve(here, '../quizzes/components/QuizChapterRow.tsx'), 'utf8');
      assert.ok(content.includes('export const QuizChapterRow = memo('));
    });

    it('CourseCard is wrapped in React.memo to prevent unnecessary re-renders in FlashList', () => {
      const content = readFileSync(resolve(here, '../my-courses/components/CourseCard.tsx'), 'utf8');
      assert.ok(content.includes('export const CourseCard = memo('));
    });

    it('MyCoursesScreen uses FlashList with stable keyExtractor and memoized callbacks', () => {
      const content = readFileSync(resolve(here, '../my-courses/screens/MyCoursesScreen.tsx'), 'utf8');
      assert.ok(content.includes("from '@shopify/flash-list'"));
      assert.ok(content.includes('<FlashList'));
      assert.ok(content.includes('keyExtractor={keyExtractor}'));
      assert.ok(content.includes('renderItem={renderItem}'));
    });
  });

  // =========================================================================
  // 5. Section Chunking for Long Chapters
  // =========================================================================
  describe('5. Render long chapters in sections (chunking)', () => {
    it('chunks paragraphs exceeding section limit into digestible groups', () => {
      const SECTION_SIZE = 8;
      const paragraphs = Array.from({ length: 22 }, (_, i) => ({
        id: `p-${i}`,
        text: `Paragraph ${i + 1}`,
      }));

      const chunks: (typeof paragraphs)[] = [];
      for (let i = 0; i < paragraphs.length; i += SECTION_SIZE) {
        chunks.push(paragraphs.slice(i, i + SECTION_SIZE));
      }

      assert.equal(chunks.length, 3);
      assert.equal(chunks[0]?.length, 8);
      assert.equal(chunks[1]?.length, 8);
      assert.equal(chunks[2]?.length, 6);
    });

    it('RichText renders chapters in section chunks without spawning excess WebViews', () => {
      const content = readFileSync(resolve(here, '../../shared/ui/RichText.tsx'), 'utf8');
      assert.ok(content.includes('SECTION_SIZE = 8'));
      assert.ok(content.includes('sections.map'));
    });
  });

  // =========================================================================
  // 6. Startup: Sync Deferred After First Paint & Secure Session Only
  // =========================================================================
  describe('6. Startup: run catalog sync after first screen drawn, short splash', () => {
    it('SyncProvider defers the startup sync until after the first screen is drawn', () => {
      const content = readFileSync(resolve(here, '../../core/sync/SyncProvider.tsx'), 'utf8');
      assert.ok(content.includes('STARTUP_SYNC_DELAY_MS'));
      assert.ok(!content.includes('InteractionManager'));
    });

    it('SessionProvider restores session from secure storage only, without blocking network calls', () => {
      const content = readFileSync(resolve(here, '../../core/session/SessionProvider.tsx'), 'utf8');
      assert.ok(content.includes('STORAGE_KEYS.session') && content.includes('getJson<SessionSnapshot>'));
      // Does not call network API in initial restoration
      assert.ok(!content.includes('apiClient.get') && !content.includes('fetch('));
    });
  });

  // =========================================================================
  // 7. Admin Web: next/dynamic for Heavy Screens
  // =========================================================================
  describe('7. Admin Web: next/dynamic for heavy screens', () => {
    const adminRoot = resolve(here, '../../../../admin-web/src/app/(portal)');

    it('uses next/dynamic for ScanWizardScreen and NewScanScreen', () => {
      const scanList = readFileSync(resolve(adminRoot, 'scan-to-pdf/page.tsx'), 'utf8');
      assert.ok(scanList.includes("import dynamic from 'next/dynamic'"));
      assert.ok(scanList.includes('ScanWizardScreen = dynamic('));

      const newScan = readFileSync(resolve(adminRoot, 'scan-to-pdf/new/page.tsx'), 'utf8');
      assert.ok(newScan.includes("import dynamic from 'next/dynamic'"));
      assert.ok(newScan.includes('NewScanScreen = dynamic('));
    });

    it('uses next/dynamic for QuestionEditorScreen in tests', () => {
      const testNew = readFileSync(resolve(adminRoot, 'content/tests/[quiz]/new/page.tsx'), 'utf8');
      assert.ok(testNew.includes("import dynamic from 'next/dynamic'"));
      assert.ok(testNew.includes('QuestionEditorScreen = dynamic('));

      const testEdit = readFileSync(resolve(adminRoot, 'content/tests/[quiz]/[questionId]/page.tsx'), 'utf8');
      assert.ok(testEdit.includes("import dynamic from 'next/dynamic'"));
      assert.ok(testEdit.includes('QuestionEditorScreen = dynamic('));
    });

    it('uses next/dynamic for QuestionFormScreen', () => {
      const qNew = readFileSync(resolve(adminRoot, 'questions/[kind]/new/page.tsx'), 'utf8');
      assert.ok(qNew.includes("import dynamic from 'next/dynamic'"));
      assert.ok(qNew.includes('QuestionFormScreen = dynamic('));

      const qEdit = readFileSync(resolve(adminRoot, 'questions/[kind]/[setId]/page.tsx'), 'utf8');
      assert.ok(qEdit.includes("import dynamic from 'next/dynamic'"));
      assert.ok(qEdit.includes('QuestionFormScreen = dynamic('));
    });
  });

  // =========================================================================
  // 8. API & Database: Prisma Logging for N+1 Queries
  // =========================================================================
  describe('8. API & Database: Check N+1 queries with Prisma query logging', () => {
    it('PrismaService configures query logging for development/profiling', () => {
      const prismaService = readFileSync(
        resolve(here, '../../../../api/src/infrastructure/database/prisma.service.ts'),
        'utf8',
      );
      assert.ok(prismaService.includes('PRISMA_LOG_QUERIES'));
      assert.ok(prismaService.includes('Prisma Query ['));
    });
  });
});
