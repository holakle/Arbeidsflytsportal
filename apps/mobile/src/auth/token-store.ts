import * as SecureStore from 'expo-secure-store';

const KEY = 'workflow_dev_token';

export async function getToken() {
  return SecureStore.getItemAsync(KEY);
}

export async function setToken(token: string) {
  return SecureStore.setItemAsync(KEY, token);
}

export async function clearToken() {
  return SecureStore.deleteItemAsync(KEY);
}
