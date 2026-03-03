'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUiPrefs } from '@/hooks/use-ui-prefs';
import { getActiveUser, type ActiveUser } from '@/lib/auth';

export function ActiveUserChip() {
  const [user, setUser] = useState<ActiveUser | null>(null);
  const { language } = useUiPrefs();

  useEffect(() => {
    setUser(getActiveUser());
    const onStorage = () => setUser(getActiveUser());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
        {user
          ? `${user.displayName} (${user.roles.join(', ')})`
          : language === 'no'
            ? 'Ingen bruker'
            : 'No user'}
      </span>
      <Link className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50" href="/login">
        {language === 'no' ? 'Bytt bruker' : 'Switch user'}
      </Link>
    </div>
  );
}
