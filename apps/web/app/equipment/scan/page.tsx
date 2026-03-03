'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getActiveUser, getDevToken } from '@/lib/auth';

type ScanState =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'processing'
  | 'error'
  | 'permission_denied'
  | 'insecure_context';
type LookupResult = Awaited<ReturnType<ReturnType<typeof apiClient>['lookupEquipmentByCode']>>;
type EquipmentItem = Awaited<ReturnType<ReturnType<typeof apiClient>['listEquipment']>>[number];
type WorkOrder = Awaited<
  ReturnType<ReturnType<typeof apiClient>['listWorkOrders']>
>['items'][number];

const SCAN_COOLDOWN_MS = 1800;

export default function ScanPage() {
  const token = getDevToken();
  const activeUser = getActiveUser();
  const canAttach = useMemo(
    () =>
      (activeUser?.roles ?? []).some((role) =>
        ['planner', 'org_admin', 'system_admin'].includes(role),
      ),
    [activeUser?.roles],
  );
  const canRegisterUsage = useMemo(
    () =>
      (activeUser?.roles ?? []).some((role) =>
        ['planner', 'technician', 'org_admin', 'system_admin'].includes(role),
      ),
    [activeUser?.roles],
  );

  const [state, setState] = useState<ScanState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]);
  const [attachItemId, setAttachItemId] = useState('');
  const [isAttaching, setIsAttaching] = useState(false);

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('');
  const [usageQty, setUsageQty] = useState(1);
  const [usageNote, setUsageNote] = useState('');
  const [isRegisteringUsage, setIsRegisteringUsage] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const zxingReaderRef = useRef<any>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const detectorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCodeRef = useRef<string>('');
  const lastScanAtRef = useRef<number>(0);
  const lookupInFlightRef = useRef<boolean>(false);

  const stopScanning = useCallback(() => {
    if (zxingControlsRef.current) {
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }
    if (zxingReaderRef.current) {
      zxingReaderRef.current.reset?.();
      zxingReaderRef.current = null;
    }
    if (detectorIntervalRef.current) {
      clearInterval(detectorIntervalRef.current);
      detectorIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
  }, []);

  const runLookup = useCallback(
    async (rawCode: string) => {
      if (!token) {
        setState('error');
        setMessage('Mangler token. Sett NEXT_PUBLIC_DEV_TOKEN eller logg inn med dev-auth.');
        return;
      }
      const normalized = rawCode.trim().toUpperCase();
      if (!normalized) return;
      const now = Date.now();
      if (lookupInFlightRef.current) return;
      if (normalized === lastCodeRef.current && now - lastScanAtRef.current < SCAN_COOLDOWN_MS)
        return;

      lookupInFlightRef.current = true;
      lastCodeRef.current = normalized;
      lastScanAtRef.current = now;
      setState('processing');
      setMessage(`Soker etter ${normalized} ...`);

      try {
        const lookup = await apiClient(token).lookupEquipmentByCode(normalized);
        setResult(lookup);
        if (lookup.found) {
          if (lookup.item?.type === 'CONSUMABLE') {
            setMessage(`Fant forbruksmateriell: ${lookup.item?.name ?? lookup.item?.id}`);
            if (canRegisterUsage) {
              const wo = await apiClient(token).listWorkOrders('page=1&limit=100');
              setWorkOrders(wo.items);
              if (wo.items.length > 0 && !selectedWorkOrderId) {
                const firstWorkOrder = wo.items.at(0);
                if (firstWorkOrder) {
                  setSelectedWorkOrderId(firstWorkOrder.id);
                }
              }
            }
          } else {
            setMessage(`Fant utstyr: ${lookup.item?.name ?? lookup.item?.id}`);
          }
        } else {
          setMessage('Ingen utstyr funnet pa denne koden.');
          if (canAttach) {
            const items = await apiClient(token).listEquipment();
            setEquipmentItems(items);
            const firstItem = items.at(0);
            if (firstItem) {
              setAttachItemId(firstItem.id);
            }
          }
        }
      } catch (error) {
        setState('error');
        setMessage(error instanceof Error ? error.message : 'Lookup feilet');
        return;
      } finally {
        lookupInFlightRef.current = false;
      }

      setState('scanning');
    },
    [canAttach, canRegisterUsage, selectedWorkOrderId, token],
  );

  const startBarcodeDetectorFallback = useCallback(async () => {
    const detectorCtor = (window as any).BarcodeDetector;
    if (!detectorCtor) {
      setState('error');
      setMessage('Ingen stottet scanner funnet i nettleseren. Bruk manuell input.');
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    mediaStreamRef.current = stream;
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    await videoRef.current.play();
    const detector = new detectorCtor({
      formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8'],
    });
    detectorIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || lookupInFlightRef.current) return;
      try {
        const hits = await detector.detect(videoRef.current);
        const value = hits?.[0]?.rawValue;
        if (value) {
          void runLookup(value);
        }
      } catch {
        // ignore frame-level detect errors
      }
    }, 450);
  }, [runLookup]);

  const startScanning = useCallback(async () => {
    stopScanning();
    setResult(null);
    setMessage(null);
    if (!window.isSecureContext) {
      setState('insecure_context');
      setMessage('Kamera krever HTTPS eller localhost. Bruk Caddy/tunnel-oppsett for mobil.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('error');
      setMessage('Nettleseren stotter ikke getUserMedia.');
      return;
    }
    if (!token) {
      setState('error');
      setMessage('Mangler token. Sett NEXT_PUBLIC_DEV_TOKEN eller logg inn med dev-auth.');
      return;
    }

    setState('starting');
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      zxingReaderRef.current = reader;
      await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (scanResult: any, _error: unknown, controls: any) => {
          if (controls) {
            zxingControlsRef.current = controls;
          }
          if (scanResult?.getText) {
            void runLookup(scanResult.getText());
          }
        },
      );
      setState('scanning');
    } catch {
      try {
        await startBarcodeDetectorFallback();
        setState('scanning');
      } catch (error) {
        const e = error as Error & { name?: string };
        if (e?.name === 'NotAllowedError') {
          setState('permission_denied');
          setMessage('Kameratilgang ble avslatt. Gi tilgang eller bruk manuell input.');
        } else {
          setState('error');
          setMessage(e?.message ?? 'Kunne ikke starte kamera.');
        }
      }
    }
  }, [runLookup, startBarcodeDetectorFallback, stopScanning, token]);

  useEffect(() => {
    void startScanning();
    return () => stopScanning();
  }, [startScanning, stopScanning]);

  async function handleAttach() {
    if (!token || !result || result.found || !attachItemId) return;
    setIsAttaching(true);
    try {
      const response = await apiClient(token).attachEquipmentBarcode(attachItemId, result.code);
      setMessage(`Barcode knyttet til ${response.item.name}.`);
      const refreshed = await apiClient(token).lookupEquipmentByCode(result.code);
      setResult(refreshed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Knytning feilet');
    } finally {
      setIsAttaching(false);
    }
  }

  async function registerConsumableUsage() {
    if (!token || !result?.found || result.item?.type !== 'CONSUMABLE' || !selectedWorkOrderId)
      return;
    setIsRegisteringUsage(true);
    try {
      await apiClient(token).addWorkOrderConsumable(selectedWorkOrderId, {
        equipmentItemId: result.item.id,
        quantity: usageQty,
        note: usageNote.trim() ? usageNote.trim() : undefined,
      });
      setMessage('Forbruk registrert pa arbeidsordre.');
      setUsageNote('');
      setUsageQty(1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Klarte ikke registrere forbruk');
    } finally {
      setIsRegisteringUsage(false);
    }
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Utstyrsscanning</h1>
        <button className="rounded border px-3 py-2 text-sm" onClick={() => void startScanning()}>
          Scan again
        </button>
      </div>

      <p className="text-sm text-slate-600">Status: {state}</p>
      {message ? (
        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          {message}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="aspect-video w-full rounded border bg-black object-cover"
        />
        <p className="mt-2 text-xs text-slate-500">
          Hvis kamera ikke virker: bruk manuell input under.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Manuell kode</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            placeholder="Skriv barcode"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <button
            className="rounded bg-accent px-3 py-2 text-white"
            onClick={() => void runLookup(manualCode)}
          >
            Sok
          </button>
        </div>
      </section>

      {result ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-medium">Resultat</h2>
          <p className="text-sm">Kode: {result.code}</p>
          <p className="text-sm">Status: {result.status}</p>
          {result.found && result.item ? (
            <div className="mt-3 space-y-1 text-sm">
              <p>Navn: {result.item.name}</p>
              <p>Type: {result.item.type === 'CONSUMABLE' ? 'Forbruksmateriell' : 'Utstyr'}</p>
              <p>Serial: {result.item.serialNumber ?? '-'}</p>
              <p>Barcode: {result.item.barcode ?? '-'}</p>
              {result.item.type === 'EQUIPMENT' ? (
                <div className="mt-3 flex gap-2">
                  <Link
                    className="rounded border px-3 py-2 text-sm"
                    href={`/overview?equipmentId=${result.item.id}`}
                  >
                    Apne
                  </Link>
                  <Link
                    className="rounded bg-accent px-3 py-2 text-sm text-white"
                    href={`/planner?equipmentItemId=${result.item.id}`}
                  >
                    Reserver
                  </Link>
                </div>
              ) : null}
              {result.item.type === 'CONSUMABLE' && canRegisterUsage ? (
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <select
                    className="rounded border px-3 py-2 md:col-span-2"
                    value={selectedWorkOrderId}
                    onChange={(e) => setSelectedWorkOrderId(e.target.value)}
                  >
                    {workOrders.map((wo) => (
                      <option key={wo.id} value={wo.id}>
                        {wo.title} ({wo.status})
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded border px-3 py-2"
                    type="number"
                    min={1}
                    value={usageQty}
                    onChange={(e) => setUsageQty(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <button
                    className="rounded bg-accent px-3 py-2 text-sm text-white disabled:opacity-50"
                    onClick={() => void registerConsumableUsage()}
                    disabled={!selectedWorkOrderId || isRegisteringUsage}
                  >
                    {isRegisteringUsage ? 'Lagrer...' : 'Registrer forbruk'}
                  </button>
                  <input
                    className="rounded border px-3 py-2 md:col-span-4"
                    value={usageNote}
                    onChange={(e) => setUsageNote(e.target.value)}
                    placeholder="Notat (valgfritt)"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {!result.found && canAttach ? (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium">Knytt til utstyr</h3>
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded border px-3 py-2"
                  value={attachItemId}
                  onChange={(e) => setAttachItemId(e.target.value)}
                >
                  {equipmentItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.serialNumber ?? item.id})
                    </option>
                  ))}
                </select>
                <button
                  className="rounded bg-accent px-3 py-2 text-white disabled:opacity-50"
                  onClick={() => void handleAttach()}
                  disabled={!attachItemId || isAttaching}
                >
                  {isAttaching ? 'Knytter...' : 'Knytt'}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
