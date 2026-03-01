'use client';

import type { DevAuthUser } from '@portal/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { clearDevSession, getActiveUser, setDevSession } from '@/lib/auth';

function reasonMessage(reason: string | null) {
  if (!reason) return null;
  if (reason === 'missing-token') return 'Du mangler innlogging/token for å åpne siden.';
  if (reason === 'invalid-token') return 'Token er ugyldig eller utløpt.';
  if (reason === 'overview-access') return 'Du har ikke rolle for tilgang til Oversikt.';
  return 'Innlogging kreves.';
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<DevAuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState(getActiveUser());

  useEffect(() => {
    apiClient()
      .listDevUsers()
      .then((result) => {
        setUsers(result);
        setError(null);
      })
      .catch((err) => {
        setError(`Kunne ikke hente dev-brukere. ${err instanceof Error ? err.message : ''}`.trim());
      })
      .finally(() => setLoading(false));
  }, []);

  async function loginAsUser(userId: string) {
    try {
      setSubmittingId(userId);
      const issued = await apiClient().issueDevToken(userId);
      setDevSession(issued.token, issued.user);
      setActiveUser(issued.user);
      router.push('/overview');
      router.refresh();
    } catch (err) {
      setError(`Innlogging feilet. ${err instanceof Error ? err.message : ''}`.trim());
    } finally {
      setSubmittingId(null);
    }
  }

  function logout() {
    clearDevSession();
    setActiveUser(null);
    router.refresh();
  }

  const reason = reasonMessage(searchParams.get('reason'));

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Dev Login</h1>
      {reason ? <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{reason}</div> : null}
      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg font-medium">Aktiv bruker</h2>
        {activeUser ? (
          <div className="space-y-2 text-sm">
            <div>
              <strong>{activeUser.displayName}</strong> ({activeUser.email})
            </div>
            <div className="flex flex-wrap gap-1">
              {activeUser.roles.map((role) => (
                <span key={role} className="rounded bg-slate-100 px-2 py-1 text-xs">
                  {role}
                </span>
              ))}
            </div>
            <button className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={logout}>
              Logg ut
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Ingen aktiv bruker.</p>
        )}
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg font-medium">Logg inn som</h2>
        {loading ? <p className="text-sm text-slate-600">Laster brukere...</p> : null}
        {!loading && users.length === 0 ? <p className="text-sm text-slate-600">Ingen dev-brukere tilgjengelig.</p> : null}
        <div className="grid gap-2 md:grid-cols-2">
          {users.map((user) => (
            <article key={user.id} className="rounded border p-3">
              <div className="font-medium">{user.displayName}</div>
              <div className="text-sm text-slate-600">{user.email}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {user.roles.map((role) => (
                  <span key={role} className="rounded bg-slate-100 px-2 py-1 text-xs">
                    {role}
                  </span>
                ))}
              </div>
              <button
                className="mt-3 rounded bg-accent px-3 py-2 text-sm text-white disabled:opacity-50"
                disabled={submittingId !== null}
                onClick={() => loginAsUser(user.id)}
              >
                {submittingId === user.id ? 'Logger inn...' : 'Logg inn som denne'}
              </button>
            </article>
          ))}
        </div>
      </section>

      <div className="flex gap-2">
        <Link className="rounded border px-3 py-2 text-sm" href="/overview">
          Til Oversikt (MVP)
        </Link>
        <Link className="rounded border px-3 py-2 text-sm" href="/planner">
          Til Planner
        </Link>
      </div>
    </main>
  );
}
