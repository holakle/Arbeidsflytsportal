'use client';

import Link from 'next/link';
import { ActiveUserChip } from '@/components/dev/active-user-chip';
import { SettingsMenu } from '@/components/dev/settings-menu';
import { useUiPrefs } from '@/hooks/use-ui-prefs';

export function TopNav() {
  const { language } = useUiPrefs();

  const labels =
    language === 'no'
      ? {
          overview: 'Oversikt',
          dashboard: 'Min side',
          planner: 'Kalender',
          workorders: 'Arbeidsordre',
          equipment: 'Utstyr',
          crew: 'Mannskap',
          times: 'Timer',
          todos: 'Todos',
        }
      : {
          overview: 'Overview',
          dashboard: 'My page',
          planner: 'Calendar',
          workorders: 'Work orders',
          equipment: 'Equipment',
          crew: 'Crew',
          times: 'Hours',
          todos: 'Todos',
        };

  return (
    <nav className="mx-auto flex w-full max-w-[1100px] gap-2 px-5 py-3">
      <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/overview">
        {labels.overview}
      </Link>
      <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/dashboard">
        {labels.dashboard}
      </Link>
      <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/planner">
        {labels.planner}
      </Link>
      <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/workorders">
        {labels.workorders}
      </Link>
      <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/equipment">
        {labels.equipment}
      </Link>
      <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/mannskap">
        {labels.crew}
      </Link>
      <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/times">
        {labels.times}
      </Link>
      <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/todos">
        {labels.todos}
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <SettingsMenu />
        <ActiveUserChip />
      </div>
    </nav>
  );
}
