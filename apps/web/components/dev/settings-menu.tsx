'use client';

import { useEffect, useRef, useState } from 'react';
import { useUiPrefs } from '@/hooks/use-ui-prefs';

export function SettingsMenu() {
  const { theme, language, setLanguage, setTheme } = useUiPrefs();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (event.target instanceof Node && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const labels =
    language === 'no'
      ? {
          settings: 'Innstillinger',
          language: 'Språk',
          theme: 'Tema',
          norwegian: 'Norsk',
          english: 'English',
          light: 'Lys',
          dark: 'Mørk',
        }
      : {
          settings: 'Settings',
          language: 'Language',
          theme: 'Theme',
          norwegian: 'Norwegian',
          english: 'English',
          light: 'Light',
          dark: 'Dark',
        };

  return (
    <div className="relative" ref={rootRef}>
      <button
        className="inline-flex items-center gap-2 rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={labels.settings}
        title={labels.settings}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.53 7.53 0 0 0-1.63-.94L14.4 2.7a.5.5 0 0 0-.5-.4h-3.8a.5.5 0 0 0-.5.4l-.36 2.62c-.58.23-1.13.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.62a.5.5 0 0 0 .5.4h3.8a.5.5 0 0 0 .5-.4l.36-2.62c.58-.23 1.13-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
          />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {labels.language}
            </div>
            <div className="flex gap-2">
              <button
                className={`rounded border px-2 py-1 text-xs ${language === 'no' ? 'border-accent text-accent' : 'border-slate-300'}`}
                onClick={() => setLanguage('no')}
              >
                {labels.norwegian}
              </button>
              <button
                className={`rounded border px-2 py-1 text-xs ${language === 'en' ? 'border-accent text-accent' : 'border-slate-300'}`}
                onClick={() => setLanguage('en')}
              >
                {labels.english}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {labels.theme}
            </div>
            <div className="flex gap-2">
              <button
                className={`rounded border px-2 py-1 text-xs ${theme === 'light' ? 'border-accent text-accent' : 'border-slate-300'}`}
                onClick={() => setTheme('light')}
              >
                {labels.light}
              </button>
              <button
                className={`rounded border px-2 py-1 text-xs ${theme === 'dark' ? 'border-accent text-accent' : 'border-slate-300'}`}
                onClick={() => setTheme('dark')}
              >
                {labels.dark}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
