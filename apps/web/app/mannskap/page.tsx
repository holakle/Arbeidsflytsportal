'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ConnectionStatus } from '@/components/dev/connection-status';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';
import {
  getCompetenceFilterOptions,
  getCompetenceNames,
  nextCompetenceExpiry,
  profileHasCompetence,
  readEmployeeProfile,
  type EmployeeProfileData,
} from '@/lib/employee-profile-store';

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

type SortMode = 'NAME' | 'COMPETENCE_COUNT' | 'EXPIRY';

const DUMMY_META_BY_EMAIL: Record<string, CrewMeta> = {
  'ole.andersen@demo.no': { location: 'Oslo Syd', phone: '+47 908 11 220', city: 'Kolbotn' },
  'martin.hagen@demo.no': { location: 'Oslo Vest', phone: '+47 916 44 530', city: 'Bærum' },
  'emilie.nilsen@demo.no': { location: 'Drammen', phone: '+47 928 70 340', city: 'Drammen' },
  'sindre.larsen@demo.no': {
    location: 'Lillestrøm',
    phone: '+47 936 25 890',
    city: 'Lillestrøm',
  },
  'ida.johansen@demo.no': { location: 'Follo', phone: '+47 948 66 125', city: 'Ski' },
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

function fallbackMeta(user: DevAuthUser, index: number): CrewMeta {
  const zones = ['Oslo Nord', 'Oslo Sentrum', 'Romerike', 'Asker', 'Vestfold'];
  const cities = ['Oslo', 'Lillestrøm', 'Asker', 'Drammen', 'Moss'];
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
  const [competenceFilter, setCompetenceFilter] = useState('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('NAME');
  const [includeExpired, setIncludeExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileRevision, setProfileRevision] = useState(0);

  useEffect(() => {
    async function loadUsers() {
      if (!token) {
        setError('Mangler token. Logg inn på nytt.');
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

  useEffect(() => {
    const refresh = () => setProfileRevision((value) => value + 1);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const profilesByUserId = useMemo(() => {
    const pairs = users.map((user) => [user.id, readEmployeeProfile(user.id)] as const);
    return new Map<string, EmployeeProfileData>(pairs);
  }, [users, profileRevision]);

  const competenceOptions = useMemo(
    () => getCompetenceFilterOptions(Array.from(profilesByUserId.values())),
    [profilesByUserId],
  );

  const rows = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    const mapped = users
      .map((user, index) => {
        const emailKey = user.email.toLowerCase();
        const meta = DUMMY_META_BY_EMAIL[emailKey] ?? fallbackMeta(user, index);
        const profile = profilesByUserId.get(user.id) ?? readEmployeeProfile(user.id);
        const competenceNames = getCompetenceNames(profile, includeExpired);
        const expiry = nextCompetenceExpiry(profile);
        return { ...user, ...meta, profile, competenceNames, expiry };
      })
      .filter((row) => {
        const competenceMatch =
          competenceFilter === 'ALL' ||
          profileHasCompetence(row.profile, competenceFilter, includeExpired);
        if (!competenceMatch) return false;
        if (!lowered) return true;
        return [
          row.displayName,
          row.email,
          row.location,
          row.city,
          row.phone,
          row.roles.join(' '),
          row.competenceNames.join(' '),
        ]
          .join(' ')
          .toLowerCase()
          .includes(lowered);
      });

    mapped.sort((a, b) => {
      if (sortMode === 'COMPETENCE_COUNT') {
        return b.competenceNames.length - a.competenceNames.length;
      }
      if (sortMode === 'EXPIRY') {
        const aTs = a.expiry?.getTime() ?? Number.POSITIVE_INFINITY;
        const bTs = b.expiry?.getTime() ?? Number.POSITIVE_INFINITY;
        return aTs - bTs;
      }
      return a.displayName.localeCompare(b.displayName, 'no');
    });

    return mapped;
  }, [competenceFilter, includeExpired, profilesByUserId, query, sortMode, users]);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mannskap</h1>
          <p className="text-sm text-slate-600">
            Klikk på navn for ansattside med ferdigheter, kurs og utløpsdato.
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
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <input
            className="rounded border px-3 py-2 text-sm md:col-span-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk på navn, e-post, lokasjon eller kompetanse"
          />
          <select
            className="rounded border px-3 py-2 text-sm"
            value={competenceFilter}
            onChange={(e) => setCompetenceFilter(e.target.value)}
          >
            <option value="ALL">All kompetanse</option>
            {competenceOptions
              .filter((item) => item !== 'ALL')
              .map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
          </select>
          <select
            className="rounded border px-3 py-2 text-sm"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
          >
            <option value="NAME">Sorter: Navn</option>
            <option value="COMPETENCE_COUNT">Sorter: Mest kompetanse</option>
            <option value="EXPIRY">Sorter: Nærmeste utløp</option>
          </select>
        </div>
        <label className="mb-3 inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={includeExpired}
            onChange={(e) => setIncludeExpired(e.target.checked)}
          />
          Inkluder utløpt kompetanse i filter/søk
        </label>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2">Navn</th>
                <th className="py-2">E-post</th>
                <th className="py-2">Lokasjon</th>
                <th className="py-2">Telefon</th>
                <th className="py-2">Bor i</th>
                <th className="py-2">Kompetanse</th>
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
                  <td className="py-2">
                    {row.competenceNames.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.competenceNames.slice(0, 4).map((name) => (
                          <span key={name} className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                            {name}
                          </span>
                        ))}
                        {row.competenceNames.length > 4 ? (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                            +{row.competenceNames.length - 4}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="py-2 text-xs">{row.roles.join(', ') || '-'}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-3 text-center text-sm text-slate-500">
                    Ingen ansatte matcher valgt filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
