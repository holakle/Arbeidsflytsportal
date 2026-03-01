'use client';

import { useEffect, useState } from 'react';
import { getDevToken } from '@/lib/auth';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/dashboard`, {
      headers: { Authorization: `Bearer ${getDevToken()}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => undefined);
  }, []);

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
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

