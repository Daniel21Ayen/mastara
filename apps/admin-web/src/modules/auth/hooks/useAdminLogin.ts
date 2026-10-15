// apps/admin-web/src/modules/auth/hooks/useAdminLogin.ts
'use client';

import { adminLoginSchema } from '@mastara/contracts';
import { ADMIN_ERROR_CODES } from '@mastara/domain';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { adminText, adminTextFor } from '@/core/i18n';
import { isApiError } from '@/core/network';
import { writeSessionCookie } from '@/core/session';

import { adminAuthApi } from '../api/auth.api';

interface FieldErrors {
  identifier?: string;
  password?: string;
}

/** Form state and submit for the admin login. Messages are already translated. */
export function useAdminLogin(nextPath: string) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);

    const parsed = adminLoginSchema.safeParse({ identifier, password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === 'identifier' || field === 'password') && !errors[field]) {
          errors[field] = adminTextFor(issue.message);
        }
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const session = await adminAuthApi.login(parsed.data);
      writeSessionCookie(session);
      router.replace(nextPath);
      router.refresh();
    } catch (cause) {
      setFormError(
        isApiError(cause, ADMIN_ERROR_CODES.UNAUTHORIZED)
          ? adminText('admin.login.invalid')
          : adminText('admin.error.generic'),
      );
      setSubmitting(false);
    }
  }

  return {
    identifier,
    setIdentifier,
    password,
    setPassword,
    fieldErrors,
    formError,
    submitting,
    submit,
  };
}
