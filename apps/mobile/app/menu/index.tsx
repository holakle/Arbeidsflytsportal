import { Link } from 'expo-router';
import { Text, View } from 'react-native';

export default function MenuScreen() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Meny</Text>
      <Text style={{ color: '#475569' }}>
        Menyen holdes apen forelopig. Innhold kan utvides senere.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Link
          href="/calendar"
          style={{
            borderWidth: 1,
            borderColor: '#cbd5e1',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          Kalender
        </Link>
        <Link
          href="/timesheets"
          style={{
            borderWidth: 1,
            borderColor: '#cbd5e1',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          Timer
        </Link>
        <Link
          href="/equipment"
          style={{
            borderWidth: 1,
            borderColor: '#cbd5e1',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          Utstyr
        </Link>
      </View>
    </View>
  );
}
