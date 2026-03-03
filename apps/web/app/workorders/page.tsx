'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function WorkOrdersPage() {
  const token = getDevToken();
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    if (!token) {
      setError('Mangler NEXT_PUBLIC_DEV_TOKEN i apps/web/.env.local');
      return;
    }
    try {
      const res = await apiClient(token).listWorkOrders('page=1&limit=200');
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2">Tittel</th>
                <th className="py-2">Status</th>
                <th className="py-2">Detaljer</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.title}</td>
                  <td className="py-2">{item.status}</td>
                  <td className="py-2">
                    <Link className="rounded border px-2 py-1 text-xs hover:bg-slate-50" href={`/workorders/${item.id}`}>
                      Åpne
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
