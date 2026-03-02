'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';
import { ConnectionStatus } from '@/components/dev/connection-status';

type WidgetType = 'MY_WORKORDERS' | 'BOOKINGS' | 'HOURS_THIS_WEEK' | 'TODO';

type DashboardWidget = {
  id: string;
  type: WidgetType;
  title: string;
  config: Record<string, unknown>;
};

type DashboardResponse = {
  widgets: DashboardWidget[];
  layout: { id: string; columns: number; layout: unknown[] } | null;
};

type WorkOrder = { id: string; title: string; status: string };
type Reservation = { id: string; startAt: string; endAt: string; equipmentItem?: { name: string | null }; workOrder?: { title: string | null } };
type Todo = { id: string; title: string; status: string; dueDate: string | null };
type WeeklySummary = { weekStart: string; totalHours: number; byActivityType: Record<string, number> };

type WidgetData = {
  myWorkOrders: WorkOrder[];
  bookings: Reservation[];
  weeklySummary: WeeklySummary | null;
  todos: Todo[];
};

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('no-NO');
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

function WidgetRenderer({ widget, data }: { widget: DashboardWidget; data: WidgetData }) {
  switch (widget.type) {
    case 'MY_WORKORDERS':
      return (
        <div className="space-y-1 text-sm">
          {data.myWorkOrders.slice(0, 6).map((wo) => (
            <div key={wo.id} className="rounded border p-2">
              <div className="font-medium">{wo.title}</div>
              <div className="text-xs text-slate-600">{wo.status}</div>
            </div>
          ))}
          {data.myWorkOrders.length === 0 ? <div className="text-xs text-slate-500">Ingen arbeidsordre funnet.</div> : null}
        </div>
      );

    case 'BOOKINGS':
      return (
        <div className="space-y-1 text-sm">
          {data.bookings.slice(0, 6).map((booking) => (
            <div key={booking.id} className="rounded border p-2">
              <div className="font-medium">{booking.equipmentItem?.name ?? 'Ukjent utstyr'}</div>
              <div className="text-xs text-slate-600">{booking.workOrder?.title ?? 'Ukjent workorder'}</div>
              <div className="text-xs text-slate-600">{formatDate(booking.startAt)} - {formatDate(booking.endAt)}</div>
            </div>
          ))}
          {data.bookings.length === 0 ? <div className="text-xs text-slate-500">Ingen bookinger funnet.</div> : null}
        </div>
      );

    case 'HOURS_THIS_WEEK':
      return (
        <div className="space-y-1 text-sm">
          <div className="rounded border p-2">
            <div className="font-medium">Timer denne uken: {data.weeklySummary?.totalHours ?? 0}</div>
            <div className="text-xs text-slate-600">Uke start: {data.weeklySummary?.weekStart ?? '-'}</div>
          </div>
          <div className="space-y-1">
            {Object.entries(data.weeklySummary?.byActivityType ?? {}).map(([activity, hours]) => (
              <div key={activity} className="text-xs text-slate-700">{activity}: {hours}</div>
            ))}
          </div>
        </div>
      );

    case 'TODO':
      return (
        <div className="space-y-1 text-sm">
          {data.todos.slice(0, 6).map((todo) => (
            <div key={todo.id} className="rounded border p-2">
              <div className="font-medium">{todo.title}</div>
              <div className="text-xs text-slate-600">{todo.status}</div>
              <div className="text-xs text-slate-600">Forfall: {formatDate(todo.dueDate)}</div>
            </div>
          ))}
          {data.todos.length === 0 ? <div className="text-xs text-slate-500">Ingen todo funnet.</div> : null}
        </div>
      );

    default:
      return <div className="text-xs text-slate-500">Ukjent widget-type.</div>;
  }
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [widgetData, setWidgetData] = useState<WidgetData>({
    myWorkOrders: [],
    bookings: [],
    weeklySummary: null,
    todos: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const token = getDevToken();

  const widgetCountByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const widget of dashboard?.widgets ?? []) {
      counts[widget.type] = (counts[widget.type] ?? 0) + 1;
    }
    return counts;
  }, [dashboard?.widgets]);

  async function load() {
    if (!token) {
      setError('Mangler NEXT_PUBLIC_DEV_TOKEN i apps/web/.env.local');
      return;
    }

    setLoading(true);
    try {
      const client = apiClient(token);
      const [dashboardRes, myWorkOrders, bookings, weeklySummary, todos] = await Promise.all([
        client.getDashboard() as Promise<DashboardResponse>,
        client.listWorkOrders('page=1&limit=20&assignedToMe=true').then((res) => res.items as WorkOrder[]),
        client.listEquipmentReservations('page=1&limit=20').then((res) => res.items as Reservation[]),
        client.weeklySummary().then((res) => res as WeeklySummary),
        client.listTodos().then((res) => res as Todo[]),
      ]);

      setDashboard(dashboardRes);
      setWidgetData({ myWorkOrders, bookings, weeklySummary, todos });
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err, 'Kunne ikke hente dashboard-data. Sjekk API/token.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Min side</h1>
        <ConnectionStatus />
      </div>

      <div className="flex items-center gap-2">
        <button className="rounded border px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-40" onClick={() => void load()} disabled={loading}>
          {loading ? 'Laster...' : 'Refresh'}
        </button>
        <span className="text-xs text-slate-600">Widgets: {dashboard?.widgets.length ?? 0}</span>
      </div>

      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(dashboard?.widgets ?? []).map((widget) => (
          <article key={widget.id} className="rounded border bg-white p-4">
            <h3 className="font-medium">{widget.title}</h3>
            <p className="mb-2 text-xs text-slate-600">Type: {widget.type} · Antall: {widgetCountByType[widget.type] ?? 0}</p>
            <WidgetRenderer widget={widget} data={widgetData} />
          </article>
        ))}
      </div>
    </main>
  );
}
