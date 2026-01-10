import { useState, useEffect, useCallback, useRef } from 'react';
import { Session, AblyMessage, NotificationHistoryItem } from '@/types';
import { addNotificationToHistory } from '@/services/storage';

const STALE_THRESHOLD_MS = 60000; // 60 seconds
const STALE_CHECK_INTERVAL_MS = 10000; // 10 seconds

interface UseSessionsReturn {
  sessions: Session[];
  handleMessage: (message: AblyMessage) => void;
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const sessionsRef = useRef<Map<string, Session>>(new Map());

  // Check for stale sessions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let hasChanges = false;

      sessionsRef.current.forEach((session, sessionId) => {
        const age = now - session.last_seen * 1000;
        if (age > STALE_THRESHOLD_MS) {
          sessionsRef.current.delete(sessionId);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setSessions(Array.from(sessionsRef.current.values()));
      }
    }, STALE_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const handleMessage = useCallback((message: AblyMessage) => {
    const { name, data } = message;
    const { session_id, timestamp } = data;

    switch (name) {
      case 'session_start': {
        const newSession: Session = {
          session_id,
          friendly_name: data.friendly_name || 'Unknown',
          cwd: data.cwd || '',
          status: 'active',
          last_seen: timestamp,
        };
        sessionsRef.current.set(session_id, newSession);
        setSessions(Array.from(sessionsRef.current.values()));
        break;
      }

      case 'session_end': {
        sessionsRef.current.delete(session_id);
        setSessions(Array.from(sessionsRef.current.values()));
        break;
      }

      case 'activity_ping': {
        const existing = sessionsRef.current.get(session_id);
        if (existing) {
          existing.last_seen = timestamp;
          existing.status = 'active';
          sessionsRef.current.set(session_id, existing);
          setSessions(Array.from(sessionsRef.current.values()));
        }
        break;
      }

      case 'status_update': {
        const existing = sessionsRef.current.get(session_id);
        if (existing) {
          existing.last_seen = timestamp;
          existing.status = data.status || 'waiting';
          existing.notification_type = data.notification_type;
          existing.message = data.message;
          sessionsRef.current.set(session_id, existing);
          setSessions(Array.from(sessionsRef.current.values()));

          // Add to notification history if it's a notification
          if (data.notification_type) {
            const historyItem: NotificationHistoryItem = {
              id: `${session_id}-${timestamp}`,
              session_id,
              friendly_name: existing.friendly_name,
              notification_type: data.notification_type,
              message: data.message,
              timestamp,
            };
            addNotificationToHistory(historyItem);
          }
        }
        break;
      }
    }
  }, []);

  return {
    sessions,
    handleMessage,
  };
}
