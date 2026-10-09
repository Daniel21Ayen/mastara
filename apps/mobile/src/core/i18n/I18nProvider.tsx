// apps/mobile/src/core/i18n/I18nProvider.tsx
import { DEFAULT_LANGUAGE, interpolate, resources } from '@mastara/i18n';
import type { Language, TranslationKey, TranslationParams } from '@mastara/i18n';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';

interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Translates a known key; `params` fill {placeholders}. */
  t: (key: TranslationKey, params?: TranslationParams) => string;
  /** Translates a message that may be a key (for example a validation message). */
  te: (message: string | undefined) => string | undefined;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  // Restore the saved language once at start.
  useEffect(() => {
    secureStorage.getString(STORAGE_KEYS.language).then((saved) => {
      if (saved === 'en' || saved === 'am') setLanguageState(saved);
    });
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    void secureStorage.setString(STORAGE_KEYS.language, next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => interpolate(resources[language][key], params),
    [language],
  );
  const te = useCallback(
    (message: string | undefined) => {
      if (message === undefined) return undefined;
      return message in resources[language] ? resources[language][message as TranslationKey] : message;
    },
    [language],
  );
  const value = useMemo(() => ({ language, setLanguage, t, te }), [language, setLanguage, t, te]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>');
  return context;
}
