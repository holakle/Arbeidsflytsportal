'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { ComponentType } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { CalendarApi, CalendarOptions } from '@fullcalendar/core';

export type FullCalendarCompatRef = {
  getApi: () => CalendarApi | null;
};

export type FullCalendarCompatProps = {
  plugins: NonNullable<CalendarOptions['plugins']>;
  locale?: CalendarOptions['locale'];
  initialView?: CalendarOptions['initialView'];
  initialDate?: CalendarOptions['initialDate'];
  events?: CalendarOptions['events'];
  datesSet?: CalendarOptions['datesSet'];
  eventClick?: CalendarOptions['eventClick'];
  height?: CalendarOptions['height'];
  firstDay?: CalendarOptions['firstDay'];
  nowIndicator?: CalendarOptions['nowIndicator'];
  headerToolbar?: CalendarOptions['headerToolbar'];
  slotMinTime?: CalendarOptions['slotMinTime'];
  slotMaxTime?: CalendarOptions['slotMaxTime'];
  dayMaxEventRows?: CalendarOptions['dayMaxEventRows'];
  eventContent?: CalendarOptions['eventContent'];
  selectable?: CalendarOptions['selectable'];
  selectMirror?: CalendarOptions['selectMirror'];
  select?: CalendarOptions['select'];
  editable?: CalendarOptions['editable'];
  eventStartEditable?: CalendarOptions['eventStartEditable'];
  eventDurationEditable?: CalendarOptions['eventDurationEditable'];
  eventDrop?: CalendarOptions['eventDrop'];
  eventResize?: CalendarOptions['eventResize'];
};

type FullCalendarLike = {
  getApi?: () => CalendarApi;
};

const AnyFullCalendar = FullCalendar as unknown as ComponentType<Record<string, unknown>>;

export const FullCalendarCompat = forwardRef<FullCalendarCompatRef, FullCalendarCompatProps>(
  function FullCalendarCompat(props, ref) {
    const internalRef = useRef<FullCalendarLike | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        getApi: () => internalRef.current?.getApi?.() ?? null,
      }),
      [],
    );

    return <AnyFullCalendar {...props} ref={internalRef} />;
  },
);
