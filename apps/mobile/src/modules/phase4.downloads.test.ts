// apps/mobile/src/modules/phase4.downloads.test.ts
import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import type { Course } from '@mastara/contracts';
import { translate } from '@mastara/i18n';

import { downloadStore } from '@/core/downloads';
import { courseDownload } from './courses/lib/courseDownload';
import { contentRemote } from './courses/api/content.api';
import { quizRemote } from './quizzes/api/quiz.api';
import { examRemote } from './exams/api/exam.api';

describe('Phase 4: Content Streaming, Resumable Downloads & Versioning', () => {
  const testCourse: Course = {
    id: 'course-p4-physics',
    code: 'PHYS101',
    semesterId: 'sem-freshman-1',
    title: 'General Physics I',
    stream: 'NATURAL',
    contentVersion: 1,
  };

  let topicFetchCount = 0;

  // Mock remote content for the entire suite to avoid real network timeouts
  (contentRemote as any).getTopics = async (_courseId: string, kind: string) => {
    if (kind === 'MODULE') {
      return [
        { id: 'p4-topic-1', title: { en: 'Kinematics' } },
        { id: 'p4-topic-2', title: { en: 'Dynamics' } },
      ];
    }
    return [];
  };

  (contentRemote as any).getTopic = async (topicId: string) => {
    topicFetchCount++;
    return {
      id: topicId,
      courseId: testCourse.id,
      kind: 'MODULE',
      number: 1,
      title: { en: `Topic ${topicId}` },
      summary: { en: 'Summary' },
      body: { en: 'Detailed physics content' },
      isFree: false,
    };
  };

  (quizRemote as any).getChapters = async () => [];
  (examRemote as any).getExams = async () => [];

  test('DWN-01 & DWN-02: Resumable downloads skip existing units and report progress', async () => {
    await downloadStore.removeCourse(testCourse.id);
    topicFetchCount = 0;

    // 1. Initial partial download: simulate topic 1 already downloaded
    await downloadStore.saveUnit(
      {
        unitId: 'TOPIC:p4-topic-1',
        kind: 'TOPIC',
        courseId: testCourse.id,
        title: 'Kinematics',
        meta: {},
      },
      [{ key: 'content:topic:p4-topic-1', value: { id: 'p4-topic-1', body: 'cached' } }],
    );

    // Verify topic 1 is recognized as downloaded
    const existingIds = await downloadStore.ids();
    assert.ok(existingIds.has('TOPIC:p4-topic-1'), 'Topic 1 must be in downloaded ids');

    // 2. Start course download with progress tracking
    const recipe = courseDownload(testCourse);
    assert.equal(recipe.unitId, `COURSE:${testCourse.id}`);
    assert.ok(recipe.estimatedBytes && recipe.estimatedBytes > 0, 'Must provide estimated bytes (DWN-02)');

    const progressSteps: Array<{ current: number; total: number }> = [];
    const entries = await recipe.fetch((current, total) => {
      progressSteps.push({ current, total });
    });

    // Topic 1 was skipped from remote network fetch because it was already saved
    assert.equal(topicFetchCount, 1, 'Only topic 2 should have been fetched over network (topic 1 skipped)');
    assert.ok(progressSteps.length > 0, 'Progress callback should have reported steps');
    assert.equal(
      progressSteps[progressSteps.length - 1].current,
      progressSteps[progressSteps.length - 1].total,
      'Progress reaches 100% on completion',
    );

    // Verify manifest entry included in download entries
    const manifestEntry = entries.find((e) => e.key === `course:${testCourse.id}:manifest`);
    assert.ok(manifestEntry, 'Manifest entry must be present');
    assert.equal((manifestEntry.value as any).contentVersion, 1);
  });

  test('DWN-06: Content versioning detects "Update available" and saves new version', async () => {
    await downloadStore.removeCourse(testCourse.id);

    // Save initial course manifest with contentVersion 1
    const recipeV1 = courseDownload({ ...testCourse, contentVersion: 1 });
    const entriesV1 = await recipeV1.fetch();
    await downloadStore.saveUnit(
      {
        unitId: recipeV1.unitId,
        kind: 'COURSE',
        courseId: testCourse.id,
        title: testCourse.title,
        meta: testCourse,
      },
      entriesV1,
    );

    // Verify initial version is 1
    const localVersion1 = await downloadStore.getDownloadedCourseVersion(testCourse.id);
    assert.equal(localVersion1, 1, 'Initial downloaded version is 1');

    // Server announces course contentVersion 2
    const serverCourseV2: Course = { ...testCourse, contentVersion: 2 };
    const isUpdateAvailable =
      localVersion1 !== null && (serverCourseV2.contentVersion ?? 1) > localVersion1;
    assert.equal(isUpdateAvailable, true, 'Update available when server version > local version');

    // Run update download
    const recipeV2 = courseDownload(serverCourseV2);
    const entriesV2 = await recipeV2.fetch();
    await downloadStore.saveUnit(
      {
        unitId: recipeV2.unitId,
        kind: 'COURSE',
        courseId: testCourse.id,
        title: serverCourseV2.title,
        meta: serverCourseV2,
      },
      entriesV2,
    );

    // Verify local version is now 2
    const localVersion2 = await downloadStore.getDownloadedCourseVersion(testCourse.id);
    assert.equal(localVersion2, 2, 'Downloaded version updated to 2');

    const isStillUpdateAvailable =
      localVersion2 !== null && (serverCourseV2.contentVersion ?? 1) > localVersion2;
    assert.equal(isStillUpdateAvailable, false, 'No update available after update download');
  });

  test('DWN-07 & ACC-06: Content deletion removes local files and resets state to Download', async () => {
    // 1. Confirm course is downloaded
    const isDownloadedBefore = await downloadStore.isCourseDownloaded(testCourse.id);
    assert.equal(isDownloadedBefore, true, 'Course is downloaded prior to deletion');

    // 2. Delete course
    await downloadStore.removeCourse(testCourse.id);

    // 3. Confirm deletion
    const isDownloadedAfter = await downloadStore.isCourseDownloaded(testCourse.id);
    assert.equal(isDownloadedAfter, false, 'Course is no longer marked as downloaded');

    const versionAfter = await downloadStore.getDownloadedCourseVersion(testCourse.id);
    assert.equal(versionAfter, null, 'Downloaded version returns null after deletion');
  });

  test('Translations: Phase 4 keys exist in both English and Amharic', () => {
    const enKeys = [
      'course.download.updateAvailable',
      'course.download.mobileDataWarningTitle',
      'course.download.mobileDataWarningBody',
      'course.download.progress',
    ] as const;

    for (const key of enKeys) {
      const enText = translate('en', key, { size: '25 MB', percent: 50, current: 1, total: 2 });
      const amText = translate('am', key, { size: '25 MB', percent: 50, current: 1, total: 2 });

      assert.ok(enText && enText.length > 0, `Missing EN translation for ${key}`);
      assert.ok(amText && amText.length > 0, `Missing AM translation for ${key}`);
      if (key !== 'course.download.progress') {
        assert.notEqual(enText, amText, `EN and AM should differ for ${key}`);
      }
    }
  });
});
