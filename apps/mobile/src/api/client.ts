import { ApiClient } from '@portal/shared';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getToken } from '../auth/token-store';

type ExtraConfig = {
  apiUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function extractExpoHost(value: string | null | undefined) {
  const source = value?.trim();
  if (!source) return null;
  const withoutProtocol = source.replace(/^[a-z]+:\/\//i, '');
  const hostPort = withoutProtocol.split('/')[0] ?? '';
  const host = hostPort.split(':')[0] ?? '';
  return host || null;
}

function resolveBaseUrl() {
  const configured = trimTrailingSlash(extra.apiUrl ?? 'http://localhost:3001');
  if (Platform.OS === 'web') {
    return configured;
  }

  try {
    const parsed = new URL(configured);
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return configured;
    }

    const expoHost =
      extractExpoHost(Constants.expoConfig?.hostUri) ??
      extractExpoHost(Constants.expoGoConfig?.debuggerHost);

    if (!expoHost) {
      return configured;
    }

    parsed.hostname = expoHost;
    return trimTrailingSlash(parsed.toString());
  } catch {
    return configured;
  }
}

export const mobileApiBaseUrl = resolveBaseUrl();

export async function mobileApiClient() {
  const token = await getToken();
  return new ApiClient(mobileApiBaseUrl, token ?? undefined);
}
