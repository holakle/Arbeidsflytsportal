import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { mobileApiClient } from '../../src/api/client';

export default function WorkordersScreen() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    mobileApiClient()
      .then((api) => api.listWorkOrders('page=1&limit=20'))
      .then((res) => setItems(res.items as any[]))
      .catch(() => undefined);
  }, []);

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Mine arbeidsordre</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/workorders/[id]', params: { id: item.id } }}>
            {item.title} ({item.status})
          </Link>
        )}
      />
    </View>
  );
}

