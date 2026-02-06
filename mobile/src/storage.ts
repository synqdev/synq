import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageKeys = {
  customer: 'synq.customer',
  locale: 'synq.locale',
};

export async function saveJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}
