import type { WidgetType } from '@portal/shared';

type MobileWidgetRegistration = {
  mobileTitle: string;
};

export const mobileWidgetRegistry = {
  MY_WORKORDERS: { mobileTitle: 'Mine arbeidsordre' },
  BOOKINGS: { mobileTitle: 'Reservasjoner' },
  HOURS_THIS_WEEK: { mobileTitle: 'Timer denne uken' },
  TODO: { mobileTitle: 'Todo' },
  MY_CALENDAR: { mobileTitle: 'Kalender (mine)' },
} satisfies Record<WidgetType, MobileWidgetRegistration>;
