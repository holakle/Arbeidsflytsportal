import Link from 'next/link';
import type { ReactNode } from 'react';
import { ActiveUserChip } from '@/components/dev/active-user-chip';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="no">
      <body>
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
          <nav className="mx-auto flex w-full max-w-[1100px] gap-2 px-5 py-3">
            <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/overview">
              Oversikt (MVP)
            </Link>
            <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/dashboard">
              Min side
            </Link>
            <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/planner">
              Planner
            </Link>
            <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/equipment">
              Utstyr
            </Link>
            <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/mannskap">
              Mannskap
            </Link>
            <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/times">
              Timer
            </Link>
            <Link className="rounded px-3 py-2 text-sm font-medium hover:bg-slate-100" href="/todos">
              Todos
            </Link>
            <ActiveUserChip />
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
