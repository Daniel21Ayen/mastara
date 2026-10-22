// apps/admin-web/src/modules/content/components/NoteEditorDialog.tsx
'use client';

import { noteInputSchema } from '@mastara/contracts';
import type { AdminModule, AdminNote } from '@mastara/contracts';
import { CONTENT_LANGS, missingForPublish } from '@mastara/domain';
import type { CatalogStatus, ContentLang, MissingPart } from '@mastara/domain';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { adminText, adminTextFor, errorText } from '@/core/i18n';
import { reasonProblem } from '@/shared/forms';
import { Button, Checkbox, Icon, Modal, SelectField, TextArea, TextField } from '@/shared/ui';
import { MathInputHelper } from '@/shared/math';

import { contentApi } from '../api/content.api';

import styles from './EditorDialog.module.css';
import { NotePreviewDialog } from './NotePreviewDialog';
import { RichPreview } from './RichPreview';

type Field = 'moduleId' | 'title.en' | 'title.am' | 'body.en' | 'body.am' | 'reason';

const MISSING_FIELD: Record<MissingPart, Field> = {
  titleEn: 'title.en',
  bodyEn: 'body.en',
  titleAm: 'title.am',
  bodyAm: 'body.am',
};

interface NoteEditorDialogProps {
  courseId: string;
  modules: readonly AdminModule[];
  /** The note to edit. Leave out to write a new one. */
  note?: AdminNote;
  /** Language tab to open in. */
  lang?: ContentLang;
  /** Called with the confirmation text after a successful save. */
  onSaved: (notice: string) => void;
  onClose: () => void;
}

