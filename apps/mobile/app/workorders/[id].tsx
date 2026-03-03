import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { mobileApiClient } from '../../src/api/client';

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

export default function WorkorderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    try {
      const api = await mobileApiClient();
      const [wo, list, active] = await Promise.all([
        api.getWorkOrder(id),
        api.listWorkOrderAttachments(id),
        api.getActiveSession(),
      ]);
      setWorkOrder(wo as WorkOrder);
      setAttachments(list as Attachment[]);
      const session = active as { id: string; workOrderId: string } | null;
      setActiveSessionId(session?.workOrderId === id ? session.id : null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente arbeidsordre');
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function handleStart() {
    if (!id) return;
    try {
      const api = await mobileApiClient();
      await api.startWorkOrder(id);
      setStatusMessage('Arbeidsøkt startet');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Start feilet');
    }
  }

  async function handlePause() {
    if (!id) return;
    try {
      const api = await mobileApiClient();
      await api.pauseWorkOrder(id);
      setStatusMessage('Arbeidsøkt satt på pause');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pause feilet');
    }
  }

  async function handleFinish() {
    if (!id) return;
    try {
      const api = await mobileApiClient();
      const result = (await api.finishWorkOrder(id)) as { timesheetDraftId?: string | null };
      setStatusMessage(
        result.timesheetDraftId
          ? `Arbeidsøkt avsluttet. Draft-timer: ${result.timesheetDraftId}`
          : 'Arbeidsøkt avsluttet',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Finish feilet');
    }
  }

  async function addDemoAttachment() {
    if (!id) return;
    try {
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
        <Pressable onPress={() => void handleStart()} style={{ backgroundColor: '#0f766e', borderRadius: 6, padding: 10 }}>
          <Text style={{ color: '#fff' }}>Start</Text>
        </Pressable>
        <Pressable onPress={() => void handlePause()} style={{ backgroundColor: '#334155', borderRadius: 6, padding: 10 }}>
          <Text style={{ color: '#fff' }}>Pause</Text>
        </Pressable>
        <Pressable onPress={() => void handleFinish()} style={{ backgroundColor: '#166534', borderRadius: 6, padding: 10 }}>
          <Text style={{ color: '#fff' }}>Ferdig</Text>
        </Pressable>
      </View>
      <Text>{activeSessionId ? 'Aktiv økt på denne ordren' : 'Ingen aktiv økt på denne ordren'}</Text>

      <Pressable onPress={() => void addDemoAttachment()} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 8 }}>
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
    </ScrollView>
  );
}
