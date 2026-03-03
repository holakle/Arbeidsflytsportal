'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!code || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, code, {
        format: 'CODE128',
        displayValue: false,
        margin: 0,
        height: 56,
        width: 1.6,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      // noop, we still show the raw code below.
    }
  }, [code]);

  if (!code) return <div className="text-sm text-slate-500">Ingen barcode registrert.</div>;

  return (
    <div className="space-y-2">
      <svg
        ref={svgRef}
        className="h-14 w-[260px] max-w-full rounded border bg-white p-1"
        aria-label={`Strekkode ${code}`}
      />
      <p className="text-xs tracking-wide text-slate-600">{code}</p>
    </div>
  );
}

export default function EquipmentDetailPage() {
  const router = useRouter();
  const token = getDevToken();
  const params = useParams<{ id: string }>();
  const equipmentId = params?.id ?? '';
  const [item, setItem] = useState<EquipmentItem | null>(null);
  const [reservations, setReservations] = useState<EquipmentReservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingEquipment, setDeletingEquipment] = useState(false);
  const [deletingReservationId, setDeletingReservationId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) {
      setError('Mangler NEXT_PUBLIC_DEV_TOKEN i apps/web/.env.local');
      setLoading(false);
      return;
    }

    try {
      const [allItems, reservationRes] = await Promise.all([
        apiClient(token).listEquipment(),
        apiClient(token).listEquipmentReservations(
          `page=1&limit=100&equipmentItemId=${equipmentId}`,
        ),
      ]);

      const found =
        (allItems as EquipmentItem[]).find((candidate) => candidate.id === equipmentId) ?? null;
      setItem(found);
      setReservations((reservationRes.items ?? []) as EquipmentReservation[]);
      setError(found ? null : 'Fant ikke utstyr med denne ID-en i din organisasjon.');
    } catch (err) {
      setError(toErrorMessage(err, 'Kunne ikke hente utstyrsinformasjon.'));
    } finally {
      setLoading(false);
    }
  }, [equipmentId, token]);

  useEffect(() => {
    if (equipmentId) {
      void loadData();
    } else {
      setError('Mangler equipment-id i URL.');
      setLoading(false);
    }
  }, [equipmentId, loadData]);

  const activeReservation = useMemo(() => {
    const now = new Date();
    return reservations.find((r) => new Date(r.startAt) <= now && now <= new Date(r.endAt)) ?? null;
  }, [reservations]);

  async function removeEquipmentItem() {
    if (!token || !item || deletingEquipment) return;
    const ok = window.confirm('Er du sikker på at du vil slette/deaktivere dette utstyret?');
    if (!ok) return;

    setDeletingEquipment(true);
    try {
      const res = await apiClient(token).deleteEquipmentItem(item.id);
      setSuccess(`Utstyr slettet. Avsluttede reservasjoner: ${res.canceledReservations}.`);
      setError(null);
      router.push('/equipment');
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke slette utstyr.'));
    } finally {
      setDeletingEquipment(false);
    }
  }

  async function removeReservation(reservationId: string) {
    if (!token || deletingReservationId) return;
    const ok = window.confirm('Slette denne reservasjonen?');
    if (!ok) return;

    setDeletingReservationId(reservationId);
    try {
      await apiClient(token).deleteEquipmentReservation(reservationId);
      setSuccess('Reservasjon slettet.');
      setError(null);
      await loadData();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke slette reservasjon.'));
    } finally {
      setDeletingReservationId(null);
    }
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link className="text-sm text-sky-700 hover:underline" href="/equipment">
            ← Tilbake til utstyr
          </Link>
          <h1 className="text-2xl font-semibold">Produktinfo</h1>
        </div>
        <ConnectionStatus />
      </div>

      {loading ? <div className="rounded border bg-white px-3 py-2 text-sm">Laster...</div> : null}
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

      {!loading && item ? (
        <>
          <div className="flex justify-end">
            <button
              className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              onClick={() => void removeEquipmentItem()}
              disabled={deletingEquipment}
            >
              {deletingEquipment ? 'Sletter...' : 'Slett utstyr'}
            </button>
          </div>

          <section className="grid gap-4 rounded border bg-white p-4 md:grid-cols-2">
            <div className="space-y-2">
              <h2 className="text-lg font-medium">{item.name}</h2>
              <dl className="space-y-1 text-sm">
                <div>
                  <dt className="inline text-slate-500">ID: </dt>
                  <dd className="inline">{item.id}</dd>
                </div>
                <div>
                  <dt className="inline text-slate-500">Serial: </dt>
                  <dd className="inline">{item.serialNumber ?? '-'}</dd>
                </div>
                <div>
                  <dt className="inline text-slate-500">Type: </dt>
                  <dd className="inline">
                    {item.type === 'CONSUMABLE' ? 'Forbruksmateriell' : 'Utstyr'}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-slate-500">Aktiv: </dt>
                  <dd className="inline">{item.active ? 'Ja' : 'Nei'}</dd>
                </div>
                <div>
                  <dt className="inline text-slate-500">Status nå: </dt>
                  <dd className="inline">
                    {item.type === 'CONSUMABLE'
                      ? 'Legges manuelt pa WO'
                      : activeReservation
                        ? 'Booket na'
                        : 'Ledig na'}
                  </dd>
                </div>
                {activeReservation?.workOrder ? (
                  <div>
                    <dt className="inline text-slate-500">Aktiv WO: </dt>
                    <dd className="inline">{activeReservation.workOrder.title}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">Strekkode</h3>
              <BarcodePreview code={item.barcode} />
            </div>
          </section>

          <section className="rounded border bg-white p-4">
            <h2 className="mb-2 text-lg">Reservasjoner</h2>
            {reservations.length === 0 ? (
              <p className="text-sm text-slate-500">Ingen reservasjoner registrert.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-600">
                      <th className="py-2">Workorder</th>
                      <th className="py-2">Start</th>
                      <th className="py-2">Slutt</th>
                      <th className="py-2">Handling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((reservation) => (
                      <tr key={reservation.id} className="border-b">
                        <td className="py-2">{reservation.workOrder?.title ?? '-'}</td>
                        <td className="py-2">{formatDate(reservation.startAt)}</td>
                        <td className="py-2">{formatDate(reservation.endAt)}</td>
                        <td className="py-2">
                          <button
                            className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                            onClick={() => void removeReservation(reservation.id)}
                            disabled={deletingReservationId === reservation.id}
                          >
                            {deletingReservationId === reservation.id ? 'Sletter...' : 'Slett'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
