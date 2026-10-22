// apps/mobile/src/modules/integration.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { authApi, realAuthApi } from './auth/api/auth.api';
import { academicApi } from './profile/api/academic.api';
import { coursesApi } from './course-list/api/courses.api';
import { profileApi } from './profile/api/profile.api';
import { myCoursesApi } from './my-courses/api/myCourses.api';
import { homeApi } from './home/api/home.api';
import { storeApi } from './store/api/store.api';
import { contentApi } from './courses/api/content.api';
import { quizApi } from './quizzes/api/quiz.api';
import { examApi } from './exams/api/exam.api';
import { cocApi } from './coc/api/coc.api';
import { deviceApi } from './device-lock/api/device.api';
import { notificationsApi } from './notifications/api/notifications.api';
import { supportApi } from './support/api/support.api';

test('Mobile Integration: Auth Flow (offline registration & central server login)', async () => {
  const rand = Math.floor(Math.random() * 900000 + 100000);
  const identifier = `+251911${rand}`;
  const password = 'Password@123';
  const name = `Mobile Student ${rand}`;

  // 1. Offline Register student (stored locally, not pushed to central DB until purchase)
  const registeredOffline = await authApi.register({
    identifier,
    password,
    name,
  });

  assert.ok(registeredOffline.token, 'Registration should return an auth token');
  assert.ok(registeredOffline.user.id, 'Registration should return a student user ID');
  assert.strictEqual(registeredOffline.user.identifier, identifier);

  // 2. Offline Login student
  const loggedInOffline = await authApi.login({
    identifier,
    password,
  });

  assert.ok(loggedInOffline.token, 'Login should return an auth token');
  assert.strictEqual(loggedInOffline.user.id, registeredOffline.user.id);

  // 3. Central database registration (simulating purchase commitment)
  const registeredServer = await realAuthApi.register({
    identifier,
    password,
    name,
  });
  assert.ok(registeredServer.token);
  assert.strictEqual(registeredServer.user.identifier, identifier);
});

test('Mobile Integration: Academic Catalog Flow', async () => {
  // 1. Get universities
  const universities = await academicApi.getUniversities();
  assert.ok(Array.isArray(universities), 'Should return an array of universities');
  assert.ok(universities.length > 0, 'Should have at least one university');

  const uni = universities[0];
  assert.ok(uni.id && uni.name && uni.shortName);

  // 2. Get programs for university
  const programs = await academicApi.getPrograms(uni.id);
  assert.ok(Array.isArray(programs));

  if (programs.length > 0) {
    const prog = programs[0];
    assert.strictEqual(prog.universityId, uni.id);

    // 3. Get semesters for program
    const semesters = await academicApi.getSemesters(prog.id);
    assert.ok(Array.isArray(semesters));

    if (semesters.length > 0) {
      const sem = semesters[0];
      assert.strictEqual(sem.programId, prog.id);

      // 4. Get courses for semester & stream
      const courses = await coursesApi.getCourses(sem.id, 'NATURAL');
      assert.ok(Array.isArray(courses));
    }
  }
});

test('Mobile Integration: Student Profile & Enrollment Flow', async () => {
  const rand = Math.floor(Math.random() * 900000 + 100000);
  const identifier = `+251922${rand}`;
  const registered = await realAuthApi.register({
    identifier,
    password: 'Password@123',
    name: 'Profile Test Student',
  });

  // Get universities & semesters to pick a valid scope
  const universities = await academicApi.getUniversities();
  const uni = universities[0];
  const programs = await academicApi.getPrograms(uni.id);
  const prog = programs[0];
  const semesters = await academicApi.getSemesters(prog.id);
  const sem = semesters[0];
  const courses = await coursesApi.getCourses(sem.id, 'NATURAL');
  const courseIds = courses.slice(0, 2).map((c) => c.id);

  // Save profile
  const saved = await profileApi.saveProfile(registered.user.id, {
    universityId: uni.id,
    programId: prog.id,
    semesterId: sem.id,
    stream: 'NATURAL',
    courseIds,
  });
  assert.strictEqual(saved.universityId, uni.id);
  assert.strictEqual(saved.programId, prog.id);

  // Fetch updated profile
  const fetched = await profileApi.getProfile(registered.user.id);
  assert.ok(fetched !== null, 'Profile should exist');
  assert.strictEqual(fetched.universityId, uni.id);
  assert.strictEqual(fetched.semesterId, sem.id);

  // Verify learning summary & enrolled courses
  const myCourses = await myCoursesApi.getMyCourses(courseIds);
  assert.ok(Array.isArray(myCourses));

  const summary = await homeApi.getSummary(registered.user.id, fetched);
  assert.ok(typeof summary.chaptersTotal === 'number');
  assert.ok(typeof summary.activeProducts === 'number');
});

