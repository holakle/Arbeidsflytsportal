'use client';

export type UiTheme = 'light' | 'dark';
export type UiLanguage = 'no' | 'en';

const THEME_KEY = 'portal.ui.theme';
const LANGUAGE_KEY = 'portal.ui.language';
const EVENT_NAME = 'portal-ui-prefs-changed';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getStoredTheme(): UiTheme {
  if (!isBrowser()) return 'light';
  const value = window.localStorage.getItem(THEME_KEY);
  return value === 'dark' ? 'dark' : 'light';
}

export function getStoredLanguage(): UiLanguage {
  if (!isBrowser()) return 'no';
  const value = window.localStorage.getItem(LANGUAGE_KEY);
  return value === 'en' ? 'en' : 'no';
}

export function applyTheme(theme: UiTheme) {
  if (!isBrowser()) return;
  document.documentElement.dataset.theme = theme;
}

export function applyLanguage(language: UiLanguage) {
  if (!isBrowser()) return;
  document.documentElement.lang = language === 'no' ? 'no' : 'en';
}

export function setStoredTheme(theme: UiTheme) {
  if (!isBrowser()) return;
  window.localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function setStoredLanguage(language: UiLanguage) {
  if (!isBrowser()) return;
  window.localStorage.setItem(LANGUAGE_KEY, language);
  applyLanguage(language);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function initUiPrefs() {
  if (!isBrowser()) return;
  applyTheme(getStoredTheme());
  applyLanguage(getStoredLanguage());
}

export function onUiPrefsChanged(listener: () => void) {
  if (!isBrowser()) return () => undefined;
  const onStorage = () => listener();
  const onCustom = () => listener();
  window.addEventListener('storage', onStorage);
  window.addEventListener(EVENT_NAME, onCustom);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(EVENT_NAME, onCustom);
  };
}
