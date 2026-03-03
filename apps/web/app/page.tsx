import Link from 'next/link';
import { ConnectionStatus } from '@/components/dev/connection-status';

export default function HomePage() {
  return (
    <main className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Arbeidsflytsportal</h1>
        <p className="text-slate-600">Enkel inngang til oversikt, planlegging og drift.</p>
      </div>
      <ConnectionStatus />
      <div className="flex flex-wrap gap-3">
        <Link className="rounded bg-accent px-4 py-2 text-white" href="/overview">
          Åpne oversikt
        </Link>
        <Link className="rounded border px-4 py-2" href="/login">
          Logg inn / bytt bruker
        </Link>
      </div>
    </main>
  );
}
