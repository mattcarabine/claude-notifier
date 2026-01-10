import { useState, useEffect, useCallback } from 'react';
import { NotificationHistoryItem } from '@/types';
import {
  getNotificationHistory,
  mergeNotificationHistory,
} from '@/services/storage';
import { getChannelHistory } from '@/services/ably';

interface UseNotificationHistoryReturn {
  history: NotificationHistoryItem[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useNotificationHistory(): UseNotificationHistoryReturn {
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const localHistory = await getNotificationHistory();
      setHistory(localHistory);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch from Ably channel history
      const ablyHistory = await getChannelHistory();

      // Merge with local history
      if (ablyHistory.length > 0) {
        await mergeNotificationHistory(ablyHistory);
      }

      // Reload from storage
      const updatedHistory = await getNotificationHistory();
      setHistory(updatedHistory);
    } catch (error) {
      console.error('Error refreshing history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    loading,
    refresh,
  };
}
