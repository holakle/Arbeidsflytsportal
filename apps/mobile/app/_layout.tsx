import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AppState } from 'react-native';
import { processPendingOperationsNow } from '../src/offline/queue-runner';
import { HeaderActions } from '../src/navigation/header-actions';

export default function Layout() {
  useEffect(() => {
    void processPendingOperationsNow();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void processPendingOperationsNow();
      }
    });

    const interval = setInterval(() => {
      void processPendingOperationsNow();
    }, 30_000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  return (
    <Stack screenOptions={{ headerRight: () => <HeaderActions /> }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Logg inn', headerRight: () => null }} />
      <Stack.Screen name="today" options={{ title: 'Oversikt' }} />
      <Stack.Screen name="settings/index" options={{ title: 'Innstillinger' }} />
      <Stack.Screen name="notifications/index" options={{ title: 'Varsler' }} />
      <Stack.Screen name="menu/index" options={{ title: 'Meny' }} />
      <Stack.Screen name="calendar/index" options={{ title: 'Kalender (mine)' }} />
      <Stack.Screen name="equipment/index" options={{ title: 'Utstyr' }} />
      <Stack.Screen name="operations/index" options={{ title: 'Synkstatus' }} />
      <Stack.Screen name="workorders/index" options={{ title: 'Mine arbeidsordre' }} />
      <Stack.Screen name="workorders/[id]" options={{ title: 'Arbeidsordre' }} />
      <Stack.Screen name="timesheets/index" options={{ title: 'Timer' }} />
      <Stack.Screen name="todos/index" options={{ title: 'Todo' }} />
    </Stack>
  );
}
