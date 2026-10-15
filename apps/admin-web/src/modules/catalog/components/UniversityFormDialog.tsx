// apps/admin-web/src/modules/catalog/components/UniversityFormDialog.tsx
'use client';

import { universityInputSchema } from '@mastara/contracts';
import type { AdminUniversity } from '@mastara/contracts';
import type { CatalogStatus } from '@mastara/domain';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { adminText, errorText } from '@/core/i18n';
import {
  FormShell,
  fieldErrors,
  reasonProblem,
  reasonRequired,
  StatusFields,
} from '@/shared/forms';
import { TextField } from '@/shared/ui';

import { catalogApi } from '../api/catalog.api';

type Field = 'name' | 'shortName';

interface UniversityFormDialogProps {
  /** The university to edit. Leave out to add a new one. */
  university?: AdminUniversity;
  onSaved: (notice: string) => void;
  onClose: () => void;
}

export function UniversityFormDialog({ university, onSaved, onClose }: UniversityFormDialogProps) {
  const [name, setName] = useState(university?.name ?? '');
  const [shortName, setShortName] = useState(university?.shortName ?? '');
  const [status, setStatus] = useState<CatalogStatus>(university?.status ?? 'DRAFT');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field | 'reason', string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editing = university !== undefined;
  const needsReason = reasonRequired(university?.status, status);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFailure(null);

    const parsed = universityInputSchema.safeParse({
      name,
      shortName,
      status,
      reason: needsReason ? reason : undefined,
    });
    const reasonError = reasonProblem(needsReason, reason);
    if (!parsed.success || reasonError) {
      setErrors({
        ...(parsed.success ? {} : fieldErrors<Field>(parsed.error.issues)),
        ...(reasonError ? { reason: reasonError } : {}),
      });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const saved = editing
        ? await catalogApi.updateUniversity(university.id, parsed.data)
        : await catalogApi.createUniversity(parsed.data);
      onSaved(
        adminText(
          editing ? 'admin.catalog.universities.saved' : 'admin.catalog.universities.created',
          {
            name: saved.shortName,
          },
        ),
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
        editing ? 'admin.catalog.universities.editTitle' : 'admin.catalog.universities.addTitle',
      )}
      submitLabel={adminText(
        editing ? 'admin.common.save' : 'admin.catalog.universities.addSubmit',
      )}
      busy={busy}
      failure={failure}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        label={adminText('admin.catalog.universities.name')}
        autoComplete="off"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
        autoFocus
      />
      <TextField
        label={adminText('admin.catalog.universities.shortName')}
        autoComplete="off"
        value={shortName}
        onChange={(event) => setShortName(event.target.value)}
        error={errors.shortName}
      />
      <StatusFields
        value={status}
        saved={university?.status}
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
