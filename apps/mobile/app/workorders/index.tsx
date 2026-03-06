import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { mobileApiClient } from '../../src/api/client';

type WorkOrder = {
  id: string;
  title: string;
  status: string;
  customerName?: string | null;
  city?: string | null;
};

export default function WorkordersIndexScreen() {
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const api = await mobileApiClient();
      const result = (await api.listWorkOrders(
        'page=1&limit=50&assignedToMe=true',
      )) as { items: WorkOrder[] };
      setItems(result.items ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente arbeidsordre');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Mine arbeidsordre</Text>
      {error ? <Text style={{ color: '#b91c1c' }}>{error}</Text> : null}
      {items.map((item) => (
        <Link
          key={item.id}
          href={{ pathname: '/workorders/[id]', params: { id: item.id } }}
          style={{
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 10,
            padding: 10,
            backgroundColor: '#fff',
          }}
        >
          <Text style={{ fontWeight: '700' }}>{item.title}</Text>
          <Text style={{ color: '#475569' }}>
            {item.status}
            {item.customerName ? ` - ${item.customerName}` : ''}
            {item.city ? ` (${item.city})` : ''}
          </Text>
        </Link>
      ))}
      {items.length === 0 ? <Text style={{ color: '#64748b' }}>Ingen arbeidsordre tilgjengelig.</Text> : null}
    </ScrollView>
  );
}
