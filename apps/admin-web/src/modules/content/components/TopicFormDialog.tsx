// apps/admin-web/src/modules/content/components/TopicFormDialog.tsx
'use client';

import { topicInputSchema } from '@mastara/contracts';
import type { AdminModule } from '@mastara/contracts';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { adminText, adminTextFor, errorText } from '@/core/i18n';
import { FormShell } from '@/shared/forms';
import { SelectField, TextField } from '@/shared/ui';

import { contentApi } from '../api/content.api';

import styles from './EditorDialog.module.css';

type Field = 'title.en' | 'title.am';

interface TopicFormDialogProps {
  /** The module of the course; the topic goes at the end of the chosen one. */
  modules: readonly AdminModule[];
  /** Fixes the module (adding from a module's own row). Leave out to let the admin choose. */
  module?: AdminModule;
  /** When adding a chapter from Question Editor chapters tree. */
  chapterMode?: boolean;
  /** Course ID when creating a chapter / module. */
  courseId?: string;
  onSaved: (notice: string) => void;
  onClose: () => void;
}

/** Adds a topic at the end of a module or adds a new chapter when chapterMode is active. */
export function TopicFormDialog({
  modules,
  module,
  chapterMode = false,
  courseId,
  onSaved,
  onClose,
}: TopicFormDialogProps) {
  const nextChapterNum =
    (modules.length > 0 ? Math.max(...modules.map((m) => m.number || 0)) : 0) + 1;

  const [moduleId, setModuleId] = useState(module?.id ?? modules[0]?.id ?? '');
  const [titleEn, setTitleEn] = useState(
    chapterMode ? `Chapter ${nextChapterNum} - New Chapter` : '',
  );
  const [titleAm, setTitleAm] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFailure(null);

    if (chapterMode) {
      if (!titleEn.trim()) {
        setErrors({ 'title.en': 'Chapter title is required' });
        return;
      }
      setErrors({});
      setBusy(true);
      try {
        if (courseId) {
          const created = await contentApi.createModule({
            courseId,
            title: { en: titleEn.trim(), am: '' },
            status: 'DRAFT',
          });
          try {
            await contentApi.addTopic({
              moduleId: created.id,
              title: { en: titleEn.trim(), am: '' },
            });
          } catch {
            // initial topic creation optional
          }
          onSaved(`Chapter ${created.number || nextChapterNum} created successfully!`);
        } else {
          const targetModuleId = moduleId || modules[0]?.id || '';
          const saved = await contentApi.addTopic({
            moduleId: targetModuleId,
            title: { en: titleEn.trim(), am: '' },
          });
          onSaved(adminText('admin.content.topics.created', { code: saved.code }));
        }
        onClose();
      } catch (cause) {
        setFailure(errorText(cause));
        setBusy(false);
      }
      return;
    }

    const parsed = topicInputSchema.safeParse({
      moduleId,
      title: { en: titleEn, am: titleAm },
    });
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.') as Field;
        if (!next[field]) next[field] = adminTextFor(issue.message);
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const saved = await contentApi.addTopic(parsed.data);
      onSaved(adminText('admin.content.topics.created', { code: saved.code }));
      onClose();
    } catch (cause) {
      setFailure(errorText(cause));
      setBusy(false);
    }
  }

  return (
    <FormShell
      title={chapterMode ? 'Add New Chapter' : adminText('admin.content.topics.addTitle')}
      submitLabel={chapterMode ? 'Add Chapter' : adminText('admin.content.topics.addSubmit')}
      busy={busy}
      failure={failure}
      onSubmit={submit}
      onClose={onClose}
    >
      {!chapterMode &&
        (module ? (
          <p className={styles.reference}>
            {adminText('admin.content.moduleLabel', { n: module.number, title: module.title.en })}
          </p>
        ) : (
          <SelectField
            label={adminText('admin.content.notes.module')}
            options={modules.map((item) => ({
              value: item.id,
              label: adminText('admin.content.moduleLabel', { n: item.number, title: item.title.en }),
            }))}
            value={moduleId}
            onChange={(event) => setModuleId(event.target.value)}
          />
        ))}
      <TextField
        label={chapterMode ? 'Chapter Title' : adminText('admin.content.modules.titleEn')}
        autoComplete="off"
        value={titleEn}
        onChange={(event) => {
          setTitleEn(event.target.value);
          setErrors((current) => ({ ...current, 'title.en': undefined }));
        }}
        error={errors['title.en']}
        autoFocus
      />
      {!chapterMode && (
        <TextField
          label={adminText('admin.content.modules.titleAm')}
          lang="am"
          autoComplete="off"
          value={titleAm}
          onChange={(event) => setTitleAm(event.target.value)}
          error={errors['title.am']}
        />
      )}
    </FormShell>
  );
}
