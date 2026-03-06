import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { mobileApiClient } from '../../src/api/client';
import { setLastOpenedWorkOrderId } from '../../src/workorders/last-opened-store';

type WorkOrder = {
  id: string;
  title: string;
  status: string;
  description?: string | null;
  customerName?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  addressLine1?: string | null;
  postalCode?: string | null;
  city?: string | null;
};

type Attachment = {
  id: string;
  kind: string;
  storageKey: string;
  createdAt: string;
};

function formatDurationHoursMinutes(startAt?: string, endAt?: string | null) {
  if (!startAt || !endAt) return null;
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;

  const totalMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatDecimalHours(hours: number) {
  if (!Number.isFinite(hours) || hours < 0) return null;
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatElapsedClock(startAt: string, nowMs: number) {
  const started = new Date(startAt);
  if (Number.isNaN(started.getTime())) return null;
  const diffSeconds = Math.max(0, Math.floor((nowMs - started.getTime()) / 1000));
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function WorkorderDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionStartedAt, setActiveSessionStartedAt] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    try {
      setWarning(null);
      const api = await mobileApiClient();
      const wo = await api.getWorkOrder(id);
      setWorkOrder(wo as WorkOrder);
      await setLastOpenedWorkOrderId(id);

      const [attachmentsResult, activeSessionResult] = await Promise.allSettled([
        api.listWorkOrderAttachments(id),
        api.getActiveSession(),
      ]);

      let attachmentsFailed = false;
      let activeSessionFailed = false;

      if (attachmentsResult.status === 'fulfilled') {
        setAttachments(attachmentsResult.value as Attachment[]);
      } else {
        attachmentsFailed = true;
        setAttachments([]);
      }

      if (activeSessionResult.status === 'fulfilled') {
        const session = activeSessionResult.value as {
          id: string;
          workOrderId: string;
          startedAt?: string;
        } | null;
        if (session?.workOrderId === id) {
          setActiveSessionId(session.id);
          setActiveSessionStartedAt(session.startedAt ?? null);
        } else {
          setActiveSessionId(null);
          setActiveSessionStartedAt(null);
        }
      } else {
        activeSessionFailed = true;
        setActiveSessionId(null);
        setActiveSessionStartedAt(null);
      }

      if (attachmentsFailed && activeSessionFailed) {
        setWarning('Arbeidsordren er lastet, men vedlegg og oktstatus kunne ikke hentes.');
      } else if (attachmentsFailed) {
        setWarning('Arbeidsordren er lastet, men vedlegg kunne ikke hentes.');
      } else if (activeSessionFailed) {
        setWarning(null);
      } else {
        setWarning(null);
      }

      setError(null);
    } catch (err) {
      setWarning(null);
      setError(err instanceof Error ? err.message : 'Kunne ikke hente arbeidsordre');
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  useEffect(() => {
    if (!activeSessionStartedAt) return;
    setNowMs(Date.now());
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSessionStartedAt]);

  async function handleStart() {
    if (!id) return;
    try {
      setError(null);
      const api = await mobileApiClient();
      await api.startWorkOrder(id);
      setStatusMessage('Arbeidsokt startet');
      await load();
    } catch (err) {
      setStatusMessage(null);
      setError(err instanceof Error ? err.message : 'Start feilet');
    }
  }

  async function handlePause() {
    if (!id) return;
    try {
      setError(null);
      const api = await mobileApiClient();
      await api.pauseWorkOrder(id);
      setStatusMessage('Arbeidsokt satt pa pause');
      await load();
    } catch (err) {
      setStatusMessage(null);
      setError(err instanceof Error ? err.message : 'Pause feilet');
    }
  }

  async function handleFinish() {
    if (!id) return;
    try {
      setError(null);
      const api = await mobileApiClient();
      const result = (await api.finishWorkOrder(id)) as {
        session?: { startedAt?: string; endedAt?: string | null };
        timesheetDraftHours?: number;
      };
      const duration =
        (typeof result.timesheetDraftHours === 'number'
          ? formatDecimalHours(result.timesheetDraftHours)
          : null) ??
        formatDurationHoursMinutes(result.session?.startedAt, result.session?.endedAt);
      setStatusMessage(
        duration ? `Arbeidsokt avsluttet. Registrert tid: ${duration}` : 'Arbeidsokt avsluttet',
      );
      await load();
    } catch (err) {
      setStatusMessage(null);
      setError(err instanceof Error ? err.message : 'Finish feilet');
    }
  }

  async function addDemoAttachment() {
    if (!id) return;
    try {
      setError(null);
      const api = await mobileApiClient();
      await api.uploadWorkOrderAttachment(id, {
        fileName: `note-${Date.now()}.txt`,
        mimeType: 'text/plain',
        contentBase64: 'RGVtbyBhdHRhY2htZW50IGZyb20gbW9iaWxl',
        kind: 'GENERAL',
      });
      setStatusMessage('Vedlegg lagt til');
      await load();
    } catch (err) {
      setStatusMessage(null);
      setError(err instanceof Error ? err.message : 'Opplasting feilet');
    }
  }

  const address = [workOrder?.addressLine1, workOrder?.postalCode, workOrder?.city]
    .filter(Boolean)
    .join(', ');

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>{workOrder?.title ?? id}</Text>
      <Text>Status: {workOrder?.status ?? '-'}</Text>
      <Text>Kunde: {workOrder?.customerName ?? '-'}</Text>
      <Text>Adresse: {address || '-'}</Text>
      <Text>Kontakt: {workOrder?.contactName ?? '-'}</Text>
      <Pressable
        disabled={!workOrder?.contactPhone}
        onPress={() => {
          if (!workOrder?.contactPhone) return;
          void Linking.openURL(`tel:${workOrder.contactPhone}`);
        }}
        style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 8 }}
      >
        <Text>{workOrder?.contactPhone ? `Ring ${workOrder.contactPhone}` : 'Ingen telefon'}</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => void handleStart()}
          style={{ backgroundColor: '#0f766e', borderRadius: 6, padding: 10 }}
        >
          <Text style={{ color: '#fff' }}>Start</Text>
        </Pressable>
        <Pressable
          onPress={() => void handlePause()}
          style={{ backgroundColor: '#334155', borderRadius: 6, padding: 10 }}
        >
          <Text style={{ color: '#fff' }}>Pause</Text>
        </Pressable>
        <Pressable
          onPress={() => void handleFinish()}
          style={{ backgroundColor: '#166534', borderRadius: 6, padding: 10 }}
        >
          <Text style={{ color: '#fff' }}>Ferdig</Text>
        </Pressable>
      </View>
      <Text>{activeSessionId ? 'Aktiv okt pa denne ordren' : 'Ingen aktiv okt pa denne ordren'}</Text>
      {activeSessionStartedAt && activeSessionId ? (
        <Text style={{ fontWeight: '700', color: '#0f766e' }}>
          Timer: {formatElapsedClock(activeSessionStartedAt, nowMs) ?? '--:--:--'}
        </Text>
      ) : null}

      <Pressable
        onPress={() => void addDemoAttachment()}
        style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 8 }}
      >
        <Text>Last opp test-vedlegg</Text>
      </Pressable>

      <Text style={{ fontWeight: '700' }}>Vedlegg</Text>
      {attachments.map((item) => (
        <Text key={item.id}>
          {item.kind}: {item.storageKey}
        </Text>
      ))}

      {statusMessage ? <Text style={{ color: '#0f766e' }}>{statusMessage}</Text> : null}
      {error ? <Text style={{ color: '#b91c1c' }}>{error}</Text> : null}
      {warning ? <Text style={{ color: '#a16207' }}>{warning}</Text> : null}
    </ScrollView>
  );
}
