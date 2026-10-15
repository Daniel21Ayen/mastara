// apps/admin-web/src/modules/tests/screens/TestsOverviewScreen.tsx
'use client';

import type { ContentCourse, QuizSummary } from '@mastara/contracts';
import { quizSlug } from '@mastara/domain';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { adminText } from '@/core/i18n';
import {
  ContentHeader,
  CourseGate,
  QuickActions,
  SectionTabs,
  SideColumn,
} from '@/modules/content';
import { Button, Card, CardTitle, Icon, RowMenu, StateMessage } from '@/shared/ui';

import { QuizSettingsDialog } from '../components/QuizSettingsDialog';
import { StatusBadge } from '../components/StatusBadge';
import { TestUpdates } from '../components/TestUpdates';
import { useTestsOverview } from '../hooks/useTests';

import styles from './Tests.module.css';

function Overview({ course }: { course: ContentCourse }) {
  const router = useRouter();
  const { data, error, reload } = useTestsOverview(course.id);
  const [editing, setEditing] = useState<QuizSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (error) {
    return (
      <StateMessage tone="alert">
        <span>{adminText('admin.tests.error')}</span>
        <Button variant="outline" onClick={reload}>
          {adminText('admin.common.retry')}
        </Button>
      </StateMessage>
    );
  }
  if (!data) return <StateMessage>{adminText('admin.common.loading')}</StateMessage>;

  return (
    <>
      {notice ? (
        <div className={styles.notice}>
          <StateMessage>{notice}</StateMessage>
        </div>
      ) : null}
      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.cards}>
            {data.quizzes.map((quiz) => {
              const name = adminText(`admin.nav.quiz${quiz.quizNo}`);
              return (
                <section key={quiz.quizNo} className={styles.kind} aria-label={name}>
                  <span className={styles.kindIcon}>
                    <Icon name="quiz" size={24} />
                  </span>
                  <h2 className={styles.kindName}>{name}</h2>
                  <p className={styles.kindCount}>
                    {adminText('admin.tests.count.questions', { n: quiz.questionCount })}
                  </p>
                  <Link className={styles.manage} href={`/content/tests/${quizSlug(quiz.quizNo)}`}>
                    {adminText('admin.content.manage')}
                    <span className="sr-only"> {name}</span>
                  </Link>
                </section>
              );
            })}
          </div>

          <Card>
            <CardTitle>{adminText('admin.tests.overview')}</CardTitle>
            <ul className={styles.rows}>
              {data.quizzes.map((quiz) => {
                const name = adminText(`admin.nav.quiz${quiz.quizNo}`);
                return (
                  <li key={quiz.quizNo} className={styles.row}>
                    <span className={styles.number}>{quiz.quizNo}</span>
                    <span className={styles.text}>
                      <span className={styles.name}>{name}</span>
                      <span className={styles.meta}>
                        {adminText('admin.tests.rowMeta', {
                          questions: quiz.questionCount,
                          minutes: quiz.minutes,
                        })}
                      </span>
                    </span>
                    <StatusBadge status={quiz.status} />
                    <RowMenu
                      label={adminText('admin.tests.actionsFor', { name })}
                      items={[
                        {
                          label: adminText('admin.tests.menu.manage'),
                          onSelect: () => router.push(`/content/tests/${quizSlug(quiz.quizNo)}`),
                        },
                        {
                          label: adminText('admin.tests.menu.settings'),
                          onSelect: () => setEditing(quiz),
                        },
                      ]}
                    />
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <SideColumn>
          <QuickActions
            actions={data.quizzes.map((quiz) => ({
              label: adminText('admin.tests.addQuiz', { n: quiz.quizNo }),
              onSelect: () => router.push(`/content/tests/${quizSlug(quiz.quizNo)}/new`),
            }))}
          />
          <TestUpdates updates={data.recent} />
        </SideColumn>
      </div>

      {editing ? (
        <QuizSettingsDialog
          courseId={course.id}
          quiz={editing}
          onSaved={(message) => {
            setNotice(message);
            reload();
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

/** Content → Tests: the three quizzes of the chosen course, quick actions and recent updates. */
export function TestsOverviewScreen() {
  return (
    <>
      <ContentHeader />
      <SectionTabs current="tests" />
      <CourseGate>{(course) => <Overview course={course} />}</CourseGate>
    </>
  );
}
