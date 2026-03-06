'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ConnectionStatus } from '@/components/dev/connection-status';
import { apiClient } from '@/lib/api-client';
import { getDevToken } from '@/lib/auth';

type WorkOrder = {
  id: string;
  title: string;
  timesheetCode: string;
  description: string | null;
  status: string;
  customerName?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  addressLine1?: string | null;
  postalCode?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  departmentId: string | null;
  locationId: string | null;
  projectId: string | null;
  department?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  assignments?: Array<{ id: string; assigneeUserId: string | null; assigneeTeamId: string | null }>;
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

function toMapSearchUrl(params: { lat?: number | null; lng?: number | null; address?: string }) {
  if (params.lat != null && params.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${params.lat},${params.lng}`;
  }

  const query = params.address?.trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Kunne ikke lese vedlegget.'));
        return;
      }
      const base64 = reader.result.includes(',')
        ? (reader.result.split(',').at(-1) ?? '')
        : reader.result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Kunne ikke lese vedlegget.'));
    reader.readAsDataURL(file);
  });
}

function paginate<T>(items: T[], page: number, pageSize = 8) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return { pageItems: items.slice(start, start + pageSize), totalPages, page: safePage };
}

export default function WorkOrdersPage() {
  const token = getDevToken();
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [locating, setLocating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mapPreviewUrl = useMemo(() => {
    const latNum = lat.trim() ? Number(lat.trim().replace(',', '.')) : null;
    const lngNum = lng.trim() ? Number(lng.trim().replace(',', '.')) : null;
    const address = [addressLine1, postalCode, city].filter((v) => v.trim()).join(', ');

    if (latNum != null && Number.isFinite(latNum) && lngNum != null && Number.isFinite(lngNum)) {
      return toMapSearchUrl({ lat: latNum, lng: lngNum, address });
    }
    return toMapSearchUrl({ address });
  }, [addressLine1, city, lat, lng, postalCode]);

  async function load() {
    if (!token) {
      setError('Mangler NEXT_PUBLIC_DEV_TOKEN i apps/web/.env.local');
      return;
    }
    try {
      const res = await apiClient(token).listWorkOrders('page=1&limit=100');
      setItems(res.items as WorkOrder[]);
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err, 'Kunne ikke hente arbeidsordre.'));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Geolokasjon er ikke støttet i denne nettleseren.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setSuccess('Posisjon hentet fra kart/GPS.');
        setError(null);
        setLocating(false);
      },
      () => {
        setError('Kunne ikke hente posisjon fra kart/GPS.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  async function createWorkOrder() {
    if (!token || !title.trim() || creating) return;

    const latRaw = lat.trim();
    const lngRaw = lng.trim();
    const parsedLat = latRaw ? Number(latRaw.replace(',', '.')) : undefined;
    const parsedLng = lngRaw ? Number(lngRaw.replace(',', '.')) : undefined;
    if ((latRaw && !Number.isFinite(parsedLat)) || (lngRaw && !Number.isFinite(parsedLng))) {
      setError('Koordinater må være gyldige tall.');
      return;
    }
    if (parsedLat !== undefined && (parsedLat < -90 || parsedLat > 90)) {
      setError('Latitude må være mellom -90 og 90.');
      return;
    }
    if (parsedLng !== undefined && (parsedLng < -180 || parsedLng > 180)) {
      setError('Longitude må være mellom -180 og 180.');
      return;
    }

    setCreating(true);
    try {
      const created = (await apiClient(token).createWorkOrder({
        title: title.trim(),
        description: description.trim() ? description.trim() : undefined,
        customerName: customerName.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        city: city.trim() || undefined,
        lat: parsedLat,
        lng: parsedLng,
      })) as WorkOrder;

      let uploaded = 0;
      let uploadFailed = 0;
      for (const file of selectedFiles) {
        try {
          const contentBase64 = await readFileAsBase64(file);
          await apiClient(token).uploadWorkOrderAttachment(created.id, {
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            contentBase64,
            kind: 'GENERAL',
          });
          uploaded += 1;
        } catch {
          uploadFailed += 1;
        }
      }

      setTitle('');
      setDescription('');
      setCustomerName('');
      setContactName('');
      setContactPhone('');
      setAddressLine1('');
      setPostalCode('');
      setCity('');
      setLat('');
      setLng('');
      setSelectedFiles([]);
      const uploadMessage =
        uploaded > 0 || uploadFailed > 0
          ? ` Vedlegg lastet opp: ${uploaded}${uploadFailed > 0 ? `, feilet: ${uploadFailed}` : ''}.`
          : '';
      setSuccess(`Opprettet: ${created.title}.${uploadMessage}`);
      setError(null);
      await load();
    } catch (err) {
      setSuccess(null);
      setError(toErrorMessage(err, 'Kunne ikke opprette arbeidsordre.'));
    } finally {
      setCreating(false);
    }
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((wo) => {
      const statusMatch = statusFilter === 'ALL' || wo.status === statusFilter;
      const searchMatch =
        q.length === 0 ||
        [
          wo.title,
          wo.description ?? '',
          wo.id,
          wo.department?.name ?? '',
          wo.location?.name ?? '',
          wo.project?.name ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(q);
      return statusMatch && searchMatch;
    });
  }, [items, search, statusFilter]);

  const paging = paginate(filteredItems, page);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Arbeidsordre</h1>
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
        <h2 className="mb-2 text-lg">Opprett arbeidsordre</h2>
        <div className="grid gap-2">
          <input
            className="rounded border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tittel"
          />
          <textarea
            className="rounded border px-3 py-2"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beskrivelse (valgfri)"
          />
          <input
            className="rounded border px-3 py-2"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Kunde"
          />
          <input
            className="rounded border px-3 py-2"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Kontaktperson"
          />
          <input
            className="rounded border px-3 py-2"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="Telefon"
          />
          <input
            className="rounded border px-3 py-2"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            placeholder="Adresse"
          />
          <div className="grid gap-2 md:grid-cols-2">
            <input
              className="rounded border px-3 py-2"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="Postnummer"
            />
            <input
              className="rounded border px-3 py-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="By"
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <input
              className="rounded border px-3 py-2"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Latitude (valgfri)"
            />
            <input
              className="rounded border px-3 py-2"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="Longitude (valgfri)"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              onClick={useCurrentLocation}
              disabled={locating}
            >
              {locating ? 'Henter posisjon...' : 'Bruk min posisjon (kart)'}
            </button>
            {mapPreviewUrl ? (
              <a
                className="rounded border px-3 py-2 text-sm hover:bg-slate-50"
                href={mapPreviewUrl}
                target="_blank"
                rel="noreferrer"
              >
                Åpne i kart
              </a>
            ) : null}
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">Vedlegg (valgfri)</label>
            <input
              className="rounded border px-3 py-2 text-sm"
              type="file"
              multiple
              onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
            />
            {selectedFiles.length > 0 ? (
              <div className="text-xs text-slate-600">
                Valgte filer: {selectedFiles.map((file) => file.name).join(', ')}
              </div>
            ) : null}
          </div>
          <button
            className="w-fit rounded bg-accent px-3 py-2 text-white disabled:opacity-50"
            disabled={!title.trim() || creating}
            onClick={() => void createWorkOrder()}
          >
            {creating ? 'Oppretter...' : 'Opprett'}
          </button>
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg">Arbeidsordreliste</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Total: {items.length}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            READY_FOR_PLANNING: {items.filter((w) => w.status === 'READY_FOR_PLANNING').length}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            IN_PROGRESS: {items.filter((w) => w.status === 'IN_PROGRESS').length}
          </span>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-3">
          <input
            className="rounded border px-3 py-2 text-sm"
            placeholder="Sok pa tittel/id"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="rounded border px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Alle statuser</option>
            <option value="DRAFT">DRAFT</option>
            <option value="READY_FOR_PLANNING">READY_FOR_PLANNING</option>
            <option value="PLANNED">PLANNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="DONE">DONE</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-600">
                <th className="py-2">Tittel</th>
                <th className="py-2">Hovedkode</th>
                <th className="py-2">Status</th>
                <th className="py-2">Avdeling</th>
                <th className="py-2">Lokasjon</th>
                <th className="py-2">Prosjekt</th>
                <th className="py-2">Kunde</th>
                <th className="py-2">Adresse</th>
                <th className="py-2">Tildelt</th>
                <th className="py-2">Detaljer</th>
              </tr>
            </thead>
            <tbody>
              {paging.pageItems.map((item) => {
                const userCount = (item.assignments ?? []).filter((a) =>
                  Boolean(a.assigneeUserId),
                ).length;
                const teamCount = (item.assignments ?? []).filter((a) =>
                  Boolean(a.assigneeTeamId),
                ).length;

                return (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">
                      <Link
                        className="text-sky-700 hover:underline"
                        href={`/workorders/${item.id}`}
                      >
                        {item.title}
                      </Link>
                    </td>
                    <td className="py-2">
                      <code className="text-xs">{item.timesheetCode}</code>
                    </td>
                    <td className="py-2">{item.status}</td>
                    <td className="py-2">{item.department?.name ?? '-'}</td>
                    <td className="py-2">{item.location?.name ?? '-'}</td>
                    <td className="py-2">{item.project?.name ?? '-'}</td>
                    <td className="py-2">{item.customerName ?? '-'}</td>
                    <td className="py-2">
                      {[item.addressLine1, item.postalCode, item.city].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="py-2">
                      {userCount || teamCount ? `Bruker: ${userCount}, Team: ${teamCount}` : '-'}
                    </td>
                    <td className="py-2">
                      <Link
                        className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                        href={`/workorders/${item.id}`}
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <button
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            disabled={paging.page <= 1}
            onClick={() => setPage(paging.page - 1)}
          >
            Forrige
          </button>
          <span>
            Side {paging.page} av {paging.totalPages}
          </span>
          <button
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            disabled={paging.page >= paging.totalPages}
            onClick={() => setPage(paging.page + 1)}
          >
            Neste
          </button>
        </div>
      </section>
    </main>
  );
}
