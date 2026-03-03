import { ApiClient } from '@portal/shared';
import { clearDevSession } from './auth';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function apiClient(token?: string) {
  const client = new ApiClient(baseUrl, token);

  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;

      return async (...args: unknown[]) => {
        try {
          return await value.apply(target, args);
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.startsWith('HTTP 401:') &&
            typeof window !== 'undefined'
          ) {
            clearDevSession();
            window.location.href = '/login?reason=invalid-token';
          }
          throw error;
        }
      };
    },
  }) as ApiClient;
}
