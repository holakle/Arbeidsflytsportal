'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';
import { ConnectionStatus } from '@/components/dev/connection-status';

type WorkOrder = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  customerName?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  addressLine1?: string | null;
  postalCode?: string | null;
  city?: string | null;
  accessNotes?: string | null;
  hmsNotes?: string | null;
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

type AttachmentEntry = {
  id: string;
  kind: string;
  mimeType: string;
  size: number;
  storageKey: string;
  createdAt: string;
};

type FinishWorkOrderResponse = {
  session?: {
    startedAt?: string;
    endedAt?: string | null;
  };
  timesheetDraftId?: string | null;
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

function formatDurationHoursMinutes(startAt?: string, endAt?: string | null) {
  if (!startAt || !endAt) return null;
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;

  const totalMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

const statuses = [
  'DRAFT',
  'READY_FOR_PLANNING',
  'PLANNED',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'CANCELLED',
];

export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const token = getDevToken();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('READY_FOR_PLANNING');
  const [departmentId, setDepartmentId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [hmsNotes, setHmsNotes] = useState('');
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
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [deletingWorkOrder, setDeletingWorkOrder] = useState(false);

  const planningOwnerLabel = useMemo(
    () => users.find((u) => u.id === planningOwnerUserId)?.displayName ?? '-',
    [planningOwnerUserId, users],
  );

  async function load() {
    if (!token || !id) return;
    try {
      const [woRes, consumableRes, catalogRes, userRes, scheduleRes, attachmentRes] = await Promise.all([
        apiClient(token).getWorkOrder(id),
        apiClient(token).listWorkOrderConsumables(id),
        apiClient(token).listEquipment('type=CONSUMABLE'),
        apiClient(token).listDevUsers(),
        apiClient(token).listWorkOrderSchedule(id),
        apiClient(token).listWorkOrderAttachments(id),
      ]);

      const wo = woRes as WorkOrder;
      const devUsers = userRes as DevUser[];
      const entries = scheduleRes as WorkOrderScheduleEntry[];

      setWorkOrder(wo);
      setTitle(wo.title ?? '');
      setDescription(wo.description ?? '');
      setStatus(wo.status ?? 'READY_FOR_PLANNING');
      setDepartmentId(wo.departmentId ?? '');
      setLocationId(wo.locationId ?? '');
      setProjectId(wo.projectId ?? '');
      setCustomerName(wo.customerName ?? '');
      setContactName(wo.contactName ?? '');
      setContactPhone(wo.contactPhone ?? '');
      setAddressLine1(wo.addressLine1 ?? '');
      setPostalCode(wo.postalCode ?? '');
      setCity(wo.city ?? '');
      setAccessNotes(wo.accessNotes ?? '');
      setHmsNotes(wo.hmsNotes ?? '');
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
      setAttachments(attachmentRes as AttachmentEntry[]);
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
        description: description.trim() ? description : undefined,
        status,
        customerName: customerName.trim() ? customerName : undefined,
        contactName: contactName.trim() ? contactName : undefined,
        contactPhone: contactPhone.trim() ? contactPhone : undefined,
        addressLine1: addressLine1.trim() ? addressLine1 : undefined,
        postalCode: postalCode.trim() ? postalCode : undefined,
        city: city.trim() ? city : undefined,
        accessNotes: accessNotes.trim() ? accessNotes : undefined,
        hmsNotes: hmsNotes.trim() ? hmsNotes : undefined,
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

  async function startSession() {
    if (!token || !id) return;
    try {
      await apiClient(token).startWorkOrder(id);
      setSessionStatus('ArbeidsÃ¸kt startet');
      await load();
    } catch (err) {
      setSessionStatus(null);
      setError(toErrorMessage(err, 'Kunne ikke starte arbeidsÃ¸kt.'));
    }
  }

  async function pauseSession() {
    if (!token || !id) return;
    try {
      await apiClient(token).pauseWorkOrder(id);
      setSessionStatus('ArbeidsÃ¸kt satt pÃ¥ pause');
      await load();
    } catch (err) {
      setSessionStatus(null);
      setError(toErrorMessage(err, 'Kunne ikke pause arbeidsÃ¸kt.'));
    }
  }

  async function finishSession() {
    if (!token || !id) return;
    try {
      const res = (await apiClient(token).finishWorkOrder(id)) as FinishWorkOrderResponse;
      const duration = formatDurationHoursMinutes(res?.session?.startedAt, res?.session?.endedAt);
      setSessionStatus(
        duration ? `ArbeidsÃ¸kt avsluttet. Registrert tid: ${duration}` : 'ArbeidsÃ¸kt avsluttet',
      );
      await load();
    } catch (err) {
      setSessionStatus(null);
      setError(toErrorMessage(err, 'Kunne ikke avslutte arbeidsÃ¸kt.'));
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

  async function removeWorkOrder() {
    if (!token || !id || deletingWorkOrder) return;
    const ok = window.confirm('Er du sikker pÃ¥ at du vil slette denne arbeidsordren?');
    if (!ok) return;

    setDeletingWorkOrder(true);
    try {
      await apiClient(token).deleteWorkOrder(id);
      router.push('/workorders');
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke slette arbeidsordre.'));
    } finally {
      setDeletingWorkOrder(false);
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
        <button
          className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
          onClick={() => void removeWorkOrder()}
          disabled={deletingWorkOrder || !workOrder}
        >
          {deletingWorkOrder ? 'Sletter...' : 'Slett arbeidsordre'}
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
          <input
            className="rounded border px-3 py-2"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Kunde"
          />
          <input
            className="rounded border px-3 py-2"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Kontaktperson"
          />
          <input
            className="rounded border px-3 py-2"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="Kontakttelefon"
          />
          <input
            className="rounded border px-3 py-2"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            placeholder="Adresse"
          />
          <input
            className="rounded border px-3 py-2"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="Postnummer"
          />
          <input
            className="rounded border px-3 py-2"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="By"
          />
          <input
            className="rounded border px-3 py-2 md:col-span-2"
            value={accessNotes}
            onChange={(e) => setAccessNotes(e.target.value)}
            placeholder="Tilkomstnotat"
          />
          <input
            className="rounded border px-3 py-2 md:col-span-2"
            value={hmsNotes}
            onChange={(e) => setHmsNotes(e.target.value)}
            placeholder="HMS-notat"
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
        <h2 className="mb-2 text-lg">Vedlegg</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2">Type</th>
                <th className="py-2">Mime</th>
                <th className="py-2">StÃ¸rrelse</th>
                <th className="py-2">LagringsnÃ¸kkel</th>
                <th className="py-2">Tid</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((entry) => (
                <tr key={entry.id} className="border-b">
                  <td className="py-2">{entry.kind}</td>
                  <td className="py-2">{entry.mimeType}</td>
                  <td className="py-2">{entry.size}</td>
                  <td className="py-2">{entry.storageKey}</td>
                  <td className="py-2">{formatDate(entry.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">ArbeidsÃ¸kt</h2>
        <div className="flex gap-2">
          <button className="rounded bg-accent px-3 py-2 text-white" onClick={() => void startSession()}>
            Start
          </button>
          <button className="rounded bg-slate-700 px-3 py-2 text-white" onClick={() => void pauseSession()}>
            Pause
          </button>
          <button className="rounded bg-emerald-700 px-3 py-2 text-white" onClick={() => void finishSession()}>
            Ferdig
          </button>
        </div>
        {sessionStatus ? <p className="mt-2 text-sm text-emerald-700">{sessionStatus}</p> : null}
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
