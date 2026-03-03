'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ConnectionStatus } from '@/components/dev/connection-status';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';

type DevAuthUser = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
};

type CrewMeta = {
  location: string;
  phone: string;
  city: string;
};

const DUMMY_META_BY_EMAIL: Record<string, CrewMeta> = {
  'ole.andersen@demo.no': { location: 'Oslo Syd', phone: '+47 908 11 220', city: 'Kolbotn' },
  'martin.hagen@demo.no': { location: 'Oslo Vest', phone: '+47 916 44 530', city: 'Baerum' },
  'emilie.nilsen@demo.no': { location: 'Drammen', phone: '+47 928 70 340', city: 'Drammen' },
  'sindre.larsen@demo.no': { location: 'Lillestrom', phone: '+47 936 25 890', city: 'Lillestrom' },
  'ida.johansen@demo.no': { location: 'Follo', phone: '+47 948 66 125', city: 'Ski' },
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

function fallbackMeta(user: DevAuthUser, index: number): CrewMeta {
  const zones = ['Oslo Nord', 'Oslo Sentrum', 'Romerike', 'Asker', 'Vestfold'];
  const cities = ['Oslo', 'Lillestrom', 'Asker', 'Drammen', 'Moss'];
  const phoneTail = String(1000 + index).padStart(4, '0');
  return {
    location: zones[index % zones.length] ?? 'Oslo',
    phone: `+47 900 ${phoneTail.slice(0, 2)} ${phoneTail.slice(2)}`,
    city: cities[index % cities.length] ?? 'Oslo',
  };
}

export default function MannskapPage() {
  const token = getDevToken();
  const [users, setUsers] = useState<DevAuthUser[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      if (!token) {
        setError('Mangler token. Logg inn pa nytt.');
        return;
      }

      try {
        const rows = (await apiClient(token).listDevUsers()) as DevAuthUser[];
        setUsers(rows);
        setError(null);
      } catch (err) {
        setError(toErrorMessage(err, 'Kunne ikke hente mannskap.'));
      }
    }

    void loadUsers();
  }, [token]);

  const rows = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return users
      .map((user, index) => {
        const emailKey = user.email.toLowerCase();
        const meta = DUMMY_META_BY_EMAIL[emailKey] ?? fallbackMeta(user, index);
        return { ...user, ...meta };
      })
      .filter((row) => {
        if (!lowered) return true;
        return [row.displayName, row.email, row.location, row.city, row.phone, row.roles.join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(lowered);
      });
  }, [query, users]);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mannskap</h1>
          <p className="text-sm text-slate-600">
            Klikk pa navn for ansattside med ferdigheter og kurs.
          </p>
        </div>
        <ConnectionStatus />
      </div>

      {error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="rounded border bg-white p-4">
        <div className="mb-3">
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sok pa navn, e-post, lokasjon eller bosted"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2">Navn</th>
                <th className="py-2">E-post</th>
                <th className="py-2">Lokasjon</th>
                <th className="py-2">Telefon</th>
                <th className="py-2">Bor i</th>
                <th className="py-2">Roller</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2">
                    <Link className="text-sky-700 hover:underline" href={`/employees/${row.id}`}>
                      {row.displayName}
                    </Link>
                  </td>
                  <td className="py-2 text-xs">{row.email}</td>
                  <td className="py-2">{row.location}</td>
                  <td className="py-2">{row.phone}</td>
                  <td className="py-2">{row.city}</td>
                  <td className="py-2 text-xs">{row.roles.join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
