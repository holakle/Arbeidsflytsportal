import { getStoredValue, removeStoredValue, setStoredValue } from '../storage/kv-store';

const KEY = 'workflow_last_opened_workorder_id';

export async function getLastOpenedWorkOrderId() {
  return getStoredValue(KEY);
}

export async function setLastOpenedWorkOrderId(workOrderId: string) {
  await setStoredValue(KEY, workOrderId);
}

export async function clearLastOpenedWorkOrderId() {
  await removeStoredValue(KEY);
}
