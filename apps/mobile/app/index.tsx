import { Link } from 'expo-router';
import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Arbeidsflytsportal</Text>
      <Link href="/workorders">Mine arbeidsordre</Link>
      <Link href="/timesheets">Timer</Link>
      <Link href="/todos">Todo</Link>
    </View>
  );
}
