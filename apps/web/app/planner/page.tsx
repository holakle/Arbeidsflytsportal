'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';
import { ConnectionStatus } from '@/components/dev/connection-status';

type WorkOrder = {
  id: string;
  title: string;
  status: string;
};

export default function PlannerPage() {
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [title, setTitle] = useState('');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [equipmentItemId, setEquipmentItemId] = useState('');
  const [reserveStart, setReserveStart] = useState('');
  const [reserveEnd, setReserveEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const token = getDevToken();

  async function load() {
    if (!token) {
      setError('Mangler NEXT_PUBLIC_DEV_TOKEN i apps/web/.env.local');
      return;
    }
    try {
      const data = await apiClient(token).listWorkOrders('page=1&limit=20');
      setItems(data.items as WorkOrder[]);
      setError(null);
    } catch {
      setError('Kunne ikke hente arbeidsordre. Sjekk at API kjører og token er gyldig.');
    }
  }

  async function createWorkOrder() {
    if (!title || !token) return;
    try {
      await apiClient(token).createWorkOrder({ title });
      setTitle('');
      await load();
    } catch {
      setError('Kunne ikke opprette arbeidsordre.');
    }
  }

  async function assignUser() {
    if (!selectedWorkOrderId || !assigneeUserId || !token) return;
    try {
      await apiClient(token).assignWorkOrder(selectedWorkOrderId, { assigneeUserId });
      setAssigneeUserId('');
      setError(null);
    } catch {
      setError('Kunne ikke tildele arbeidsordre.');
    }
  }

  async function reserveEquipment() {
    if (!selectedWorkOrderId || !equipmentItemId || !reserveStart || !reserveEnd || !token) return;
    try {
      await apiClient(token).reserveEquipment({
        workOrderId: selectedWorkOrderId,
        equipmentItemId,
        startAt: reserveStart,
        endAt: reserveEnd,
      });
      setError(null);
    } catch {
      setError('Kunne ikke booke utstyr.');
    }
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Planner</h1>
        <ConnectionStatus />
      </div>
      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}
      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Opprett arbeidsordre</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tittel"
          />
          <button className="rounded bg-accent px-3 py-2 text-white" onClick={createWorkOrder}>
            Opprett
          </button>
        </div>
      </div>
      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Mine arbeidsordre</h2>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded border p-2">
              <strong>{item.title}</strong>
              <div className="text-sm text-gray-600">Status: {item.status}</div>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Tildel person/team</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <input
            className="rounded border px-3 py-2"
            value={selectedWorkOrderId}
            onChange={(e) => setSelectedWorkOrderId(e.target.value)}
            placeholder="WorkOrder ID"
          />
          <input
            className="rounded border px-3 py-2"
            value={assigneeUserId}
            onChange={(e) => setAssigneeUserId(e.target.value)}
            placeholder="Assignee User ID"
          />
          <button className="rounded bg-accent px-3 py-2 text-white" onClick={assignUser}>
            Tildel
          </button>
        </div>
      </div>
      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Book utstyr</h2>
        <div className="grid gap-2 md:grid-cols-5">
          <input
            className="rounded border px-3 py-2"
            value={selectedWorkOrderId}
            onChange={(e) => setSelectedWorkOrderId(e.target.value)}
            placeholder="WorkOrder ID"
          />
          <input
            className="rounded border px-3 py-2"
            value={equipmentItemId}
            onChange={(e) => setEquipmentItemId(e.target.value)}
            placeholder="Equipment ID"
          />
          <input
            className="rounded border px-3 py-2"
            value={reserveStart}
            onChange={(e) => setReserveStart(e.target.value)}
            placeholder="Start ISO"
          />
          <input
            className="rounded border px-3 py-2"
            value={reserveEnd}
            onChange={(e) => setReserveEnd(e.target.value)}
            placeholder="End ISO"
          />
          <button className="rounded bg-accent px-3 py-2 text-white" onClick={reserveEquipment}>
            Book
          </button>
        </div>
      </div>
    </main>
  );
}
