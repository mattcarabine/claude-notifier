import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config, NotificationHistoryItem } from '@/types';

const KEYS = {
  ABLY_API_KEY: 'ably_api_key',
  NOTIFICATION_HISTORY: 'notification_history',
} as const;

export async function getAblyApiKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.ABLY_API_KEY);
  } catch {
    return null;
  }
}

export async function setAblyApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.ABLY_API_KEY, key);
}

export async function clearAblyApiKey(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.ABLY_API_KEY);
}

export async function getNotificationHistory(): Promise<NotificationHistoryItem[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.NOTIFICATION_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addNotificationToHistory(
  item: NotificationHistoryItem
): Promise<void> {
  const history = await getNotificationHistory();

  // Check for duplicate (same session_id and timestamp)
  const exists = history.some(
    (h) => h.session_id === item.session_id && h.timestamp === item.timestamp
  );

  if (!exists) {
    // Add to beginning, keep max 100 items
    const newHistory = [item, ...history].slice(0, 100);
    await AsyncStorage.setItem(
      KEYS.NOTIFICATION_HISTORY,
      JSON.stringify(newHistory)
    );
  }
}

export async function mergeNotificationHistory(
  items: NotificationHistoryItem[]
): Promise<void> {
  const existing = await getNotificationHistory();

  // Create a map of existing items by id
  const existingMap = new Map(existing.map((item) => [item.id, item]));

  // Merge new items
  for (const item of items) {
    if (!existingMap.has(item.id)) {
      existingMap.set(item.id, item);
    }
  }

  // Sort by timestamp descending and limit to 100
  const merged = Array.from(existingMap.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100);

  await AsyncStorage.setItem(KEYS.NOTIFICATION_HISTORY, JSON.stringify(merged));
}

export async function clearNotificationHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.NOTIFICATION_HISTORY);
}
