// apps/admin-web/src/modules/content/screens/ContentManagementScreen.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { quizSlug } from '@mastara/domain';
import type { QuizNumber } from '@mastara/domain';
import { Icon } from '@/shared/ui';
import {
  INITIAL_TEST_SETS,
  INITIAL_MATERIALS,
  type TestSetItem,
  type MaterialItem,
  type MaterialSubTab,
} from '../state/contentManagementData';
import { BuildTestSetDialog } from '../components/BuildTestSetDialog';
import { ViewDetailModal } from '../components/ViewDetailModal';
import { contentApi } from '../api/content.api';
import { StudentPreviewModal } from '@/shared/preview';
import styles from '../components/ContentManagement.module.css';

interface Props {
  initialTab?: 'materials' | 'tests';
  initialQuiz?: QuizNumber;
  initialMaterialSubTab?: MaterialSubTab;
}

export function ContentManagementScreen({
  initialTab = 'materials',
  initialQuiz = 1,
  initialMaterialSubTab = 'modules',
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const globalQuery = searchParams.get('q')?.toLowerCase().trim() || '';

  // Main Tab: 'materials' (Screenshot 2) vs 'tests' (Screenshot 1)
  const [activeTab, setActiveTab] = useState<'materials' | 'tests'>(initialTab);

  // Sub Tabs
  const [quizNo, setQuizNo] = useState<QuizNumber>(initialQuiz);
  const [materialSubTab, setMaterialSubTab] = useState<MaterialSubTab>(initialMaterialSubTab);

  // Lists Data State
  const [testSets, setTestSets] = useState<TestSetItem[]>(INITIAL_TEST_SETS);
  const [materials, setMaterials] = useState<MaterialItem[]>(INITIAL_MATERIALS);

  useEffect(() => {
    let isCancelled = false;
    async function loadLiveMaterials() {
      try {
        const courses = await contentApi.listCourses();
        if (isCancelled || courses.length === 0) return;

        const liveItems: MaterialItem[] = [];

        for (const course of courses) {
          try {
            const [modules, notes] = await Promise.all([
              contentApi.listModules(course.id).catch(() => []),
              contentApi.listNotes(course.id).catch(() => []),
            ]);

            for (const mod of modules) {
              liveItems.push({
                id: mod.id,
                type: 'modules',
                chapterNumber: mod.number,
                chapterTitle: `Chapter ${mod.number}`,
                chapterSubtitle: mod.title.en,
                title: mod.title.en,
                subtitle: mod.title.am || `Module ${mod.number}`,
                courseTitle: course.title,
                courseCode: course.code,
                semester: 'Semester 1',
                program: 'Remedial',
                status: mod.status === 'PUBLISHED' ? 'Active' : 'Inactive',
                content: `Module ${mod.number}: ${mod.topics.length} topics, ${mod.notes.length} notes`,
              });
            }

            for (const note of notes) {
              liveItems.push({
                id: note.id,
                type: 'notes',
                chapterNumber: note.moduleNumber || 1,
                chapterTitle: `Chapter ${note.moduleNumber || 1}`,
                chapterSubtitle: note.title.en,
                title: note.title.en,
                subtitle: note.title.am || '',
                courseTitle: course.title,
                courseCode: course.code,
                semester: 'Semester 1',
                program: 'Remedial',
                status: note.status === 'PUBLISHED' ? 'Active' : 'Inactive',
                content: note.body.en,
              });

              if (note.title.am || note.body.am) {
                liveItems.push({
                  id: `${note.id}-am`,
                  type: 'amharic-notes',
                  chapterNumber: note.moduleNumber || 1,
                  chapterTitle: `Chapter ${note.moduleNumber || 1}`,
                  chapterSubtitle: note.title.am || note.title.en,
                  title: note.title.am || note.title.en,
                  subtitle: note.title.en,
                  courseTitle: course.title,
                  courseCode: course.code,
                  semester: 'Semester 1',
                  program: 'Remedial',
                  status: note.status === 'PUBLISHED' ? 'Active' : 'Inactive',
                  content: note.body.am || note.body.en,
                });
              }
            }
          } catch {
            // ignore course fetching errors
          }
        }

        if (!isCancelled && liveItems.length > 0) {
          setMaterials((prev) => {
            const liveIds = new Set(liveItems.map((item) => item.id));
            const remaining = prev.filter((item) => !liveIds.has(item.id));
            return [...liveItems, ...remaining];
          });
        }
      } catch (err) {
        console.error('Failed to fetch live materials for content management:', err);
      }
    }

    loadLiveMaterials();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Modals
  const [isBuildDialogOpen, setIsBuildDialogOpen] = useState(false);
  const [viewTestSet, setViewTestSet] = useState<TestSetItem | null>(null);
  const [viewMaterial, setViewMaterial] = useState<MaterialItem | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isStudentPreviewOpen, setIsStudentPreviewOpen] = useState(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters for Test Set Management (Screenshot 1)
  const [testChapter, setTestChapter] = useState('All chapters');
  const [testCourse, setTestCourse] = useState('All courses');
  const [testStream, setTestStream] = useState('All streams');
  const [testProgram, setTestProgram] = useState('All programs');
  const [testStatus, setTestStatus] = useState('All statuses');

  // Filters for Material Management (Screenshot 2)
  const [matChapter, setMatChapter] = useState('All chapters');
  const [matCourse, setMatCourse] = useState('All courses');
  const [matSemester, setMatSemester] = useState('All semesters');
  const [matProgram, setMatProgram] = useState('All programs');
  const [matStatus, setMatStatus] = useState('All statuses');

  // Pagination State
  const [testPage, setTestPage] = useState(1);
  const [materialPage, setMaterialPage] = useState(1);
  const pageSize = 10;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTabSwitch = (tab: 'materials' | 'tests') => {
    setActiveTab(tab);
    if (tab === 'materials') {
      router.push('/content');
    } else {
      router.push('/content/tests');
    }
  };

  const handleQuizTabChange = (quiz: QuizNumber) => {
    setQuizNo(quiz);
    setTestPage(1);
    router.push(`/content/tests/${quizSlug(quiz)}`);
  };

  const handleMaterialTabChange = (subTab: MaterialSubTab) => {
    setMaterialSubTab(subTab);
    setMaterialPage(1);
    router.push(`/content/${subTab}`);
  };

  // Build Test Set Handler
  const handleTestSetBuilt = (newTestSet: TestSetItem) => {
    setTestSets((prev) => [newTestSet, ...prev]);
    setQuizNo(newTestSet.quizNo);
    showToast(`Test Set "${newTestSet.testSetId}" built successfully!`);
  };

  // Verify Test Set Handler
  const handleVerify = (item: TestSetItem) => {
    setTestSets((prev) =>
      prev.map((t) =>
        t.id === item.id
          ? { ...t, verified: !t.verified, status: !t.verified ? 'Active' : t.status }
          : t,
      ),
    );
    showToast(
      !item.verified
        ? `Test Set "${item.testSetId}" has been verified!`
        : `Verification removed for "${item.testSetId}".`,
    );
  };

  // Toggle Material Status
  const handleToggleMaterialStatus = (id: string) => {
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: m.status === 'Active' ? 'Inactive' : 'Active' } : m,
      ),
    );
    setOpenDropdownId(null);
    showToast('Material status updated.');
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    setOpenDropdownId(null);
    showToast('Material removed.');
  };

  // Filtered Test Sets
  const filteredTestSets = useMemo(() => {
    return testSets.filter((item) => {
      if (item.quizNo !== quizNo) return false;
      if (testChapter !== 'All chapters' && item.chapterTitle !== testChapter) return false;
      if (testCourse !== 'All courses' && item.courseTitle !== testCourse) return false;
      if (testStream !== 'All streams' && item.stream !== testStream) return false;
      if (testProgram !== 'All programs' && item.program !== testProgram) return false;
      if (testStatus !== 'All statuses' && item.status !== testStatus) return false;
      if (globalQuery) {
        const matchesQuery =
          item.question.toLowerCase().includes(globalQuery) ||
          item.chapterTitle.toLowerCase().includes(globalQuery) ||
          item.chapterSubtitle.toLowerCase().includes(globalQuery) ||
          item.courseTitle.toLowerCase().includes(globalQuery) ||
          item.program.toLowerCase().includes(globalQuery) ||
          (item.testSetId && item.testSetId.toLowerCase().includes(globalQuery));
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [testSets, quizNo, testChapter, testCourse, testStream, testProgram, testStatus, globalQuery]);

  // Filtered Materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      if (item.type !== materialSubTab) return false;
      if (matChapter !== 'All chapters' && item.chapterTitle !== matChapter) return false;
      if (matCourse !== 'All courses' && item.courseTitle !== matCourse) return false;
      if (matSemester !== 'All semesters' && item.semester !== matSemester) return false;
      if (matProgram !== 'All programs' && item.program !== matProgram) return false;
      if (matStatus !== 'All statuses' && item.status !== matStatus) return false;
      if (globalQuery) {
        const matchesQuery =
          item.title.toLowerCase().includes(globalQuery) ||
          item.subtitle.toLowerCase().includes(globalQuery) ||
          item.chapterTitle.toLowerCase().includes(globalQuery) ||
          item.courseTitle.toLowerCase().includes(globalQuery) ||
          item.program.toLowerCase().includes(globalQuery);
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [materials, materialSubTab, matChapter, matCourse, matSemester, matProgram, matStatus, globalQuery]);

  const testPageCount = Math.max(1, Math.ceil(filteredTestSets.length / pageSize));
  const materialPageCount = Math.max(1, Math.ceil(filteredMaterials.length / pageSize));

  const pagedTestSets = useMemo(() => {
    const start = (testPage - 1) * pageSize;
    return filteredTestSets.slice(start, start + pageSize);
  }, [filteredTestSets, testPage, pageSize]);

  const pagedMaterials = useMemo(() => {
    const start = (materialPage - 1) * pageSize;
    return filteredMaterials.slice(start, start + pageSize);
  }, [filteredMaterials, materialPage, pageSize]);

  // Unique options for filters
  const testChapters = ['All chapters', ...Array.from(new Set(testSets.map((t) => t.chapterTitle)))];
  const testCourses = ['All courses', ...Array.from(new Set(testSets.map((t) => t.courseTitle)))];
  const testStreams = ['All streams', ...Array.from(new Set(testSets.map((t) => t.stream)))];
  const testPrograms = ['All programs', ...Array.from(new Set(testSets.map((t) => t.program)))];

  const matChapters = ['All chapters', ...Array.from(new Set(materials.map((m) => m.chapterTitle)))];
  const matCourses = ['All courses', ...Array.from(new Set(materials.map((m) => m.courseTitle)))];
  const matSemesters = ['All semesters', ...Array.from(new Set(materials.map((m) => m.semester)))];
  const matPrograms = ['All programs', ...Array.from(new Set(materials.map((m) => m.program)))];

  return (
    <div className={styles.container}>
      {/* Top Switcher Tabs between Materials and Tests */}
      <div className={styles.topNavRow}>
        <div className={styles.topSwitcher}>
          <button
            type="button"
            className={`${styles.topSwitcherBtn} ${
              activeTab === 'materials' ? styles.topSwitcherBtnActive : ''
            }`}
            onClick={() => handleTabSwitch('materials')}
          >
            <Icon name="file" size={18} />
            Materials
          </button>
          <button
            type="button"
            className={`${styles.topSwitcherBtn} ${
              activeTab === 'tests' ? styles.topSwitcherBtnActive : ''
            }`}
            onClick={() => handleTabSwitch('tests')}
          >
            <Icon name="check" size={18} />
            Tests
          </button>
        </div>
      </div>

      {/* Toast Notice */}
      {toastMessage && (
        <div className={styles.toastNotice}>
          <span>✓ {toastMessage}</span>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setToastMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* ==========================================================================
          TAB 1: TEST SET MANAGEMENT (SCREENSHOT 1)
          ========================================================================== */}
      {activeTab === 'tests' && (
        <>
          {/* Header */}
          <div className={styles.testSetHeader}>
            <h1 className={styles.testSetTitle}>Test Set Management</h1>
            <div className={styles.testSetHeaderActions}>
              <button
                type="button"
                className={styles.buildTestSetBtn}
                style={{ background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1' }}
                onClick={() => setIsStudentPreviewOpen(true)}
                title="Preview as Student"
              >
                <Icon name="eye" size={18} />
                Preview as Student
              </button>
              <Link
                href={`/content/tests/${quizSlug(quizNo)}/new`}
                className={styles.newQuestionBtn}
              >
                + New Question
              </Link>
              <button
                type="button"
                className={styles.buildTestSetBtn}
                onClick={() => setIsBuildDialogOpen(true)}
              >
                <Icon name="grid" size={18} />
                Build Test Set
              </button>
            </div>
          </div>

          {/* Sub Tabs: Quiz 1, Quiz 2, Quiz 3 */}
          <div className={styles.subTabsRow}>
            {[1, 2, 3].map((q) => {
              const num = q as QuizNumber;
              const isActive = quizNo === num;
              return (
                <button
                  key={num}
                  type="button"
                  className={`${styles.quizTabBtn} ${isActive ? styles.quizTabBtnActive : ''}`}
                  onClick={() => handleQuizTabChange(num)}
                >
                  Quiz {num}
                </button>
              );
            })}
          </div>

          {/* Filters Row */}
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="filter-test-chapter">
                Chapter
              </label>
              <select
                id="filter-test-chapter"
                className={styles.filterSelect}
                value={testChapter}
                onChange={(e) => {
                  setTestChapter(e.target.value);
                  setTestPage(1);
                }}
              >
                {testChapters.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="filter-test-course">
                Course
              </label>
              <select
                id="filter-test-course"
                className={styles.filterSelect}
                value={testCourse}
                onChange={(e) => {
                  setTestCourse(e.target.value);
                  setTestPage(1);
                }}
              >
                {testCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="filter-test-stream">
                Stream
              </label>
              <select
                id="filter-test-stream"
                className={styles.filterSelect}
                value={testStream}
                onChange={(e) => {
                  setTestStream(e.target.value);
                  setTestPage(1);
                }}
              >
                {testStreams.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="filter-test-program">
                Program
              </label>
              <select
                id="filter-test-program"
                className={styles.filterSelect}
                value={testProgram}
                onChange={(e) => {
                  setTestProgram(e.target.value);
                  setTestPage(1);
                }}
              >
                {testPrograms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="filter-test-status">
                Status
              </label>
              <select
                id="filter-test-status"
                className={styles.filterSelect}
                value={testStatus}
                onChange={(e) => {
                  setTestStatus(e.target.value);
                  setTestPage(1);
                }}
              >
                <option value="All statuses">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Test Sets Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>#</th>
                    <th className={styles.th}>Chapter</th>
                    <th className={styles.th}>Question</th>
                    <th className={styles.th}>Course Title</th>
                    <th className={styles.th}>Semester</th>
                    <th className={styles.th}>Stream</th>
                    <th className={styles.th}>Program</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTestSets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={styles.emptyState}>
                        No questions found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    pagedTestSets.map((row, idx) => (
                      <tr key={row.id} className={styles.tr}>
                        <td className={`${styles.td} ${styles.indexCell}`}>{(testPage - 1) * pageSize + idx + 1}</td>
                        <td className={styles.td}>
                          <div className={styles.chapterCell}>
                            <span className={styles.chapterTitle}>{row.chapterTitle}</span>
                            {row.chapterSubtitle ? (
                              <span className={styles.chapterSubtitle}>{row.chapterSubtitle}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className={styles.td}>
                          <div className={styles.questionCell}>
                            <span className={styles.questionText} title={row.question}>
                              {row.question}
                            </span>
                            <span className={styles.questionMetaTag}>
                              {row.questionId} · {row.questionType}
                            </span>
                          </div>
                        </td>
                        <td className={styles.td}>{row.courseTitle}</td>
                        <td className={styles.td}>{row.semester}</td>
                        <td className={styles.td}>{row.stream}</td>
                        <td className={styles.td}>{row.program}</td>
                        <td className={styles.td}>
                          <span
                            className={
                              row.status === 'Active'
                                ? styles.statusPillActive
                                : styles.statusPillInactive
                            }
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className={styles.td}>
                          <div className={styles.actionsCell}>
                            <Link
                              href={`/content/tests/${quizSlug(row.quizNo)}/studio?id=${row.id}`}
                              className={styles.btnActionOutline}
                            >
                              <Icon name="edit" size={14} />
                              Edit
                            </Link>
                            <button
                              type="button"
                              className={styles.btnActionPrimary}
                              onClick={() => handleVerify(row)}
                            >
                              <Icon name="shieldCheck" size={14} />
                              {row.verified ? 'Verified' : 'Verify'}
                            </button>
                            <button
                              type="button"
                              className={styles.btnActionOutline}
                              onClick={() => setViewTestSet(row)}
                            >
                              <Icon name="eye" size={14} />
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className={styles.paginationRow}>
              <span className={styles.paginationCount}>
                Showing {filteredTestSets.length === 0 ? 0 : (testPage - 1) * pageSize + 1} to{' '}
                {Math.min(testPage * pageSize, filteredTestSets.length)} of {filteredTestSets.length}
              </span>
              <div className={styles.paginationControls}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={testPage <= 1}
                  onClick={() => setTestPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className={styles.pageIndicator}>
                  Page {testPage} of {testPageCount}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={testPage >= testPageCount}
                  onClick={() => setTestPage((p) => Math.min(testPageCount, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==========================================================================
          TAB 2: MATERIAL MANAGEMENT (SCREENSHOT 2)
          ========================================================================== */}
      {activeTab === 'materials' && (
        <>
          {/* Header */}
          <div className={styles.materialHeader}>
            <div className={styles.materialHeaderLeft}>
              <div className={styles.materialLogoBox} aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 30 30" fill="none">
                  <path
                    d="M15 6.5C11.5 3 4 3 2.5 5.5v16.5c2.5 0 8.5 0 12.5 3.5 4-3.5 10-3.5 12.5-3.5V5.5c-1.5-2.5-9-2.5-12.5 1z"
                    fill="#3b82f6"
                  />
                  <path d="M15 25.5V6.5" stroke="#1d4ed8" strokeWidth="1.5" />
                  <path
                    d="M15 1.5l1.2 2.3 2.6.4-1.9 1.8.4 2.6-2.3-1.2-2.3 1.2.4-2.6-1.9-1.8 2.6-.4L15 1.5z"
                    fill="#FBBF24"
                  />
                </svg>
              </div>
              <div className={styles.materialHeaderText}>
                <h1 className={styles.materialTitle}>Material Management</h1>
                <p className={styles.materialSubtitle}>
                  Manage course materials, modules, and study resources.
                </p>
              </div>
            </div>

            <Link href="/content/material/studio" className={styles.newMaterialBtn}>
              + New Material
            </Link>
          </div>

          {/* Sub Tabs: Modules, Note, Amharic Notes */}
          <div className={styles.subTabsRow}>
            <button
              type="button"
              className={`${styles.materialTabBtn} ${
                materialSubTab === 'modules' ? styles.materialTabBtnActive : ''
              }`}
              onClick={() => handleMaterialTabChange('modules')}
            >
              <Icon name="cube" size={18} />
              Modules
            </button>
            <button
              type="button"
              className={`${styles.materialTabBtn} ${
                materialSubTab === 'notes' ? styles.materialTabBtnActive : ''
              }`}
              onClick={() => handleMaterialTabChange('notes')}
            >
              <Icon name="file" size={18} />
              Note
            </button>
            <button
              type="button"
              className={`${styles.materialTabBtn} ${
                materialSubTab === 'amharic-notes' ? styles.materialTabBtnActive : ''
              }`}
              onClick={() => handleMaterialTabChange('amharic-notes')}
            >
              <Icon name="translate" size={18} />
              Amharic Notes
            </button>
          </div>

          {/* Filters Row */}
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="filter-mat-chapter">
                Chapter
              </label>
              <select
                id="filter-mat-chapter"
                className={styles.filterSelect}
                value={matChapter}
                onChange={(e) => {
                  setMatChapter(e.target.value);
                  setMaterialPage(1);
                }}
              >
                {matChapters.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="filter-mat-course">
                Course
              </label>
              <select
                id="filter-mat-course"
                className={styles.filterSelect}
                value={matCourse}
                onChange={(e) => {
                  setMatCourse(e.target.value);
                  setMaterialPage(1);
                }}
              >
                {matCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="filter-mat-semester">
                Semester
              </label>
              <select
                id="filter-mat-semester"
                className={styles.filterSelect}
                value={matSemester}
                onChange={(e) => {
                  setMatSemester(e.target.value);
                  setMaterialPage(1);
                }}
              >
                {matSemesters.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="filter-mat-program">
                Program
              </label>
              <select
                id="filter-mat-program"
                className={styles.filterSelect}
                value={matProgram}
                onChange={(e) => {
                  setMatProgram(e.target.value);
                  setMaterialPage(1);
                }}
              >
                {matPrograms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="filter-mat-status">
                Status
              </label>
              <select
                id="filter-mat-status"
                className={styles.filterSelect}
                value={matStatus}
                onChange={(e) => {
                  setMatStatus(e.target.value);
                  setMaterialPage(1);
                }}
              >
                <option value="All statuses">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Material Table Card */}
          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>#</th>
                    <th className={styles.th}>Chapter</th>
                    <th className={styles.th}>Course</th>
                    <th className={styles.th}>Semester</th>
                    <th className={styles.th}>Program</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.emptyState}>
                        No materials found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    pagedMaterials.map((row, idx) => (
                      <tr key={row.id} className={styles.tr}>
                        <td className={`${styles.td} ${styles.indexCell}`}>{(materialPage - 1) * pageSize + idx + 1}</td>
                        <td className={styles.td}>
                          <div className={styles.chapterCell}>
                            <span className={styles.chapterTitle}>{row.chapterTitle}</span>
                            <span className={styles.chapterSubtitle}>{row.chapterSubtitle}</span>
                          </div>
                        </td>
                        <td className={styles.td}>{row.courseTitle}</td>
                        <td className={styles.td}>{row.semester}</td>
                        <td className={styles.td}>{row.program}</td>
                        <td className={styles.td}>
                          <span className={styles.statusBadgeDot}>
                            <span
                              className={
                                row.status === 'Active' ? styles.dotGreen : styles.dotBlue
                              }
                            />
                            <span
                              className={
                                row.status === 'Active'
                                ? styles.statusActiveDot
                                : styles.statusInactiveDot
                              }
                            >
                              {row.status}
                            </span>
                          </span>
                        </td>
                        <td className={styles.td}>
                          <div className={styles.actionsCell}>
                            <Link
                              href={`/content/material/studio?id=${row.id}&tab=${row.type}`}
                              className={styles.btnActionOutline}
                            >
                              <Icon name="edit" size={14} />
                              Edit
                            </Link>
                            <button
                              type="button"
                              className={styles.btnActionPrimary}
                              onClick={() => setViewMaterial(row)}
                            >
                              <Icon name="eye" size={14} />
                              View
                            </button>
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                className={styles.btnActionDots}
                                onClick={() =>
                                  setOpenDropdownId(
                                    openDropdownId === row.id ? null : row.id,
                                  )
                                }
                                title="More options"
                              >
                                ⋮
                              </button>
                              {openDropdownId === row.id && (
                                <div className={styles.dropdownMenu}>
                                  <button
                                    type="button"
                                    className={styles.dropdownItem}
                                    onClick={() => handleToggleMaterialStatus(row.id)}
                                  >
                                    Mark as {row.status === 'Active' ? 'Inactive' : 'Active'}
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                                    onClick={() => handleDeleteMaterial(row.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className={styles.paginationRow}>
              <span className={styles.paginationCount}>
                Showing {filteredMaterials.length === 0 ? 0 : (materialPage - 1) * pageSize + 1} to{' '}
                {Math.min(materialPage * pageSize, filteredMaterials.length)} of {filteredMaterials.length}
              </span>
              <div className={styles.paginationControls}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={materialPage <= 1}
                  onClick={() => setMaterialPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className={styles.pageIndicator}>
                  Page {materialPage} of {materialPageCount}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={materialPage >= materialPageCount}
                  onClick={() => setMaterialPage((p) => Math.min(materialPageCount, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Build Test Set Dialog Modal */}
      <BuildTestSetDialog
        isOpen={isBuildDialogOpen}
        onClose={() => setIsBuildDialogOpen(false)}
        defaultQuizNo={quizNo}
        onBuild={handleTestSetBuilt}
      />

      {/* View Detail Modal */}
      <ViewDetailModal
        isOpen={viewTestSet !== null || viewMaterial !== null}
        onClose={() => {
          setViewTestSet(null);
          setViewMaterial(null);
        }}
        questionItem={viewTestSet}
        material={viewMaterial}
      />

      {/* Student Preview Modal */}
      <StudentPreviewModal
        isOpen={isStudentPreviewOpen}
        onClose={() => setIsStudentPreviewOpen(false)}
        title={`Quiz ${quizNo} - Student Preview`}
        subtitle="Test Set Assessment Mode"
        category="Enrolled Course"
        mode="assessment"
        content="Review test set questions in read-only simulation mode. Stripped teacher rubrics and answers."
        questions={filteredTestSets.slice(0, 5).map((ts) => ({
          id: ts.id,
          prompt: ts.question,
          type: ts.questionType,
          options: ts.options || ['Option A', 'Option B', 'Option C', 'Option D'],
        }))}
      />
    </div>
  );
}
