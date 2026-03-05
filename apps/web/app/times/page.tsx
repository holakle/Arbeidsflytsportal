'use client';

import Link from 'next/link';
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
  workOrder?: { id: string; title: string } | null;
  project?: { id: string; name: string } | null;
  status?: string;
};

type WeeklySummary = {
  weekStart: string;
  totalHours: number;
  byActivityType: Record<string, number>;
};

type WorkOrder = {
  id: string;
  title: string;
  status: string;
  projectId: string | null;
  project?: { id: string; name: string } | null;
};

type DevUser = {
  id: string;
  displayName: string;
  email: string;
  roles: string[];
};

type MeResponse = {
  user: {
    id: string;
    email: string;
    displayName: string;
    organizationId: string;
  };
  roles: string[];
  organizationId: string;
};

const activityTypes = ['INSTALLATION', 'TRAVEL', 'MEETING', 'ADMIN', 'OTHER'];
const timesheetStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED'] as const;

type TimesheetStatus = (typeof timesheetStatuses)[number];
type EntryEditState = {
  date: string;
  hours: string;
  activityType: string;
  workOrderId: string;
  projectId: string;
  note: string;
  status: TimesheetStatus;
};

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

function toDateInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return todayDateInputValue();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function TimesPage() {
  const token = getDevToken();
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [users, setUsers] = useState<DevUser[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);

  const [date, setDate] = useState(todayDateInputValue());
  const [hours, setHours] = useState('7.5');
  const [activityType, setActivityType] = useState('INSTALLATION');
  const [note, setNote] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EntryEditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canManageOtherUsers = useMemo(() => {
    if (!me) return false;
    return me.roles.some(
      (role) => role === 'planner' || role === 'org_admin' || role === 'system_admin',
    );
  }, [me]);

  const targetUserId = useMemo(() => {
    if (!me) return '';
    if (!canManageOtherUsers) return me.user.id;
    return selectedWorkerId || me.user.id;
  }, [canManageOtherUsers, me, selectedWorkerId]);

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const wo of workOrders) {
      if (!wo.projectId) continue;
      if (!map.has(wo.projectId)) {
        map.set(wo.projectId, wo.project?.name ?? `Prosjekt ${wo.projectId.slice(0, 8)}`);
      }
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [workOrders]);

  const totalListedHours = useMemo(
    () => entries.reduce((sum, entry) => sum + Number(entry.hours), 0),
    [entries],
  );

  const workOrderById = useMemo(() => {
    const map = new Map<string, WorkOrder>();
    for (const item of workOrders) map.set(item.id, item);
    return map;
  }, [workOrders]);

  async function loadEntriesAndSummary(nextTargetUserId: string) {
    if (!token) return;

    const queryUserId =
      canManageOtherUsers && nextTargetUserId && me?.user.id !== nextTargetUserId
        ? nextTargetUserId
        : undefined;

    const [entriesRes, summaryRes] = await Promise.all([
      apiClient(token)
        .listTimesheets(queryUserId ? { userId: queryUserId } : undefined)
        .then((res) => res as TimesheetEntry[]),
      apiClient(token)
        .weeklySummary(undefined, queryUserId)
        .then((res) => res as WeeklySummary),
    ]);

    setEntries(entriesRes);
    setSummary(summaryRes);
  }

  async function loadMeta() {
    if (!token) {
      setError('Mangler NEXT_PUBLIC_DEV_TOKEN i apps/web/.env.local');
      return;
    }

    try {
      const [meRes, workOrderRes, usersRes] = await Promise.all([
        apiClient(token)
          .me()
          .then((res) => res as MeResponse),
        apiClient(token)
          .listWorkOrders('page=1&limit=100')
          .then((res) => res.items as WorkOrder[]),
        apiClient(token)
          .listDevUsers()
          .then((res) => res as DevUser[]),
      ]);

      setMe(meRes);
      setWorkOrders(workOrderRes);
      setUsers(usersRes);
      setSelectedWorkerId(meRes.user.id);
      setError(null);

      await loadEntriesAndSummary(meRes.user.id);
    } catch (err) {
      setError(toErrorMessage(err, 'Kunne ikke hente timer.'));
    }
  }

  useEffect(() => {
    void loadMeta();
  }, []);

  useEffect(() => {
    if (!targetUserId || !me) return;
    void loadEntriesAndSummary(targetUserId).catch((err) =>
      setError(toErrorMessage(err, 'Kunne ikke hente timer.')),
    );
  }, [targetUserId]);

  async function createEntry() {
    if (!token || !me) return;

    const numericHours = Number(hours);
    if (!Number.isFinite(numericHours) || numericHours <= 0) {
      setError('Timer må være et positivt tall.');
      return;
    }

    const body: {
      date: string;
      hours: number;
      activityType: string;
      workOrderId: string | null;
      projectId: string | null;
      note?: string;
      userId?: string;
    } = {
      date: new Date(`${date}T00:00:00`).toISOString(),
      hours: numericHours,
      activityType,
      workOrderId: workOrderId.trim() ? workOrderId.trim() : null,
      projectId: projectId.trim() ? projectId.trim() : null,
      note: note.trim() ? note.trim() : undefined,
    };

    if (canManageOtherUsers && targetUserId && targetUserId !== me.user.id) {
      body.userId = targetUserId;
    }

    try {
      await apiClient(token).createTimesheet(body);
      setSuccess('Timeføring opprettet.');
      setError(null);
      setNote('');
      await loadEntriesAndSummary(targetUserId || me.user.id);
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke opprette timeføring.'));
    }
  }

  async function removeEntry(id: string) {
    if (!token || !me) return;
    try {
      await apiClient(token).deleteTimesheet(id);
      setSuccess('Timesheet slettet.');
      setError(null);
      await loadEntriesAndSummary(targetUserId || me.user.id);
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke slette timesheet.'));
    }
  }

  async function setEntryStatus(id: string, status: 'DRAFT' | 'SUBMITTED') {
    if (!token || !me) return;
    try {
      await apiClient(token).updateTimesheet(id, { status });
      setSuccess(`Timesheet satt til ${status}.`);
      setError(null);
      await loadEntriesAndSummary(targetUserId || me.user.id);
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke oppdatere status.'));
    }
  }

  function startEdit(entry: TimesheetEntry) {
    setEditingEntryId(entry.id);
    setEditState({
      date: toDateInputValue(entry.date),
      hours: String(entry.hours),
      activityType: entry.activityType,
      workOrderId: entry.workOrderId ?? '',
      projectId: entry.projectId ?? '',
      note: entry.note ?? '',
      status: (entry.status as TimesheetStatus | undefined) ?? 'DRAFT',
    });
    setSuccess(null);
    setError(null);
  }

  function cancelEdit() {
    setEditingEntryId(null);
    setEditState(null);
    setSavingEdit(false);
  }

  function onEditWorkOrderChange(nextWorkOrderId: string) {
    if (!editState) return;
    const selected = workOrders.find((wo) => wo.id === nextWorkOrderId);
    setEditState({
      ...editState,
      workOrderId: nextWorkOrderId,
      projectId: selected?.projectId ?? editState.projectId,
    });
  }

  async function saveEditEntry(entryId: string) {
    if (!token || !me || !editState || savingEdit) return;

    const numericHours = Number(editState.hours);
    if (!Number.isFinite(numericHours) || numericHours <= 0) {
      setError('Timer må være et positivt tall.');
      return;
    }

    setSavingEdit(true);
    try {
      await apiClient(token).updateTimesheet(entryId, {
        date: new Date(`${editState.date}T00:00:00`).toISOString(),
        hours: numericHours,
        activityType: editState.activityType,
        workOrderId: editState.workOrderId.trim() ? editState.workOrderId.trim() : null,
        projectId: editState.projectId.trim() ? editState.projectId.trim() : null,
        note: editState.note.trim() ? editState.note.trim() : undefined,
        status: editState.status,
      });
      setSuccess('Timeføring oppdatert.');
      setError(null);
      cancelEdit();
      await loadEntriesAndSummary(targetUserId || me.user.id);
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke oppdatere timeføring.'));
    } finally {
      setSavingEdit(false);
    }
  }

  function onWorkOrderChange(nextWorkOrderId: string) {
    setWorkOrderId(nextWorkOrderId);
    const selected = workOrders.find((wo) => wo.id === nextWorkOrderId);
    if (selected?.projectId) {
      setProjectId(selected.projectId);
    }
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Timer</h1>
        <ConnectionStatus />
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
          <input
            className="rounded border px-3 py-2"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            className="rounded border px-3 py-2"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Timer"
          />
          <select
            className="rounded border px-3 py-2"
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
          >
            {activityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {canManageOtherUsers ? (
            <select
              className="rounded border px-3 py-2 md:col-span-3"
              value={targetUserId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName} ({user.roles.join(', ') || 'no-role'})
                </option>
              ))}
            </select>
          ) : null}

          <select
            className="rounded border px-3 py-2"
            value={workOrderId}
            onChange={(e) => onWorkOrderChange(e.target.value)}
          >
            <option value="">Ingen arbeidsordre</option>
            {workOrders.map((wo) => (
              <option key={wo.id} value={wo.id}>
                {wo.title} ({wo.status})
              </option>
            ))}
          </select>

          <select
            className="rounded border px-3 py-2"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Ingen prosjekt</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.label}
              </option>
            ))}
          </select>

          <button
            className="rounded bg-accent px-3 py-2 text-white"
            onClick={() => void createEntry()}
          >
            Opprett
          </button>

          <textarea
            className="rounded border px-3 py-2 md:col-span-3"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notat (valgfri)"
          />
        </div>

        {me ? (
          <p className="mt-2 text-xs text-slate-600">
            Fører timer som:{' '}
            {users.find((u) => u.id === targetUserId)?.displayName ?? me.user.displayName}
          </p>
        ) : null}
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Føringer</h2>
        <p className="mb-2 text-xs text-slate-600">
          Sum i listen: {totalListedHours.toFixed(2)} timer
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2">Dato</th>
                <th className="py-2">Timer</th>
                <th className="py-2">Aktivitet</th>
                <th className="py-2">Arbeidsordre</th>
                <th className="py-2">Ordrenummer</th>
                <th className="py-2">Status</th>
                <th className="py-2">Notat</th>
                <th className="py-2">Handling</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isEditing = editingEntryId === entry.id && Boolean(editState);
                const linkedWorkOrder =
                  (entry.workOrderId ? workOrderById.get(entry.workOrderId) : null) ??
                  entry.workOrder ??
                  null;

                return (
                  <tr key={entry.id} className="border-b">
                    <td className="py-2">
                      {isEditing && editState ? (
                        <input
                          className="w-36 rounded border px-2 py-1"
                          type="date"
                          value={editState.date}
                          onChange={(e) => setEditState({ ...editState, date: e.target.value })}
                        />
                      ) : (
                        formatDate(entry.date)
                      )}
                    </td>
                    <td className="py-2">
                      {isEditing && editState ? (
                        <input
                          className="w-20 rounded border px-2 py-1"
                          value={editState.hours}
                          onChange={(e) => setEditState({ ...editState, hours: e.target.value })}
                        />
                      ) : (
                        entry.hours
                      )}
                    </td>
                    <td className="py-2">
                      {isEditing && editState ? (
                        <select
                          className="rounded border px-2 py-1"
                          value={editState.activityType}
                          onChange={(e) => setEditState({ ...editState, activityType: e.target.value })}
                        >
                          {activityTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      ) : (
                        entry.activityType
                      )}
                    </td>
                    <td className="py-2">
                      {isEditing && editState ? (
                        <select
                          className="w-56 rounded border px-2 py-1"
                          value={editState.workOrderId}
                          onChange={(e) => onEditWorkOrderChange(e.target.value)}
                        >
                          <option value="">Ingen arbeidsordre</option>
                          {workOrders.map((wo) => (
                            <option key={wo.id} value={wo.id}>
                              {wo.title}
                            </option>
                          ))}
                        </select>
                      ) : linkedWorkOrder ? (
                        <Link
                          className="text-sky-700 hover:underline"
                          href={`/workorders/${linkedWorkOrder.id}`}
                        >
                          {linkedWorkOrder.title}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2">
                      {isEditing && editState ? (
                        <code className="text-xs text-slate-600">{editState.workOrderId || '-'}</code>
                      ) : entry.workOrderId ? (
                        <code className="text-xs" title={entry.workOrderId}>
                          {entry.workOrderId}
                        </code>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2">
                      {isEditing && editState ? (
                        <select
                          className="rounded border px-2 py-1"
                          value={editState.status}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              status: e.target.value as TimesheetStatus,
                            })
                          }
                        >
                          {timesheetStatuses.map((statusOption) => (
                            <option key={statusOption} value={statusOption}>
                              {statusOption}
                            </option>
                          ))}
                        </select>
                      ) : (
                        entry.status ?? '-'
                      )}
                    </td>
                    <td className="py-2">
                      {isEditing && editState ? (
                        <input
                          className="w-full min-w-56 rounded border px-2 py-1"
                          value={editState.note}
                          onChange={(e) => setEditState({ ...editState, note: e.target.value })}
                          placeholder="Notat"
                        />
                      ) : (
                        entry.note ?? '-'
                      )}
                    </td>
                    <td className="py-2">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
                            onClick={() => void saveEditEntry(entry.id)}
                            disabled={savingEdit}
                          >
                            {savingEdit ? 'Lagrer...' : 'Lagre'}
                          </button>
                          <button
                            className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                            onClick={cancelEdit}
                          >
                            Avbryt
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                            onClick={() => startEdit(entry)}
                          >
                            Rediger
                          </button>
                          <button
                            className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                            onClick={() => void setEntryStatus(entry.id, 'DRAFT')}
                          >
                            Sett draft
                          </button>
                          <button
                            className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                            onClick={() => void setEntryStatus(entry.id, 'SUBMITTED')}
                          >
                            Sett submitted
                          </button>
                          <button
                            className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                            onClick={() => void removeEntry(entry.id)}
                          >
                            Slett
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-3 text-center text-slate-500">
                    Ingen føringer registrert enda.
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
