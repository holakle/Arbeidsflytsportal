export type ActiveUser = {
  id: string;
  email: string;
  displayName: string;
  organizationId: string;
  roles: string[];
};

const USER_KEY = 'portal.dev.user';
const COOKIE_KEY = 'portal_dev_token';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getDevToken(): string {
  if (isBrowser()) {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${COOKIE_KEY}=`));
    if (match) return decodeURIComponent(match.split('=')[1]);
  }
  return '';
}

export function getActiveUser(): ActiveUser | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveUser;
  } catch {
    return null;
  }
}

export function setDevSession(token: string, user: ActiveUser) {
  if (!isBrowser()) return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Strict; Secure`;
}

export function clearDevSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(USER_KEY);
  document.cookie = `${COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Strict; Secure`;
}
