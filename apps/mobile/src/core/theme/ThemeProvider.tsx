// apps/mobile/src/core/theme/ThemeProvider.tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Appearance, StyleSheet, useColorScheme } from 'react-native';

import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';

import { themes } from './theme';
import type { ColorScheme, Theme } from './theme';

/** What the student chose. "system" follows the phone's own light/dark setting. */
export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeValue {
  theme: Theme;
  scheme: ColorScheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

const isPreference = (value: string | null): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('light');

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  // Consistently locked to the unified 4-colour brand palette
  const scheme: ColorScheme = 'light';

  useEffect(() => {
    try {
      Appearance.setColorScheme('light');
    } catch {
      // Ignored if device ignores manual override
    }
  }, []);

  const value = useMemo(
    () => ({ theme: themes[scheme], scheme, preference, setPreference }),
    [scheme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}

/** The active theme. Re-renders the component when the student switches between light and dark. */
export function useTheme(): Theme {
  return useThemeContext().theme;
}

/** For the light / dark switch: what is chosen, what is showing, and how to change it. */
export function useThemePreference(): Omit<ThemeValue, 'theme'> {
  const { scheme, preference, setPreference } = useThemeContext();
  return { scheme, preference, setPreference };
}

/**
 * Defines a file's styles once, as a function of the theme. Call the returned hook inside a component:
 *   const useStyles = createStyles((theme) => ({ card: { backgroundColor: theme.colors.surface } }));
 *   function Card() { const styles = useStyles(); ... }
 * The styles are built once per scheme and reused, so switching themes costs one build per file, not one per render.
 */
export function createStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (theme: Theme) => T | StyleSheet.NamedStyles<T>,
): () => T {
  const cache = new Map<ColorScheme, T>();

  return function useStyles(): T {
    const { scheme } = useThemeContext();
    let styles = cache.get(scheme);
    if (!styles) {
      styles = StyleSheet.create(factory(themes[scheme]) as T);
      cache.set(scheme, styles);
    }
    return styles;
  };
}
