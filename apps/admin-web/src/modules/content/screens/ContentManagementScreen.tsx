// apps/admin-web/src/modules/content/screens/ContentManagementScreen.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/shared/ui';
import { useContentCourse } from '../state/ContentCourseContext';
import { useMaterial } from '../hooks/useContent';
import { useTestsOverview } from '@/modules/tests/hooks/useTests';
import styles from '../components/ContentManagement.module.css';

interface Props {
  initialTab?: 'materials' | 'tests';
}

export function ContentManagementScreen({ initialTab = 'materials' }: Props) {
  const router = useRouter();
  const { courses, course, setCourseId } = useContentCourse();
  const [activeTab, setActiveTab] = useState<'materials' | 'tests'>(initialTab);

  const activeCourseId = course?.id || 'cs101';
  const { summary: materialSummary } = useMaterial(activeCourseId);
  const { data: testsData } = useTestsOverview(activeCourseId);

  const courseTitle = course?.title || 'Computer Science (CS101)';

  const handleTabSwitch = (tab: 'materials' | 'tests') => {
    setActiveTab(tab);
    if (tab === 'materials') {
      router.push('/content');
    } else {
      router.push('/content/tests');
    }
  };

  // Safe fallback counts
  const moduleCount = materialSummary.data?.moduleCount ?? 8;
  const noteCount = materialSummary.data?.noteCount ?? 24;
  const amharicNoteCount = materialSummary.data?.amharicNoteCount ?? 12;
  const topicCount = materialSummary.data?.topicCount ?? 24;
  const quizCount = materialSummary.data?.quizCount ?? 3;

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Content Management</h1>
          <p className={styles.subtitle}>
            {activeTab === 'materials'
              ? 'Create and manage course materials and assessments'
              : 'Create and manage course materials, quizzes, modules and assessments'}
          </p>
        </div>

        <div className={styles.coursePickerWrapper}>
          <span className={styles.coursePickerIcon}>
            <Icon name="graduationCap" size={18} />
          </span>
          <select
            className={styles.courseSelect}
            value={course?.id || ''}
            onChange={(e) => setCourseId(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
            {courses.length === 0 && <option value="cs101">Computer Science (CS101)</option>}
          </select>
        </div>
      </header>

      {/* Pill Switcher Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'materials' ? styles.tabBtnActive : ''}`}
          onClick={() => handleTabSwitch('materials')}
        >
          <Icon name="file" size={18} />
          Materials
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'tests' ? styles.tabBtnActive : ''}`}
          onClick={() => handleTabSwitch('tests')}
        >
          <Icon name="check" size={18} />
          Tests
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className={styles.layout}>
        {/* ===================== TAB 1: MATERIALS ===================== */}
        {activeTab === 'materials' && (
          <>
            <div className={styles.mainColumn}>
              {/* 3 Cards Row */}
              <div className={styles.cardsGrid3}>
                {/* Modules Card */}
                <div className={styles.statCard}>
                  <div className={`${styles.iconCircle} ${styles.iconCircleGreen}`}>
                    <Icon name="file" size={22} />
                  </div>
                  <h3 className={styles.statCardTitle}>Modules</h3>
                  <span className={styles.statCardCount}>{moduleCount} modules</span>
                  <Link href="/content/modules" className={styles.manageLink}>
                    Manage →
                  </Link>
                </div>

                {/* Notes Card */}
                <div className={styles.statCard}>
                  <div className={`${styles.iconCircle} ${styles.iconCircleBlue}`}>
                    <Icon name="file" size={22} />
                  </div>
                  <h3 className={styles.statCardTitle}>Notes</h3>
                  <span className={styles.statCardCount}>{noteCount} total notes</span>
                  <Link href="/content/notes" className={styles.manageLink}>
                    Manage →
                  </Link>
                </div>

                {/* Amharic Notes Card */}
                <div className={styles.statCard}>
                  <div className={`${styles.iconCircle} ${styles.iconCirclePurple}`}>
                    <Icon name="file" size={22} />
                  </div>
                  <h3 className={styles.statCardTitle}>Amharic Notes</h3>
                  <span className={styles.statCardCount}>{amharicNoteCount} total notes</span>
                  <Link href="/content/amharic-notes" className={styles.manageLink}>
                    Manage →
                  </Link>
                </div>
              </div>

              {/* Course Overview Card */}
              <div className={styles.overviewCard}>
                <h3 className={styles.overviewTitle}>Course Overview</h3>
                <div className={styles.courseBadge}>{courseTitle}</div>
                <p className={styles.statsText}>
                  Modules {moduleCount} · Topics {topicCount} · Quizzes {quizCount}
                </p>
              </div>
            </div>

            {/* Side Column */}
            <div className={styles.sideColumn}>
              {/* Quick Actions */}
              <div className={styles.sideCard}>
                <div className={styles.sideHeader}>
                  <h3 className={styles.sideTitle}>Quick Actions</h3>
                </div>
                <div className={styles.quickActionsList}>
                  <Link href="/content/modules" className={styles.quickActionBtn}>
                    + Add Module
                  </Link>
                  <Link href="/content/notes" className={styles.quickActionBtn}>
                    + Add Note
                  </Link>
                  <Link href="/content/amharic-notes" className={styles.quickActionBtn}>
                    + Add Amharic Note
                  </Link>
                </div>
              </div>

              {/* Recent Updates */}
              <div className={styles.sideCard}>
                <div className={styles.sideHeader}>
                  <h3 className={styles.sideTitle}>Recent Updates</h3>
                </div>
                <ul className={styles.updatesList}>
                  <li className={styles.updateItem}>
                    <span className={styles.updateIcon} style={{ color: '#16a34a' }}>
                      ●
                    </span>
                    <div className={styles.updateInfo}>
                      <span className={styles.updateTitle}>Module 3 - Algorithms</span>
                      <span className={styles.updateTime}>2 hours ago</span>
                    </div>
                  </li>
                  <li className={styles.updateItem}>
                    <span className={styles.updateIcon} style={{ color: '#0066ff' }}>
                      ●
                    </span>
                    <div className={styles.updateInfo}>
                      <span className={styles.updateTitle}>Note: Data Structures</span>
                      <span className={styles.updateTime}>5 hours ago</span>
                    </div>
                  </li>
                  <li className={styles.updateItem}>
                    <span className={styles.updateIcon} style={{ color: '#9333ea' }}>
                      ●
                    </span>
                    <div className={styles.updateInfo}>
                      <span className={styles.updateTitle}>Amharic Note - ክለሳ?</span>
                      <span className={styles.updateTime}>1 day ago</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}

        {/* ===================== TAB 2: TESTS ===================== */}
        {activeTab === 'tests' && (
          <>
            <div className={styles.mainColumn}>
              {/* 4 Cards Row */}
              <div className={styles.cardsGrid4}>
                {/* Quiz 1 */}
                <div className={styles.statCard}>
                  <div className={`${styles.iconCircle} ${styles.iconCircleBlue}`}>
                    <Icon name="check" size={22} />
                  </div>
                  <h3 className={styles.statCardTitle}>Quiz 1</h3>
                  <span className={styles.statCardCount}>5 questions</span>
                  <Link href="/content/tests/quiz-1" className={styles.manageLink}>
                    Manage →
                  </Link>
                </div>

                {/* Quiz 2 */}
                <div className={styles.statCard}>
                  <div className={`${styles.iconCircle} ${styles.iconCircleBlue}`}>
                    <Icon name="check" size={22} />
                  </div>
                  <h3 className={styles.statCardTitle}>Quiz 2</h3>
                  <span className={styles.statCardCount}>8 questions</span>
                  <Link href="/content/tests/quiz-2" className={styles.manageLink}>
                    Manage →
                  </Link>
                </div>

                {/* Quiz 3 */}
                <div className={styles.statCard}>
                  <div className={`${styles.iconCircle} ${styles.iconCircleBlue}`}>
                    <Icon name="check" size={22} />
                  </div>
                  <h3 className={styles.statCardTitle}>Quiz 3</h3>
                  <span className={styles.statCardCount}>6 questions</span>
                  <Link href="/content/tests/quiz-3" className={styles.manageLink}>
                    Manage →
                  </Link>
                </div>

                {/* Total Quizzes */}
                <div className={styles.statCard}>
                  <div className={`${styles.iconCircle} ${styles.iconCircleBlue}`}>
                    <Icon name="file" size={22} />
                  </div>
                  <h3 className={styles.statCardTitle}>Total Quizzes</h3>
                  <span className={styles.statCardCount}>3 quizzes</span>
                  <Link href="/content/tests/quiz-1" className={styles.manageLink}>
                    Manage →
                  </Link>
                </div>
              </div>

              {/* Tests Overview Card */}
              <div className={styles.overviewCard}>
                <div className={styles.overviewHeader}>
                  <Icon name="check" size={20} />
                  <h3 className={styles.overviewTitle}>Tests Overview</h3>
                </div>
                <p className={styles.overviewSubtitle}>Manage your quizzes and assessments</p>

                <ul className={styles.testRows}>
                  <li className={styles.testRow}>
                    <span className={styles.numberPill}>1</span>
                    <div className={styles.testRowInfo}>
                      <span className={styles.testRowTitle}>Quiz 1</span>
                      <span className={styles.testRowMeta}>5 questions · 15 minutes</span>
                    </div>
                    <span className={styles.statusPillPublished}>Published</span>
                    <Link
                      href="/content/tests/quiz-1"
                      className={styles.moreBtn}
                      title="Manage Quiz 1"
                    >
                      ⋮
                    </Link>
                  </li>

                  <li className={styles.testRow}>
                    <span className={styles.numberPill}>2</span>
                    <div className={styles.testRowInfo}>
                      <span className={styles.testRowTitle}>Quiz 2</span>
                      <span className={styles.testRowMeta}>8 questions · 20 minutes</span>
                    </div>
                    <span className={styles.statusPillPublished}>Published</span>
                    <Link
                      href="/content/tests/quiz-2"
                      className={styles.moreBtn}
                      title="Manage Quiz 2"
                    >
                      ⋮
                    </Link>
                  </li>

                  <li className={styles.testRow}>
                    <span className={styles.numberPill}>3</span>
                    <div className={styles.testRowInfo}>
                      <span className={styles.testRowTitle}>Quiz 3</span>
                      <span className={styles.testRowMeta}>6 questions · 15 minutes</span>
                    </div>
                    <span className={styles.statusPillDraft}>Draft</span>
                    <Link
                      href="/content/tests/quiz-3"
                      className={styles.moreBtn}
                      title="Manage Quiz 3"
                    >
                      ⋮
                    </Link>
                  </li>
                </ul>

                <div className={styles.paginationRow}>
                  <span>Showing 1-3 of 3</span>
                  <div className={styles.paginationControls}>
                    <button type="button" className={styles.pageBtn} disabled>
                      ‹
                    </button>
                    <button type="button" className={`${styles.pageBtn} ${styles.pageBtnActive}`}>
                      1
                    </button>
                    <button type="button" className={styles.pageBtn} disabled>
                      ›
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Column */}
            <div className={styles.sideColumn}>
              {/* Quick Actions */}
              <div className={styles.sideCard}>
                <div className={styles.sideHeader}>
                  <h3 className={styles.sideTitle}>
                    <Icon name="tag" size={16} />
                    Quick Actions
                  </h3>
                </div>
                <div className={styles.quickActionsList}>
                  <Link href="/content/tests/quiz-1" className={styles.quickActionBtn}>
                    + Add Quiz 1
                  </Link>
                  <Link href="/content/tests/quiz-2" className={styles.quickActionBtn}>
                    + Add Quiz 2
                  </Link>
                  <Link href="/content/tests/quiz-3" className={styles.quickActionBtn}>
                    + Add Quiz 3
                  </Link>
                  <Link href="/content/tests/quiz-1" className={styles.quickActionBtn}>
                    + Add Question
                  </Link>
                </div>
              </div>

              {/* Recent Updates */}
              <div className={styles.sideCard}>
                <div className={styles.sideHeader}>
                  <h3 className={styles.sideTitle}>
                    <Icon name="clock" size={16} />
                    Recent Updates
                  </h3>
                  <Link href="/content/tests" className={styles.sideHeaderLink}>
                    View all →
                  </Link>
                </div>
                <ul className={styles.updatesList}>
                  <li className={styles.updateItem}>
                    <span className={styles.updateIcon}>
                      <Icon name="file" size={16} />
                    </span>
                    <div className={styles.updateInfo}>
                      <span className={styles.updateTitle}>Quiz 1 Updated</span>
                      <span className={styles.updateTime}>2 hours ago</span>
                    </div>
                    <span className={styles.statusPillPublished}>Published</span>
                    <span className={styles.moreBtn}>⋮</span>
                  </li>
                  <li className={styles.updateItem}>
                    <span className={styles.updateIcon}>
                      <Icon name="file" size={16} />
                    </span>
                    <div className={styles.updateInfo}>
                      <span className={styles.updateTitle}>Quiz 2 Created</span>
                      <span className={styles.updateTime}>4 hours ago</span>
                    </div>
                    <span className={styles.statusPillPublished}>Published</span>
                    <span className={styles.moreBtn}>⋮</span>
                  </li>
                  <li className={styles.updateItem}>
                    <span className={styles.updateIcon}>
                      <Icon name="file" size={16} />
                    </span>
                    <div className={styles.updateInfo}>
                      <span className={styles.updateTitle}>Quiz 3 Draft Saved</span>
                      <span className={styles.updateTime}>1 day ago</span>
                    </div>
                    <span className={styles.statusPillDraft}>Draft</span>
                    <span className={styles.moreBtn}>⋮</span>
                  </li>
                  <li className={styles.updateItem}>
                    <span className={styles.updateIcon}>
                      <Icon name="file" size={16} />
                    </span>
                    <div className={styles.updateInfo}>
                      <span className={styles.updateTitle}>Question Added to Quiz 1</span>
                      <span className={styles.updateTime}>1 day ago</span>
                    </div>
                    <span className={styles.statusPillPublished}>Published</span>
                    <span className={styles.moreBtn}>⋮</span>
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
