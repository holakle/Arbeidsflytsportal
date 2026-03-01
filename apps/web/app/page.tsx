import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-semibold">Arbeidsflytsportal</h1>
      <p>MVP med Del 1 (arbeidsordre) og Del 4 (personlig oversikt).</p>
      <div className="flex gap-3">
        <Link className="rounded bg-accent px-3 py-2 text-white" href="/planner">
          Planner
        </Link>
        <Link className="rounded border px-3 py-2" href="/dashboard">
          Dashboard
        </Link>
      </div>
    </main>
  );
}

