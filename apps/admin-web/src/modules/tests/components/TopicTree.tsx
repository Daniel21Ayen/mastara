// apps/admin-web/src/modules/tests/components/TopicTree.tsx
'use client';

import type { AdminModule } from '@mastara/contracts';
import { useState, useMemo } from 'react';

import { Card, CardTitle, Icon, TextField } from '@/shared/ui';
import styles from './TopicTree.module.css';

interface TopicTreeProps {
  courseTitle: string;
  modules: readonly AdminModule[];
  topicId: string;
  onPick: (topicId: string) => void;
  onNewTopic: () => void;
}

interface ChapterItem {
  id: string;
  topicId: string;
  name: string;
  subtitle: string;
}

const DEFAULT_CHAPTERS: ChapterItem[] = [
  { id: 'ch-1', topicId: 'top-1', name: 'Chapter 1', subtitle: 'Introduction & Foundations' },
  { id: 'ch-2', topicId: 'top-2', name: 'Chapter 2', subtitle: 'Core Concepts & Principles' },
  { id: 'ch-3', topicId: 'top-3', name: 'Chapter 3', subtitle: 'Advanced Topics & Analysis' },
  { id: 'ch-4', topicId: 'top-4', name: 'Chapter 4', subtitle: 'Case Studies & Applications' },
  { id: 'ch-5', topicId: 'top-5', name: 'Chapter 5', subtitle: 'Review & Syntheses' },
];

/** "Chapters": Shows only Chapter 1, Chapter 2, Chapter 3... without module/topic hierarchy. */
export function TopicTree({ courseTitle, modules, topicId, onPick, onNewTopic }: TopicTreeProps) {
  const [q, setQ] = useState('');

  // Map modules directly into clean Chapter 1, Chapter 2, Chapter 3 list
  const chapters = useMemo<ChapterItem[]>(() => {
    if (!modules || modules.length === 0) return DEFAULT_CHAPTERS;
    return modules.map((module, idx) => {
      const chapterNum = module.number || idx + 1;
      const firstTopicId = module.topics[0]?.id || module.id;
      return {
        id: module.id,
        topicId: firstTopicId,
        name: `Chapter ${chapterNum}`,
        subtitle: module.title?.en || `Chapter ${chapterNum} Content`,
      };
    });
  }, [modules]);

  const filteredChapters = chapters.filter(
    (ch) =>
      !q.trim() ||
      ch.name.toLowerCase().includes(q.toLowerCase()) ||
      ch.subtitle.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <Card>
      <CardTitle>Chapters</CardTitle>
      <p className={styles.course}>
        <Icon name="book" size={18} />
        {courseTitle}
      </p>

      <TextField
        label="Search chapters"
        placeholder="Filter chapters..."
        autoComplete="off"
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />

      <span className={styles.chaptersHeading}>Chapters</span>

      {filteredChapters.length === 0 ? (
        <p className={styles.empty}>No chapters match the search.</p>
      ) : (
        <ul className={styles.chapterList}>
          {filteredChapters.map((ch) => {
            const isSelected =
              topicId === ch.topicId ||
              (modules.find((m) => m.id === ch.id)?.topics.some((t) => t.id === topicId) ?? false);
            return (
              <li key={ch.id}>
                <button
                  type="button"
                  className={`${styles.chapterItem} ${
                    isSelected ? styles.chapterItemActive : ''
                  }`}
                  aria-pressed={isSelected}
                  onClick={() => onPick(ch.topicId)}
                >
                  <span className={styles.chapterIcon}>
                    <Icon name="file" size={16} />
                  </span>
                  <span className={styles.chapterText}>
                    <span className={styles.chapterName}>{ch.name}</span>
                    <span className={styles.chapterSubtitle}>{ch.subtitle}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" className={styles.addChapterBtn} onClick={onNewTopic}>
        <Icon name="plus" size={16} />
        + Add New Chapter
      </button>
    </Card>
  );
}
