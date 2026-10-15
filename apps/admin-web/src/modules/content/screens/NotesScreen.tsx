// apps/admin-web/src/modules/content/screens/NotesScreen.tsx
'use client';

import type { AdminNote, ContentCourse } from '@mastara/contracts';
import { hasAmharic } from '@mastara/domain';
import type { ContentLang } from '@mastara/domain';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { adminText } from '@/core/i18n';
import { Button, Card, CardTitle, StateMessage } from '@/shared/ui';

import { AmharicNoteDialog } from '../components/AmharicNoteDialog';
import { ContentHeader } from '../components/ContentHeader';
import { MaterialTabs } from '../components/ContentTabs';
import { CourseGate } from '../components/CourseGate';
import { NoteEditorDialog } from '../components/NoteEditorDialog';
import { NotePreviewDialog } from '../components/NotePreviewDialog';
import { NoteRow } from '../components/NoteRow';
import { QuickActions, RecentUpdates, SideColumn } from '../components/SidePanels';
import { useMaterial } from '../hooks/useContent';
import { matchesSearch } from '../lib/matchesSearch';

import styles from './MaterialScreens.module.css';

type Dialog =
  | { kind: 'editor'; note?: AdminNote; lang: ContentLang }
  | { kind: 'amharic'; note?: AdminNote }
  | { kind: 'preview'; note: AdminNote; lang: ContentLang }
  | null;

interface NotesViewProps {
  course: ContentCourse;
  /** Notes shows every note in English; Amharic Notes shows the notes that have an Amharic view. */
  view: 'notes' | 'amharic';
}

function NotesView({ course, view }: NotesViewProps) {
  const q = useSearchParams().get('q') ?? undefined;
  const { summary, modules, notes, failed, reload } = useMaterial(course.id);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const amharic = view === 'amharic';
  const lang: ContentLang = amharic ? 'am' : 'en';

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

  const rows = notes.data.filter(
    (note) => (!amharic || hasAmharic(note)) && matchesSearch(q, note.title[lang], note.body[lang]),
  );
  const saved = (message: string) => {
    setNotice(message);
    reload();
  };

  return (
    <>
      {notice ? (
        <div className={styles.notice}>
          <StateMessage>{notice}</StateMessage>
        </div>
      ) : null}
      <div className={styles.layout}>
        <Card>
          <CardTitle>
            {adminText(amharic ? 'admin.content.amharic.overview' : 'admin.content.notes.overview')}
          </CardTitle>
          {rows.length === 0 ? (
            <p className={styles.empty}>
              {adminText(amharic ? 'admin.content.amharic.empty' : 'admin.content.notes.empty')}
            </p>
          ) : (
            <ul className={styles.list}>
              {rows.map((note) => (
                <NoteRow
                  key={note.id}
                  title={note.title[lang]}
                  lang={lang}
                  moduleNumber={note.moduleNumber}
                  updatedAt={note.updatedAt}
                  status={note.status}
                  menuLabel={adminText('admin.content.actionsFor', { title: note.title[lang] })}
                  menu={[
                    amharic
                      ? {
                          label: adminText('admin.content.amharic.edit'),
                          onSelect: () => setDialog({ kind: 'amharic', note }),
                        }
                      : {
                          label: adminText('admin.content.notes.edit'),
                          onSelect: () => setDialog({ kind: 'editor', note, lang: 'en' }),
                        },
                    ...(amharic
                      ? [
                          {
                            label: adminText('admin.content.notes.editFull'),
                            onSelect: () =>
                              setDialog({ kind: 'editor', note, lang: 'am' as const }),
                          },
                        ]
                      : []),
                    {
                      label: adminText('admin.content.reviewAsStudent'),
                      onSelect: () => setDialog({ kind: 'preview', note, lang }),
                    },
                  ]}
                />
              ))}
            </ul>
          )}
        </Card>

        <SideColumn>
          <QuickActions
            actions={[
              amharic
                ? {
                    label: adminText('admin.content.amharic.add'),
                    onSelect: () => setDialog({ kind: 'amharic' }),
                  }
                : {
                    label: adminText('admin.content.notes.add'),
                    onSelect: () => setDialog({ kind: 'editor', lang: 'en' }),
                  },
            ]}
          />
          <RecentUpdates updates={summary.data.recent} />
        </SideColumn>
      </div>

      {dialog?.kind === 'editor' ? (
        <NoteEditorDialog
          courseId={course.id}
          modules={modules.data}
          note={dialog.note}
          lang={dialog.lang}
          onSaved={saved}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === 'amharic' ? (
        <AmharicNoteDialog
          notes={notes.data}
          note={dialog.note}
          onSaved={saved}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === 'preview' ? (
        <NotePreviewDialog
          title={dialog.note.title}
          body={dialog.note.body}
          lang={dialog.lang}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
}

export function NotesScreen() {
  return (
    <>
      <ContentHeader />
      <MaterialTabs current="notes" />
      <CourseGate>{(course) => <NotesView course={course} view="notes" />}</CourseGate>
    </>
  );
}

export function AmharicNotesScreen() {
  return (
    <>
      <ContentHeader />
      <MaterialTabs current="amharic-notes" />
      <CourseGate>{(course) => <NotesView course={course} view="amharic" />}</CourseGate>
    </>
  );
}
