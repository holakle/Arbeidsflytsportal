import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { mobileApiClient } from '../src/api/client';
import { setToken } from '../src/auth/token-store';

type DevUser = {
  id: string;
  displayName: string;
  email: string;
  roles: string[];
};

export default function LoginScreen() {
  const [users, setUsers] = useState<DevUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mobileApiClient()
      .then((api) => api.listDevUsers())
      .then((result) => setUsers(result as DevUser[]))
      .catch((err) => setError(err instanceof Error ? err.message : 'Kunne ikke hente brukere'))
      .finally(() => setLoading(false));
  }, []);

  async function loginAs(userId: string) {
    setError(null);
    try {
      const api = await mobileApiClient();
      const tokenRes = await api.issueDevToken(userId);
      await setToken((tokenRes as { token: string }).token);
      router.replace('/today');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Innlogging feilet');
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, gap: 10 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Logg inn</Text>
      <Text>Velg demo-bruker:</Text>
      {error ? <Text style={{ color: '#b91c1c' }}>{error}</Text> : null}
      {users.map((user) => (
        <Pressable
          key={user.id}
          onPress={() => void loginAs(user.id)}
          style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12 }}
        >
          <Text style={{ fontWeight: '600' }}>{user.displayName}</Text>
          <Text>{user.email}</Text>
          <Text>{user.roles.join(', ')}</Text>
        </Pressable>
      ))}
    </View>
  );
}
