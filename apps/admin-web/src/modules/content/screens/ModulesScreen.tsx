// apps/admin-web/src/modules/content/screens/ModulesScreen.tsx
'use client';

import type { AdminModule, ContentCourse } from '@mastara/contracts';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { adminText } from '@/core/i18n';
import { Badge, Button, Card, CardTitle, Icon, StateMessage } from '@/shared/ui';

import { ContentHeader } from '../components/ContentHeader';
import { MaterialTabs } from '../components/ContentTabs';
import { CourseGate } from '../components/CourseGate';
import { ModuleFormDialog } from '../components/ModuleFormDialog';
import { ModuleProgress } from '../components/ModuleProgress';
import { QuickActions, SideColumn } from '../components/SidePanels';
import { TopicFormDialog } from '../components/TopicFormDialog';
import { useContentSummary, useModules } from '../hooks/useContent';
import { matchesSearch } from '../lib/matchesSearch';

import styles from './MaterialScreens.module.css';

type Dialog =
  | { kind: 'module'; module?: AdminModule }
  | { kind: 'topic'; module: AdminModule }
  | null;

function ModulesOverview({ course }: { course: ContentCourse }) {
  const q = useSearchParams().get('q') ?? undefined;
  const modules = useModules(course.id);
  const summary = useContentSummary(course.id);
  const [open, setOpen] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = () => {
    modules.reload();
    summary.reload();
  };

  if (modules.error || summary.error) {
    return (
      <StateMessage tone="alert">
        <span>{adminText('admin.content.error')}</span>
        <Button variant="outline" onClick={reload}>
          {adminText('admin.common.retry')}
        </Button>
      </StateMessage>
    );
  }
  if (!modules.data || !summary.data) {
    return <StateMessage>{adminText('admin.common.loading')}</StateMessage>;
  }

  const visible = modules.data.filter((item) =>
    matchesSearch(
      q,
      item.title.en,
      item.title.am,
      ...item.topics.map((topic) => topic.title.en),
      ...item.notes.map((note) => note.title),
    ),
  );

  return (
    <>
      {notice ? (
        <div className={styles.notice}>
          <StateMessage>{notice}</StateMessage>
        </div>
      ) : null}
      <div className={styles.layout}>
        <Card>
          <CardTitle>{adminText('admin.content.modules.overview')}</CardTitle>
          {visible.length === 0 ? (
            <p className={styles.empty}>{adminText('admin.content.modules.empty')}</p>
          ) : (
            <ul className={styles.list}>
              {visible.map((item) => {
                const expanded = open === item.id;
                const panelId = `module-${item.id}`;
                return (
                  <li key={item.id} className={styles.module}>
                    <button
                      type="button"
                      className={styles.moduleHead}
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => setOpen(expanded ? null : item.id)}
                    >
                      <span className={styles.moduleIcon}>
                        <Icon name="module" />
                      </span>
                      <span className={styles.moduleText}>
                        <span className={styles.moduleTitle}>
                          {adminText('admin.content.moduleLabel', {
                            n: item.number,
                            title: item.title.en,
                          })}
                        </span>
                        <span className={styles.moduleMeta}>
                          {adminText('admin.content.moduleCounts', {
                            topics: item.topics.length,
                            notes: item.notes.length,
                          })}
                        </span>
                      </span>
                      <Badge tone={item.status === 'PUBLISHED' ? 'primary' : 'neutral'}>
                        {adminText(`admin.catalog.status.${item.status}`)}
                      </Badge>
                      <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={18} />
                    </button>
                    {expanded ? (
                      <div id={panelId} className={styles.detail}>
                        <p className={styles.detailTitle}>
                          {adminText('admin.content.modules.topics')}
                        </p>
                        {item.topics.length === 0 ? (
                          <p className={styles.empty}>
                            {adminText('admin.content.modules.noTopics')}
                          </p>
                        ) : (
                          <ul className={styles.detailList}>
                            {item.topics.map((topic) => (
                              <li key={topic.id}>
                                {topic.code} {topic.title.en}
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className={styles.detailTitle}>{adminText('admin.nav.notes')}</p>
                        {item.notes.length === 0 ? (
                          <p className={styles.empty}>
                            {adminText('admin.content.modules.noNotes')}
                          </p>
                        ) : (
                          <ul className={styles.detailList}>
                            {item.notes.map((note) => (
                              <li key={note.id}>{note.title}</li>
                            ))}
                          </ul>
                        )}
                        <div className={styles.detailActions}>
                          <Button
                            variant="outline"
                            onClick={() => setDialog({ kind: 'module', module: item })}
                          >
                            {adminText('admin.content.modules.edit')}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setDialog({ kind: 'topic', module: item })}
                          >
                            {adminText('admin.content.topics.add')}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <SideColumn>
          <QuickActions
            actions={[
              {
                label: adminText('admin.content.modules.add'),
                onSelect: () => setDialog({ kind: 'module' }),
              },
            ]}
          />
          <ModuleProgress
            done={summary.data.publishedModuleCount}
            total={summary.data.moduleCount}
          />
        </SideColumn>
      </div>

      {dialog?.kind === 'module' ? (
        <ModuleFormDialog
          courseId={course.id}
          module={dialog.module}
          onSaved={(message) => {
            setNotice(message);
            reload();
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === 'topic' ? (
        <TopicFormDialog
          modules={modules.data}
          module={dialog.module}
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

export function ModulesScreen() {
  return (
    <>
      <ContentHeader />
      <MaterialTabs current="modules" />
      <CourseGate>{(course) => <ModulesOverview course={course} />}</CourseGate>
    </>
  );
}
