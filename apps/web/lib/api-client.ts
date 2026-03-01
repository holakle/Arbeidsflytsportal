import { ApiClient } from '@portal/shared';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function apiClient(token?: string) {
  return new ApiClient(baseUrl, token);
}

