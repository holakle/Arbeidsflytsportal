import { Text, View } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Innstillinger</Text>
      <Text style={{ color: '#475569' }}>
        Denne siden er klargjort. Vi kan fylle inn innhold i neste steg.
      </Text>
    </View>
  );
}
