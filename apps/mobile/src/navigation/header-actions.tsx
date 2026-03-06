import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export function HeaderActions() {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable
        onPress={() => router.push('/settings')}
        style={{
          borderWidth: 1,
          borderColor: '#cbd5e1',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: '#fff',
        }}
      >
        <Text style={{ fontWeight: '700' }}>S</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push('/notifications')}
        style={{
          borderWidth: 1,
          borderColor: '#cbd5e1',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: '#fff',
        }}
      >
        <Text style={{ fontWeight: '700' }}>V</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push('/menu')}
        style={{
          borderWidth: 1,
          borderColor: '#cbd5e1',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: '#fff',
        }}
      >
        <Text style={{ fontWeight: '700' }}>M</Text>
      </Pressable>
    </View>
  );
}
