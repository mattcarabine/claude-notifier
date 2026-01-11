import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config, NotificationHistoryItem, SessionFilterSettings } from '@/types';

const KEYS = {
  ABLY_API_KEY: 'ably_api_key',
  NOTIFICATION_HISTORY: 'notification_history',
  SESSION_FILTER_SETTINGS: 'session_filter_settings',
} as const;

const DEFAULT_FILTER_SETTINGS: SessionFilterSettings = {
  activeOnly: false,
  idleExpiryMinutes: 60,
};

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

export async function getSessionFilterSettings(): Promise<SessionFilterSettings> {
  try {
    const data = await AsyncStorage.getItem(KEYS.SESSION_FILTER_SETTINGS);
    if (data) {
      const parsed = JSON.parse(data);
      // Migration: rename finishedExpiryMinutes to idleExpiryMinutes
      if ('finishedExpiryMinutes' in parsed && !('idleExpiryMinutes' in parsed)) {
        parsed.idleExpiryMinutes = parsed.finishedExpiryMinutes;
        delete parsed.finishedExpiryMinutes;
      }
      return { ...DEFAULT_FILTER_SETTINGS, ...parsed };
    }
    return DEFAULT_FILTER_SETTINGS;
  } catch {
    return DEFAULT_FILTER_SETTINGS;
  }
}

export async function setSessionFilterSettings(
  settings: SessionFilterSettings
): Promise<void> {
  await AsyncStorage.setItem(
    KEYS.SESSION_FILTER_SETTINGS,
    JSON.stringify(settings)
  );
}
