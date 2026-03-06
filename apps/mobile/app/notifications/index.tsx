import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { mobileApiClient } from '../../src/api/client';

type Notification = {
  id: string;
  type: string;
  readAt: string | null;
};

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const api = await mobileApiClient();
      const rows = (await api.listNotifications()) as Notification[];
      setItems(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente varsler');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Varsler</Text>
      {error ? <Text style={{ color: '#b91c1c' }}>{error}</Text> : null}
      {items.map((item) => (
        <View
          key={item.id}
          style={{
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 10,
            padding: 10,
            backgroundColor: '#fff',
          }}
        >
          <Text style={{ fontWeight: '700' }}>{item.type}</Text>
          <Text style={{ color: '#475569' }}>{item.readAt ? 'Lest' : 'Ulest'}</Text>
        </View>
      ))}
      {items.length === 0 ? <Text style={{ color: '#64748b' }}>Ingen varsler.</Text> : null}
    </ScrollView>
  );
}
