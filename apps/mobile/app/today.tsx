import { Link, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { mobileApiClient } from '../src/api/client';
import { clearToken } from '../src/auth/token-store';
import { mobileWidgetRegistry } from '../src/dashboard/widget-registry';
import { listPendingOperations } from '../src/offline/pending-operations';
import { processPendingOperationsNow } from '../src/offline/queue-runner';

type WidgetType = keyof typeof mobileWidgetRegistry;

type DashboardWidget = {
  id: string;
  type: WidgetType;
  title: string;
  config: Record<string, unknown>;
};

type DashboardResponse = {
  widgets: DashboardWidget[];
  layout: unknown;
};

type WorkOrder = {
  id: string;
  title: string;
  status: string;
  customerName?: string | null;
  city?: string | null;
};

type Reservation = {
  id: string;
  startAt: string;
  endAt: string;
  equipmentItemId?: string;
  workOrderId?: string | null;
  equipmentItem?: { id?: string; name: string | null };
  workOrder?: { id?: string; title: string | null };
};

type WeeklySummary = {
  weekStart: string;
  totalHours: number;
  byActivityType: Record<string, number>;
};

type Todo = { id: string; title: string; status: string; dueDate: string | null };

type CalendarEvent = {
  id: string;
  type: 'workorder_schedule' | 'equipment_reservation';
  title: string;
  start: string;
  end: string;
  workOrderRef?: { id: string; title: string; status: string } | null;
};

type Notification = {
  id: string;
  type: string;
  readAt: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('no-NO');
}

function getBookingHref(booking: Reservation) {
  const equipmentId = booking.equipmentItem?.id ?? booking.equipmentItemId;
  if (equipmentId) return `/equipment?equipmentItemId=${equipmentId}`;
  const workOrderId = booking.workOrder?.id ?? booking.workOrderId;
  if (workOrderId) return `/workorders/${workOrderId}`;
  return '/equipment';
}

function dateRange(rangeDays: number) {
  const from = new Date();
  const to = new Date(from.getTime() + rangeDays * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function TodayScreen() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pendingCounts, setPendingCounts] = useState({ pending: 0, failed: 0 });

  const calendarRangeDays = useMemo(() => {
    const widget = dashboard?.widgets.find((item) => item.type === 'MY_CALENDAR');
    const value = Number(widget?.config?.rangeDays ?? 14);
    return Number.isFinite(value) && value > 0 ? value : 14;
  }, [dashboard?.widgets]);

  async function refreshPending() {
    const operations = await listPendingOperations();
    setPendingCounts({
      pending: operations.filter((item) => item.status === 'Pending').length,
      failed: operations.filter((item) => item.status === 'Failed').length,
    });
  }

  async function load() {
    try {
      setWarning(null);
      await processPendingOperationsNow();

      const api = await mobileApiClient();
      const range = dateRange(calendarRangeDays);

      const [
        dashboardResult,
        workOrdersResult,
        bookingsResult,
        weeklySummaryResult,
        todosResult,
        calendarResult,
        notificationsResult,
      ] = await Promise.allSettled([
        api.getDashboard(),
        api.listWorkOrders('page=1&limit=20&assignedToMe=true'),
        api.listEquipmentReservations('page=1&limit=20'),
        api.weeklySummary(),
        api.listTodos('mineOnly=true'),
        api.listSchedule({ from: range.from, to: range.to, scope: 'mine' }),
        api.listNotifications(),
      ]);

      let failedCount = 0;

      if (dashboardResult.status === 'fulfilled') {
        setDashboard(dashboardResult.value as DashboardResponse);
      } else {
        failedCount += 1;
      }
      if (workOrdersResult.status === 'fulfilled') {
        const parsed = workOrdersResult.value as { items: WorkOrder[] };
        setWorkOrders(parsed.items ?? []);
      } else {
        failedCount += 1;
        setWorkOrders([]);
      }
      if (bookingsResult.status === 'fulfilled') {
        const parsed = bookingsResult.value as { items: Reservation[] };
        setBookings(parsed.items ?? []);
      } else {
        failedCount += 1;
        setBookings([]);
      }
      if (weeklySummaryResult.status === 'fulfilled') {
        setWeeklySummary(weeklySummaryResult.value as WeeklySummary);
      } else {
        failedCount += 1;
        setWeeklySummary(null);
      }
      if (todosResult.status === 'fulfilled') {
        setTodos(todosResult.value as Todo[]);
      } else {
        failedCount += 1;
        setTodos([]);
      }
      if (calendarResult.status === 'fulfilled') {
        setCalendarEvents(calendarResult.value as CalendarEvent[]);
      } else {
        failedCount += 1;
        setCalendarEvents([]);
      }
      if (notificationsResult.status === 'fulfilled') {
        setNotifications(notificationsResult.value as Notification[]);
      } else {
        failedCount += 1;
        setNotifications([]);
      }

      if (failedCount > 0) {
        setWarning(`Noen oversiktsdata kunne ikke hentes (${failedCount}).`);
      }

      await refreshPending();
      setError(null);
    } catch (err) {
      setWarning(null);
      setError(err instanceof Error ? err.message : 'Kunne ikke hente oversikt');
    }
  }

  useEffect(() => {
    void load();
  }, [calendarRangeDays]);

  async function logout() {
    await clearToken();
    router.replace('/login');
  }

  function renderWidget(widget: DashboardWidget) {
    if (widget.type === 'MY_WORKORDERS') {
      return (
        <View style={{ gap: 8 }}>
          {workOrders.slice(0, 6).map((item) => (
            <Link
              key={item.id}
              href={{ pathname: '/workorders/[id]', params: { id: item.id } }}
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 10,
                padding: 10,
                backgroundColor: '#fff',
              }}
            >
              <Text style={{ fontWeight: '700', color: '#0f172a' }}>{item.title}</Text>
              <Text style={{ color: '#475569' }}>
                {item.status}
                {item.customerName ? ` - ${item.customerName}` : ''}
                {item.city ? ` (${item.city})` : ''}
              </Text>
            </Link>
          ))}
          {workOrders.length === 0 ? (
            <Text style={{ color: '#64748b' }}>Ingen arbeidsordre.</Text>
          ) : null}
        </View>
      );
    }

    if (widget.type === 'BOOKINGS') {
      return (
        <View style={{ gap: 8 }}>
          {bookings.slice(0, 6).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(getBookingHref(item))}
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 10,
                padding: 10,
                backgroundColor: '#fff',
              }}
            >
              <Text style={{ fontWeight: '700', color: '#0f172a' }}>
                {item.equipmentItem?.name ?? 'Ukjent utstyr'}
              </Text>
              <Text style={{ color: '#475569' }}>
                {item.workOrder?.title ??
                  (item.workOrderId
                    ? `Arbeidsordre ${item.workOrderId}`
                    : 'Uten arbeidsordre')}
              </Text>
              <Text style={{ color: '#475569', fontSize: 12 }}>
                {formatDate(item.startAt)} - {formatDate(item.endAt)}
              </Text>
            </Pressable>
          ))}
          {bookings.length === 0 ? (
            <Text style={{ color: '#64748b' }}>Ingen reservasjoner.</Text>
          ) : null}
        </View>
      );
    }

    if (widget.type === 'HOURS_THIS_WEEK') {
      return (
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '700', color: '#0f172a' }}>
            Timer denne uken: {weeklySummary?.totalHours ?? 0}
          </Text>
          <Text style={{ color: '#475569', fontSize: 12 }}>
            Uke start: {weeklySummary?.weekStart ?? '-'}
          </Text>
          <Link href="/timesheets" style={{ color: '#0f766e', textDecorationLine: 'underline' }}>
            Ga til timer
          </Link>
        </View>
      );
    }

    if (widget.type === 'TODO') {
      return (
        <View style={{ gap: 8 }}>
          {todos.slice(0, 6).map((item) => (
            <View
              key={item.id}
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 10,
                padding: 10,
              }}
            >
              <Text style={{ fontWeight: '700', color: '#0f172a' }}>{item.title}</Text>
              <Text style={{ color: '#475569' }}>{item.status}</Text>
              <Text style={{ color: '#475569', fontSize: 12 }}>
                Forfall: {formatDate(item.dueDate)}
              </Text>
            </View>
          ))}
          {todos.length === 0 ? <Text style={{ color: '#64748b' }}>Ingen todo.</Text> : null}
        </View>
      );
    }

    if (widget.type === 'MY_CALENDAR') {
      return (
        <View style={{ gap: 8 }}>
          {calendarEvents.slice(0, 6).map((event) => (
            <View
              key={event.id}
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 10,
                padding: 10,
              }}
            >
              <Text style={{ fontWeight: '700', color: '#0f172a' }}>{event.title}</Text>
              <Text style={{ color: '#475569' }}>
                {formatDate(event.start)} - {formatDate(event.end)}
              </Text>
              {event.workOrderRef ? (
                <Text style={{ color: '#475569', fontSize: 12 }}>
                  {event.workOrderRef.title} ({event.workOrderRef.status})
                </Text>
              ) : null}
            </View>
          ))}
          {calendarEvents.length === 0 ? (
            <Text style={{ color: '#64748b' }}>Ingen kalenderhendelser.</Text>
          ) : null}
          <Link href="/calendar" style={{ color: '#0f766e', textDecorationLine: 'underline' }}>
            Apne kalender
          </Link>
        </View>
      );
    }

    return <Text style={{ color: '#64748b' }}>Ukjent widgettype</Text>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 12, color: '#64748b', letterSpacing: 1 }}>FELTAPP</Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#0f172a' }}>Oversikt</Text>
        </View>
        <Pressable
          onPress={() => void logout()}
          style={{
            borderWidth: 1,
            borderColor: '#cbd5e1',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text>Logg ut</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Link
          href="/calendar"
          style={{
            borderWidth: 1,
            borderColor: '#cbd5e1',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          Kalender
        </Link>
        <Link
          href="/workorders"
          style={{
            borderWidth: 1,
            borderColor: '#cbd5e1',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          Mine arbeidsordre
        </Link>
        <Link
          href="/timesheets"
          style={{
            borderWidth: 1,
            borderColor: '#cbd5e1',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          Timer
        </Link>
        <Link
          href="/equipment"
          style={{
            borderWidth: 1,
            borderColor: '#cbd5e1',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          Utstyr
        </Link>
        <Link
          href="/operations"
          style={{
            borderWidth: 1,
            borderColor: '#cbd5e1',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          Synkstatus
        </Link>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: '#e2e8f0',
          borderRadius: 10,
          padding: 10,
          backgroundColor: '#fff',
        }}
      >
        <Text style={{ fontWeight: '700', color: '#0f172a' }}>Synkstatus</Text>
        <Text style={{ color: '#475569' }}>
          Pending: {pendingCounts.pending} - Failed: {pendingCounts.failed}
        </Text>
        <Pressable onPress={() => void load()} style={{ marginTop: 8 }}>
          <Text style={{ color: '#0f766e', textDecorationLine: 'underline' }}>
            Oppdater oversikt
          </Text>
        </Pressable>
      </View>

      {error ? <Text style={{ color: '#b91c1c' }}>{error}</Text> : null}
      {warning ? <Text style={{ color: '#a16207' }}>{warning}</Text> : null}

      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: '700', color: '#0f172a' }}>Notifikasjoner</Text>
        <FlatList
          scrollEnabled={false}
          data={notifications.slice(0, 5)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text style={{ color: '#475569' }}>
              {item.type} {item.readAt ? '(lest)' : '(ulest)'}
            </Text>
          )}
          ListEmptyComponent={<Text style={{ color: '#64748b' }}>Ingen notifikasjoner.</Text>}
        />
      </View>

      {(dashboard?.widgets ?? []).map((widget) => (
        <View
          key={widget.id}
          style={{
            borderWidth: 1,
            borderColor: '#dbe4ef',
            borderRadius: 12,
            backgroundColor: '#f8fafc',
            padding: 12,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>
            {mobileWidgetRegistry[widget.type].mobileTitle}
          </Text>
          {renderWidget(widget)}
        </View>
      ))}
    </ScrollView>
  );
}
