// apps/admin-web/src/modules/content/components/AmharicNoteDialog.tsx
'use client';

import { amharicNoteInputSchema } from '@mastara/contracts';
import type { AdminNote } from '@mastara/contracts';
import { hasAmharic } from '@mastara/domain';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { adminText, adminTextFor, errorText } from '@/core/i18n';
import { Button, Modal, SelectField, TextArea, TextField } from '@/shared/ui';

import { contentApi } from '../api/content.api';

import styles from './EditorDialog.module.css';
import { RichPreview } from './RichPreview';

type Field = 'noteId' | 'title' | 'body';

interface AmharicNoteDialogProps {
  notes: readonly AdminNote[];
  /** The note to edit. Leave out to pick a note and add its Amharic view. */
  note?: AdminNote;
  onSaved: (notice: string) => void;
  onClose: () => void;
}

/**
 * The Amharic view of a note. It saves into the same bilingual record, so there is no second file and
 * the English text stays as it is. Publishing stays a decision of the note itself.
 */
export function AmharicNoteDialog({ notes, note, onSaved, onClose }: AmharicNoteDialogProps) {
  const start = note ?? notes.find((item) => !hasAmharic(item));
  const [noteId, setNoteId] = useState(start?.id ?? '');
  const [title, setTitle] = useState(start?.title.am ?? '');
  const [body, setBody] = useState(start?.body.am ?? '');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = notes.find((item) => item.id === noteId);
  const clear = (field: Field) => setErrors((current) => ({ ...current, [field]: undefined }));

  function choose(id: string) {
    const next = notes.find((item) => item.id === id);
    setNoteId(id);
    setTitle(next?.title.am ?? '');
    setBody(next?.body.am ?? '');
    clear('noteId');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFailure(null);

    const parsed = amharicNoteInputSchema.safeParse({ title, body });
    const next: Partial<Record<Field, string>> = {};
    if (!noteId) next.noteId = adminTextFor('validation.required');
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]) as Field;
        if (!next[field]) next[field] = adminTextFor(issue.message);
      }
    }
    if (Object.keys(next).length > 0 || !parsed.success) {
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const saved = await contentApi.saveAmharicNote(noteId, parsed.data);
      onSaved(adminText('admin.content.amharic.saved', { title: saved.title.am }));
      onClose();
    } catch (cause) {
      setFailure(errorText(cause));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={adminText(note ? 'admin.content.amharic.editTitle' : 'admin.content.amharic.addTitle')}
      onClose={busy ? () => undefined : onClose}
      wide
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <SelectField
          label={adminText('admin.content.amharic.note')}
          placeholder={adminText('admin.content.amharic.selectNote')}
          options={notes.map((item) => ({
            value: item.id,
            label: `${adminText('admin.content.moduleShort', { n: item.moduleNumber })} · ${item.title.en}`,
          }))}
          value={noteId}
          disabled={note !== undefined}
          onChange={(event) => choose(event.target.value)}
          error={errors.noteId}
        />
        {selected ? (
          <>
            <p className={styles.label}>{adminText('admin.content.amharic.english')}</p>
            <p className={styles.reference}>
              {selected.title.en}
              {'\n\n'}
              {selected.body.en.slice(0, 240)}
              {selected.body.en.length > 240 ? '…' : ''}
            </p>
          </>
        ) : null}
        <TextField
          label={adminText('admin.content.amharic.titleField')}
          lang="am"
          autoComplete="off"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            clear('title');
          }}
          error={errors.title}
        />
        <TextArea
          label={adminText('admin.content.amharic.bodyField')}
          lang="am"
          rows={8}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            clear('body');
          }}
          error={errors.body}
        />
        <p className={styles.hint}>{adminText('admin.content.notes.formulaHint')}</p>
        <p className={styles.label}>{adminText('admin.content.notes.preview')}</p>
        <RichPreview text={body} lang="am" empty={adminText('admin.content.preview.empty')} />
        {selected?.status === 'PUBLISHED' ? (
          <p className={styles.hint}>{adminText('admin.content.amharic.versionHint')}</p>
        ) : null}

        {failure ? (
          <p className={styles.failure} role="alert">
            {failure}
          </p>
        ) : null}
        <div className={styles.buttons}>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {adminText('admin.common.cancel')}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? adminText('admin.common.saving') : adminText('admin.common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
