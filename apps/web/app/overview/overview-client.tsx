'use client';

import { widgetTypes } from '@portal/shared';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectionStatus } from '@/components/dev/connection-status';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';

type SectionResult<T> = { status: 'ok'; data: T } | { status: 'error'; message: string };

type WorkOrder = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  departmentId: string | null;
  locationId: string | null;
  projectId: string | null;
  assignments?: Assignment[];
};

type Assignment = {
  id: string;
  workOrderId: string;
  assigneeUserId: string | null;
  assigneeTeamId: string | null;
};

type EquipmentItem = { id: string; name: string; serialNumber: string | null; barcode: string | null; active: boolean };
type EquipmentReservation = {
  id: string;
  equipmentItemId: string;
  workOrderId: string;
  startAt: string;
  endAt: string;
  equipmentItem?: { id: string; name: string; serialNumber: string | null };
  workOrder?: { id: string; title: string; status: string };
};
type Timesheet = {
  id: string;
  userId: string;
  date: string;
  hours: string | number;
  activityType: string;
  workOrderId: string | null;
  projectId: string | null;
  note: string | null;
};
type WeeklySummary = { weekStart: string; totalHours: number; byActivityType: Record<string, number> };
type Todo = {
  id: string;
  userId: string | null;
  teamId: string | null;
  title: string;
  status: string;
  dueDate: string | null;
  description: string | null;
};
type DashboardData = {
  widgets: Array<{ id: string; type: string; title: string; config: Record<string, unknown> }>;
  layout: { id: string; columns: number; layout: Array<{ widgetInstanceId: string; x: number; y: number; w: number; h: number } | { widgetIndex: number; x: number; y: number; w: number; h: number }> } | null;
};
type Me = { user: { id: string; email: string; displayName: string; organizationId: string }; roles: string[] };
type DetailState = { title: string; payload: unknown } | null;

export type OverviewSections = {
  workOrders: SectionResult<{ items: WorkOrder[]; page: number; limit: number; total: number }>;
  equipmentItems: SectionResult<EquipmentItem[]>;
  reservations: SectionResult<{ items: EquipmentReservation[]; page: number; limit: number; total: number }>;
  timesheets: SectionResult<Timesheet[]>;
  weeklySummary: SectionResult<WeeklySummary>;
  todos: SectionResult<Todo[]>;
  dashboard: SectionResult<DashboardData>;
};

function formatDate(date: string | null | undefined) {
  if (!date) return 'Ingen';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleString('no-NO');
}

function toNumber(value: string | number) {
  return typeof value === 'number' ? value : Number(value);
}

function paginate<T>(items: T[], page: number, pageSize = 8) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return { pageItems: items.slice(start, start + pageSize), totalPages, page: safePage };
}

function getData<T>(section: SectionResult<T>, fallback: T): T {
  return section.status === 'ok' ? section.data : fallback;
}

function SectionShell({
  title,
  subtitle,
  kpis,
  children,
  error,
  onRefresh,
}: {
  title: string;
  subtitle: string;
  kpis: string[];
  children: React.ReactNode;
  error?: string;
  onRefresh: () => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
        <button className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50" onClick={onRefresh}>
          Refresh
        </button>
      </div>
      {error ? <div className="mb-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}
      <div className="mb-3 flex flex-wrap gap-2">
        {kpis.map((kpi) => (
          <span key={kpi} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {kpi}
          </span>
        ))}
      </div>
      {children}
    </section>
  );
}

function TablePager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (next: number) => void }) {
  return (
    <div className="mt-3 flex items-center gap-2 text-sm">
      <button className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Forrige
      </button>
      <span>
        Side {page} av {totalPages}
      </span>
      <button className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Neste
      </button>
    </div>
  );
}

