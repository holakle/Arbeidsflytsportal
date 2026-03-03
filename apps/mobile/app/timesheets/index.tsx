import { useEffect, useState } from 'react';
import { Button, FlatList, Text, View } from 'react-native';
import { mobileApiClient } from '../../src/api/client';

export default function TimesheetsScreen() {
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  async function load() {
    const api = await mobileApiClient();
    const [list, weekly] = await Promise.all([api.listTimesheets(), api.weeklySummary()]);
    setEntries(list as any[]);
    setSummary(weekly);
  }

  async function addSampleEntry() {
    const api = await mobileApiClient();
    await api.createTimesheet({
      date: new Date().toISOString().slice(0, 10),
      hours: 1.5,
      activityType: 'ADMIN',
    });
    await load();
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <View style={{ padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Timer</Text>
      <Text>Total denne uken: {summary?.totalHours ?? 0} t</Text>
      <Button title="Registrer 1.5 t ADMIN" onPress={addSampleEntry} />
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text>
            {String(item.date).slice(0, 10)} - {item.hours}h ({item.activityType})
          </Text>
        )}
      />
    </View>
  );
}
