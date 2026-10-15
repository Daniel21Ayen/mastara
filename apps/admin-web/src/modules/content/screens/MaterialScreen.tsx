// apps/admin-web/src/modules/content/screens/MaterialScreen.tsx
'use client';

import type { ContentCourse } from '@mastara/contracts';
import Link from 'next/link';
import { useState } from 'react';

import { adminText } from '@/core/i18n';
import { Button, Card, CardTitle, Icon, StateMessage } from '@/shared/ui';
import type { IconName } from '@/shared/ui';

import { AmharicNoteDialog } from '../components/AmharicNoteDialog';
import { ContentHeader } from '../components/ContentHeader';
import { SectionTabs } from '../components/ContentTabs';
import { CourseGate } from '../components/CourseGate';
import { ModuleFormDialog } from '../components/ModuleFormDialog';
import { NoteEditorDialog } from '../components/NoteEditorDialog';
import { QuickActions, RecentUpdates, SideColumn } from '../components/SidePanels';
import { useMaterial } from '../hooks/useContent';

import styles from './MaterialScreens.module.css';

type Dialog = 'module' | 'note' | 'amharic' | null;

function MaterialOverview({ course }: { course: ContentCourse }) {
  const { summary, modules, notes, failed, reload } = useMaterial(course.id);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (failed) {
    return (
      <StateMessage tone="alert">
        <span>{adminText('admin.content.error')}</span>
        <Button variant="outline" onClick={reload}>
          {adminText('admin.common.retry')}
        </Button>
      </StateMessage>
    );
  }
  if (!summary.data || !modules.data || !notes.data) {
    return <StateMessage>{adminText('admin.common.loading')}</StateMessage>;
  }
  const data = summary.data;

  const kinds: { id: string; icon: IconName; name: string; count: string; href: string }[] = [
    {
      id: 'modules',
      icon: 'module',
      name: adminText('admin.nav.modules'),
      count: adminText('admin.content.count.modules', { n: data.moduleCount }),
      href: '/content/modules',
    },
    {
      id: 'notes',
      icon: 'note',
      name: adminText('admin.nav.notes'),
      count: adminText('admin.content.count.notes', { n: data.noteCount }),
      href: '/content/notes',
    },
    {
      id: 'amharic',
      icon: 'translate',
      name: adminText('admin.nav.amharicNotes'),
      count: adminText('admin.content.count.notes', { n: data.amharicNoteCount }),
      href: '/content/amharic-notes',
    },
  ];

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
            {kinds.map((kind) => (
              <section key={kind.id} className={styles.kind} aria-label={kind.name}>
                <span className={styles.kindIcon}>
                  <Icon name={kind.icon} size={24} />
                </span>
                <h2 className={styles.kindName}>{kind.name}</h2>
                <p className={styles.kindCount}>{kind.count}</p>
                <Link className={styles.manage} href={kind.href}>
                  {adminText('admin.content.manage')}
                  <span className="sr-only"> {kind.name}</span>
                </Link>
              </section>
            ))}
          </div>

          <Card>
            <CardTitle>{adminText('admin.content.courseOverview')}</CardTitle>
            <p className={styles.course}>
              <Icon name="book" size={18} />
              {course.title} ({course.code})
            </p>
            <p className={styles.counts}>
              {adminText('admin.content.courseCounts', {
                modules: data.moduleCount,
                topics: data.topicCount,
                quizzes: data.quizCount,
              })}
            </p>
          </Card>
        </div>

        <SideColumn>
          <QuickActions
            actions={[
              {
                label: adminText('admin.content.modules.add'),
                onSelect: () => setDialog('module'),
              },
              { label: adminText('admin.content.notes.add'), onSelect: () => setDialog('note') },
              {
                label: adminText('admin.content.amharic.add'),
                onSelect: () => setDialog('amharic'),
              },
            ]}
          />
          <RecentUpdates updates={data.recent} />
        </SideColumn>
      </div>

      {dialog === 'module' ? (
        <ModuleFormDialog
          courseId={course.id}
          onSaved={(message) => {
            setNotice(message);
            reload();
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === 'note' ? (
        <NoteEditorDialog
          courseId={course.id}
          modules={modules.data}
          onSaved={(message) => {
            setNotice(message);
            reload();
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === 'amharic' ? (
        <AmharicNoteDialog
          notes={notes.data}
          onSaved={(message) => {
            setNotice(message);
            reload();
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
}

/** Material Management: counts per kind, quick actions and recent updates for the chosen course. */
export function MaterialScreen() {
  return (
    <>
      <ContentHeader />
      <SectionTabs current="materials" />
      <CourseGate>{(course) => <MaterialOverview course={course} />}</CourseGate>
    </>
  );
}
