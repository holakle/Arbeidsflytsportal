'use client';

import { useEffect, useState } from 'react';
import { getDevToken } from '@/lib/auth';
import { ConnectionStatus } from '@/components/dev/connection-status';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getDevToken();
    if (!token) {
      setError('Mangler NEXT_PUBLIC_DEV_TOKEN i apps/web/.env.local');
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Request failed');
        return r.json();
      })
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch(() => setError('Kunne ikke hente dashboard. Sjekk API/token.'));
  }, []);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <ConnectionStatus />
      </div>
      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data?.widgets?.map((w: any) => (
          <article key={w.id} className="rounded border bg-white p-4">
            <h3 className="font-medium">{w.title}</h3>
            <p className="text-sm text-gray-600">Type: {w.type}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
