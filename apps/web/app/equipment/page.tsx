'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';
import { ConnectionStatus } from '@/components/dev/connection-status';

type EquipmentItem = {
  id: string;
  name: string;
  serialNumber: string | null;
  barcode: string | null;
  type: 'EQUIPMENT' | 'CONSUMABLE';
  active: boolean;
};

type EquipmentReservation = {
  id: string;
  equipmentItemId: string;
  startAt: string;
  endAt: string;
  equipmentItem?: { id: string; name: string; serialNumber: string | null };
  workOrder?: { id: string; title: string; status: string };
};

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('no-NO');
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

function BarcodePreview({ code }: { code: string | null }) {
  if (!code) return <span className="text-slate-400">-</span>;
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, code, {
        format: 'CODE128',
        displayValue: false,
        margin: 0,
        height: 36,
        width: 1.3,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      // If rendering fails for unexpected value, keep the text fallback below.
    }
  }, [code]);

  return (
    <div className="inline-flex flex-col">
      <svg ref={svgRef} className="h-9 w-[180px]" aria-label={`Strekkode ${code}`} />
      <span className="text-[10px] tracking-wide text-slate-500">{code}</span>
    </div>
  );
}

export default function EquipmentPage() {
  const token = getDevToken();
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [reservations, setReservations] = useState<EquipmentReservation[]>([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EQUIPMENT' | 'CONSUMABLE'>('ALL');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token) {
      setError('Mangler NEXT_PUBLIC_DEV_TOKEN i apps/web/.env.local');
      return;
    }
    try {
      const [itemRes, reservationRes] = await Promise.all([
        apiClient(token).listEquipment(),
        apiClient(token).listEquipmentReservations('page=1&limit=100'),
      ]);
      setItems(itemRes as EquipmentItem[]);
      setReservations((reservationRes.items ?? []) as EquipmentReservation[]);
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err, 'Kunne ikke hente utstyrsdata.'));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const reservedNow = useMemo(() => {
    const now = new Date();
    return new Set(reservations.filter((r) => new Date(r.startAt) <= now && now <= new Date(r.endAt)).map((r) => r.equipmentItemId));
  }, [reservations]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesType = typeFilter === 'ALL' ? true : item.type === typeFilter;
      if (!matchesType) return false;
      if (!q) return true;
      return [item.id, item.name, item.serialNumber ?? '', item.barcode ?? '', item.type].join(' ').toLowerCase().includes(q);
    });
  }, [items, query, typeFilter]);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Utstyr</h1>
        <ConnectionStatus />
      </div>

      <div className="flex gap-2">
        <Link className="rounded border px-3 py-2 text-sm hover:bg-slate-50" href="/equipment/scan">
          Apne scanner
        </Link>
        <button className="rounded border px-3 py-2 text-sm hover:bg-slate-50" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Equipment items</h2>
        <div className="mb-2 grid gap-2 md:grid-cols-3">
          <input
            className="w-full rounded border px-3 py-2 text-sm md:col-span-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sok pa navn/serial/barcode"
          />
          <select
            className="rounded border px-3 py-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'EQUIPMENT' | 'CONSUMABLE')}
          >
            <option value="ALL">Alle typer</option>
            <option value="EQUIPMENT">Utstyr (bookbar)</option>
            <option value="CONSUMABLE">Forbruksmateriell</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2">Navn</th>
                <th className="py-2">Serial</th>
                <th className="py-2">Type</th>
                <th className="py-2">Status</th>
                <th className="py-2">Strekkode</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">
                    <Link className="text-sky-700 hover:underline" href={`/equipment/${item.id}`}>
                      {item.name}
                    </Link>
                  </td>
                  <td className="py-2">{item.serialNumber ?? '-'}</td>
                  <td className="py-2">{item.type === 'CONSUMABLE' ? 'Forbruksmateriell' : 'Utstyr'}</td>
                  <td className="py-2">{item.type === 'CONSUMABLE' ? 'Legges manuelt pa WO' : reservedNow.has(item.id) ? 'Booket na' : 'Ledig na'}</td>
                  <td className="py-2">
                    <BarcodePreview code={item.barcode} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Reservasjoner</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2">Utstyr</th>
                <th className="py-2">Workorder</th>
                <th className="py-2">Start</th>
                <th className="py-2">Slutt</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id} className="border-b">
                  <td className="py-2">{reservation.equipmentItem?.name ?? reservation.equipmentItemId}</td>
                  <td className="py-2">{reservation.workOrder?.title ?? '-'}</td>
                  <td className="py-2">{formatDate(reservation.startAt)}</td>
                  <td className="py-2">{formatDate(reservation.endAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
