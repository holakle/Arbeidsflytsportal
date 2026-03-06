import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  listPendingOperations,
  type PendingOperation,
  type PendingOperationStatus,
} from '../../src/offline/pending-operations';
import {
  processPendingOperationsNow,
  retryAllPendingOperations,
} from '../../src/offline/queue-runner';

type FilterValue = 'All' | PendingOperationStatus;

function formatDate(value: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('no-NO');
}

export default function OperationsScreen() {
  const [operations, setOperations] = useState<PendingOperation[]>([]);
  const [filter, setFilter] = useState<FilterValue>('All');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredOperations = useMemo(() => {
    if (filter === 'All') return operations;
    return operations.filter((item) => item.status === filter);
  }, [filter, operations]);

  async function refresh() {
    const rows = await listPendingOperations();
    setOperations(rows);
  }

  async function runSync() {
    try {
      setBusy(true);
      setMessage(null);
      setError(null);
      await processPendingOperationsNow();
      await refresh();
      setMessage('Synk triggeret for pending-operasjoner.');
    } catch (err) {
      setMessage(null);
      setError(err instanceof Error ? err.message : 'Kunne ikke synkronisere operasjoner.');
    } finally {
      setBusy(false);
    }
  }

  async function retryAll() {
    try {
      setBusy(true);
      setMessage(null);
      setError(null);
      await retryAllPendingOperations();
      await refresh();
      setMessage('Retry alle kjort.');
    } catch (err) {
      setMessage(null);
      setError(err instanceof Error ? err.message : 'Kunne ikke retrye operasjoner.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Synkstatus</Text>
      <Text style={{ color: '#475569' }}>
        Totalt: {operations.length} | Pending:{' '}
        {operations.filter((item) => item.status === 'Pending').length} | Failed:{' '}
        {operations.filter((item) => item.status === 'Failed').length}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['All', 'Pending', 'Failed', 'Synced'] as FilterValue[]).map((value) => (
          <Pressable
            key={value}
            onPress={() => setFilter(value)}
            style={{
              borderWidth: 1,
              borderColor: filter === value ? '#0f766e' : '#cbd5e1',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: filter === value ? '#f0fdfa' : '#fff',
            }}
          >
            <Text>{value}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          disabled={busy}
          onPress={() => void runSync()}
          style={{
            borderWidth: 1,
            borderColor: '#cbd5e1',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: '#fff',
            opacity: busy ? 0.6 : 1,
          }}
        >
          <Text>Synk pending</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => void retryAll()}
          style={{
            borderWidth: 1,
            borderColor: '#0f766e',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: '#0f766e',
            opacity: busy ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#fff' }}>Retry alle</Text>
        </Pressable>
      </View>

      {message ? <Text style={{ color: '#0f766e' }}>{message}</Text> : null}
      {error ? <Text style={{ color: '#b91c1c' }}>{error}</Text> : null}

      {filteredOperations.map((operation) => (
        <View
          key={operation.id}
          style={{
            borderWidth: 1,
            borderColor:
              operation.status === 'Failed'
                ? '#fecaca'
                : operation.status === 'Pending'
                  ? '#fde68a'
                  : '#bbf7d0',
            borderRadius: 10,
            padding: 10,
            backgroundColor: '#fff',
            gap: 4,
          }}
        >
          <Text style={{ fontWeight: '700' }}>
            {operation.type} - {operation.status}
          </Text>
          <Text style={{ color: '#475569' }}>Forsok: {operation.attemptCount}</Text>
          <Text style={{ color: '#475569' }}>Opprettet: {formatDate(operation.createdAt)}</Text>
          <Text style={{ color: '#475569' }}>Sist oppdatert: {formatDate(operation.updatedAt)}</Text>
          <Text style={{ color: '#475569' }}>Neste retry: {formatDate(operation.nextRetryAt)}</Text>
          {operation.lastError ? (
            <Text style={{ color: '#b91c1c' }}>Feil: {operation.lastError}</Text>
          ) : null}
        </View>
      ))}

      {filteredOperations.length === 0 ? (
        <Text style={{ color: '#64748b' }}>Ingen operasjoner for valgt filter.</Text>
      ) : null}
    </ScrollView>
  );
}
