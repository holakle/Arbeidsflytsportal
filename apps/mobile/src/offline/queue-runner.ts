import { mobileApiBaseUrl, mobileApiClient } from '../api/client';
import {
  enqueuePendingOperation,
  listPendingOperations,
  markOperationFailed,
  markOperationPending,
  markOperationSynced,
  type PendingOperation,
} from './pending-operations';

const MAX_ATTEMPTS = 5;
let processing = false;

function canRetry(operation: PendingOperation, forceFailed = false) {
  if (operation.status === 'Synced') return false;
  if (!forceFailed && operation.status === 'Failed' && operation.attemptCount >= MAX_ATTEMPTS) {
    return false;
  }
  if (!operation.nextRetryAt) return true;
  return new Date(operation.nextRetryAt) <= new Date();
}

function nextRetryIso(attemptCount: number) {
  const seconds = Math.min(60, 2 ** Math.max(0, attemptCount));
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

async function isApiReachable() {
  try {
    const response = await fetch(`${mobileApiBaseUrl}/health`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

async function runOperation(operation: PendingOperation) {
  const api = await mobileApiClient();

  if (operation.type === 'SCAN_LOOKUP') {
    const code = String(operation.payload.code ?? '').trim();
    if (!code) throw new Error('Missing code in scan lookup operation');
    await api.lookupEquipmentByCode(code);
    return;
  }

  if (operation.type === 'EQUIPMENT_RESERVE') {
    await api.reserveEquipment({
      equipmentItemId: String(operation.payload.equipmentItemId),
      workOrderId: (operation.payload.workOrderId as string | null | undefined) ?? null,
      startAt: String(operation.payload.startAt),
      endAt: String(operation.payload.endAt),
      allowConflict: Boolean(operation.payload.allowConflict ?? false),
    });
    return;
  }

  if (operation.type === 'TIMESHEET_CREATE') {
    await api.createTimesheet(operation.payload);
    return;
  }

  if (operation.type === 'TIMESHEET_UPDATE') {
    const entryId = String(operation.payload.entryId ?? '');
    const body = operation.payload.body as Record<string, unknown> | undefined;
    if (!entryId || !body) {
      throw new Error('Missing entryId/body in timesheet update operation');
    }
    await api.updateTimesheet(entryId, body);
  }
}

export async function processPendingOperationsNow(options?: { forceFailed?: boolean }) {
  if (processing) return;
  processing = true;
  try {
    const reachable = await isApiReachable();
    if (!reachable) return;

    const operations = await listPendingOperations();
    for (const operation of operations) {
      if (!canRetry(operation, options?.forceFailed === true)) continue;
      try {
        await runOperation(operation);
        await markOperationSynced(operation.id);
      } catch (error) {
        const message = toErrorMessage(error);
        const nextAttempt = operation.attemptCount + 1;
        if (nextAttempt >= MAX_ATTEMPTS) {
          await markOperationFailed(operation.id, message);
        } else {
          await markOperationPending(operation.id, message, nextRetryIso(nextAttempt));
        }
      }
    }
  } finally {
    processing = false;
  }
}

export async function retryAllPendingOperations() {
  await processPendingOperationsNow({ forceFailed: true });
}

export async function queueOrRunScanLookup(code: string) {
  const payload = { code };
  try {
    const api = await mobileApiClient();
    const result = await api.lookupEquipmentByCode(code);
    return { queued: false as const, result };
  } catch (error) {
    const op = await enqueuePendingOperation('SCAN_LOOKUP', payload);
    return { queued: true as const, operation: op, error: toErrorMessage(error) };
  }
}

export async function queueOrRunEquipmentReserve(payload: {
  equipmentItemId: string;
  workOrderId?: string | null;
  startAt: string;
  endAt: string;
  allowConflict?: boolean;
}) {
  try {
    const api = await mobileApiClient();
    const result = await api.reserveEquipment(payload);
    return { queued: false as const, result };
  } catch (error) {
    const op = await enqueuePendingOperation('EQUIPMENT_RESERVE', payload);
    return { queued: true as const, operation: op, error: toErrorMessage(error) };
  }
}

export async function queueOrRunTimesheetCreate(payload: Record<string, unknown>) {
  try {
    const api = await mobileApiClient();
    const result = await api.createTimesheet(payload);
    return { queued: false as const, result };
  } catch (error) {
    const op = await enqueuePendingOperation('TIMESHEET_CREATE', payload);
    return { queued: true as const, operation: op, error: toErrorMessage(error) };
  }
}

export async function queueOrRunTimesheetUpdate(entryId: string, body: Record<string, unknown>) {
  try {
    const api = await mobileApiClient();
    const result = await api.updateTimesheet(entryId, body);
    return { queued: false as const, result };
  } catch (error) {
    const op = await enqueuePendingOperation('TIMESHEET_UPDATE', { entryId, body });
    return { queued: true as const, operation: op, error: toErrorMessage(error) };
  }
}
