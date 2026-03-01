import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Dev Login</h1>
      <p>Sett `NEXT_PUBLIC_DEV_TOKEN` i `apps/web/.env.local` for lokal auth-stub.</p>
      <ul className="list-disc space-y-1 pl-6 text-sm">
        <li>API må kjore pa `http://localhost:3001`</li>
        <li>Token må inneholde riktig `organizationId` og `roles`</li>
      </ul>
      <Link className="inline-block rounded border px-3 py-2" href="/planner">
        Gå til Planner
      </Link>
    </main>
  );
}
