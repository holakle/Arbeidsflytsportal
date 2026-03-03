'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ConnectionStatus } from '@/components/dev/connection-status';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';

type WorkOrder = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  departmentId: string | null;
  locationId: string | null;
  projectId: string | null;
  department?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  assignments?: Array<{ id: string; assigneeUserId: string | null; assigneeTeamId: string | null }>;
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

function paginate<T>(items: T[], page: number, pageSize = 8) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return { pageItems: items.slice(start, start + pageSize), totalPages, page: safePage };
}

export default function WorkOrdersPage() {
  const token = getDevToken();
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    if (!token) {
      setError('Mangler NEXT_PUBLIC_DEV_TOKEN i apps/web/.env.local');
      return;
    }
    try {
      const res = await apiClient(token).listWorkOrders('page=1&limit=100');
      setItems(res.items as WorkOrder[]);
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err, 'Kunne ikke hente arbeidsordre.'));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createWorkOrder() {
    if (!token || !title.trim()) return;
    try {
      const created = (await apiClient(token).createWorkOrder({
        title: title.trim(),
        description: description.trim() ? description.trim() : undefined,
      })) as WorkOrder;
      setTitle('');
      setDescription('');
      setSuccess(`Opprettet: ${created.title}`);
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke opprette arbeidsordre.'));
    }
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((wo) => {
      const statusMatch = statusFilter === 'ALL' || wo.status === statusFilter;
      const searchMatch =
        q.length === 0 ||
        [wo.title, wo.description ?? '', wo.id, wo.department?.name ?? '', wo.location?.name ?? '', wo.project?.name ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q);
      return statusMatch && searchMatch;
    });
  }, [items, search, statusFilter]);

  const paging = paginate(filteredItems, page);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Arbeidsordre</h1>
        <ConnectionStatus />
      </div>

      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}
      {success ? <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</div> : null}

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Opprett arbeidsordre</h2>
        <div className="grid gap-2">
          <input className="rounded border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tittel" />
          <textarea
            className="rounded border px-3 py-2"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beskrivelse (valgfri)"
          />
          <button className="w-fit rounded bg-accent px-3 py-2 text-white disabled:opacity-50" disabled={!title.trim()} onClick={() => void createWorkOrder()}>
            Opprett
          </button>
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Arbeidsordreliste</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Total: {items.length}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            OPEN: {items.filter((w) => w.status === 'OPEN').length}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            IN_PROGRESS: {items.filter((w) => w.status === 'IN_PROGRESS').length}
          </span>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-3">
          <input
            className="rounded border px-3 py-2 text-sm"
            placeholder="Sok pa tittel/id"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="rounded border px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Alle statuser</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="DONE">DONE</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2">Tittel</th>
                <th className="py-2">Status</th>
                <th className="py-2">Avdeling</th>
                <th className="py-2">Lokasjon</th>
                <th className="py-2">Prosjekt</th>
                <th className="py-2">Tildelt</th>
                <th className="py-2">Detaljer</th>
              </tr>
            </thead>
            <tbody>
              {paging.pageItems.map((item) => {
                const userCount = (item.assignments ?? []).filter((a) => Boolean(a.assigneeUserId)).length;
                const teamCount = (item.assignments ?? []).filter((a) => Boolean(a.assigneeTeamId)).length;

                return (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">
                      <Link className="text-sky-700 hover:underline" href={`/workorders/${item.id}`}>
                        {item.title}
                      </Link>
                    </td>
                    <td className="py-2">{item.status}</td>
                    <td className="py-2">{item.department?.name ?? '-'}</td>
                    <td className="py-2">{item.location?.name ?? '-'}</td>
                    <td className="py-2">{item.project?.name ?? '-'}</td>
                    <td className="py-2">{userCount || teamCount ? `Bruker: ${userCount}, Team: ${teamCount}` : '-'}</td>
                    <td className="py-2">
                      <Link className="rounded border px-2 py-1 text-xs hover:bg-slate-50" href={`/workorders/${item.id}`}>
                        Inspect
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <button className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40" disabled={paging.page <= 1} onClick={() => setPage(paging.page - 1)}>
            Forrige
          </button>
          <span>
            Side {paging.page} av {paging.totalPages}
          </span>
          <button
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            disabled={paging.page >= paging.totalPages}
            onClick={() => setPage(paging.page + 1)}
          >
            Neste
          </button>
        </div>
      </section>
    </main>
  );
}
