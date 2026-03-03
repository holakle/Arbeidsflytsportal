'use client';

import { useEffect, useState } from 'react';
import { useUiPrefs } from '@/hooks/use-ui-prefs';

export function ConnectionStatus() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'down'>('checking');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const { language } = useUiPrefs();

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`${apiUrl}/health`);
        if (!cancelled) setStatus(res.ok ? 'ok' : 'down');
      } catch {
        if (!cancelled) setStatus('down');
      }
    }
    check();
    const id = setInterval(check, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [apiUrl]);

  const style =
    status === 'ok'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'down'
        ? 'bg-rose-100 text-rose-800'
        : 'bg-slate-100 text-slate-700';

  const label =
    language === 'no'
      ? status === 'ok'
        ? 'API: online'
        : status === 'down'
          ? 'API: offline'
          : 'API: sjekker'
      : status === 'ok'
        ? 'API: online'
        : status === 'down'
          ? 'API: offline'
          : 'API: checking';

  return <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${style}`}>{label}</span>;
}
