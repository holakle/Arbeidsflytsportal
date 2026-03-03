import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getToken } from '../src/auth/token-store';

export default function HomeScreen() {
  const [ready, setReady] = useState(false);
  const [token, setCurrentToken] = useState<string | null>(null);

  useEffect(() => {
    getToken()
      .then((value) => setCurrentToken(value))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={token ? '/today' : '/login'} />;
}
