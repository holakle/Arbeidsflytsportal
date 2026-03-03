'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';
import { ConnectionStatus } from '@/components/dev/connection-status';

type WorkOrder = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  departmentId: string | null;
  locationId: string | null;
  projectId: string | null;
  planningOwnerUserId: string | null;
  department?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  assignments?: Array<{ id: string; assigneeUserId: string | null; assigneeTeamId: string | null }>;
};

type DevUser = {
  id: string;
  displayName: string;
  email: string;
  roles: string[];
};

type ConsumableItem = {
  id: string;
  name: string;
  serialNumber: string | null;
  barcode: string | null;
  type: 'CONSUMABLE';
};

type WorkOrderConsumable = {
  id: string;
  quantity: number;
  note: string | null;
  createdAt: string;
  equipmentItem?: ConsumableItem;
};

type WorkOrderScheduleEntry = {
  id: string;
  assigneeUserId: string | null;
  assigneeTeamId: string | null;
  startAt: string;
  endAt: string;
  note: string | null;
  status: string;
  assigneeUser?: { id: string; displayName: string };
  assigneeTeam?: { id: string; name: string };
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('no-NO');
}

function toLocalDateTime(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

function toIso(localDateTime: string) {
  const date = new Date(localDateTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

const statuses = ['OPEN', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED'];

export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const token = getDevToken();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [departmentId, setDepartmentId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [planningOwnerUserId, setPlanningOwnerUserId] = useState('');
  const [assignmentUserId, setAssignmentUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [users, setUsers] = useState<DevUser[]>([]);

  const [consumables, setConsumables] = useState<WorkOrderConsumable[]>([]);
  const [consumableCatalog, setConsumableCatalog] = useState<ConsumableItem[]>([]);
  const [selectedConsumableId, setSelectedConsumableId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [consumableNote, setConsumableNote] = useState('');

  const [scheduleEntries, setScheduleEntries] = useState<WorkOrderScheduleEntry[]>([]);
  const [scheduleAssigneeUserId, setScheduleAssigneeUserId] = useState('');
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [scheduleNote, setScheduleNote] = useState('');

  const planningOwnerLabel = useMemo(
    () => users.find((u) => u.id === planningOwnerUserId)?.displayName ?? '-',
    [planningOwnerUserId, users],
  );

  async function load() {
    if (!token || !id) return;
    try {
      const [woRes, consumableRes, catalogRes, userRes, scheduleRes] = await Promise.all([
        apiClient(token).getWorkOrder(id),
        apiClient(token).listWorkOrderConsumables(id),
        apiClient(token).listEquipment('type=CONSUMABLE'),
        apiClient(token).listDevUsers(),
        apiClient(token).listWorkOrderSchedule(id),
      ]);

      const wo = woRes as WorkOrder;
      const devUsers = userRes as DevUser[];
      const entries = scheduleRes as WorkOrderScheduleEntry[];

      setWorkOrder(wo);
      setTitle(wo.title ?? '');
      setDescription(wo.description ?? '');
      setStatus(wo.status ?? 'OPEN');
      setDepartmentId(wo.departmentId ?? '');
      setLocationId(wo.locationId ?? '');
      setProjectId(wo.projectId ?? '');
      setPlanningOwnerUserId(wo.planningOwnerUserId ?? '');
      setUsers(devUsers);
      if (!assignmentUserId && devUsers.length > 0) {
        const firstUser = devUsers.at(0);
        if (firstUser) setAssignmentUserId(firstUser.id);
      }

      setConsumables(consumableRes as WorkOrderConsumable[]);
      const catalog = catalogRes as ConsumableItem[];
      setConsumableCatalog(catalog);
      if (!selectedConsumableId && catalog.length > 0) {
        const firstConsumable = catalog.at(0);
        if (firstConsumable) {
          setSelectedConsumableId(firstConsumable.id);
        }
      }

      setScheduleEntries(entries);
      if (!scheduleAssigneeUserId && devUsers.length > 0) {
        const firstUser = devUsers.at(0);
        if (firstUser) {
          setScheduleAssigneeUserId(firstUser.id);
        }
      }
      if (!scheduleStart || !scheduleEnd) {
        const now = new Date();
        const plusTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        setScheduleStart(toLocalDateTime(now.toISOString()));
        setScheduleEnd(toLocalDateTime(plusTwoHours.toISOString()));
      }

      setError(null);
    } catch (err) {
      setError(toErrorMessage(err, 'Kunne ikke hente arbeidsordre.'));
    }
  }

  useEffect(() => {
    void load();
  }, [id, token]);

  async function save() {
    if (!token || !id) return;
    try {
      await apiClient(token).updateWorkOrder(id, {
        title,
        description: description.trim() ? description : null,
        status,
        departmentId: departmentId.trim() ? departmentId : null,
        locationId: locationId.trim() ? locationId : null,
        projectId: projectId.trim() ? projectId : null,
      });
      setSuccess('Arbeidsordre oppdatert.');
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke oppdatere arbeidsordre.'));
    }
  }

  async function savePlanningOwner() {
    if (!token || !id) return;
    try {
      await apiClient(token).setPlanningOwner(id, planningOwnerUserId || null);
      setSuccess('Planansvarlig oppdatert.');
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke oppdatere planansvarlig.'));
    }
  }

  async function addScheduleEntry() {
    if (!token || !id || !scheduleAssigneeUserId || !scheduleStart || !scheduleEnd) return;
    const startAt = toIso(scheduleStart);
    const endAt = toIso(scheduleEnd);
    if (!startAt || !endAt) {
      setError('Ugyldig datoformat for schedule.');
      return;
    }

    try {
      await apiClient(token).createWorkOrderSchedule(id, {
        assigneeUserId: scheduleAssigneeUserId,
        startAt,
        endAt,
        note: scheduleNote.trim() ? scheduleNote.trim() : undefined,
      });
      setSuccess('Schedule entry opprettet.');
      setError(null);
      setScheduleNote('');
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke opprette schedule entry.'));
    }
  }

  async function addAssignment() {
    if (!token || !id || !assignmentUserId) return;
    try {
      await apiClient(token).assignWorkOrder(id, { assigneeUserId: assignmentUserId });
      setSuccess('Tildeling opprettet.');
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke opprette tildeling.'));
    }
  }

  async function deleteScheduleEntry(scheduleId: string) {
    if (!token || !id) return;
    try {
      await apiClient(token).deleteWorkOrderSchedule(id, scheduleId);
      setSuccess('Schedule entry slettet.');
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke slette schedule entry.'));
    }
  }

  async function addConsumable() {
    if (!token || !id || !selectedConsumableId || quantity < 1) return;
    try {
      await apiClient(token).addWorkOrderConsumable(id, {
        equipmentItemId: selectedConsumableId,
        quantity,
        note: consumableNote.trim() ? consumableNote.trim() : undefined,
      });
      setConsumableNote('');
      setQuantity(1);
      setSuccess('Forbruksmateriell lagt til arbeidsordre.');
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke legge til forbruksmateriell.'));
    }
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Arbeidsordre</h1>
          <p className="text-sm text-slate-600">{id}</p>
          <p className="text-xs text-slate-600">
            Plassering: {workOrder?.department?.name ?? '-'} / {workOrder?.location?.name ?? '-'} /{' '}
            {workOrder?.project?.name ?? '-'}
          </p>
        </div>
        <ConnectionStatus />
      </div>

      <div className="flex gap-2">
        <Link className="rounded border px-3 py-2 text-sm hover:bg-slate-50" href="/planner">
          Tilbake til Planner
        </Link>
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
        <h2 className="mb-2 text-lg">Rediger info</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded border px-3 py-2 md:col-span-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tittel"
          />
          <textarea
            className="rounded border px-3 py-2 md:col-span-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beskrivelse"
            rows={4}
          />
          <select
            className="rounded border px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            className="rounded border px-3 py-2"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            placeholder="Avdeling ID (valgfri)"
          />
          <input
            className="rounded border px-3 py-2"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            placeholder="Lokasjon ID (valgfri)"
          />
          <input
            className="rounded border px-3 py-2"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Prosjekt ID (valgfri)"
          />
          <button
            className="rounded bg-accent px-3 py-2 text-white md:col-span-2"
            onClick={() => void save()}
            disabled={!workOrder}
          >
            Lagre
          </button>
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Tildelinger</h2>
        <div className="mb-3 grid gap-2 md:grid-cols-3">
          <select
            className="rounded border px-3 py-2 md:col-span-2"
            value={assignmentUserId}
            onChange={(e) => setAssignmentUserId(e.target.value)}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
          <button
            className="rounded bg-accent px-3 py-2 text-white"
            onClick={() => void addAssignment()}
          >
            Tildel bruker
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2">Bruker</th>
                <th className="py-2">Team</th>
                <th className="py-2">XOR</th>
              </tr>
            </thead>
            <tbody>
              {(workOrder?.assignments ?? []).map((assignment) => {
                const assignedUser = users.find((user) => user.id === assignment.assigneeUserId);
                const xorValid =
                  Boolean(assignment.assigneeUserId) !== Boolean(assignment.assigneeTeamId);
                return (
                  <tr key={assignment.id} className="border-b">
                    <td className="py-2">
                      {assignedUser?.displayName ?? assignment.assigneeUserId ?? '-'}
                    </td>
                    <td className="py-2">{assignment.assigneeTeamId ?? '-'}</td>
                    <td className="py-2">{xorValid ? 'OK' : 'INVALID'}</td>
                  </tr>
                );
              })}
              {(workOrder?.assignments ?? []).length === 0 ? (
                <tr>
                  <td className="py-2 text-slate-500" colSpan={3}>
                    Ingen tildelinger enda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Planansvarlig (planlegger)</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <select
            className="rounded border px-3 py-2 md:col-span-2"
            value={planningOwnerUserId}
            onChange={(e) => setPlanningOwnerUserId(e.target.value)}
          >
            <option value="">Ingen</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
          <button
            className="rounded bg-accent px-3 py-2 text-white"
            onClick={() => void savePlanningOwner()}
          >
            Lagre planansvarlig
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-600">Aktiv planansvarlig: {planningOwnerLabel}</p>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Tildelt arbeid (tidspunkt)</h2>
        <div className="grid gap-2 md:grid-cols-5">
          <select
            className="rounded border px-3 py-2 md:col-span-2"
            value={scheduleAssigneeUserId}
            onChange={(e) => setScheduleAssigneeUserId(e.target.value)}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
          <input
            className="rounded border px-3 py-2"
            type="datetime-local"
            value={scheduleStart}
            onChange={(e) => setScheduleStart(e.target.value)}
          />
          <input
            className="rounded border px-3 py-2"
            type="datetime-local"
            value={scheduleEnd}
            onChange={(e) => setScheduleEnd(e.target.value)}
          />
          <button
            className="rounded bg-accent px-3 py-2 text-white"
            onClick={() => void addScheduleEntry()}
          >
            Legg til
          </button>
          <input
            className="rounded border px-3 py-2 md:col-span-5"
            value={scheduleNote}
            onChange={(e) => setScheduleNote(e.target.value)}
            placeholder="Notat (valgfritt)"
          />
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2">Ressurs</th>
                <th className="py-2">Start</th>
                <th className="py-2">Slutt</th>
                <th className="py-2">Status</th>
                <th className="py-2">Notat</th>
                <th className="py-2">Handling</th>
              </tr>
            </thead>
            <tbody>
              {scheduleEntries.map((entry) => (
                <tr key={entry.id} className="border-b">
                  <td className="py-2">
                    {entry.assigneeUser?.displayName ?? entry.assigneeTeam?.name ?? '-'}
                  </td>
                  <td className="py-2">{formatDate(entry.startAt)}</td>
                  <td className="py-2">{formatDate(entry.endAt)}</td>
                  <td className="py-2">{entry.status}</td>
                  <td className="py-2">{entry.note ?? '-'}</td>
                  <td className="py-2">
                    <button
                      className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                      onClick={() => void deleteScheduleEntry(entry.id)}
                    >
                      Slett
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Forbruksmateriell</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <select
            className="rounded border px-3 py-2 md:col-span-2"
            value={selectedConsumableId}
            onChange={(e) => setSelectedConsumableId(e.target.value)}
          >
            {consumableCatalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.barcode ?? item.id})
              </option>
            ))}
          </select>
          <input
            className="rounded border px-3 py-2"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            placeholder="Antall"
          />
          <button
            className="rounded bg-accent px-3 py-2 text-white"
            onClick={() => void addConsumable()}
            disabled={!selectedConsumableId}
          >
            Legg til
          </button>
          <input
            className="rounded border px-3 py-2 md:col-span-4"
            value={consumableNote}
            onChange={(e) => setConsumableNote(e.target.value)}
            placeholder="Notat (valgfritt)"
          />
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2">Materiell</th>
                <th className="py-2">Antall</th>
                <th className="py-2">Notat</th>
                <th className="py-2">Tid</th>
              </tr>
            </thead>
            <tbody>
              {consumables.map((entry) => (
                <tr key={entry.id} className="border-b">
                  <td className="py-2">{entry.equipmentItem?.name ?? entry.id}</td>
                  <td className="py-2">{entry.quantity}</td>
                  <td className="py-2">{entry.note ?? '-'}</td>
                  <td className="py-2">{formatDate(entry.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
