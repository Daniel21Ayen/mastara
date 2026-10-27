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

/** First launch: light (the brand look). The student flips the Dark mode switch in Profile; the choice is remembered. */
const DEFAULT_PREFERENCE: ThemePreference = 'light';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_PREFERENCE);
  const [loaded, setLoaded] = useState(false);
  const systemScheme = useColorScheme();

  // Restore the saved choice once (a few milliseconds from secure storage).
  useEffect(() => {
    let cancelled = false;
    secureStorage
      .getString(STORAGE_KEYS.theme)
      .then((saved) => {
        if (!cancelled && isPreference(saved)) setPreferenceState(saved);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void secureStorage.setString(STORAGE_KEYS.theme, next).catch(() => undefined);
  }, []);

  const scheme: ColorScheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  // Keep native pieces (keyboard, alerts, date pickers) in step with the app theme.
  useEffect(() => {
    try {
      Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
    } catch {
      // Some devices ignore the manual override; the app theme still switches.
    }
  }, [preference]);

  const value = useMemo(
    () => ({ theme: themes[scheme], scheme, preference, setPreference }),
    [scheme, preference, setPreference],
  );

  // Hold the first frame until the saved choice is known, so a dark-mode student never sees a white flash.
  if (!loaded) return null;

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

/** For the dark-mode switch: what is chosen, what is showing, and how to change it. */
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