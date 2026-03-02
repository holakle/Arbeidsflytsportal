import type { z } from 'zod';
import type { MeResponse } from '../schemas/auth.schema';
import type { DevAuthUser, IssueDevTokenResponse } from '../schemas/dev-auth.schema';
import type {
  attachBarcodeResponseSchema,
  equipmentItemSchema,
  equipmentLookupResponseSchema,
  equipmentReservationSchema,
} from '../schemas/equipment.schema';
import type { WorkOrder, workOrderConsumableSchema } from '../schemas/workorder.schema';
import { HttpClient } from './http-client';

type Paged<T> = { items: T[]; page: number; limit: number; total: number };
type EquipmentItem = z.infer<typeof equipmentItemSchema>;
type EquipmentReservation = z.infer<typeof equipmentReservationSchema>;
type EquipmentLookupResponse = z.infer<typeof equipmentLookupResponseSchema>;
type AttachBarcodeResponse = z.infer<typeof attachBarcodeResponseSchema>;
type WorkOrderConsumable = z.infer<typeof workOrderConsumableSchema>;

export class ApiClient {
  private readonly http: HttpClient;

  constructor(baseUrl: string, token?: string) {
    this.http = new HttpClient(baseUrl, token);
  }

  me(): Promise<MeResponse> {
    return this.http.request('/me');
  }

  listDevUsers(): Promise<DevAuthUser[]> {
    return this.http.request('/dev-auth/users');
  }

  issueDevToken(userId: string): Promise<IssueDevTokenResponse> {
    return this.http.request('/dev-auth/token', { method: 'POST', body: { userId } });
  }

  listWorkOrders(query = ''): Promise<Paged<WorkOrder>> {
    return this.http.request(`/workorders${query ? `?${query}` : ''}`);
  }

  createWorkOrder(body: Record<string, unknown>): Promise<WorkOrder> {
    return this.http.request('/workorders', { method: 'POST', body });
  }

  getWorkOrder(id: string): Promise<WorkOrder> {
    return this.http.request(`/workorders/${id}`);
  }

  assignWorkOrder(id: string, body: Record<string, unknown>): Promise<{ success: true }> {
    return this.http.request(`/workorders/${id}/assign`, { method: 'POST', body });
  }

  updateWorkOrder(id: string, body: Record<string, unknown>): Promise<WorkOrder> {
    return this.http.request(`/workorders/${id}`, { method: 'PATCH', body });
  }

  listWorkOrderConsumables(id: string): Promise<WorkOrderConsumable[]> {
    return this.http.request(`/workorders/${id}/consumables`);
  }

  addWorkOrderConsumable(
    id: string,
    body: { equipmentItemId: string; quantity?: number; note?: string },
  ): Promise<WorkOrderConsumable> {
    return this.http.request(`/workorders/${id}/consumables`, { method: 'POST', body });
  }

  setPlanningOwner(id: string, planningOwnerUserId: string | null): Promise<WorkOrder> {
    return this.http.request(`/workorders/${id}/planning-owner`, {
      method: 'POST',
      body: { planningOwnerUserId },
    });
  }

  listWorkOrderSchedule(id: string): Promise<unknown[]> {
    return this.http.request(`/workorders/${id}/schedule`);
  }

  createWorkOrderSchedule(
    id: string,
    body: { assigneeUserId?: string; assigneeTeamId?: string; startAt: string; endAt: string; note?: string; status?: string },
  ): Promise<unknown> {
    return this.http.request(`/workorders/${id}/schedule`, { method: 'POST', body });
  }

  deleteWorkOrderSchedule(id: string, scheduleId: string): Promise<{ success: true }> {
    return this.http.request(`/workorders/${id}/schedule/${scheduleId}`, { method: 'DELETE' });
  }

  listEquipment(query = ''): Promise<EquipmentItem[]> {
    return this.http.request(`/equipment${query ? `?${query}` : ''}`);
  }

  listEquipmentReservations(query = ''): Promise<Paged<EquipmentReservation>> {
    return this.http.request(`/equipment/reservations${query ? `?${query}` : ''}`);
  }

  reserveEquipment(body: Record<string, unknown>): Promise<unknown> {
    return this.http.request('/equipment/reserve', { method: 'POST', body });
  }

  lookupEquipmentByCode(code: string): Promise<EquipmentLookupResponse> {
    const query = new URLSearchParams({ code }).toString();
    return this.http.request(`/equipment/lookup?${query}`);
  }

  attachEquipmentBarcode(id: string, barcode: string): Promise<AttachBarcodeResponse> {
    return this.http.request(`/equipment/${id}/barcode`, { method: 'POST', body: { barcode } });
  }

  listTimesheets(query?: string | { from?: string; to?: string; userId?: string }): Promise<unknown[]> {
    if (typeof query === 'string') {
      return this.http.request(`/timesheets${query ? `?${query}` : ''}`);
    }

    const params = new URLSearchParams();
    if (query?.from) params.set('from', query.from);
    if (query?.to) params.set('to', query.to);
    if (query?.userId) params.set('userId', query.userId);
    const qs = params.toString();
    return this.http.request(`/timesheets${qs ? `?${qs}` : ''}`);
  }

  createTimesheet(body: Record<string, unknown>): Promise<unknown> {
    return this.http.request('/timesheets', { method: 'POST', body });
  }

  updateTimesheet(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.request(`/timesheets/${id}`, { method: 'PATCH', body });
  }

  deleteTimesheet(id: string): Promise<unknown> {
    return this.http.request(`/timesheets/${id}`, { method: 'DELETE' });
  }

  weeklySummary(weekStart?: string, userId?: string): Promise<unknown> {
    const params = new URLSearchParams();
    if (weekStart) params.set('weekStart', weekStart);
    if (userId) params.set('userId', userId);
    const qs = params.toString();
    return this.http.request(`/timesheets/weekly-summary${qs ? `?${qs}` : ''}`);
  }

  listTodos(query = ''): Promise<unknown[]> {
    return this.http.request(`/todos${query ? `?${query}` : ''}`);
  }

  createTodo(body: Record<string, unknown>): Promise<unknown> {
    return this.http.request('/todos', { method: 'POST', body });
  }

  updateTodo(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.request(`/todos/${id}`, { method: 'PATCH', body });
  }

  deleteTodo(id: string): Promise<unknown> {
    return this.http.request(`/todos/${id}`, { method: 'DELETE' });
  }

  getDashboard(): Promise<unknown> {
    return this.http.request('/dashboard');
  }

  updateDashboard(body: Record<string, unknown>): Promise<unknown> {
    return this.http.request('/dashboard', { method: 'PUT', body });
  }

  listSchedule(query: {
    from: string;
    to: string;
    scope?: 'mine' | 'all';
    assigneeUserId?: string;
    assigneeTeamId?: string;
    equipmentItemId?: string;
  }): Promise<unknown[]> {
    const params = new URLSearchParams();
    params.set('from', query.from);
    params.set('to', query.to);
    if (query.scope) params.set('scope', query.scope);
    if (query.assigneeUserId) params.set('assigneeUserId', query.assigneeUserId);
    if (query.assigneeTeamId) params.set('assigneeTeamId', query.assigneeTeamId);
    if (query.equipmentItemId) params.set('equipmentItemId', query.equipmentItemId);
    return this.http.request(`/schedule?${params.toString()}`);
  }
}
