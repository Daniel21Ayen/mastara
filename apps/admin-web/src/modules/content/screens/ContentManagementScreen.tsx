// apps/admin-web/src/modules/content/screens/ContentManagementScreen.tsx
'use client';

import { useState, useMemo } from 'react';
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

  // Modals
  const [isBuildDialogOpen, setIsBuildDialogOpen] = useState(false);
  const [viewTestSet, setViewTestSet] = useState<TestSetItem | null>(null);
  const [viewMaterial, setViewMaterial] = useState<MaterialItem | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

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
  };

  const handleMaterialTabChange = (subTab: MaterialSubTab) => {
    setMaterialSubTab(subTab);
    setMaterialPage(1);
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
          item.chapterTitle.toLowerCase().includes(globalQuery) ||
          item.chapterSubtitle.toLowerCase().includes(globalQuery) ||
          item.courseTitle.toLowerCase().includes(globalQuery) ||
          item.program.toLowerCase().includes(globalQuery) ||
          item.testSetId.toLowerCase().includes(globalQuery);
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
                onChange={(e) => setTestChapter(e.target.value)}
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
                onChange={(e) => setTestCourse(e.target.value)}
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
                onChange={(e) => setTestStream(e.target.value)}
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
                onChange={(e) => setTestProgram(e.target.value)}
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
                onChange={(e) => setTestStatus(e.target.value)}
              >
                <option value="All statuses">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Test Set Table Card */}
          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>#</th>
                    <th className={styles.th}>Chapter</th>
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
                      <td colSpan={8} className={styles.emptyState}>
                        No test sets found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTestSets.map((row, idx) => (
                      <tr key={row.id} className={styles.tr}>
                        <td className={`${styles.td} ${styles.indexCell}`}>{idx + 1}</td>
                        <td className={styles.td}>
                          <div className={styles.chapterCell}>
                            <span className={styles.chapterTitle}>{row.chapterTitle}</span>
                            <span className={styles.chapterSubtitle}>{row.chapterSubtitle}</span>
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
                Showing {filteredTestSets.length} of {filteredTestSets.length}
              </span>
              <div className={styles.paginationControls}>
                <button type="button" className={styles.pageBtn} disabled>
                  Previous
                </button>
                <span className={styles.pageIndicator}>Page 1 of 1</span>
                <button type="button" className={styles.pageBtn} disabled>
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
                onChange={(e) => setMatChapter(e.target.value)}
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
                onChange={(e) => setMatCourse(e.target.value)}
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
                onChange={(e) => setMatSemester(e.target.value)}
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
                onChange={(e) => setMatProgram(e.target.value)}
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
                onChange={(e) => setMatStatus(e.target.value)}
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
                    <th className={styles.th}>
                      {materialSubTab === 'modules'
                        ? 'Module Title'
                        : materialSubTab === 'notes'
                        ? 'Note Title'
                        : 'Amharic Note Title'}
                    </th>
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
                      <td colSpan={8} className={styles.emptyState}>
                        No materials found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredMaterials.map((row, idx) => (
                      <tr key={row.id} className={styles.tr}>
                        <td className={`${styles.td} ${styles.indexCell}`}>{idx + 1}</td>
                        <td className={styles.td}>
                          <div className={styles.chapterCell}>
                            <span className={styles.chapterTitle}>{row.chapterTitle}</span>
                            <span className={styles.chapterSubtitle}>{row.chapterSubtitle}</span>
                          </div>
                        </td>
                        <td className={styles.td}>
                          <div className={styles.moduleCell}>
                            <div className={styles.moduleIconBox}>
                              <Icon
                                name={
                                  row.type === 'modules'
                                    ? 'cube'
                                    : row.type === 'notes'
                                    ? 'file'
                                    : 'translate'
                                }
                                size={18}
                              />
                            </div>
                            <div className={styles.moduleDetails}>
                              <span className={styles.moduleTitleText}>{row.title}</span>
                              <span className={styles.moduleSubtitleText}>{row.subtitle}</span>
                            </div>
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
                Showing {filteredMaterials.length} of {filteredMaterials.length}
              </span>
              <div className={styles.paginationControls}>
                <button type="button" className={styles.pageBtn} disabled>
                  Previous
                </button>
                <span className={styles.pageIndicator}>Page 1 of 1</span>
                <button type="button" className={styles.pageBtn} disabled>
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
        testSet={viewTestSet}
        material={viewMaterial}
      />
    </div>
  );
}
