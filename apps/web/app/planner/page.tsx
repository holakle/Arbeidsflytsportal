'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import nbLocale from '@fullcalendar/core/locales/nb';
import type { DatesSetArg, EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';
import { ConnectionStatus } from '@/components/dev/connection-status';
import {
  FullCalendarCompat,
  type FullCalendarCompatRef,
} from '@/components/planner/fullcalendar-compat';

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

type PlannerTab = 'CALENDAR' | 'CREATE_WORKORDER';
type ResourceMode = 'MANNSKAP' | 'UTSTYR';
type CalendarViewMode = 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth';

type CalendarEventExtended = {
  type: ScheduleEvent['type'];
  status?: string | null;
  note?: string | null;
  resourceRef?: ScheduleEvent['resourceRef'];
  workOrderRef?: ScheduleEvent['workOrderRef'];
};

type CalendarSelectArg = {
  start: Date;
  end: Date;
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

function toIso(localDateTime: string) {
  const date = new Date(localDateTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toLocalDateTimeValue(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  const h = String(value.getHours()).padStart(2, '0');
  const min = String(value.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('no-NO');
}

function todayDateInputValue() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDateInputValue(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function PlannerPageInner() {
  const searchParams = useSearchParams();
  const token = getDevToken();
  const calendarRef = useRef<FullCalendarCompatRef | null>(null);

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

  const [plannerTab, setPlannerTab] = useState<PlannerTab>('CALENDAR');
  const [calendarView, setCalendarView] = useState<CalendarViewMode>('timeGridWeek');
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(todayDateInputValue());
  const [calendarRange, setCalendarRange] = useState<{ from: string; to: string }>(() => {
    const today = todayDateInputValue();
    const start = new Date(`${today}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { from: start.toISOString(), to: end.toISOString() };
  });

  const [resourceMode, setResourceMode] = useState<ResourceMode>('MANNSKAP');
  const [selectedUserFilterId, setSelectedUserFilterId] = useState('ALL');
  const [selectedEquipmentFilterId, setSelectedEquipmentFilterId] = useState('ALL');
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<ScheduleEvent | null>(null);
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [selectionStart, setSelectionStart] = useState('');
  const [selectionEnd, setSelectionEnd] = useState('');
  const [selectionWorkOrderId, setSelectionWorkOrderId] = useState('');
  const [selectionUserId, setSelectionUserId] = useState('');
  const [selectionEquipmentId, setSelectionEquipmentId] = useState('');
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [selectionConflicts, setSelectionConflicts] = useState<ScheduleEvent[]>([]);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

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
      return (
        event.resourceRef?.kind === 'equipment' &&
        event.resourceRef.id === selectedEquipmentFilterId
      );
    });
  }, [resourceMode, scheduleEvents, selectedEquipmentFilterId, selectedUserFilterId]);

  const availabilityBadge = useMemo(() => {
    const now = new Date();
    const specificSelected =
      (resourceMode === 'MANNSKAP' && selectedUserFilterId !== 'ALL') ||
      (resourceMode === 'UTSTYR' && selectedEquipmentFilterId !== 'ALL');

    if (!specificSelected) {
      return {
        label: 'Velg ressurs for ledighetsstatus',
        className: 'bg-slate-100 text-slate-700',
      };
    }

    const hasActiveEvent = filteredScheduleEvents.some((event) => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      return start <= now && now <= end;
    });

    if (hasActiveEvent) {
      return { label: 'Booket na', className: 'bg-amber-100 text-amber-800' };
    }

    return { label: 'Ledig na', className: 'bg-emerald-100 text-emerald-800' };
  }, [filteredScheduleEvents, resourceMode, selectedEquipmentFilterId, selectedUserFilterId]);

  const calendarEvents = useMemo<EventInput[]>(() => {
    const now = new Date();

    return filteredScheduleEvents.map((event) => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      const overlapsNow = start <= now && now <= end;
      const baseColor = event.type === 'workorder_schedule' ? '#0f766e' : '#b45309';
      const nowColor = event.type === 'workorder_schedule' ? '#0e7490' : '#c2410c';

      return {
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        backgroundColor: overlapsNow ? nowColor : baseColor,
        borderColor: overlapsNow ? nowColor : baseColor,
        textColor: '#ffffff',
        extendedProps: {
          type: event.type,
          status: event.status,
          note: event.note,
          resourceRef: event.resourceRef,
          workOrderRef: event.workOrderRef,
        } satisfies CalendarEventExtended,
      };
    });
  }, [filteredScheduleEvents]);

  async function loadSchedule() {
    if (!token) return;

    try {
      const query: {
        from: string;
        to: string;
        scope?: 'mine' | 'all';
        assigneeUserId?: string;
        equipmentItemId?: string;
      } = {
        from: calendarRange.from,
        to: calendarRange.to,
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
      setResourceMode('UTSTYR');
      setSelectedEquipmentFilterId(requestedEquipmentItemId);
    }
  }, [searchParams]);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (plannerTab === 'CALENDAR') {
      void loadSchedule();
    }
  }, [calendarRange, resourceMode, selectedEquipmentFilterId, selectedUserFilterId, plannerTab]);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (api.view.type !== calendarView) {
      api.changeView(calendarView);
    }
  }, [calendarView]);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.gotoDate(calendarAnchorDate);
  }, [calendarAnchorDate]);

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

  function onDatesSet(arg: DatesSetArg) {
    setCalendarRange({ from: arg.start.toISOString(), to: arg.end.toISOString() });
    setCalendarAnchorDate(toDateInputValue(arg.view.currentStart));
  }

  function onEventClick(arg: EventClickArg) {
    const ext = arg.event.extendedProps as CalendarEventExtended;
    if (ext.workOrderRef?.id) {
      setSelectedCalendarEvent(null);
      return;
    }
    setSelectedCalendarEvent({
      id: arg.event.id,
      title: arg.event.title,
      start: arg.event.start?.toISOString() ?? '',
      end: arg.event.end?.toISOString() ?? '',
      type: ext.type,
      status: ext.status,
      note: ext.note,
      resourceRef: ext.resourceRef,
      workOrderRef: ext.workOrderRef,
    });
  }

  function onCalendarSelect(arg: CalendarSelectArg) {
    if (arg.start >= arg.end) return;

    const nextWorkOrderId = selectedWorkOrderId || workOrders.at(0)?.id || '';
    const nextUserId =
      selectedUserFilterId !== 'ALL'
        ? selectedUserFilterId
        : assigneeUserId || users.at(0)?.id || '';
    const nextEquipmentId =
      selectedEquipmentFilterId !== 'ALL'
        ? selectedEquipmentFilterId
        : equipmentItemId || equipmentItems.at(0)?.id || '';

    setSelectionStart(toLocalDateTimeValue(arg.start));
    setSelectionEnd(toLocalDateTimeValue(arg.end));
    setSelectionWorkOrderId(nextWorkOrderId);
    setSelectionUserId(nextUserId);
    setSelectionEquipmentId(nextEquipmentId);
    setSelectionModalOpen(true);
  }

  function renderEventContent(arg: EventContentArg) {
    const ext = arg.event.extendedProps as CalendarEventExtended;
    const label = arg.timeText ? `${arg.timeText} ${arg.event.title}` : arg.event.title;
    const isDeleting = deletingEventId === arg.event.id;

    if (ext.workOrderRef?.id) {
      return (
        <div className="group relative block h-full w-full">
          <Link
            href={`/workorders/${ext.workOrderRef.id}`}
            className="block h-full w-full truncate px-1 pr-7 text-white underline-offset-2 hover:underline"
            title={label}
          >
            {label}
          </Link>
          <button
            type="button"
            className="absolute right-0.5 top-0.5 hidden h-5 w-5 items-center justify-center rounded bg-rose-600 text-white shadow group-hover:flex"
            title="Slett booking"
            aria-label="Slett booking"
            disabled={isDeleting}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void deleteCalendarEvent(
                arg.event.id,
                ext.type,
                ext.workOrderRef?.id,
              );
            }}
          >
            {isDeleting ? (
              <span className="text-xs leading-none">...</span>
            ) : (
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current" aria-hidden>
                <path d="M7.5 2.5A1.5 1.5 0 0 0 6 4v.5H3.5a.75.75 0 0 0 0 1.5h.54l.74 9.3A2 2 0 0 0 6.77 17h6.46a2 2 0 0 0 1.99-1.7l.74-9.3h.54a.75.75 0 0 0 0-1.5H14V4a1.5 1.5 0 0 0-1.5-1.5h-5ZM12.5 4v.5h-5V4h5Zm-4 3.25c.41 0 .75.34.75.75v5a.75.75 0 0 1-1.5 0V8c0-.41.34-.75.75-.75Zm3 0c.41 0 .75.34.75.75v5a.75.75 0 0 1-1.5 0V8c0-.41.34-.75.75-.75Z" />
              </svg>
            )}
          </button>
        </div>
      );
    }

    return (
      <div className="group relative block h-full w-full">
        <div className="block h-full w-full truncate px-1 pr-7 text-white" title={label}>
          {label}
        </div>
        <button
          type="button"
          className="absolute right-0.5 top-0.5 hidden h-5 w-5 items-center justify-center rounded bg-rose-600 text-white shadow group-hover:flex"
          title="Slett booking"
          aria-label="Slett booking"
          disabled={isDeleting}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void deleteCalendarEvent(arg.event.id, ext.type);
          }}
        >
          {isDeleting ? (
            <span className="text-xs leading-none">...</span>
          ) : (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current" aria-hidden>
              <path d="M7.5 2.5A1.5 1.5 0 0 0 6 4v.5H3.5a.75.75 0 0 0 0 1.5h.54l.74 9.3A2 2 0 0 0 6.77 17h6.46a2 2 0 0 0 1.99-1.7l.74-9.3h.54a.75.75 0 0 0 0-1.5H14V4a1.5 1.5 0 0 0-1.5-1.5h-5ZM12.5 4v.5h-5V4h5Zm-4 3.25c.41 0 .75.34.75.75v5a.75.75 0 0 1-1.5 0V8c0-.41.34-.75.75-.75Zm3 0c.41 0 .75.34.75.75v5a.75.75 0 0 1-1.5 0V8c0-.41.34-.75.75-.75Z" />
            </svg>
          )}
        </button>
      </div>
    );
  }

  async function deleteCalendarEvent(
    eventId: string,
    eventType: ScheduleEvent['type'],
    workOrderId?: string,
  ) {
    if (!token || deletingEventId) return;

    const ok = window.confirm('Slette denne bookingen fra kalenderen?');
    if (!ok) return;

    setDeletingEventId(eventId);
    try {
      if (eventType === 'workorder_schedule') {
        if (!workOrderId) {
          setError('Kunne ikke finne arbeidsordre for valgt booking.');
          return;
        }
        await apiClient(token).deleteWorkOrderSchedule(workOrderId, eventId);
      } else {
        await apiClient(token).deleteEquipmentReservation(eventId);
      }

      setSuccess('Booking slettet.');
      setError(null);
      setSelectedCalendarEvent((prev) => (prev?.id === eventId ? null : prev));
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke slette booking.'));
    } finally {
      setDeletingEventId(null);
    }
  }

  function calendarPrev() {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.prev();
  }

  function calendarNext() {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.next();
  }

  function calendarToday() {
    const api = calendarRef.current?.getApi();
    if (!api) {
      setCalendarAnchorDate(todayDateInputValue());
      return;
    }
    api.today();
  }

  async function confirmSelectionBooking() {
    if (!token || !selectionWorkOrderId || !selectionStart || !selectionEnd) return;

    const startAt = toIso(selectionStart);
    const endAt = toIso(selectionEnd);
    if (!startAt || !endAt) {
      setError('Ugyldig tidsrom valgt.');
      return;
    }

    const selectionStartDate = new Date(startAt);
    const selectionEndDate = new Date(endAt);
    const conflicts = scheduleEvents.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const overlaps = eventStart < selectionEndDate && selectionStartDate < eventEnd;
      if (!overlaps) return false;

      if (resourceMode === 'MANNSKAP') {
        return (
          event.type === 'workorder_schedule' &&
          event.resourceRef?.kind === 'user' &&
          event.resourceRef.id === selectionUserId
        );
      }

      return (
        event.type === 'equipment_reservation' &&
        event.resourceRef?.kind === 'equipment' &&
        event.resourceRef.id === selectionEquipmentId
      );
    });

    if (conflicts.length > 0) {
      setSelectionConflicts(conflicts);
      setConflictModalOpen(true);
      return;
    }

    await executeSelectionBooking(startAt, endAt);
  }

  async function executeSelectionBooking(startAt: string, endAt: string) {
    if (!token || !selectionWorkOrderId) return;

    try {
      if (resourceMode === 'MANNSKAP') {
        if (!selectionUserId) {
          setError('Velg mannskap for booking.');
          return;
        }
        await apiClient(token).createWorkOrderSchedule(selectionWorkOrderId, {
          assigneeUserId: selectionUserId,
          startAt,
          endAt,
        });
        setSuccess('Mannskap ble booket fra kalenderen.');
      } else {
        if (!selectionEquipmentId) {
          setError('Velg utstyr for booking.');
          return;
        }
        await apiClient(token).reserveEquipment({
          workOrderId: selectionWorkOrderId,
          equipmentItemId: selectionEquipmentId,
          startAt,
          endAt,
        });
        setSuccess('Utstyr ble booket fra kalenderen.');
      }

      setSelectionModalOpen(false);
      setConflictModalOpen(false);
      setSelectionConflicts([]);
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke booke valgt tidsrom.'));
    }
  }

  async function confirmSelectionBookingWithOverlap() {
    const startAt = toIso(selectionStart);
    const endAt = toIso(selectionEnd);
    if (!startAt || !endAt) {
      setError('Ugyldig tidsrom valgt.');
      return;
    }
    await executeSelectionBooking(startAt, endAt);
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kalender</h1>
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
        <div className="mb-3 flex gap-2">
          <button
            className={`rounded px-3 py-2 text-sm ${plannerTab === 'CALENDAR' ? 'bg-accent text-white' : 'border hover:bg-slate-50'}`}
            onClick={() => setPlannerTab('CALENDAR')}
          >
            Kalender
          </button>
        </div>

        {plannerTab === 'CALENDAR' ? (
          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-6">
              <input
                className="rounded border px-3 py-2 md:col-span-1"
                type="date"
                value={calendarAnchorDate}
                onChange={(e) => setCalendarAnchorDate(e.target.value)}
              />
              <button
                className="rounded border px-3 py-2 text-sm hover:bg-slate-50"
                onClick={calendarPrev}
              >
                Forrige
              </button>
              <button
                className="rounded border px-3 py-2 text-sm hover:bg-slate-50"
                onClick={calendarToday}
              >
                I dag
              </button>
              <button
                className="rounded border px-3 py-2 text-sm hover:bg-slate-50"
                onClick={calendarNext}
              >
                Neste
              </button>
              <select
                className="rounded border px-3 py-2"
                value={calendarView}
                onChange={(e) => setCalendarView(e.target.value as CalendarViewMode)}
              >
                <option value="timeGridDay">Dag</option>
                <option value="timeGridWeek">Uke</option>
                <option value="dayGridMonth">Maaned</option>
              </select>
              <span
                className={`inline-flex items-center justify-center rounded px-2 py-1 text-xs font-medium ${availabilityBadge.className}`}
              >
                {availabilityBadge.label}
              </span>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <select
                className="rounded border px-3 py-2"
                value={resourceMode}
                onChange={(e) => setResourceMode(e.target.value as ResourceMode)}
              >
                <option value="MANNSKAP">Mannskap</option>
                <option value="UTSTYR">Utstyr</option>
              </select>
              {resourceMode === 'MANNSKAP' ? (
                <select
                  className="rounded border px-3 py-2 md:col-span-2"
                  value={selectedUserFilterId}
                  onChange={(e) => setSelectedUserFilterId(e.target.value)}
                >
                  <option value="ALL">Alle brukere</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="rounded border px-3 py-2 md:col-span-2"
                  value={selectedEquipmentFilterId}
                  onChange={(e) => setSelectedEquipmentFilterId(e.target.value)}
                >
                  <option value="ALL">Alt utstyr</option>
                  {equipmentItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.serialNumber ?? item.id})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="overflow-hidden rounded border bg-white p-2">
              <FullCalendarCompat
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                locale={nbLocale}
                initialView={calendarView}
                initialDate={calendarAnchorDate}
                events={calendarEvents}
                datesSet={onDatesSet}
                eventClick={onEventClick}
                eventContent={renderEventContent}
                selectable
                selectMirror
                select={onCalendarSelect}
                height="auto"
                firstDay={1}
                nowIndicator
                headerToolbar={false}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                dayMaxEventRows={3}
              />
            </div>

            {calendarEvents.length === 0 ? (
              <p className="text-sm text-slate-500">Ingen hendelser i valgt intervall/filter.</p>
            ) : null}

            {selectedCalendarEvent ? (
              <div className="rounded border p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <strong>{selectedCalendarEvent.title}</strong>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                    {selectedCalendarEvent.type}
                  </span>
                </div>
                <div className="text-slate-600">
                  {formatDate(selectedCalendarEvent.start)} -{' '}
                  {formatDate(selectedCalendarEvent.end)}
                </div>
                {selectedCalendarEvent.resourceRef ? (
                  <div className="text-slate-600">
                    Ressurs:{' '}
                    {selectedCalendarEvent.resourceRef.label ??
                      selectedCalendarEvent.resourceRef.id}
                  </div>
                ) : null}
                {selectedCalendarEvent.workOrderRef ? (
                  <div className="text-slate-600">
                    Arbeidsordre:{' '}
                    <Link
                      className="underline"
                      href={`/workorders/${selectedCalendarEvent.workOrderRef.id}`}
                    >
                      {selectedCalendarEvent.workOrderRef.title}
                    </Link>{' '}
                    ({selectedCalendarEvent.workOrderRef.status})
                  </div>
                ) : null}
                {selectedCalendarEvent.note ? (
                  <div className="text-slate-600">Notat: {selectedCalendarEvent.note}</div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Klikk pa en hendelse for detaljer.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-lg">Opprett arbeidsordre</h2>
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
            <button
              className="rounded bg-accent px-3 py-2 text-white disabled:opacity-40"
              onClick={createWorkOrder}
              disabled={!title || loading}
            >
              Opprett
            </button>
          </div>
        )}
      </section>

      {plannerTab === 'CALENDAR' ? (
        <>
          <div className="rounded border bg-white p-4">
            <h2 className="mb-2 text-lg">Tildel person</h2>
            <div className="grid gap-2 md:grid-cols-3">
              <select
                className="rounded border px-3 py-2"
                value={selectedWorkOrderId}
                onChange={(e) => setSelectedWorkOrderId(e.target.value)}
              >
                {workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.title} ({wo.status})
                  </option>
                ))}
              </select>

              <select
                className="rounded border px-3 py-2"
                value={assigneeUserId}
                onChange={(e) => setAssigneeUserId(e.target.value)}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName} ({user.roles.join(', ') || 'no-role'})
                  </option>
                ))}
              </select>

              <button
                className="rounded bg-accent px-3 py-2 text-white disabled:opacity-40"
                onClick={assignUser}
                disabled={!selectedWorkOrderId || !assigneeUserId || loading}
              >
                Tildel
              </button>
            </div>
            {selectedWorkOrder ? (
              <p className="mt-2 text-xs text-slate-600">
                Valgt arbeidsordre: {selectedWorkOrder.title}
              </p>
            ) : null}
          </div>

          <div className="rounded border bg-white p-4">
            <h2 className="mb-2 text-lg">Book utstyr</h2>
            <div className="grid gap-2 md:grid-cols-5">
              <select
                className="rounded border px-3 py-2"
                value={selectedWorkOrderId}
                onChange={(e) => setSelectedWorkOrderId(e.target.value)}
              >
                {workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.title} ({wo.status})
                  </option>
                ))}
              </select>

              <select
                className="rounded border px-3 py-2"
                value={equipmentItemId}
                onChange={(e) => setEquipmentItemId(e.target.value)}
              >
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
                disabled={
                  !selectedWorkOrderId ||
                  !equipmentItemId ||
                  !reserveStart ||
                  !reserveEnd ||
                  loading
                }
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
                  <Link
                    className="mt-1 inline-block rounded border px-2 py-1 text-xs hover:bg-slate-50"
                    href={`/workorders/${item.id}`}
                  >
                    Apne
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      {selectionModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-xl">
            <h2 className="mb-3 text-lg font-semibold">Book valgt tidsrom</h2>
            <div className="grid gap-2 md:grid-cols-2">
              <select
                className="rounded border px-3 py-2 md:col-span-2"
                value={selectionWorkOrderId}
                onChange={(e) => setSelectionWorkOrderId(e.target.value)}
              >
                {workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.title} ({wo.status})
                  </option>
                ))}
              </select>

              {resourceMode === 'MANNSKAP' ? (
                <select
                  className="rounded border px-3 py-2 md:col-span-2"
                  value={selectionUserId}
                  onChange={(e) => setSelectionUserId(e.target.value)}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="rounded border px-3 py-2 md:col-span-2"
                  value={selectionEquipmentId}
                  onChange={(e) => setSelectionEquipmentId(e.target.value)}
                >
                  {equipmentItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.serialNumber ?? item.id})
                    </option>
                  ))}
                </select>
              )}

              <input
                className="rounded border px-3 py-2"
                type="datetime-local"
                value={selectionStart}
                onChange={(e) => setSelectionStart(e.target.value)}
              />
              <input
                className="rounded border px-3 py-2"
                type="datetime-local"
                value={selectionEnd}
                onChange={(e) => setSelectionEnd(e.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded border px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => setSelectionModalOpen(false)}
              >
                Avbryt
              </button>
              <button
                className="rounded bg-accent px-3 py-2 text-sm text-white"
                onClick={() => void confirmSelectionBooking()}
              >
                Book
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {conflictModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold">Konflikt oppdaget</h2>
            <p className="text-sm text-slate-700">
              Valgt tidsrom overlapper med {selectionConflicts.length} eksisterende booking(er) for
              valgt ressurs.
            </p>
            <ul className="mt-3 max-h-40 space-y-1 overflow-auto rounded border bg-slate-50 p-2 text-sm">
              {selectionConflicts.slice(0, 8).map((event) => (
                <li key={event.id}>
                  <strong>{event.title}</strong> ({formatDate(event.start)} -{' '}
                  {formatDate(event.end)})
                </li>
              ))}
            </ul>
            {selectionConflicts.length > 8 ? (
              <p className="mt-2 text-xs text-slate-500">
                Viser 8 av {selectionConflicts.length} konflikter.
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded border px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => {
                  setConflictModalOpen(false);
                  setSelectionConflicts([]);
                }}
              >
                Avbryt
              </button>
              <button
                className="rounded bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700"
                onClick={() => void confirmSelectionBookingWithOverlap()}
              >
                Book likevel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<main className="p-5 text-sm text-slate-600">Laster planner...</main>}>
      <PlannerPageInner />
    </Suspense>
  );
}
