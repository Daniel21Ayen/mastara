// apps/admin-web/src/modules/shell/components/Topbar.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { adminText } from '@/core/i18n';
import { useAdminSession } from '@/core/session';
import { Button } from '@/shared/ui';

import styles from './Topbar.module.css';

interface TopbarProps {
  menuOpen: boolean;
  onToggleMenu: () => void;
}

export function Topbar({ menuOpen, onToggleMenu }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { user, logout } = useAdminSession();
  const onStudents = pathname === '/students' || pathname.startsWith('/students/');
  const onQuestions = pathname.startsWith('/questions');
  const onPayments = pathname === '/commerce/payments';
  const onContent = pathname.startsWith('/content') || onQuestions || onPayments;
  const [query, setQuery] = useState(onStudents || onContent ? (params.get('q') ?? '') : '');

  // On the Students page the box shows the current search, and clearing the search clears the box.
  const currentQ = params.get('q') ?? '';
  useEffect(() => {
    if (
      pathname === '/students' ||
      pathname.startsWith('/content') ||
      pathname.startsWith('/questions') ||
      onPayments
    ) {
      setQuery(currentQ);
    }
  }, [pathname, currentQ]);

  // On Content pages the text filters the page you are on. Elsewhere search opens the Students list with
  // the text; an empty box on the Students page clears the search.
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (onContent) {
      router.push(text ? `${pathname}?q=${encodeURIComponent(text)}` : pathname);
      return;
    }
    if (text) router.push(`/students?q=${encodeURIComponent(text)}`);
    else if (onStudents) router.push('/students');
  }

  return (
    <header className={styles.topbar}>
      <button
        type="button"
        className={styles.menuButton}
        aria-expanded={menuOpen}
        aria-controls="portal-sidebar"
        aria-label={
          menuOpen ? adminText('admin.common.closeMenu') : adminText('admin.common.openMenu')
        }
        onClick={onToggleMenu}
      >
        <span aria-hidden="true">☰</span>
      </button>

      <form className={styles.search} role="search" onSubmit={search}>
        <label htmlFor="global-search" className="sr-only">
          {adminText('admin.topbar.searchLabel')}
        </label>
        <input
          id="global-search"
          className={styles.input}
          type="search"
          placeholder={adminText(
            onStudents
              ? 'admin.students.searchPlaceholder'
              : onQuestions
                ? 'admin.questions.searchPlaceholder'
                : onPayments
                  ? 'admin.payments.searchPlaceholder'
                  : onContent
                  ? 'admin.content.searchPlaceholder'
                  : 'admin.topbar.searchPlaceholder',
          )}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>

      <div className={styles.account}>
        <span className={styles.role} title={user.identifier}>
          {adminText('admin.topbar.role')}
        </span>
        <Button variant="outline" onClick={logout}>
          {adminText('admin.topbar.logout')}
        </Button>
      </div>
    </header>
  );
}
