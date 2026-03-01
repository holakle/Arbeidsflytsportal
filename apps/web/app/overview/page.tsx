import type { MeResponse } from '@portal/shared';
import { notFound, redirect } from 'next/navigation';
import OverviewClient, { type OverviewSections } from './overview-client';
import { apiRequest, canAccessOverview, getServerToken, trySection } from '@/lib/server-api';

export default async function OverviewPage() {
  const overviewEnabled = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_OVERVIEW === 'true';
  if (!overviewEnabled) {
    notFound();
  }

  const token = await getServerToken();
  if (!token) {
    redirect('/login?reason=missing-token');
  }

  let me: MeResponse;
  try {
    me = await apiRequest<MeResponse>('/me', token);
  } catch {
    redirect('/login?reason=invalid-token');
  }

  if (!canAccessOverview(me)) {
    redirect('/login?reason=overview-access');
  }

  const sections: OverviewSections = {
    workOrders: await trySection('WorkOrders', apiRequest('/workorders?page=1&limit=100', token)),
    equipmentItems: await trySection('EquipmentItems', apiRequest('/equipment', token)),
    reservations: await trySection('EquipmentReservations', apiRequest('/equipment/reservations?page=1&limit=100', token)),
    timesheets: await trySection('Timesheets', apiRequest('/timesheets', token)),
    weeklySummary: await trySection('Weekly summary', apiRequest('/timesheets/weekly-summary', token)),
    todos: await trySection('Todos', apiRequest('/todos', token)),
    dashboard: await trySection('Dashboard', apiRequest('/dashboard', token)),
  };

  return <OverviewClient me={me} sections={sections} />;
}
