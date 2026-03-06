'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ConnectionStatus } from '@/components/dev/connection-status';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';

type SubOrder = {
  id: string;
  workOrderId: string;
  title: string;
  timesheetCode: string;
  description: string | null;
  status: string;
  createdAt: string;
};

const statuses = [
  'DRAFT',
  'READY_FOR_PLANNING',
  'PLANNED',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'CANCELLED',
];

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function WorkOrderSubOrderPage() {
  const params = useParams<{ id: string; subOrderId: string }>();
  const router = useRouter();
  const workOrderId = params?.id;
  const subOrderId = params?.subOrderId;
  const token = getDevToken();

  const [subOrder, setSubOrder] = useState<SubOrder | null>(null);
  const [title, setTitle] = useState('');
  const [timesheetCode, setTimesheetCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    if (!token || !workOrderId || !subOrderId) return;
    try {
      const res = (await apiClient(token).getWorkOrderSubOrder(workOrderId, subOrderId)) as SubOrder;
      setSubOrder(res);
      setTitle(res.title);
      setTimesheetCode(res.timesheetCode);
      setDescription(res.description ?? '');
      setStatus(res.status);
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err, 'Kunne ikke hente delordre.'));
    }
  }

  useEffect(() => {
    void load();
  }, [token, workOrderId, subOrderId]);

  async function save() {
    if (!token || !workOrderId || !subOrderId || saving) return;
    setSaving(true);
    try {
      await apiClient(token).updateWorkOrderSubOrder(workOrderId, subOrderId, {
        title: title.trim(),
        timesheetCode: timesheetCode.trim(),
        description: description.trim() || undefined,
        status,
      });
      setSuccess('Delordre oppdatert.');
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke oppdatere delordre.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!token || !workOrderId || !subOrderId || deleting) return;
    const ok = window.confirm('Er du sikker på at du vil slette delordren?');
    if (!ok) return;
    setDeleting(true);
    try {
      await apiClient(token).deleteWorkOrderSubOrder(workOrderId, subOrderId);
      router.push(`/workorders/${workOrderId}`);
    } catch (err) {
      setError(toErrorMessage(err, 'Kunne ikke slette delordre.'));
      setDeleting(false);
    }
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Delordre</h1>
          <p className="text-sm text-slate-600">{subOrder?.id ?? subOrderId}</p>
        </div>
        <ConnectionStatus />
      </div>

      <div className="flex gap-2">
        <Link className="rounded border px-3 py-2 text-sm hover:bg-slate-50" href={`/workorders/${workOrderId}`}>
          Tilbake til arbeidsordre
        </Link>
        <button
          className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
          onClick={() => void remove()}
          disabled={deleting || !subOrder}
        >
          {deleting ? 'Sletter...' : 'Slett delordre'}
        </button>
      </div>

      {error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Rediger delordre</h2>
        <div className="grid gap-2">
          <input
            className="rounded border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tittel"
          />
          <input
            className="rounded border px-3 py-2"
            value={timesheetCode}
            onChange={(e) => setTimesheetCode(e.target.value)}
            placeholder="Delordrekode"
          />
          <select
            className="rounded border px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {statuses.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>
          <textarea
            className="rounded border px-3 py-2"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beskrivelse"
          />
          <button
            className="rounded bg-accent px-3 py-2 text-white disabled:opacity-50"
            onClick={() => void save()}
            disabled={saving || !title.trim() || !timesheetCode.trim()}
          >
            {saving ? 'Lagrer...' : 'Lagre'}
          </button>
        </div>
      </section>
    </main>
  );
}
