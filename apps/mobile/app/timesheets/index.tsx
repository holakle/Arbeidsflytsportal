import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { mobileApiClient } from '../../src/api/client';
import { listPendingOperations } from '../../src/offline/pending-operations';
import {
  processPendingOperationsNow,
  queueOrRunTimesheetCreate,
  queueOrRunTimesheetUpdate,
} from '../../src/offline/queue-runner';

type WorkOrder = {
  id: string;
  title: string;
  status: string;
  timesheetCode?: string;
};

type TimesheetEntry = {
  id: string;
  date: string;
  hours: number;
  activityType: string;
  note: string | null;
  status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  workOrderId: string | null;
  workOrder?: { id: string; title: string; timesheetCode?: string } | null;
};

type WeeklySummary = {
  weekStart: string;
  totalHours: number;
  byActivityType: Record<string, number>;
};

type WorkSession = {
  id: string;
  workOrderId: string;
  state: 'RUNNING' | 'PAUSED' | 'DONE';
  startedAt: string;
  endedAt?: string | null;
};

type EntryEditState = {
  date: string;
  hours: string;
  activityType: string;
  note: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  workOrderId: string;
};

const activityTypes = ['INSTALLATION', 'TRAVEL', 'MEETING', 'ADMIN', 'OTHER'];

