'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';
import { ConnectionStatus } from '@/components/dev/connection-status';

type WorkOrder = {
  id: string;
  title: string;
  status: string;
};

type EquipmentItem = {
  id: string;
  name: string;
  serialNumber: string | null;
  type: 'EQUIPMENT' | 'CONSUMABLE';
};

type DevUser = {
  id: string;
  displayName: string;
  email: string;
  roles: string[];
};

type ScheduleEvent = {
  id: string;
  type: 'workorder_schedule' | 'equipment_reservation';
  title: string;
  start: string;
  end: string;
  status?: string | null;
  note?: string | null;
  resourceRef?: { kind: 'user' | 'team' | 'equipment'; id: string; label?: string | null } | null;
  workOrderRef?: { id: string; title: string; status: string } | null;
};

type ViewMode = 'LIST' | 'CALENDAR';
type ResourceMode = 'MANNSKAP' | 'UTSTYR';

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

function toIso(localDateTime: string) {
  const date = new Date(localDateTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('no-NO');
}

function getWeekBounds(anchorDate: string) {
  const anchor = new Date(`${anchorDate}T00:00:00`);
  const day = anchor.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(anchor);
  start.setDate(anchor.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

function todayDateInputValue() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function PlannerPage() {
  const searchParams = useSearchParams();
  const token = getDevToken();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [users, setUsers] = useState<DevUser[]>([]);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [equipmentItemId, setEquipmentItemId] = useState('');
  const [reserveStart, setReserveStart] = useState('');
  const [reserveEnd, setReserveEnd] = useState('');

  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(todayDateInputValue());
  const [resourceMode, setResourceMode] = useState<ResourceMode>('MANNSKAP');
  const [selectedUserFilterId, setSelectedUserFilterId] = useState('ALL');
  const [selectedEquipmentFilterId, setSelectedEquipmentFilterId] = useState('ALL');
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedWorkOrder = useMemo(
    () => workOrders.find((wo) => wo.id === selectedWorkOrderId) ?? null,
    [selectedWorkOrderId, workOrders],
  );

  const filteredScheduleEvents = useMemo(() => {
    return scheduleEvents.filter((event) => {
      if (resourceMode === 'MANNSKAP') {
        if (event.type !== 'workorder_schedule') return false;
        if (selectedUserFilterId === 'ALL') return true;
        return event.resourceRef?.kind === 'user' && event.resourceRef.id === selectedUserFilterId;
      }

      if (event.type !== 'equipment_reservation') return false;
      if (selectedEquipmentFilterId === 'ALL') return true;
      return event.resourceRef?.kind === 'equipment' && event.resourceRef.id === selectedEquipmentFilterId;
    });
  }, [resourceMode, scheduleEvents, selectedEquipmentFilterId, selectedUserFilterId]);

  async function loadSchedule() {
    if (!token) return;
    try {
      const { start, end } = getWeekBounds(calendarAnchorDate);
      const query: {
        from: string;
        to: string;
        scope?: 'mine' | 'all';
        assigneeUserId?: string;
        equipmentItemId?: string;
      } = {
        from: start,
        to: end,
        scope: 'all',
      };

      if (resourceMode === 'MANNSKAP' && selectedUserFilterId !== 'ALL') {
        query.assigneeUserId = selectedUserFilterId;
      }
      if (resourceMode === 'UTSTYR' && selectedEquipmentFilterId !== 'ALL') {
        query.equipmentItemId = selectedEquipmentFilterId;
      }

      try {
        const events = await apiClient(token).listSchedule(query);
        setScheduleEvents(events as ScheduleEvent[]);
      } catch (err) {
        if (err instanceof Error && err.message.includes('HTTP 403')) {
          const mineEvents = await apiClient(token).listSchedule({ ...query, scope: 'mine' });
          setScheduleEvents(mineEvents as ScheduleEvent[]);
        } else {
          throw err;
        }
      }
    } catch (err) {
      setError(toErrorMessage(err, 'Kunne ikke hente kalenderdata.'));
    }
  }

  async function load() {
    if (!token) {
      setError('Mangler NEXT_PUBLIC_DEV_TOKEN i apps/web/.env.local');
      return;
    }

    setLoading(true);
    try {
      const [workOrderRes, userRes, equipmentRes] = await Promise.all([
        apiClient(token).listWorkOrders('page=1&limit=100'),
        apiClient(token).listDevUsers(),
        apiClient(token).listEquipment('type=EQUIPMENT'),
      ]);

      const woItems = workOrderRes.items as WorkOrder[];
      const userItems = userRes as DevUser[];
      const equipment = equipmentRes as EquipmentItem[];

      setWorkOrders(woItems);
      setUsers(userItems);
      setEquipmentItems(equipment);

      if (!selectedWorkOrderId && woItems.length > 0) {
        const firstWorkOrder = woItems.at(0);
        if (firstWorkOrder) setSelectedWorkOrderId(firstWorkOrder.id);
      }
      if (!assigneeUserId && userItems.length > 0) {
        const firstUser = userItems.at(0);
        if (firstUser) setAssigneeUserId(firstUser.id);
      }
      if (!equipmentItemId && equipment.length > 0) {
        const firstEquipment = equipment.at(0);
        if (firstEquipment) setEquipmentItemId(firstEquipment.id);
      }
      if (selectedUserFilterId === 'ALL' && userItems.length > 0) {
        setSelectedUserFilterId('ALL');
      }
      if (selectedEquipmentFilterId === 'ALL' && equipment.length > 0) {
        setSelectedEquipmentFilterId('ALL');
      }

      await loadSchedule();
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err, 'Kunne ikke hente planner-data.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const requestedEquipmentItemId = searchParams.get('equipmentItemId');
    if (requestedEquipmentItemId) {
      setEquipmentItemId(requestedEquipmentItemId);
    }
  }, [searchParams]);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (viewMode === 'CALENDAR') {
      void loadSchedule();
    }
  }, [calendarAnchorDate, resourceMode, selectedEquipmentFilterId, selectedUserFilterId, viewMode]);

  async function createWorkOrder() {
    if (!title || !token) return;
    try {
      const created = await apiClient(token).createWorkOrder({ title, description });
      setTitle('');
      setDescription('');
      setSuccess(`Opprettet arbeidsordre: ${created.title}`);
      await load();
      setSelectedWorkOrderId(created.id);
      setError(null);
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke opprette arbeidsordre.'));
    }
  }

  async function assignUser() {
    if (!selectedWorkOrderId || !assigneeUserId || !token) return;
    try {
      await apiClient(token).assignWorkOrder(selectedWorkOrderId, { assigneeUserId });
      setSuccess('Arbeidsordre ble tildelt bruker.');
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke tildele arbeidsordre.'));
    }
  }

  async function reserveEquipment() {
    if (!selectedWorkOrderId || !equipmentItemId || !reserveStart || !reserveEnd || !token) return;

    const startIso = toIso(reserveStart);
    const endIso = toIso(reserveEnd);
    if (!startIso || !endIso) {
      setSuccess(null);
      setError('Start/slutt har ugyldig datoformat.');
      return;
    }

    try {
      await apiClient(token).reserveEquipment({
        workOrderId: selectedWorkOrderId,
        equipmentItemId,
        startAt: startIso,
        endAt: endIso,
      });
      setSuccess('Utstyr ble booket.');
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke booke utstyr.'));
    }
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Planner</h1>
        <ConnectionStatus />
      </div>

      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}
      {success ? <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</div> : null}

      <section className="rounded border bg-white p-4">
        <div className="mb-3 flex gap-2">
          <button
            className={`rounded px-3 py-2 text-sm ${viewMode === 'LIST' ? 'bg-accent text-white' : 'border hover:bg-slate-50'}`}
            onClick={() => setViewMode('LIST')}
          >
            Liste
          </button>
          <button
            className={`rounded px-3 py-2 text-sm ${viewMode === 'CALENDAR' ? 'bg-accent text-white' : 'border hover:bg-slate-50'}`}
            onClick={() => setViewMode('CALENDAR')}
          >
            Kalender
          </button>
        </div>

        {viewMode === 'CALENDAR' ? (
          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-4">
              <input
                className="rounded border px-3 py-2"
                type="date"
                value={calendarAnchorDate}
                onChange={(e) => setCalendarAnchorDate(e.target.value)}
              />
              <select className="rounded border px-3 py-2" value={resourceMode} onChange={(e) => setResourceMode(e.target.value as ResourceMode)}>
                <option value="MANNSKAP">Mannskap</option>
                <option value="UTSTYR">Utstyr</option>
              </select>
              {resourceMode === 'MANNSKAP' ? (
                <select className="rounded border px-3 py-2 md:col-span-2" value={selectedUserFilterId} onChange={(e) => setSelectedUserFilterId(e.target.value)}>
                  <option value="ALL">Alle brukere</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              ) : (
                <select className="rounded border px-3 py-2 md:col-span-2" value={selectedEquipmentFilterId} onChange={(e) => setSelectedEquipmentFilterId(e.target.value)}>
                  <option value="ALL">Alt utstyr</option>
                  {equipmentItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.serialNumber ?? item.id})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              {filteredScheduleEvents.map((event) => (
                <div key={event.id} className="rounded border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <strong>{event.title}</strong>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{event.type}</span>
                  </div>
                  <div className="text-slate-600">
                    {formatDate(event.start)} - {formatDate(event.end)}
                  </div>
                  {event.resourceRef ? <div className="text-slate-600">Ressurs: {event.resourceRef.label ?? event.resourceRef.id}</div> : null}
                  {event.workOrderRef ? (
                    <div className="text-slate-600">
                      Arbeidsordre:{' '}
                      <Link className="underline" href={`/workorders/${event.workOrderRef.id}`}>
                        {event.workOrderRef.title}
                      </Link>{' '}
                      ({event.workOrderRef.status})
                    </div>
                  ) : null}
                </div>
              ))}
              {filteredScheduleEvents.length === 0 ? <p className="text-sm text-slate-500">Ingen hendelser i valgt intervall/filter.</p> : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Listevisning under brukes for oppretting, tildeling og booking.</p>
        )}
      </section>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Opprett arbeidsordre</h2>
        <div className="space-y-2">
          <input
            className="w-full rounded border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tittel"
          />
          <textarea
            className="w-full rounded border px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beskrivelse"
            rows={3}
          />
          <button className="rounded bg-accent px-3 py-2 text-white disabled:opacity-40" onClick={createWorkOrder} disabled={!title || loading}>
            Opprett
          </button>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Tildel person</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <select className="rounded border px-3 py-2" value={selectedWorkOrderId} onChange={(e) => setSelectedWorkOrderId(e.target.value)}>
            {workOrders.map((wo) => (
              <option key={wo.id} value={wo.id}>
                {wo.title} ({wo.status})
              </option>
            ))}
          </select>

          <select className="rounded border px-3 py-2" value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName} ({user.roles.join(', ') || 'no-role'})
              </option>
            ))}
          </select>

          <button className="rounded bg-accent px-3 py-2 text-white disabled:opacity-40" onClick={assignUser} disabled={!selectedWorkOrderId || !assigneeUserId || loading}>
            Tildel
          </button>
        </div>
        {selectedWorkOrder ? <p className="mt-2 text-xs text-slate-600">Valgt arbeidsordre: {selectedWorkOrder.title}</p> : null}
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Book utstyr</h2>
        <div className="grid gap-2 md:grid-cols-5">
          <select className="rounded border px-3 py-2" value={selectedWorkOrderId} onChange={(e) => setSelectedWorkOrderId(e.target.value)}>
            {workOrders.map((wo) => (
              <option key={wo.id} value={wo.id}>
                {wo.title} ({wo.status})
              </option>
            ))}
          </select>

          <select className="rounded border px-3 py-2" value={equipmentItemId} onChange={(e) => setEquipmentItemId(e.target.value)}>
            {equipmentItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.serialNumber ?? item.id})
              </option>
            ))}
          </select>

          <input
            className="rounded border px-3 py-2"
            type="datetime-local"
            value={reserveStart}
            onChange={(e) => setReserveStart(e.target.value)}
          />
          <input
            className="rounded border px-3 py-2"
            type="datetime-local"
            value={reserveEnd}
            onChange={(e) => setReserveEnd(e.target.value)}
          />

          <button
            className="rounded bg-accent px-3 py-2 text-white disabled:opacity-40"
            onClick={reserveEquipment}
            disabled={!selectedWorkOrderId || !equipmentItemId || !reserveStart || !reserveEnd || loading}
          >
            Book
          </button>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Arbeidsordre</h2>
        <ul className="space-y-2">
          {workOrders.map((item) => (
            <li key={item.id} className="rounded border p-2">
              <strong>{item.title}</strong>
              <div className="text-sm text-gray-600">Status: {item.status}</div>
              <Link className="mt-1 inline-block rounded border px-2 py-1 text-xs hover:bg-slate-50" href={`/workorders/${item.id}`}>
                Apne
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
