import Link from 'next/link';
import { ConnectionStatus } from '@/components/dev/connection-status';

export default function HomePage() {
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-semibold">Arbeidsflytsportal</h1>
      <p>MVP med Del 1 (arbeidsordre) og Del 4 (personlig oversikt).</p>
      <ConnectionStatus />
      <div className="flex gap-3">
        <Link className="rounded border px-3 py-2" href="/overview">
          Oversikt (MVP)
        </Link>
        <Link className="rounded bg-accent px-3 py-2 text-white" href="/planner">
          Planner
        </Link>
        <Link className="rounded border px-3 py-2" href="/dashboard">
          Min side
        </Link>
        <Link className="rounded border px-3 py-2" href="/equipment">
          Utstyr
        </Link>
      </div>
      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg font-medium">Lokal setup-checklist</h2>
        <ol className="list-decimal space-y-1 pl-6 text-sm">
          <li>Start Postgres: `docker compose up -d postgres`</li>
          <li>Kjor API migrate + seed</li>
          <li>Sett `NEXT_PUBLIC_API_URL` og `NEXT_PUBLIC_DEV_TOKEN` i `apps/web/.env.local`</li>
          <li>Start web: `pnpm --filter @apps/web dev`</li>
        </ol>
      </section>
    </main>
  );
}
