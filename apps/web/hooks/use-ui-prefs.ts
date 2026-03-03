'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getStoredLanguage,
  getStoredTheme,
  initUiPrefs,
  onUiPrefsChanged,
  setStoredLanguage,
  setStoredTheme,
  type UiLanguage,
  type UiTheme,
} from '@/lib/ui-prefs';

export function useUiPrefs() {
  const [theme, setThemeState] = useState<UiTheme>('light');
  const [language, setLanguageState] = useState<UiLanguage>('no');

  useEffect(() => {
    initUiPrefs();
    setThemeState(getStoredTheme());
    setLanguageState(getStoredLanguage());

    return onUiPrefsChanged(() => {
      setThemeState(getStoredTheme());
      setLanguageState(getStoredLanguage());
    });
  }, []);

  return useMemo(
    () => ({
      theme,
      language,
      setTheme: (value: UiTheme) => setStoredTheme(value),
      setLanguage: (value: UiLanguage) => setStoredLanguage(value),
    }),
    [language, theme],
  );
}