test('Mobile Integration: Store & Pricing Flow', async () => {
  const pricing = await storeApi.getPricing();
  assert.ok(pricing.singlePrice > 0, 'Pricing config should have single price');
  assert.ok(pricing.fullStreamPrice > 0, 'Pricing config should have fullStreamPrice');


  const accounts = await storeApi.getAccounts();
  assert.ok(accounts.CBE_MOBILE, 'Accounts should include CBE Mobile');
  assert.ok(accounts.TELEBIRR, 'Accounts should include Telebirr');
});

test('Mobile Integration: Content & Assessments Flow', async () => {
  const universities = await academicApi.getUniversities();
  const uni = universities[0];
  const programs = await academicApi.getPrograms(uni.id);
  const prog = programs[0];
  const semesters = await academicApi.getSemesters(prog.id);
  const sem = semesters[0];
  const courses = await coursesApi.getCourses(sem.id, 'NATURAL');

  if (courses.length > 0) {
    const courseId = courses[0].id;

    // Content: Topics
    const topics = await contentApi.getTopics(courseId, 'TOPIC');
    assert.ok(Array.isArray(topics));

    // Quizzes: Chapters
    const chapters = await quizApi.getChapters(courseId, 1);
    assert.ok(Array.isArray(chapters));

    // Exams: Midterm exams
    const exams = await examApi.getExams(courseId, 'MID');
    assert.ok(Array.isArray(exams));
  }

  // COC: Exam Sets
  const cocSets = await cocApi.getSets([]);
  assert.ok(Array.isArray(cocSets));

});

test('Mobile Integration: Device Lock Flow', async () => {
  const deviceId = `test-device-${Date.now()}`;
  await deviceApi.registerDevice({
    userId: 'test-user',
    deviceId,
    deviceName: 'Pixel 8 Pro (Test)',
  });

  await deviceApi.releaseDevice('test-user');
});

test('Mobile Integration: Support Tickets & Notifications Flow', async () => {
  const tickets = await supportApi.getTickets('test-user');
  assert.ok(Array.isArray(tickets));

  const notifications = await notificationsApi.getNotifications('test-user', []);
  assert.ok(Array.isArray(notifications));
});

test('Mobile Integration: Offline Exam Outbox Sync API Flow', async () => {
  const rand = Math.floor(Math.random() * 900000 + 100000);
  const authRes = await authApi.register({
    identifier: `+251933${rand}`,
    password: 'Password@123',
    name: 'Sync Student',
  });

  const { syncApi } = await import('../core/sync/syncApi');
  const now = new Date().toISOString();

  const ops = [
    {
      id: `op-exam-sync-${Date.now()}`,
      type: 'EXAM_SUBMITTED' as const,
      payload: {
        sittingId: `test-sit-${Date.now()}`,
        examId: 'test-exam-1',
        title: 'Computer Science (Mid)',
        answers: { Q1: { kind: 'choice', optionIds: ['opt-a'] } },
        reason: 'manual',
        durationMs: 3600000,
        elapsedMs: 1800000,
        startedAt: now,
        submittedAt: now,
        provisional: { correct: 4, total: 5 },
      },
      createdAt: now,
    },
  ];

  const results = await syncApi.pushBatch(authRes.user.id, ops);
  assert.ok(Array.isArray(results), 'Sync batch should return results array');
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0]!.id, ops[0]!.id);
  assert.strictEqual(results[0]!.status, 'accepted');

  // Verify idempotency on second upload
  const secondResults = await syncApi.pushBatch(authRes.user.id, ops);
  assert.strictEqual(secondResults[0]!.status, 'already_applied');
});

