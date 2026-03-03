import { getToken } from './token-store';

export async function hasToken() {
  const token = await getToken();
  return Boolean(token);
}
