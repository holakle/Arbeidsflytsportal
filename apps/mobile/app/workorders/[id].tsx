import { useLocalSearchParams } from 'expo-router';
import { Button, Text, View } from 'react-native';
import { mobileApiClient } from '../../src/api/client';

export default function WorkorderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  async function setInProgress() {
    if (!id) return;
    const api = await mobileApiClient();
    await api.updateWorkOrder(id, { status: 'IN_PROGRESS' });
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Arbeidsordre {id}</Text>
      <Button title="Sett status til IN_PROGRESS" onPress={setInProgress} />
    </View>
  );
}

