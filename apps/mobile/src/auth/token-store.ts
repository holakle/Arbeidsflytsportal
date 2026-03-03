import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'workflow_dev_token';

export async function getToken() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(KEY);
  }
  return SecureStore.getItemAsync(KEY);
}

export async function setToken(token: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(KEY, token);
    return;
  }
  return SecureStore.setItemAsync(KEY, token);
}

export async function clearToken() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.removeItem(KEY);
    return;
  }
  return SecureStore.deleteItemAsync(KEY);
}
