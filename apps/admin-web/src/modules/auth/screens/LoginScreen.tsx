// apps/admin-web/src/modules/auth/screens/LoginScreen.tsx
'use client';

import { useState } from 'react';

import { adminText } from '@/core/i18n';
import { Button, TextField } from '@/shared/ui';

import { useAdminLogin } from '../hooks/useAdminLogin';

import styles from './LoginScreen.module.css';

export function LoginScreen({ nextPath }: { nextPath: string }) {
  const login = useAdminLogin(nextPath);
  const [showForgotNote, setShowForgotNote] = useState(false);

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={login.submit} noValidate>
        <p className={styles.brand}>{adminText('admin.app.name')}</p>
        <h1 className={styles.title}>{adminText('admin.login.title')}</h1>
        <p className={styles.subtitle}>{adminText('admin.login.subtitle')}</p>

        <div className={styles.fields}>
          <TextField
            label={adminText('admin.login.identifier')}
            type="text"
            autoComplete="username"
            inputMode="email"
            value={login.identifier}
            onChange={(event) => login.setIdentifier(event.target.value)}
            error={login.fieldErrors.identifier}
          />
          <TextField
            label={adminText('admin.login.password')}
            type="password"
            autoComplete="current-password"
            value={login.password}
            onChange={(event) => login.setPassword(event.target.value)}
            error={login.fieldErrors.password}
          />
        </div>

        {login.formError ? (
          <p className={styles.formError} role="alert">
            {login.formError}
          </p>
        ) : null}

        <Button type="submit" fullWidth disabled={login.submitting}>
          {login.submitting ? adminText('admin.login.submitting') : adminText('admin.login.submit')}
        </Button>

        <button
          type="button"
          className={styles.link}
          onClick={() => setShowForgotNote((shown) => !shown)}
        >
          {adminText('admin.login.forgot')}
        </button>
        {showForgotNote ? (
          <p className={styles.note}>{adminText('admin.login.forgotNote')}</p>
        ) : null}

        <p className={styles.note}>{adminText('admin.login.studentsNote')}</p>
      </form>
    </main>
  );
}