export default function OverviewClient({ me, sections }: { me: Me; sections: OverviewSections }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<DetailState>(null);
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  const workOrders = getData(sections.workOrders, { items: [], page: 1, limit: 100, total: 0 }).items;
  const equipmentItems = getData(sections.equipmentItems, []);
  const reservations = getData(sections.reservations, { items: [], page: 1, limit: 200, total: 0 }).items;
  const timesheets = getData(sections.timesheets, []);
  const weekly = getData(sections.weeklySummary, { weekStart: '-', totalHours: 0, byActivityType: {} });
  const todos = getData(sections.todos, []);
  const dashboard = getData(sections.dashboard, { widgets: [], layout: null });
  const token = getDevToken();

  const [woSearch, setWoSearch] = useState('');
  const [woStatus, setWoStatus] = useState('ALL');
  const [woPage, setWoPage] = useState(1);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [itemSearch, setItemSearch] = useState('');
  const [itemPage, setItemPage] = useState(1);
  const [reservationSearch, setReservationSearch] = useState('');
  const [reservationEquipment, setReservationEquipment] = useState('ALL');
  const [reservationPage, setReservationPage] = useState(1);
  const [timesheetSearch, setTimesheetSearch] = useState('');
  const [timesheetPage, setTimesheetPage] = useState(1);
  const [todoSearch, setTodoSearch] = useState('');
  const [todoStatus, setTodoStatus] = useState('ALL');
  const [todoPage, setTodoPage] = useState(1);
  const [widgetSearch, setWidgetSearch] = useState('');
  const [widgetPage, setWidgetPage] = useState(1);
  const requestedEquipmentId = searchParams.get('equipmentId');

  useEffect(() => {
    if (!requestedEquipmentId) return;
    setItemSearch(requestedEquipmentId);
    setReservationEquipment(requestedEquipmentId);
    setItemPage(1);
    setReservationPage(1);
  }, [requestedEquipmentId]);

  const assignments = useMemo(
    () =>
      workOrders.flatMap((wo) =>
        (wo.assignments ?? []).map((assignment) => ({
          ...assignment,
          workOrderTitle: wo.title,
          status: wo.status,
          xorValid: Boolean(assignment.assigneeUserId) !== Boolean(assignment.assigneeTeamId),
        })),
      ),
    [workOrders],
  );

  const equipmentReservedNow = useMemo(() => {
    const now = new Date();
    return new Set(reservations.filter((r) => new Date(r.startAt) <= now && now <= new Date(r.endAt)).map((r) => r.equipmentItemId));
  }, [reservations]);

  const usersAndTeams = useMemo(() => {
    const teamIds = new Set<string>();
    todos.forEach((todo) => todo.teamId && teamIds.add(todo.teamId));
    assignments.forEach((assignment) => assignment.assigneeTeamId && teamIds.add(assignment.assigneeTeamId));
    return { roles: me.roles ?? [], teamIds: [...teamIds] };
  }, [assignments, me.roles, todos]);

  const filteredWorkOrders = useMemo(
    () =>
      workOrders.filter((wo) => {
        const statusMatch = woStatus === 'ALL' || wo.status === woStatus;
        const q = woSearch.trim().toLowerCase();
        const searchMatch = q.length === 0 || [wo.title, wo.description ?? '', wo.id].join(' ').toLowerCase().includes(q);
        return statusMatch && searchMatch;
      }),
    [woSearch, woStatus, workOrders],
  );
  const filteredAssignments = useMemo(() => {
    const q = assignmentSearch.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter((row) => [row.id, row.workOrderTitle, row.assigneeUserId ?? '', row.assigneeTeamId ?? ''].join(' ').toLowerCase().includes(q));
  }, [assignmentSearch, assignments]);
  const filteredEquipmentItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return equipmentItems;
    return equipmentItems.filter((item) => [item.id, item.name, item.serialNumber ?? '', item.barcode ?? ''].join(' ').toLowerCase().includes(q));
  }, [equipmentItems, itemSearch]);
  const filteredReservations = useMemo(
    () =>
      reservations.filter((row) => {
        const equipmentMatch = reservationEquipment === 'ALL' || row.equipmentItemId === reservationEquipment;
        const q = reservationSearch.trim().toLowerCase();
        const searchMatch = q.length === 0 || [row.id, row.equipmentItem?.name ?? '', row.workOrder?.title ?? '', row.equipmentItemId].join(' ').toLowerCase().includes(q);
        return equipmentMatch && searchMatch;
      }),
    [reservationEquipment, reservationSearch, reservations],
  );
  const filteredTimesheets = useMemo(() => {
    const q = timesheetSearch.trim().toLowerCase();
    if (!q) return timesheets;
    return timesheets.filter((row) => [row.id, row.activityType, row.workOrderId ?? '', row.projectId ?? '', row.note ?? ''].join(' ').toLowerCase().includes(q));
  }, [timesheetSearch, timesheets]);
  const filteredTodos = useMemo(
    () =>
      todos.filter((todo) => {
        const statusMatch = todoStatus === 'ALL' || todo.status === todoStatus;
        const q = todoSearch.trim().toLowerCase();
        const searchMatch = q.length === 0 || [todo.id, todo.title, todo.description ?? ''].join(' ').toLowerCase().includes(q);
        return statusMatch && searchMatch;
      }),
    [todoSearch, todoStatus, todos],
  );
  const widgetRows = useMemo(() => {
    const mine = dashboard.widgets ?? [];
    const rows = widgetTypes.map((type) => ({ type, mineCount: mine.filter((widget) => widget.type === type).length, instances: mine.filter((widget) => widget.type === type) }));
    const q = widgetSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.type.toLowerCase().includes(q));
  }, [dashboard.widgets, widgetSearch]);

  const woPaging = paginate(filteredWorkOrders, woPage);
  const assignmentPaging = paginate(filteredAssignments, assignmentPage);
  const itemPaging = paginate(filteredEquipmentItems, itemPage);
  const reservationPaging = paginate(filteredReservations, reservationPage);
  const timesheetPaging = paginate(filteredTimesheets, timesheetPage);
  const todoPaging = paginate(filteredTodos, todoPage);
  const widgetPaging = paginate(widgetRows, widgetPage);

  async function pinWidget(type: string, title: string, config: Record<string, unknown> = {}) {
    if (!token) {
      setPinMessage('Mangler token for pinning.');
      return;
    }

    try {
      const client = apiClient(token);
      const current = (await client.getDashboard()) as DashboardData;

      const duplicate = current.widgets.some(
        (widget) => widget.type === type && JSON.stringify(widget.config ?? {}) === JSON.stringify(config),
      );
      if (duplicate) {
        setPinMessage('Widget finnes allerede pa Min side.');
        return;
      }

      const newWidgetId = crypto.randomUUID();
      const widgets = [...current.widgets, { id: newWidgetId, type, title, config }];

      const existingLayoutRaw = Array.isArray(current.layout?.layout) ? current.layout?.layout : [];
      const existingLayout = existingLayoutRaw
        .map((entry) => {
          if ('widgetInstanceId' in entry && entry.widgetInstanceId) {
            return { ...entry, widgetInstanceId: entry.widgetInstanceId };
          }
          if ('widgetIndex' in entry) {
            const existingWidget = current.widgets.at(entry.widgetIndex);
            if (!existingWidget) return null;
            return { ...entry, widgetInstanceId: existingWidget.id };
          }
          return null;
        })
        .filter((entry): entry is { widgetInstanceId: string; x: number; y: number; w: number; h: number } => Boolean(entry));

      const maxY = existingLayout.reduce((max, entry) => Math.max(max, entry.y + entry.h), 0);
      const layout = {
        id: current.layout?.id ?? crypto.randomUUID(),
        columns: current.layout?.columns ?? 4,
        layout: [...existingLayout, { widgetInstanceId: newWidgetId, x: 0, y: maxY + 2, w: 2, h: 2 }],
      };

      await client.updateDashboard({ widgets, layout });
      setPinMessage('Lagt til pa Min side. Apne /dashboard for a se widgeten.');
      router.refresh();
    } catch (error) {
      setPinMessage(`Kunne ikke pinne widget: ${error instanceof Error ? error.message : 'ukjent feil'}`);
    }
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Oversikt (MVP)</h1>
          <p className="text-sm text-slate-600">One-page data explorer for testing av domene og widget-hypoteser.</p>
        </div>
        <ConnectionStatus />
      </div>
      {pinMessage ? <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{pinMessage}</div> : null}

      <SectionShell title="WorkOrders" subtitle="Status, nullable dimensjoner og assignments per ordre" kpis={[`Total: ${workOrders.length}`, `OPEN: ${workOrders.filter((w) => w.status === 'OPEN').length}`, `IN_PROGRESS: ${workOrders.filter((w) => w.status === 'IN_PROGRESS').length}`]} error={sections.workOrders.status === 'error' ? sections.workOrders.message : undefined} onRefresh={() => router.refresh()}>
        <div className="mb-2"><button className="rounded border px-3 py-1 text-xs" onClick={() => void pinWidget('MY_WORKORDERS', 'Mine arbeidsordre', { source: 'overview.workorders' })}>Legg til pa Min side</button></div>
        <div className="mb-2 grid gap-2 md:grid-cols-3">
          <input className="rounded border px-3 py-2 text-sm" placeholder="Sok pa tittel/id" value={woSearch} onChange={(e) => { setWoSearch(e.target.value); setWoPage(1); }} />
          <select className="rounded border px-3 py-2 text-sm" value={woStatus} onChange={(e) => { setWoStatus(e.target.value); setWoPage(1); }}>
            <option value="ALL">Alle statuser</option><option value="OPEN">OPEN</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="DONE">DONE</option><option value="BLOCKED">BLOCKED</option><option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-600"><th className="py-2">Tittel</th><th className="py-2">Status</th><th className="py-2">Dept/Loc/Project</th><th className="py-2">Detaljer</th></tr></thead><tbody>{woPaging.pageItems.map((row) => (<tr key={row.id} className="border-b"><td className="py-2">{row.title}</td><td className="py-2">{row.status}</td><td className="py-2 text-xs">{row.departmentId ?? 'null'} / {row.locationId ?? 'null'} / {row.projectId ?? 'null'}</td><td className="py-2"><button className="rounded border px-2 py-1 text-xs" onClick={() => setDetail({ title: 'WorkOrder', payload: row })}>Inspect</button></td></tr>))}</tbody></table></div>
        <TablePager page={woPaging.page} totalPages={woPaging.totalPages} onPage={setWoPage} />
      </SectionShell>

      <SectionShell title="Assignments" subtitle="XOR validering: enten team eller user" kpis={[`Total: ${assignments.length}`, `User: ${assignments.filter((a) => a.assigneeUserId).length}`, `Team: ${assignments.filter((a) => a.assigneeTeamId).length}`, `XOR ok: ${assignments.filter((a) => a.xorValid).length}`]} error={sections.workOrders.status === 'error' ? 'Assignments utilgjengelig fordi workorders feilet.' : undefined} onRefresh={() => router.refresh()}>
        <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Sok pa assignment/workorder/team/user" value={assignmentSearch} onChange={(e) => { setAssignmentSearch(e.target.value); setAssignmentPage(1); }} />
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-600"><th className="py-2">WorkOrder</th><th className="py-2">User</th><th className="py-2">Team</th><th className="py-2">XOR</th><th className="py-2">Detaljer</th></tr></thead><tbody>{assignmentPaging.pageItems.map((row) => (<tr key={row.id} className="border-b"><td className="py-2">{row.workOrderTitle}</td><td className="py-2 text-xs">{row.assigneeUserId ?? '-'}</td><td className="py-2 text-xs">{row.assigneeTeamId ?? '-'}</td><td className="py-2">{row.xorValid ? 'OK' : 'INVALID'}</td><td className="py-2"><button className="rounded border px-2 py-1 text-xs" onClick={() => setDetail({ title: 'Assignment', payload: row })}>Inspect</button></td></tr>))}</tbody></table></div>
        <TablePager page={assignmentPaging.page} totalPages={assignmentPaging.totalPages} onPage={setAssignmentPage} />
      </SectionShell>

      <SectionShell title="EquipmentReservations" subtitle="Tidspunkt + overlap/context per utstyr" kpis={[`Total: ${reservations.length}`, `Neste 7 dager: ${reservations.filter((r) => new Date(r.startAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length}`, `Utstyr med bookinger: ${new Set(reservations.map((r) => r.equipmentItemId)).size}`]} error={sections.reservations.status === 'error' ? sections.reservations.message : undefined} onRefresh={() => router.refresh()}>
        <div className="mb-2"><button className="rounded border px-3 py-1 text-xs" onClick={() => void pinWidget('BOOKINGS', 'Bookinger', { source: 'overview.reservations' })}>Legg til pa Min side</button></div>
        <div className="mb-2 grid gap-2 md:grid-cols-3">
          <input className="rounded border px-3 py-2 text-sm" placeholder="Sok pa utstyr/workorder" value={reservationSearch} onChange={(e) => { setReservationSearch(e.target.value); setReservationPage(1); }} />
          <select className="rounded border px-3 py-2 text-sm" value={reservationEquipment} onChange={(e) => { setReservationEquipment(e.target.value); setReservationPage(1); }}>
            <option value="ALL">Alt utstyr</option>{equipmentItems.map((item) => (<option key={item.id} value={item.id}>{item.name}</option>))}
          </select>
        </div>
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-600"><th className="py-2">Utstyr</th><th className="py-2">WorkOrder</th><th className="py-2">Start</th><th className="py-2">Slutt</th><th className="py-2">Detaljer</th></tr></thead><tbody>{reservationPaging.pageItems.map((row) => (<tr key={row.id} className="border-b"><td className="py-2">{row.equipmentItem?.name ?? row.equipmentItemId}</td><td className="py-2">{row.workOrder?.title ?? row.workOrderId}</td><td className="py-2 text-xs">{formatDate(row.startAt)}</td><td className="py-2 text-xs">{formatDate(row.endAt)}</td><td className="py-2"><button className="rounded border px-2 py-1 text-xs" onClick={() => setDetail({ title: 'EquipmentReservation', payload: row })}>Inspect</button></td></tr>))}</tbody></table></div>
        <TablePager page={reservationPaging.page} totalPages={reservationPaging.totalPages} onPage={setReservationPage} />
      </SectionShell>

      <SectionShell title="EquipmentItems" subtitle="Tilgjengelighet basert pa aktive reservasjoner" kpis={[`Total: ${equipmentItems.length}`, `Tilgjengelig na: ${equipmentItems.filter((item) => !equipmentReservedNow.has(item.id)).length}`, `Booket na: ${equipmentItems.filter((item) => equipmentReservedNow.has(item.id)).length}`]} error={sections.equipmentItems.status === 'error' ? sections.equipmentItems.message : undefined} onRefresh={() => router.refresh()}>
        <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Sok pa utstyr" value={itemSearch} onChange={(e) => { setItemSearch(e.target.value); setItemPage(1); }} />
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-600"><th className="py-2">Navn</th><th className="py-2">Serial</th><th className="py-2">Barcode</th><th className="py-2">Status</th><th className="py-2">Detaljer</th></tr></thead><tbody>{itemPaging.pageItems.map((row) => (<tr key={row.id} className={`border-b ${requestedEquipmentId === row.id ? 'bg-amber-50' : ''}`}><td className="py-2">{row.name}</td><td className="py-2">{row.serialNumber ?? '-'}</td><td className="py-2 text-xs">{row.barcode ?? '-'}</td><td className="py-2">{equipmentReservedNow.has(row.id) ? 'Booket' : 'Ledig'}</td><td className="py-2"><button className="rounded border px-2 py-1 text-xs" onClick={() => setDetail({ title: 'EquipmentItem', payload: row })}>Inspect</button></td></tr>))}</tbody></table></div>
        <TablePager page={itemPaging.page} totalPages={itemPaging.totalPages} onPage={setItemPage} />
      </SectionShell>

      <SectionShell title="Users/Teams" subtitle="Roller fra /me + team IDs observert i data" kpis={[`Bruker: ${me.user.displayName}`, `Roller: ${usersAndTeams.roles.length}`, `Team IDs: ${usersAndTeams.teamIds.length}`]} onRefresh={() => router.refresh()}>
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded border border-slate-200 p-3 text-sm"><h3 className="mb-2 font-medium">Current User</h3><p>{me.user.displayName}</p><p className="text-xs text-slate-600">{me.user.email}</p><div className="mt-2 flex flex-wrap gap-1">{usersAndTeams.roles.map((role) => (<span key={role} className="rounded bg-slate-100 px-2 py-1 text-xs">{role}</span>))}</div></article>
          <article className="rounded border border-slate-200 p-3 text-sm"><h3 className="mb-2 font-medium">Team Membership (IDs)</h3><ul className="space-y-1 text-xs text-slate-700">{usersAndTeams.teamIds.length === 0 ? <li>Ingen funnet i lastede data.</li> : null}{usersAndTeams.teamIds.map((teamId) => (<li key={teamId}>{teamId}</li>))}</ul></article>
        </div>
      </SectionShell>

      <SectionShell title="Timesheets" subtitle="Daglige entries + ukesummering" kpis={[`Entries: ${timesheets.length}`, `Uke-start: ${weekly.weekStart}`, `Timer uke: ${weekly.totalHours}`, `Nullable links: ${timesheets.filter((t) => t.workOrderId === null || t.projectId === null).length}`]} error={sections.timesheets.status === 'error' ? sections.timesheets.message : sections.weeklySummary.status === 'error' ? sections.weeklySummary.message : undefined} onRefresh={() => router.refresh()}>
        <div className="mb-2"><button className="rounded border px-3 py-1 text-xs" onClick={() => void pinWidget('HOURS_THIS_WEEK', 'Timer denne uken', { source: 'overview.weekly-summary' })}>Legg til pa Min side</button></div>
        <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Sok pa activity/workorder/project" value={timesheetSearch} onChange={(e) => { setTimesheetSearch(e.target.value); setTimesheetPage(1); }} />
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-600"><th className="py-2">Dato</th><th className="py-2">Timer</th><th className="py-2">Type</th><th className="py-2">WO/Project</th><th className="py-2">Detaljer</th></tr></thead><tbody>{timesheetPaging.pageItems.map((row) => (<tr key={row.id} className="border-b"><td className="py-2">{formatDate(row.date)}</td><td className="py-2">{toNumber(row.hours)}</td><td className="py-2">{row.activityType}</td><td className="py-2 text-xs">{row.workOrderId ?? 'null'} / {row.projectId ?? 'null'}</td><td className="py-2"><button className="rounded border px-2 py-1 text-xs" onClick={() => setDetail({ title: 'Timesheet', payload: row })}>Inspect</button></td></tr>))}</tbody></table></div>
        <TablePager page={timesheetPaging.page} totalPages={timesheetPaging.totalPages} onPage={setTimesheetPage} />
      </SectionShell>

      <SectionShell title="Todos" subtitle="Mine/team med status og forfallsdato" kpis={[`Total: ${todos.length}`, `OPEN: ${todos.filter((t) => t.status === 'OPEN').length}`, `Team: ${todos.filter((t) => t.teamId).length}`, `Mine: ${todos.filter((t) => t.userId === me.user.id).length}`]} error={sections.todos.status === 'error' ? sections.todos.message : undefined} onRefresh={() => router.refresh()}>
        <div className="mb-2"><button className="rounded border px-3 py-1 text-xs" onClick={() => void pinWidget('TODO', 'Todo', { source: 'overview.todos' })}>Legg til pa Min side</button></div>
        <div className="mb-2 grid gap-2 md:grid-cols-3">
          <input className="rounded border px-3 py-2 text-sm" placeholder="Sok pa todo" value={todoSearch} onChange={(e) => { setTodoSearch(e.target.value); setTodoPage(1); }} />
          <select className="rounded border px-3 py-2 text-sm" value={todoStatus} onChange={(e) => { setTodoStatus(e.target.value); setTodoPage(1); }}>
            <option value="ALL">Alle statuser</option><option value="OPEN">OPEN</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="DONE">DONE</option><option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-600"><th className="py-2">Tittel</th><th className="py-2">Status</th><th className="py-2">Forfall</th><th className="py-2">Scope</th><th className="py-2">Detaljer</th></tr></thead><tbody>{todoPaging.pageItems.map((row) => (<tr key={row.id} className="border-b"><td className="py-2">{row.title}</td><td className="py-2">{row.status}</td><td className="py-2 text-xs">{formatDate(row.dueDate)}</td><td className="py-2 text-xs">{row.userId ? 'User' : row.teamId ? 'Team' : 'Global'}</td><td className="py-2"><button className="rounded border px-2 py-1 text-xs" onClick={() => setDetail({ title: 'Todo', payload: row })}>Inspect</button></td></tr>))}</tbody></table></div>
        <TablePager page={todoPaging.page} totalPages={todoPaging.totalPages} onPage={setTodoPage} />
      </SectionShell>

      <SectionShell title="Dashboard Widgets" subtitle="Tilgjengelige widget-typer + mine instanser/config" kpis={[`Typer: ${widgetTypes.length}`, `Mine widgets: ${dashboard.widgets.length}`, `Layout columns: ${dashboard.layout?.columns ?? 0}`]} error={sections.dashboard.status === 'error' ? sections.dashboard.message : undefined} onRefresh={() => router.refresh()}>
        <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Sok pa widget type" value={widgetSearch} onChange={(e) => { setWidgetSearch(e.target.value); setWidgetPage(1); }} />
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-600"><th className="py-2">Type</th><th className="py-2">Mine instanser</th><th className="py-2">Detaljer</th></tr></thead><tbody>{widgetPaging.pageItems.map((row) => (<tr key={row.type} className="border-b"><td className="py-2">{row.type}</td><td className="py-2">{row.mineCount}</td><td className="py-2"><button className="rounded border px-2 py-1 text-xs" onClick={() => setDetail({ title: 'WidgetType', payload: row })}>Inspect</button></td></tr>))}</tbody></table></div>
        <TablePager page={widgetPaging.page} totalPages={widgetPaging.totalPages} onPage={setWidgetPage} />
      </SectionShell>

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Inspect: {detail.title}</h3>
              <button className="rounded border border-slate-300 px-2 py-1 text-sm" onClick={() => setDetail(null)}>
                Lukk
              </button>
            </div>
            <pre className="overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(detail.payload, null, 2)}</pre>
          </div>
        </div>
      ) : null}
    </main>
  );
}
