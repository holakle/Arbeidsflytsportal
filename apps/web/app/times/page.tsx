'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';
import { ConnectionStatus } from '@/components/dev/connection-status';

type TimesheetEntry = {
  id: string;
  date: string;
  hours: number;
  activityType: string;
  note: string | null;
  workOrderId: string | null;
  projectId: string | null;
};

type WeeklySummary = {
  weekStart: string;
  totalHours: number;
  byActivityType: Record<string, number>;
};

const activityTypes = ['INSTALLATION', 'TRAVEL', 'MEETING', 'ADMIN', 'OTHER'];

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('no-NO');
}

function todayDateInputValue() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function TimesPage() {
  const token = getDevToken();
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [date, setDate] = useState(todayDateInputValue());
  const [hours, setHours] = useState('7.5');
  const [activityType, setActivityType] = useState('INSTALLATION');
  const [note, setNote] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const totalListedHours = useMemo(() => entries.reduce((sum, entry) => sum + Number(entry.hours), 0), [entries]);

  async function load() {
    if (!token) {
      setError('Mangler NEXT_PUBLIC_DEV_TOKEN i apps/web/.env.local');
      return;
    }
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        apiClient(token).listTimesheets().then((res) => res as TimesheetEntry[]),
        apiClient(token).weeklySummary().then((res) => res as WeeklySummary),
      ]);
      setEntries(entriesRes);
      setSummary(summaryRes);
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err, 'Kunne ikke hente timer.'));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createEntry() {
    if (!token) return;
    const numericHours = Number(hours);
    if (!Number.isFinite(numericHours) || numericHours <= 0) {
      setError('Timer må være et positivt tall.');
      return;
    }

    try {
      await apiClient(token).createTimesheet({
        date: new Date(`${date}T00:00:00`).toISOString(),
        hours: numericHours,
        activityType,
        workOrderId: workOrderId.trim() ? workOrderId.trim() : null,
        projectId: projectId.trim() ? projectId.trim() : null,
        note: note.trim() ? note.trim() : undefined,
      });
      setSuccess('Timelinje opprettet.');
      setError(null);
      setNote('');
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke opprette timelinje.'));
    }
  }

  async function removeEntry(id: string) {
    if (!token) return;
    try {
      await apiClient(token).deleteTimesheet(id);
      setSuccess('Timesheet slettet.');
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke slette timesheet.'));
    }
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Timer</h1>
        <ConnectionStatus />
      </div>

      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}
      {success ? <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</div> : null}

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Ukesummering</h2>
        <p className="text-sm">Uke start: {summary?.weekStart ?? '-'}</p>
        <p className="text-sm">Totalt denne uken: {summary?.totalHours ?? 0} timer</p>
        <div className="mt-2 grid gap-1 text-xs text-slate-700">
          {Object.entries(summary?.byActivityType ?? {}).map(([key, value]) => (
            <div key={key}>
              {key}: {value}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Ny timeføring</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <input className="rounded border px-3 py-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className="rounded border px-3 py-2" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Timer" />
          <select className="rounded border px-3 py-2" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
            {activityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input className="rounded border px-3 py-2" value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value)} placeholder="WorkOrder ID (valgfri)" />
          <input className="rounded border px-3 py-2" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Project ID (valgfri)" />
          <button className="rounded bg-accent px-3 py-2 text-white" onClick={() => void createEntry()}>
            Opprett
          </button>
          <textarea className="rounded border px-3 py-2 md:col-span-3" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notat (valgfri)" />
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Føringer</h2>
        <p className="mb-2 text-xs text-slate-600">Sum i listen: {totalListedHours.toFixed(2)} timer</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2">Dato</th>
                <th className="py-2">Timer</th>
                <th className="py-2">Aktivitet</th>
                <th className="py-2">Notat</th>
                <th className="py-2">Handling</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b">
                  <td className="py-2">{formatDate(entry.date)}</td>
                  <td className="py-2">{entry.hours}</td>
                  <td className="py-2">{entry.activityType}</td>
                  <td className="py-2">{entry.note ?? '-'}</td>
                  <td className="py-2">
                    <button className="rounded border px-2 py-1 text-xs hover:bg-slate-50" onClick={() => void removeEntry(entry.id)}>
                      Slett
                    </button>
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
