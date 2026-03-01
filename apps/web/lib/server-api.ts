import 'server-only';

import type { MeResponse } from '@portal/shared';
import { cookies } from 'next/headers';

type SectionOk<T> = { status: 'ok'; data: T };
type SectionError = { status: 'error'; message: string };
export type SectionResult<T> = SectionOk<T> | SectionError;

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getServerToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('portal_dev_token')?.value;
  if (cookieToken) return cookieToken;
  if (process.env.NODE_ENV !== 'production') {
    return process.env.NEXT_PUBLIC_DEV_TOKEN ?? null;
  }
  return null;
}

export async function apiRequest<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as T;
}

export async function trySection<T>(label: string, call: Promise<T>): Promise<SectionResult<T>> {
  try {
    const data = await call;
    return { status: 'ok', data };
  } catch (error) {
    return {
      status: 'error',
      message: `${label} feilet: ${error instanceof Error ? error.message : 'Ukjent feil'}`,
    };
  }
}

export function canAccessOverview(me: MeResponse): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return me.roles.some((role) => ['planner', 'org_admin', 'system_admin'].includes(role));
}
