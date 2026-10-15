// apps/admin-web/src/modules/tests/components/TopicTree.tsx
'use client';

import type { AdminModule } from '@mastara/contracts';
import { useState } from 'react';

import { adminText } from '@/core/i18n';
import { matchesSearch } from '@/modules/content';
import { Button, Card, CardTitle, Icon, TextField } from '@/shared/ui';

import styles from './TopicTree.module.css';

interface TopicTreeProps {
  courseTitle: string;
  modules: readonly AdminModule[];
  topicId: string;
  onPick: (topicId: string) => void;
  onNewTopic: () => void;
}

/** "Courses & Topics": the chosen course's modules and topics; clicking a topic assigns the question to it. */
export function TopicTree({ courseTitle, modules, topicId, onPick, onNewTopic }: TopicTreeProps) {
  const [q, setQ] = useState('');
  const groups = modules
    .map((module) => ({
      module,
      topics: module.topics.filter((topic) =>
        matchesSearch(q, topic.title.en, topic.code, module.title.en),
      ),
    }))
    .filter((group) => group.topics.length > 0);

  return (
    <Card>
      <CardTitle>{adminText('admin.tests.tree.title')}</CardTitle>
      <p className={styles.course}>
        <Icon name="book" size={18} />
        {courseTitle}
      </p>
      <TextField
        label={adminText('admin.tests.tree.search')}
        placeholder={adminText('admin.tests.tree.search')}
        autoComplete="off"
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />
      {groups.length === 0 ? (
        <p className={styles.empty}>{adminText('admin.tests.tree.empty')}</p>
      ) : (
        <ul className={styles.modules}>
          {groups.map(({ module, topics }) => (
            <li key={module.id}>
              <p className={styles.module}>
                {adminText('admin.content.moduleLabel', {
                  n: module.number,
                  title: module.title.en,
                })}
              </p>
              <ul className={styles.topics}>
                {topics.map((topic) => (
                  <li key={topic.id}>
                    <button
                      type="button"
                      className={`${styles.topic} ${topic.id === topicId ? styles.current : ''}`}
                      aria-pressed={topic.id === topicId}
                      onClick={() => onPick(topic.id)}
                    >
                      {topic.code} {topic.title.en}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <Button variant="outline" onClick={onNewTopic}>
        <Icon name="plus" size={18} />
        {adminText('admin.tests.tree.newTopic')}
      </Button>
    </Card>
  );
}
