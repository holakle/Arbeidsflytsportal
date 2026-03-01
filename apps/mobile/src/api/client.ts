import { ApiClient } from '@portal/shared';
import Constants from 'expo-constants';
import { getToken } from '../auth/token-store';

type ExtraConfig = {
  apiUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;
const baseUrl = extra.apiUrl ?? 'http://localhost:3001';

export async function mobileApiClient() {
  const token = await getToken();
  return new ApiClient(baseUrl, token ?? undefined);
}
