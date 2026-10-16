// apps/admin-web/src/modules/questions/components/BuildSetDialog.tsx
'use client';

import { examSetInputSchema } from '@mastara/contracts';
import { examSetSlug } from '@mastara/domain';
import type { ExamSetKind } from '@mastara/domain';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { adminText, errorText } from '@/core/i18n';
import { fieldErrors } from '@/shared/forms';
import { Button, Modal } from '@/shared/ui';

import { questionsApi } from '../api/questions.api';
import { emptyDetails, toSetInput } from '../lib/examSetForm';
import type { SetDetailsState } from '../lib/examSetForm';

import { SetScopeFields, SetTermsFields } from './SetFields';
import type { SetErrors } from './SetFields';
import styles from './Questions.module.css';

/** Build Exam Set: names the set and says who it is for. It starts as a draft; questions come next. */
export function BuildSetDialog({ kind, onClose }: { kind: ExamSetKind; onClose: () => void }) {
  const router = useRouter();
  const [details, setDetails] = useState<SetDetailsState>(emptyDetails());
  const [errors, setErrors] = useState<SetErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const change = (patch: Partial<SetDetailsState>, ...clear: string[]) => {
    setDetails((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of clear) next[key] = undefined;
      return next;
    });
  };

  async function build() {
    if (busy) return;
    setFailure(null);
    const parsed = examSetInputSchema.safeParse(toSetInput(kind, details, [], 'DRAFT'));
    if (!parsed.success) {
      setErrors(fieldErrors<string>(parsed.error.issues));
      return;
    }
    setBusy(true);
    try {
      if (await questionsApi.findSet(parsed.data.id)) {
        setErrors({ id: adminText('admin.questions.problem.setExists') });
        setBusy(false);
        return;
      }
      const saved = await questionsApi.saveSet(parsed.data);
      onClose();
      router.push(`/questions/${examSetSlug(kind)}/${saved.id}`);
    } catch (cause) {
      setFailure(errorText(cause));
      setBusy(false);
    }
  }

  return (
    <Modal title={adminText(`admin.questions.build.${kind}`)} onClose={onClose} wide>
      <div className={styles.form}>
        <p className={styles.hint}>{adminText('admin.questions.build.hint')}</p>
        <SetScopeFields kind={kind} details={details} errors={errors} onChange={change} />
        <SetTermsFields details={details} errors={errors} onChange={change} />
        {failure ? (
          <p className={styles.failure} role="alert">
            {failure}
          </p>
        ) : null}
        <div className={styles.dialogActions}>
          <Button variant="outline" onClick={onClose}>
            {adminText('admin.common.cancel')}
          </Button>
          <Button disabled={busy} onClick={() => void build()}>
            {busy ? adminText('admin.common.saving') : adminText('admin.questions.build.create')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
