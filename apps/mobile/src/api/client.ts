import { ApiClient } from '@portal/shared';
import { getToken } from '../auth/token-store';

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function mobileApiClient() {
  const token = await getToken();
  return new ApiClient(baseUrl, token ?? undefined);
}

