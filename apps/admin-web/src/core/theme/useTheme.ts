'use client';
// apps/admin-web/src/core/theme/useTheme.ts
import { useCallback, useEffect, useState } from 'react';

type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'admin-theme';

function applyTheme(scheme: ColorScheme) {
  if (typeof document !== 'undefined') {
    if (scheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
}

export function useTheme() {
  const [scheme, setScheme] = useState<ColorScheme>('light');

  // Read persisted preference on mount
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ColorScheme | null) ?? 'light';
    setScheme(stored);
    applyTheme(stored);
  }, []);

  const toggle = useCallback(() => {
    setScheme((prev) => {
      const next: ColorScheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return { scheme, isDark: scheme === 'dark', toggle };
}