/** One record, two languages: both are edited here, and publishing needs both complete. */
export function NoteEditorDialog({
  courseId,
  modules,
  note,
  lang = 'en',
  onSaved,
  onClose,
}: NoteEditorDialogProps) {
  const [moduleId, setModuleId] = useState(note?.moduleId ?? modules[0]?.id ?? '');
  const [isFree, setIsFree] = useState(note?.isFree ?? false);
  const [shown, setShown] = useState<ContentLang>(lang);
  const [title, setTitle] = useState({ en: note?.title.en ?? '', am: note?.title.am ?? '' });
  const [body, setBody] = useState({ en: note?.body.en ?? '', am: note?.body.am ?? '' });
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const editing = note !== undefined;
  const wasPublished = note?.status === 'PUBLISHED';

  const clear = (field: Field) => setErrors((current) => ({ ...current, [field]: undefined }));

  async function save(status: CatalogStatus) {
    if (busy) return;
    setFailure(null);

    const needsReason = status === 'DRAFT' && wasPublished;
    const parsed = noteInputSchema.safeParse({
      courseId,
      moduleId,
      title,
      body,
      isFree,
      status,
      reason: needsReason ? reason : undefined,
    });

    const next: Partial<Record<Field, string>> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.') as Field;
        if (!next[field]) next[field] = adminTextFor(issue.message);
      }
    }
    if (status === 'PUBLISHED') {
      for (const part of missingForPublish({ title, body })) {
        const field = MISSING_FIELD[part];
        if (!next[field]) next[field] = adminText('validation.publishMissing');
      }
    }
    const reasonError = reasonProblem(needsReason, reason);
    if (reasonError) next.reason = reasonError;

    if (Object.keys(next).length > 0 || !parsed.success) {
      setErrors(next);
      // Show the language that still has a gap.
      const first = Object.keys(next).find((key) => key.endsWith('.am') || key.endsWith('.en'));
      if (first) setShown(first.endsWith('.am') ? 'am' : 'en');
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const saved = editing
        ? await contentApi.updateNote(note.id, parsed.data)
        : await contentApi.createNote(parsed.data);
      onSaved(
        status === 'PUBLISHED'
          ? adminText('admin.content.notes.published', {
              title: saved.title.en,
              version: saved.version,
            })
          : adminText('admin.content.notes.draftSaved', { title: saved.title.en }),
      );
      onClose();
    } catch (cause) {
      setFailure(errorText(cause));
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(wasPublished ? 'PUBLISHED' : 'DRAFT');
  }

  const langName = adminText(`admin.content.lang.${shown}`);

  return (
    <Modal
      title={adminText(editing ? 'admin.content.notes.editTitle' : 'admin.content.notes.addTitle')}
      onClose={busy ? () => undefined : onClose}
      wide
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.row}>
          <SelectField
            label={adminText('admin.content.notes.module')}
            placeholder={adminText('admin.content.notes.selectModule')}
            options={modules.map((item) => ({
              value: item.id,
              label: adminText('admin.content.moduleLabel', {
                n: item.number,
                title: item.title.en,
              }),
            }))}
            value={moduleId}
            onChange={(event) => {
              setModuleId(event.target.value);
              clear('moduleId');
            }}
            error={errors.moduleId}
          />
          <Checkbox
            label={adminText('admin.content.notes.free')}
            hint={adminText('admin.content.notes.freeHint')}
            checked={isFree}
            onChange={(event) => setIsFree(event.target.checked)}
          />
        </div>

        <div
          className={styles.langs}
          role="group"
          aria-label={adminText('admin.content.notes.language')}
        >
          {CONTENT_LANGS.map((value) => (
            <Button
              key={value}
              variant={shown === value ? 'primary' : 'outline'}
              aria-pressed={shown === value}
              onClick={() => setShown(value)}
            >
              {adminText(`admin.content.lang.${value}`)}
            </Button>
          ))}
        </div>

        <TextField
          key={`title-${shown}`}
          label={adminText('admin.content.notes.titleIn', { language: langName })}
          lang={shown}
          autoComplete="off"
          value={title[shown]}
          onChange={(event) => {
            setTitle({ ...title, [shown]: event.target.value });
            clear(`title.${shown}`);
          }}
          error={errors[`title.${shown}`]}
        />
        <TextArea
          key={`body-${shown}`}
          label={adminText('admin.content.notes.bodyIn', { language: langName })}
          lang={shown}
          rows={8}
          value={body[shown]}
          onChange={(event) => {
            setBody({ ...body, [shown]: event.target.value });
            clear(`body.${shown}`);
          }}
          error={errors[`body.${shown}`]}
        />
        <MathInputHelper
          value={body[shown]}
          onChange={(val: string) => {
            setBody({ ...body, [shown]: val });
            clear(`body.${shown}`);
          }}
          placeholderHelp="Math formulas: $E=mc^2$ or $$\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$"
        />
        <p className={styles.hint}>{adminText('admin.content.notes.formulaHint')}</p>

        <p className={styles.label}>{adminText('admin.content.notes.preview')}</p>
        <RichPreview
          text={body[shown]}
          lang={shown}
          empty={adminText('admin.content.preview.empty')}
        />

        {wasPublished ? (
          <>
            <TextArea
              label={adminText('admin.catalog.form.unpublishReason')}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                clear('reason');
              }}
              error={errors.reason}
            />
            <p className={styles.hint}>{adminText('admin.content.notes.reasonHint')}</p>
          </>
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
          <Button variant="outline" onClick={() => setPreviewing(true)} disabled={busy}>
            <Icon name="eye" size={16} />
            {adminText('admin.content.reviewAsStudent')}
          </Button>
          <Button variant="outline" onClick={() => void save('DRAFT')} disabled={busy}>
            {adminText('admin.content.saveDraft')}
          </Button>
          <Button onClick={() => void save('PUBLISHED')} disabled={busy}>
            {busy ? adminText('admin.common.saving') : adminText('admin.content.publish')}
          </Button>
        </div>
      </form>

      {previewing ? (
        <NotePreviewDialog
          title={title}
          body={body}
          lang={shown}
          onClose={() => setPreviewing(false)}
        />
      ) : null}
    </Modal>
  );
}
