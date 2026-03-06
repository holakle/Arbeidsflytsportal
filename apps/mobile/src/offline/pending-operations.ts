import { getStoredValue, setStoredValue } from '../storage/kv-store';

const KEY = 'workflow_pending_operations_v1';

export type PendingOperationStatus = 'Pending' | 'Synced' | 'Failed';
export type PendingOperationType =
  | 'SCAN_LOOKUP'
  | 'EQUIPMENT_RESERVE'
  | 'TIMESHEET_CREATE'
  | 'TIMESHEET_UPDATE';

export type PendingOperation = {
  id: string;
  type: PendingOperationType;
  payload: Record<string, unknown>;
  status: PendingOperationStatus;
  attemptCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  nextRetryAt: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function buildId() {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readAll(): Promise<PendingOperation[]> {
  const raw = await getStoredValue(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PendingOperation[];
  } catch {
    return [];
  }
}

async function writeAll(ops: PendingOperation[]) {
  await setStoredValue(KEY, JSON.stringify(ops));
}

export async function listPendingOperations() {
  return readAll();
}

export async function enqueuePendingOperation(
  type: PendingOperationType,
  payload: Record<string, unknown>,
) {
  const ops = await readAll();
  const operation: PendingOperation = {
    id: buildId(),
    type,
    payload,
    status: 'Pending',
    attemptCount: 0,
    lastError: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    nextRetryAt: null,
  };
  ops.unshift(operation);
  await writeAll(ops);
  return operation;
}

export async function updatePendingOperation(
  id: string,
  patch: Partial<PendingOperation>,
): Promise<PendingOperation | null> {
  const ops = await readAll();
  const index = ops.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const current = ops[index];
  if (!current) return null;
  const next: PendingOperation = {
    ...current,
    ...patch,
    updatedAt: nowIso(),
  };
  ops[index] = next;
  await writeAll(ops);
  return next;
}

export async function markOperationSynced(id: string) {
  return updatePendingOperation(id, {
    status: 'Synced',
    nextRetryAt: null,
    lastError: null,
  });
}

export async function markOperationFailed(id: string, error: string) {
  const current = (await listPendingOperations()).find((item) => item.id === id);
  const attempts = (current?.attemptCount ?? 0) + 1;
  return updatePendingOperation(id, {
    status: 'Failed',
    attemptCount: attempts,
    lastError: error,
    nextRetryAt: null,
  });
}

export async function markOperationPending(
  id: string,
  error: string,
  nextRetryAt: string | null,
) {
  const current = (await listPendingOperations()).find((item) => item.id === id);
  const attempts = (current?.attemptCount ?? 0) + 1;
  return updatePendingOperation(id, {
    status: 'Pending',
    attemptCount: attempts,
    lastError: error,
    nextRetryAt,
  });
}
