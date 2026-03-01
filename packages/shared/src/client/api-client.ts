import type { z } from 'zod';
import type { MeResponse } from '../schemas/auth.schema';
import type { equipmentItemSchema, equipmentReservationSchema } from '../schemas/equipment.schema';
import type { WorkOrder } from '../schemas/workorder.schema';
import { HttpClient } from './http-client';

type Paged<T> = { items: T[]; page: number; limit: number; total: number };
type EquipmentItem = z.infer<typeof equipmentItemSchema>;
type EquipmentReservation = z.infer<typeof equipmentReservationSchema>;

export class ApiClient {
  private readonly http: HttpClient;

  constructor(baseUrl: string, token?: string) {
    this.http = new HttpClient(baseUrl, token);
  }

  me(): Promise<MeResponse> {
    return this.http.request('/me');
  }

  listWorkOrders(query = ''): Promise<Paged<WorkOrder>> {
    return this.http.request(`/workorders${query ? `?${query}` : ''}`);
  }

  createWorkOrder(body: Record<string, unknown>): Promise<WorkOrder> {
    return this.http.request('/workorders', { method: 'POST', body });
  }

  assignWorkOrder(id: string, body: Record<string, unknown>): Promise<{ success: true }> {
    return this.http.request(`/workorders/${id}/assign`, { method: 'POST', body });
  }

  updateWorkOrder(id: string, body: Record<string, unknown>): Promise<WorkOrder> {
    return this.http.request(`/workorders/${id}`, { method: 'PATCH', body });
  }

  listEquipment(): Promise<EquipmentItem[]> {
    return this.http.request('/equipment');
  }

  listEquipmentReservations(query = ''): Promise<Paged<EquipmentReservation>> {
    return this.http.request(`/equipment/reservations${query ? `?${query}` : ''}`);
  }

  reserveEquipment(body: Record<string, unknown>): Promise<unknown> {
    return this.http.request('/equipment/reserve', { method: 'POST', body });
  }

  listTimesheets(query = ''): Promise<unknown[]> {
    return this.http.request(`/timesheets${query ? `?${query}` : ''}`);
  }

  createTimesheet(body: Record<string, unknown>): Promise<unknown> {
    return this.http.request('/timesheets', { method: 'POST', body });
  }

  weeklySummary(weekStart?: string): Promise<unknown> {
    return this.http.request(`/timesheets/weekly-summary${weekStart ? `?weekStart=${weekStart}` : ''}`);
  }

  listTodos(query = ''): Promise<unknown[]> {
    return this.http.request(`/todos${query ? `?${query}` : ''}`);
  }

  createTodo(body: Record<string, unknown>): Promise<unknown> {
    return this.http.request('/todos', { method: 'POST', body });
  }

  getDashboard(): Promise<unknown> {
    return this.http.request('/dashboard');
  }

  updateDashboard(body: Record<string, unknown>): Promise<unknown> {
    return this.http.request('/dashboard', { method: 'PUT', body });
  }
}
