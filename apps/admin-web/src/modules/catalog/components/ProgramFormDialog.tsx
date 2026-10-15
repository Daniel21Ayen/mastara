// apps/admin-web/src/modules/catalog/components/ProgramFormDialog.tsx
'use client';

import { programInputSchema } from '@mastara/contracts';
import type { AdminProgram } from '@mastara/contracts';
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
import { SelectField, StateMessage, TextField } from '@/shared/ui';

import { catalogApi } from '../api/catalog.api';
import { useUniversities } from '../hooks/useCatalog';

type Field = 'universityId' | 'name';

interface ProgramFormDialogProps {
  /** The program to edit. Leave out to add a new one. */
  program?: AdminProgram;
  onSaved: (notice: string) => void;
  onClose: () => void;
}

export function ProgramFormDialog({ program, onSaved, onClose }: ProgramFormDialogProps) {
  const universities = useUniversities();
  const [universityId, setUniversityId] = useState(program?.universityId ?? '');
  const [name, setName] = useState(program?.name ?? '');
  const [status, setStatus] = useState<CatalogStatus>(program?.status ?? 'DRAFT');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field | 'reason', string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editing = program !== undefined;
  const needsReason = reasonRequired(program?.status, status);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFailure(null);

    const parsed = programInputSchema.safeParse({
      universityId,
      name,
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
        ? await catalogApi.updateProgram(program.id, parsed.data)
        : await catalogApi.createProgram(parsed.data);
      onSaved(
        adminText(editing ? 'admin.catalog.programs.saved' : 'admin.catalog.programs.created', {
          name: saved.name,
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
        editing ? 'admin.catalog.programs.editTitle' : 'admin.catalog.programs.addTitle',
      )}
      submitLabel={adminText(editing ? 'admin.common.save' : 'admin.catalog.programs.addSubmit')}
      busy={busy}
      failure={failure}
      onSubmit={submit}
      onClose={onClose}
    >
      {!editing && universities.loading && !universities.data ? (
        <StateMessage>{adminText('admin.common.loading')}</StateMessage>
      ) : null}
      {!editing && universities.error ? (
        <StateMessage tone="alert">{adminText('admin.error.generic')}</StateMessage>
      ) : null}

      <SelectField
        label={adminText('admin.catalog.form.university')}
        placeholder={adminText('admin.catalog.form.selectUniversity')}
        options={(universities.data ?? []).map((item) => ({
          value: item.id,
          label: item.shortName,
        }))}
        value={universityId}
        disabled={editing}
        onChange={(event) => setUniversityId(event.target.value)}
        error={errors.universityId}
      />
      <TextField
        label={adminText('admin.catalog.programs.name')}
        autoComplete="off"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
        autoFocus
      />
      <StatusFields
        value={status}
        saved={program?.status}
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
