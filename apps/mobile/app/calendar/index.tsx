import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { mobileApiClient } from '../../src/api/client';

type CalendarEvent = {
  id: string;
  type: 'workorder_schedule' | 'equipment_reservation';
  title: string;
  start: string;
  end: string;
  resourceRef?: { label?: string | null } | null;
  workOrderRef?: { id: string; title: string; status: string } | null;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('no-NO');
}

function buildRange(days = 14) {
  const from = new Date();
  const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function CalendarMineScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const api = await mobileApiClient();
      const range = buildRange(14);
      const list = (await api.listSchedule({
        from: range.from,
        to: range.to,
        scope: 'mine',
      })) as CalendarEvent[];
      setEvents(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente kalender');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Kalender (mine)</Text>
      {error ? <Text style={{ color: '#b91c1c' }}>{error}</Text> : null}
      {events.map((event) => (
        <View
          key={event.id}
          style={{
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 10,
            padding: 10,
            backgroundColor: '#fff',
            gap: 4,
          }}
        >
          <Text style={{ fontWeight: '700' }}>{event.title}</Text>
          <Text>{event.type}</Text>
          <Text style={{ color: '#475569' }}>
            {formatDate(event.start)} - {formatDate(event.end)}
          </Text>
          {event.resourceRef?.label ? (
            <Text style={{ color: '#475569' }}>Ressurs: {event.resourceRef.label}</Text>
          ) : null}
          {event.workOrderRef ? (
            <Text style={{ color: '#475569' }}>
              WO: {event.workOrderRef.title} ({event.workOrderRef.status})
            </Text>
          ) : null}
        </View>
      ))}
      {events.length === 0 ? <Text style={{ color: '#64748b' }}>Ingen hendelser i valgt periode.</Text> : null}
    </ScrollView>
  );
}
