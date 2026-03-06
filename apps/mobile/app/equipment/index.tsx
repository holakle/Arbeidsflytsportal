import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { mobileApiClient } from '../../src/api/client';
import { listPendingOperations } from '../../src/offline/pending-operations';
import {
  processPendingOperationsNow,
  queueOrRunEquipmentReserve,
  queueOrRunScanLookup,
} from '../../src/offline/queue-runner';
import { getLastOpenedWorkOrderId } from '../../src/workorders/last-opened-store';

type EquipmentItem = {
  id: string;
  name: string;
  serialNumber: string | null;
  barcode: string | null;
  type: 'EQUIPMENT' | 'CONSUMABLE';
};

type WorkOrder = {
  id: string;
  title: string;
  status: string;
};

type LookupResult = {
  code: string;
  found: boolean;
  status: 'AVAILABLE' | 'RESERVED_ACTIVE' | 'CONSUMABLE' | 'NOT_FOUND';
  item: EquipmentItem | null;
  activeReservation: {
    id: string;
    workOrderId: string | null;
    startAt: string;
    endAt: string;
    workOrder?: { id: string; title: string; status: string } | null;
  } | null;
};

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toLocalDateTime(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

function toIso(localDateTime: string) {
  const date = new Date(localDateTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default function EquipmentScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanHandled, setScanHandled] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [search, setSearch] = useState('');
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activeSessionWorkOrderId, setActiveSessionWorkOrderId] = useState<string | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [showJobList, setShowJobList] = useState(false);
  const [reserveStart, setReserveStart] = useState('');
  const [reserveEnd, setReserveEnd] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCounts, setPendingCounts] = useState({ pending: 0, failed: 0 });

  const filteredEquipment = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return equipment;
    return equipment.filter((item) =>
      [item.id, item.name, item.serialNumber ?? '', item.barcode ?? ''].join(' ').toLowerCase().includes(q),
    );
  }, [equipment, search]);

  const selectedWorkOrderLabel = useMemo(() => {
    if (!selectedWorkOrderId) return 'Uten arbeidsordre';
    const row = workOrders.find((item) => item.id === selectedWorkOrderId);
    return row ? `${row.title} (${row.status})` : selectedWorkOrderId;
  }, [selectedWorkOrderId, workOrders]);

  async function refreshPending() {
    const operations = await listPendingOperations();
    setPendingCounts({
      pending: operations.filter((item) => item.status === 'Pending').length,
      failed: operations.filter((item) => item.status === 'Failed').length,
    });
  }

  async function load() {
    try {
      await processPendingOperationsNow();
      const api = await mobileApiClient();
      const [equipmentResult, workOrderResult, activeSession, lastOpened] = await Promise.all([
        api.listEquipment('type=EQUIPMENT'),
        api.listWorkOrders('page=1&limit=50&assignedToMe=true'),
        api.getActiveSession(),
        getLastOpenedWorkOrderId(),
      ]);

      const equipmentItems = (equipmentResult as EquipmentItem[]).filter(
        (item) => item.type === 'EQUIPMENT',
      );
      const myWorkOrders = ((workOrderResult as { items: WorkOrder[] }).items ?? []) as WorkOrder[];
      const session = activeSession as { workOrderId?: string | null } | null;
      const defaultWorkOrderId = session?.workOrderId ?? lastOpened ?? null;

      setEquipment(equipmentItems);
      setWorkOrders(myWorkOrders);
      setActiveSessionWorkOrderId(session?.workOrderId ?? null);
      setSelectedWorkOrderId(defaultWorkOrderId);
      if (!selectedEquipmentId && equipmentItems.length > 0) {
        const firstEquipment = equipmentItems[0];
        if (firstEquipment) {
          setSelectedEquipmentId(firstEquipment.id);
        }
      }

      if (!reserveStart || !reserveEnd) {
        const now = new Date();
        const plusTwo = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        setReserveStart(toLocalDateTime(now.toISOString()));
        setReserveEnd(toLocalDateTime(plusTwo.toISOString()));
      }

      await refreshPending();
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err, 'Kunne ikke hente utstyrsdata'));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleLookup(code: string) {
    const normalized = code.trim();
    if (!normalized) return;
    setMessage(null);
    setError(null);

    const result = await queueOrRunScanLookup(normalized);
    if (result.queued) {
      setMessage('Scan-oppslag lagret i kø (Pending).');
      await refreshPending();
      return;
    }

    const lookup = result.result as LookupResult;
    setLookupResult(lookup);
    if (lookup.item?.id) {
      setSelectedEquipmentId(lookup.item.id);
    }
    setMessage('Scan-oppslag synket.');
  }

  async function onBarcodeScanned(data: string) {
    if (scanHandled) return;
    setScanHandled(true);
    setScannerOpen(false);
    setCodeInput(data);
    await handleLookup(data);
  }

  async function openScanner() {
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        setError('Kameratilgang ble avslått. Bruk manuell kode.');
        return;
      }
    }
    setScanHandled(false);
    setScannerOpen(true);
  }

  async function reserveEquipment() {
    if (!selectedEquipmentId || !reserveStart || !reserveEnd) {
      setError('Velg utstyr og tidsrom før booking.');
      return;
    }
    const startAt = toIso(reserveStart);
    const endAt = toIso(reserveEnd);
    if (!startAt || !endAt) {
      setError('Ugyldig tidspunkt for booking.');
      return;
    }

    setMessage(null);
    setError(null);
    const result = await queueOrRunEquipmentReserve({
      equipmentItemId: selectedEquipmentId,
      workOrderId: selectedWorkOrderId,
      startAt,
      endAt,
    });
    if (result.queued) {
      setMessage('Booking lagret i kø (Pending).');
      await refreshPending();
      return;
    }

    setMessage('Booking opprettet og synket.');
    await load();
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Utstyr</Text>
      <Text style={{ color: '#475569' }}>
        Pending: {pendingCounts.pending} - Failed: {pendingCounts.failed}
      </Text>

      <View style={{ borderWidth: 1, borderColor: '#dbe4ef', borderRadius: 12, backgroundColor: '#f8fafc', padding: 12, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>Scan / oppslag</Text>
        <TextInput
          value={codeInput}
          onChangeText={setCodeInput}
          placeholder="Barcode / QR-kode"
          style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: '#fff' }}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => void handleLookup(codeInput)} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' }}>
            <Text>Manuelt oppslag</Text>
          </Pressable>
          <Pressable onPress={() => void openScanner()} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' }}>
            <Text>Start kamera-scan</Text>
          </Pressable>
        </View>
        {scannerOpen ? (
          <View style={{ overflow: 'hidden', borderRadius: 12 }}>
            <CameraView
              style={{ height: 260 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8'] }}
              onBarcodeScanned={(event) => void onBarcodeScanned(event.data)}
            />
          </View>
        ) : null}
        {lookupResult ? (
          <View style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, backgroundColor: '#fff' }}>
            <Text style={{ fontWeight: '700' }}>Resultat: {lookupResult.status}</Text>
            <Text>Kode: {lookupResult.code}</Text>
            <Text>Utstyr: {lookupResult.item?.name ?? '-'}</Text>
            <Text>Aktiv reservasjon: {lookupResult.activeReservation ? 'Ja' : 'Nei'}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: '#dbe4ef', borderRadius: 12, backgroundColor: '#f8fafc', padding: 12, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>Book utstyr</Text>
        <Text style={{ color: '#475569' }}>
          Default jobb: aktiv økt ({activeSessionWorkOrderId ?? '-'}) eller sist åpnet arbeidsordre.
        </Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Søk utstyr"
          style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: '#fff' }}
        />
        <View style={{ gap: 6 }}>
          {filteredEquipment.slice(0, 8).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setSelectedEquipmentId(item.id)}
              style={{
                borderWidth: 1,
                borderColor: selectedEquipmentId === item.id ? '#0f766e' : '#e2e8f0',
                borderRadius: 8,
                padding: 8,
                backgroundColor: '#fff',
              }}
            >
              <Text style={{ fontWeight: '700' }}>{item.name}</Text>
              <Text style={{ color: '#475569' }}>{item.serialNumber ?? item.id}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => setShowJobList((value) => !value)}
          style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' }}
        >
          <Text>Knyttet jobb: {selectedWorkOrderLabel}</Text>
        </Pressable>
        {showJobList ? (
          <View style={{ gap: 6 }}>
            <Pressable
              onPress={() => {
                setSelectedWorkOrderId(null);
                setShowJobList(false);
              }}
              style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 8, backgroundColor: '#fff' }}
            >
              <Text>Uten arbeidsordre</Text>
            </Pressable>
            {workOrders.slice(0, 15).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  setSelectedWorkOrderId(item.id);
                  setShowJobList(false);
                }}
                style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 8, backgroundColor: '#fff' }}
              >
                <Text style={{ fontWeight: '700' }}>{item.title}</Text>
                <Text style={{ color: '#475569' }}>{item.status}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <TextInput
          value={reserveStart}
          onChangeText={setReserveStart}
          placeholder="Start (YYYY-MM-DDTHH:mm)"
          style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: '#fff' }}
        />
        <TextInput
          value={reserveEnd}
          onChangeText={setReserveEnd}
          placeholder="Slutt (YYYY-MM-DDTHH:mm)"
          style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: '#fff' }}
        />

        <Pressable
          onPress={() => void reserveEquipment()}
          style={{ borderWidth: 1, borderColor: '#0f766e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0f766e' }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Opprett booking</Text>
        </Pressable>
      </View>

      {message ? <Text style={{ color: '#0f766e' }}>{message}</Text> : null}
      {error ? <Text style={{ color: '#b91c1c' }}>{error}</Text> : null}
    </ScrollView>
  );
}