function todayDateInputValue() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDateInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return todayDateInputValue();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toIsoDate(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

export default function TimesheetsScreen() {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);

  const [date, setDate] = useState(todayDateInputValue());
  const [hours, setHours] = useState('7.5');
  const [activityType, setActivityType] = useState('INSTALLATION');
  const [note, setNote] = useState('');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('');
  const [createStatus, setCreateStatus] = useState<'DRAFT' | 'SUBMITTED'>('DRAFT');

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EntryEditState | null>(null);

  const [pendingCounts, setPendingCounts] = useState({ pending: 0, failed: 0 });
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalListedHours = useMemo(
    () => entries.reduce((sum, item) => sum + Number(item.hours), 0),
    [entries],
  );

  async function refreshPending() {
    const operations = await listPendingOperations();
    const timesheetOps = operations.filter(
      (item) => item.type === 'TIMESHEET_CREATE' || item.type === 'TIMESHEET_UPDATE',
    );
    setPendingCounts({
      pending: timesheetOps.filter((item) => item.status === 'Pending').length,
      failed: timesheetOps.filter((item) => item.status === 'Failed').length,
    });
  }

  async function load() {
    try {
      setWarning(null);
      await processPendingOperationsNow();
      const api = await mobileApiClient();
      const [entriesResult, summaryResult, workOrdersResult, activeSessionResult] =
        await Promise.allSettled([
          api.listTimesheets(),
          api.weeklySummary(),
          api.listWorkOrders('page=1&limit=50&assignedToMe=true'),
          api.getActiveSession(),
        ]);

      let failed = 0;

      if (entriesResult.status === 'fulfilled') {
        setEntries(entriesResult.value as TimesheetEntry[]);
      } else {
        failed += 1;
        setEntries([]);
      }

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value as WeeklySummary);
      } else {
        failed += 1;
        setSummary(null);
      }

      if (workOrdersResult.status === 'fulfilled') {
        const rows = (workOrdersResult.value as { items: WorkOrder[] }).items ?? [];
        setWorkOrders(rows);
        if (!selectedWorkOrderId && rows.length > 0) {
          const firstRow = rows[0];
          if (firstRow) {
            setSelectedWorkOrderId(firstRow.id);
          }
        }
      } else {
        failed += 1;
        setWorkOrders([]);
      }

      if (activeSessionResult.status === 'fulfilled') {
        const session = activeSessionResult.value as WorkSession | null;
        setActiveSession(session);
        if (session?.workOrderId) {
          setSelectedWorkOrderId(session.workOrderId);
        }
      } else {
        failed += 1;
        setActiveSession(null);
      }

      if (failed > 0) {
        setWarning(`Timer er lastet, men ${failed} tilleggskall feilet.`);
      }

      await refreshPending();
      setError(null);
    } catch (err) {
      setWarning(null);
      setError(err instanceof Error ? err.message : 'Kunne ikke hente timer.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function startAutoSession() {
    if (!selectedWorkOrderId) {
      setError('Velg arbeidsordre for a starte auto-okt.');
      return;
    }
    try {
      setMessage(null);
      setError(null);
      const api = await mobileApiClient();
      await api.startWorkOrder(selectedWorkOrderId);
      setMessage('Auto-okt startet.');
      await load();
    } catch (err) {
      setMessage(null);
      setError(err instanceof Error ? err.message : 'Kunne ikke starte auto-okt.');
    }
  }

  async function pauseAutoSession() {
    if (!activeSession?.workOrderId) {
      setError('Ingen aktiv okt a pause.');
      return;
    }
    try {
      setMessage(null);
      setError(null);
      const api = await mobileApiClient();
      await api.pauseWorkOrder(activeSession.workOrderId);
      setMessage('Auto-okt pauset.');
      await load();
    } catch (err) {
      setMessage(null);
      setError(err instanceof Error ? err.message : 'Kunne ikke pause auto-okt.');
    }
  }

  async function finishAutoSession() {
    if (!activeSession?.workOrderId) {
      setError('Ingen aktiv okt a avslutte.');
      return;
    }
    try {
      setMessage(null);
      setError(null);
      const api = await mobileApiClient();
      const result = (await api.finishWorkOrder(activeSession.workOrderId)) as {
        timesheetDraftId?: string | null;
      };
      if (result.timesheetDraftId) {
        setMessage(`Auto-okt ferdig. Draft opprettet: ${result.timesheetDraftId}`);
      } else {
        setMessage('Auto-okt ferdig.');
      }
      await load();
    } catch (err) {
      setMessage(null);
      setError(err instanceof Error ? err.message : 'Kunne ikke fullfore auto-okt.');
    }
  }

  async function createManualEntry() {
    const numericHours = Number(hours);
    if (!Number.isFinite(numericHours) || numericHours <= 0) {
      setError('Timer ma vaere et positivt tall.');
      return;
    }
    try {
      setMessage(null);
      setError(null);
      const payload = {
        date: toIsoDate(date),
        hours: numericHours,
        activityType,
        workOrderId: selectedWorkOrderId.trim() ? selectedWorkOrderId.trim() : null,
        note: note.trim() ? note.trim() : undefined,
        status: createStatus,
      };
      const result = await queueOrRunTimesheetCreate(payload);
      if (result.queued) {
        setMessage('Timeforing lagret i ko (Pending).');
        await refreshPending();
      } else {
        setMessage('Timeforing synket.');
        await load();
      }
      setNote('');
    } catch (err) {
      setMessage(null);
      setError(err instanceof Error ? err.message : 'Kunne ikke opprette timeforing.');
    }
  }

  function startEdit(entry: TimesheetEntry) {
    setEditingEntryId(entry.id);
    setEditState({
      date: toDateInputValue(entry.date),
      hours: String(entry.hours),
      activityType: entry.activityType,
      note: entry.note ?? '',
      status: entry.status ?? 'DRAFT',
      workOrderId: entry.workOrderId ?? '',
    });
  }

  function cancelEdit() {
    setEditingEntryId(null);
    setEditState(null);
  }

  async function saveEdit(entryId: string) {
    if (!editState) return;
    const numericHours = Number(editState.hours);
    if (!Number.isFinite(numericHours) || numericHours <= 0) {
      setError('Timer ma vaere et positivt tall.');
      return;
    }
    try {
      setMessage(null);
      setError(null);
      const result = await queueOrRunTimesheetUpdate(entryId, {
        date: toIsoDate(editState.date),
        hours: numericHours,
        activityType: editState.activityType,
        note: editState.note.trim() ? editState.note.trim() : null,
        status: editState.status,
        workOrderId: editState.workOrderId.trim() ? editState.workOrderId.trim() : null,
      });
      if (result.queued) {
        setMessage('Oppdatering lagret i ko (Pending).');
        await refreshPending();
      } else {
        setMessage('Timeforing oppdatert.');
        await load();
      }
      cancelEdit();
    } catch (err) {
      setMessage(null);
      setError(err instanceof Error ? err.message : 'Kunne ikke oppdatere timeforing.');
    }
  }

  async function submitEntry(entryId: string) {
    try {
      setMessage(null);
      setError(null);
      const result = await queueOrRunTimesheetUpdate(entryId, { status: 'SUBMITTED' });
      if (result.queued) {
        setMessage('Submit lagret i ko (Pending).');
        await refreshPending();
      } else {
        setMessage('Timeforing sendt inn.');
        await load();
      }
    } catch (err) {
      setMessage(null);
      setError(err instanceof Error ? err.message : 'Kunne ikke sende inn timeforing.');
    }
  }

  async function removeEntry(entryId: string) {
    try {
      setMessage(null);
      setError(null);
      const api = await mobileApiClient();
      await api.deleteTimesheet(entryId);
      setMessage('Timeforing slettet.');
      await load();
    } catch (err) {
      setMessage(null);
      setError(err instanceof Error ? err.message : 'Kunne ikke slette timeforing.');
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Timer</Text>
      <Text style={{ color: '#475569' }}>
        Uke start: {summary?.weekStart ?? '-'} | Timer: {summary?.totalHours ?? 0}
      </Text>
      <Text style={{ color: '#475569' }}>
        Liste sum: {totalListedHours.toFixed(2)} | Pending: {pendingCounts.pending} | Failed:{' '}
        {pendingCounts.failed}
      </Text>

      <View
        style={{
          borderWidth: 1,
          borderColor: '#dbe4ef',
          borderRadius: 12,
          backgroundColor: '#f8fafc',
          padding: 12,
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700' }}>Auto-okt</Text>
        <Text style={{ color: '#475569' }}>
          Aktiv: {activeSession ? `${activeSession.workOrderId} (${activeSession.state})` : 'Nei'}
        </Text>
        <Text style={{ color: '#475569' }}>
          Velg jobb for start (default): {selectedWorkOrderId || '-'}
        </Text>
        <View style={{ gap: 6 }}>
          {workOrders.slice(0, 8).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setSelectedWorkOrderId(item.id)}
              style={{
                borderWidth: 1,
                borderColor: selectedWorkOrderId === item.id ? '#0f766e' : '#e2e8f0',
                borderRadius: 8,
                padding: 8,
                backgroundColor: '#fff',
              }}
            >
              <Text style={{ fontWeight: '700' }}>{item.title}</Text>
              <Text style={{ color: '#475569' }}>
                {item.status}
                {item.timesheetCode ? ` (${item.timesheetCode})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => void startAutoSession()}
            style={{
              borderWidth: 1,
              borderColor: '#0f766e',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: '#0f766e',
            }}
          >
            <Text style={{ color: '#fff' }}>Start</Text>
          </Pressable>
          <Pressable
            onPress={() => void pauseAutoSession()}
            style={{
              borderWidth: 1,
              borderColor: '#334155',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: '#334155',
            }}
          >
            <Text style={{ color: '#fff' }}>Pause</Text>
          </Pressable>
          <Pressable
            onPress={() => void finishAutoSession()}
            style={{
              borderWidth: 1,
              borderColor: '#166534',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: '#166534',
            }}
          >
            <Text style={{ color: '#fff' }}>Ferdig</Text>
          </Pressable>
        </View>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: '#dbe4ef',
          borderRadius: 12,
          backgroundColor: '#f8fafc',
          padding: 12,
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700' }}>Manuell timeforing</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="Dato YYYY-MM-DD"
          style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: '#fff' }}
        />
        <TextInput
          value={hours}
          onChangeText={setHours}
          placeholder="Timer"
          keyboardType="decimal-pad"
          style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: '#fff' }}
        />
        <TextInput
          value={activityType}
          onChangeText={setActivityType}
          placeholder="Aktivitetstype"
          style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: '#fff' }}
        />
        <Text style={{ color: '#475569' }}>Aktivitetstyper: {activityTypes.join(', ')}</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Notat"
          style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: '#fff' }}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['DRAFT', 'SUBMITTED'] as const).map((status) => (
            <Pressable
              key={status}
              onPress={() => setCreateStatus(status)}
              style={{
                borderWidth: 1,
                borderColor: createStatus === status ? '#0f766e' : '#cbd5e1',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: createStatus === status ? '#f0fdfa' : '#fff',
              }}
            >
              <Text>{status}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => void createManualEntry()}
          style={{
            borderWidth: 1,
            borderColor: '#0f766e',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: '#0f766e',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Lagre time</Text>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>Foringer</Text>
        {entries.map((entry) => {
          const isEditing = editingEntryId === entry.id && Boolean(editState);
          return (
            <View
              key={entry.id}
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 10,
                padding: 10,
                backgroundColor: '#fff',
                gap: 6,
              }}
            >
              {isEditing && editState ? (
                <View style={{ gap: 6 }}>
                  <TextInput
                    value={editState.date}
                    onChangeText={(value) => setEditState({ ...editState, date: value })}
                    placeholder="Dato YYYY-MM-DD"
                    style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8 }}
                  />
                  <TextInput
                    value={editState.hours}
                    onChangeText={(value) => setEditState({ ...editState, hours: value })}
                    placeholder="Timer"
                    style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8 }}
                  />
                  <TextInput
                    value={editState.activityType}
                    onChangeText={(value) => setEditState({ ...editState, activityType: value })}
                    placeholder="Aktivitetstype"
                    style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8 }}
                  />
                  <TextInput
                    value={editState.workOrderId}
                    onChangeText={(value) => setEditState({ ...editState, workOrderId: value })}
                    placeholder="WorkOrderId (valgfri)"
                    style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8 }}
                  />
                  <TextInput
                    value={editState.note}
                    onChangeText={(value) => setEditState({ ...editState, note: value })}
                    placeholder="Notat"
                    style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8 }}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['DRAFT', 'SUBMITTED', 'APPROVED'] as const).map((status) => (
                      <Pressable
                        key={status}
                        onPress={() => setEditState({ ...editState, status })}
                        style={{
                          borderWidth: 1,
                          borderColor: editState.status === status ? '#0f766e' : '#cbd5e1',
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                          backgroundColor: editState.status === status ? '#f0fdfa' : '#fff',
                        }}
                      >
                        <Text>{status}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => void saveEdit(entry.id)}
                      style={{
                        borderWidth: 1,
                        borderColor: '#0f766e',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: '#0f766e',
                      }}
                    >
                      <Text style={{ color: '#fff' }}>Lagre</Text>
                    </Pressable>
                    <Pressable
                      onPress={cancelEdit}
                      style={{
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: '#fff',
                      }}
                    >
                      <Text>Avbryt</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontWeight: '700' }}>
                    {toDateInputValue(entry.date)} - {entry.hours}h ({entry.activityType})
                  </Text>
                  <Text style={{ color: '#475569' }}>
                    Status: {entry.status ?? '-'} | WorkOrder:{' '}
                    {entry.workOrder?.title ??
                      entry.workOrderId ??
                      (entry.workOrderId === null ? 'Ingen' : '-')}
                  </Text>
                  <Text style={{ color: '#475569' }}>Notat: {entry.note ?? '-'}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => startEdit(entry)}
                      style={{
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: '#fff',
                      }}
                    >
                      <Text>Rediger</Text>
                    </Pressable>
                    {entry.status !== 'SUBMITTED' ? (
                      <Pressable
                        onPress={() => void submitEntry(entry.id)}
                        style={{
                          borderWidth: 1,
                          borderColor: '#0f766e',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          backgroundColor: '#0f766e',
                        }}
                      >
                        <Text style={{ color: '#fff' }}>Submit</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => void removeEntry(entry.id)}
                      style={{
                        borderWidth: 1,
                        borderColor: '#b91c1c',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: '#fff',
                      }}
                    >
                      <Text style={{ color: '#b91c1c' }}>Slett</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}
        {entries.length === 0 ? <Text style={{ color: '#64748b' }}>Ingen timeforinger.</Text> : null}
      </View>

      <Pressable
        onPress={() => void load()}
        style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' }}
      >
        <Text>Oppdater timer</Text>
      </Pressable>

      {message ? <Text style={{ color: '#0f766e' }}>{message}</Text> : null}
      {warning ? <Text style={{ color: '#a16207' }}>{warning}</Text> : null}
      {error ? <Text style={{ color: '#b91c1c' }}>{error}</Text> : null}
    </ScrollView>
  );
}
