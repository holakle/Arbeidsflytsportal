import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { mobileApiClient } from '../src/api/client';
import { clearToken } from '../src/auth/token-store';

type WorkOrder = {
  id: string;
  title: string;
  status: string;
  customerName?: string | null;
  city?: string | null;
};

type Notification = {
  id: string;
  type: string;
  readAt: string | null;
};

export default function TodayScreen() {
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeSessionText, setActiveSessionText] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  async function load() {
    try {
      const api = await mobileApiClient();
      const [workOrders, activeSession] = await Promise.all([
        api.listWorkOrders('page=1&limit=20&assignedToMe=true'),
        api.getActiveSession(),
      ]);
      const notificationList = (await api.listNotifications()) as Notification[];
      const typed = (workOrders as { items: WorkOrder[] }).items;
      setItems(typed);
      setNotifications(notificationList);
      const active = activeSession as { workOrderId: string } | null;
      setActiveSessionText(active ? `Aktiv økt på arbeidsordre ${active.workOrderId}` : null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente data');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function logout() {
    await clearToken();
    router.replace('/login');
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>I dag - Mine jobber</Text>
        <Pressable onPress={() => void logout()} style={{ borderWidth: 1, borderColor: '#cbd5e1', padding: 8, borderRadius: 6 }}>
          <Text>Logg ut</Text>
        </Pressable>
      </View>
      {activeSessionText ? <Text style={{ color: '#0f766e' }}>{activeSessionText}</Text> : null}
      {error ? <Text style={{ color: '#b91c1c' }}>{error}</Text> : null}
      <Text style={{ fontWeight: '700' }}>Notifikasjoner</Text>
      {notifications.slice(0, 3).map((notification) => (
        <Text key={notification.id}>
          {notification.type} {notification.readAt ? '(lest)' : '(ulest)'}
        </Text>
      ))}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/workorders/[id]', params: { id: item.id } }} style={{ paddingVertical: 10 }}>
            {item.title} ({item.status}) {item.customerName ? `- ${item.customerName}` : ''}{' '}
            {item.city ? `(${item.city})` : ''}
          </Link>
        )}
      />
    </View>
  );
}
