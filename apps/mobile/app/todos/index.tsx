import { useEffect, useState } from 'react';
import { Button, FlatList, Text, View } from 'react-native';
import { mobileApiClient } from '../../src/api/client';

export default function TodosScreen() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const api = await mobileApiClient();
    const list = await api.listTodos('mineOnly=true');
    setItems(list as any[]);
  }

  async function addTodo() {
    const api = await mobileApiClient();
    await api.createTodo({ title: 'Ny mobil todo', status: 'OPEN' });
    await load();
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <View style={{ padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Todo</Text>
      <Button title="Legg til todo" onPress={addTodo} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text>
            {item.title} ({item.status})
          </Text>
        )}
      />
    </View>
  );
}

