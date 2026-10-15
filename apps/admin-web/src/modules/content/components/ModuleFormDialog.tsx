// apps/admin-web/src/modules/content/components/ModuleFormDialog.tsx
'use client';

import { moduleInputSchema } from '@mastara/contracts';
import type { AdminModule } from '@mastara/contracts';
import type { CatalogStatus } from '@mastara/domain';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { adminText, adminTextFor, errorText } from '@/core/i18n';
import { FormShell, reasonProblem, reasonRequired, StatusFields } from '@/shared/forms';
import { TextField } from '@/shared/ui';

import { contentApi } from '../api/content.api';

type Field = 'title.en' | 'title.am' | 'reason';

interface ModuleFormDialogProps {
  courseId: string;
  /** The module to edit. Leave out to add a new one. */
  module?: AdminModule;
  onSaved: (notice: string) => void;
  onClose: () => void;
}

export function ModuleFormDialog({ courseId, module, onSaved, onClose }: ModuleFormDialogProps) {
  const [titleEn, setTitleEn] = useState(module?.title.en ?? '');
  const [titleAm, setTitleAm] = useState(module?.title.am ?? '');
  const [status, setStatus] = useState<CatalogStatus>(module?.status ?? 'DRAFT');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editing = module !== undefined;
  const needsReason = reasonRequired(module?.status, status);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFailure(null);

    const parsed = moduleInputSchema.safeParse({
      courseId,
      title: { en: titleEn, am: titleAm },
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
    const reasonError = reasonProblem(needsReason, reason);
    if (reasonError) next.reason = reasonError;
    if (Object.keys(next).length > 0 || !parsed.success) {
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const saved = editing
        ? await contentApi.updateModule(module.id, parsed.data)
        : await contentApi.createModule(parsed.data);
      onSaved(
        adminText(editing ? 'admin.content.modules.saved' : 'admin.content.modules.created', {
          n: saved.number,
        }),
      );
      onClose();
    } catch (cause) {
      setFailure(errorText(cause));
      setBusy(false);
    }
  }

  return (
    <FormShell
      title={adminText(
        editing ? 'admin.content.modules.editTitle' : 'admin.content.modules.addTitle',
      )}
      submitLabel={adminText(editing ? 'admin.common.save' : 'admin.content.modules.addSubmit')}
      busy={busy}
      failure={failure}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        label={adminText('admin.content.modules.titleEn')}
        autoComplete="off"
        value={titleEn}
        onChange={(event) => {
          setTitleEn(event.target.value);
          setErrors((current) => ({ ...current, 'title.en': undefined }));
        }}
        error={errors['title.en']}
        autoFocus
      />
      <TextField
        label={adminText('admin.content.modules.titleAm')}
        lang="am"
        autoComplete="off"
        value={titleAm}
        onChange={(event) => setTitleAm(event.target.value)}
        error={errors['title.am']}
      />
      <StatusFields
        value={status}
        saved={module?.status}
        reason={reason}
        reasonError={errors.reason}
        onStatus={setStatus}
        onReason={(next) => {
          setReason(next);
          setErrors((current) => ({ ...current, reason: undefined }));
        }}
      />
    </FormShell>
  );
}
