import { useState, useEffect, useCallback, useRef } from 'react';
import { Session, AblyMessage, NotificationHistoryItem } from '@/types';
import { addNotificationToHistory } from '@/services/storage';

const STALE_CHECK_INTERVAL_MS = 10000; // 10 seconds

interface UseSessionsOptions {
  finishedExpiryMinutes: number;
}

interface UseSessionsReturn {
  sessions: Session[];
  handleMessage: (message: AblyMessage) => void;
}

export function useSessions(options: UseSessionsOptions): UseSessionsReturn {
  const { finishedExpiryMinutes } = options;
  const [sessions, setSessions] = useState<Session[]>([]);
  const sessionsRef = useRef<Map<string, Session>>(new Map());

  // Check for expired finished sessions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const expiryMs = finishedExpiryMinutes * 60 * 1000;
      let hasChanges = false;

      sessionsRef.current.forEach((session, sessionId) => {
        // Only expire sessions that are finished
        if (session.notification_type === 'finished') {
          const age = now - session.last_seen * 1000;
          if (age > expiryMs) {
            sessionsRef.current.delete(sessionId);
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        setSessions(Array.from(sessionsRef.current.values()));
      }
    }, STALE_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [finishedExpiryMinutes]);

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
          // Update friendly_name if the new one is more complete (has " - " with message snippet)
          if (data.friendly_name && data.friendly_name.includes(' - ') && !existing.friendly_name.includes(' - ')) {
            existing.friendly_name = data.friendly_name;
          }
          if (data.cwd && !existing.cwd) {
            existing.cwd = data.cwd;
          }
          sessionsRef.current.set(session_id, existing);
        } else {
          // Create session from ping if we missed session_start
          const newSession: Session = {
            session_id,
            friendly_name: data.friendly_name || 'Active Session',
            cwd: data.cwd || '',
            status: 'active',
            last_seen: timestamp,
          };
          sessionsRef.current.set(session_id, newSession);
        }
        setSessions(Array.from(sessionsRef.current.values()));
        break;
      }

      case 'status_update': {
        let session = sessionsRef.current.get(session_id);
        if (!session) {
          // Create session from status_update if we missed session_start
          session = {
            session_id,
            friendly_name: data.friendly_name || 'Active Session',
            cwd: data.cwd || '',
            status: data.status || 'waiting',
            last_seen: timestamp,
          };
        } else {
          // Update friendly_name if the new one is more complete (has " - " with message snippet)
          if (data.friendly_name && data.friendly_name.includes(' - ') && !session.friendly_name.includes(' - ')) {
            session.friendly_name = data.friendly_name;
          }
          if (data.cwd && !session.cwd) {
            session.cwd = data.cwd;
          }
        }
        session.last_seen = timestamp;
        session.status = data.status || 'waiting';
        session.notification_type = data.notification_type;
        session.message = data.message;
        sessionsRef.current.set(session_id, session);
        setSessions(Array.from(sessionsRef.current.values()));

        // Add to notification history if it's a notification
        if (data.notification_type) {
          const historyItem: NotificationHistoryItem = {
            id: `${session_id}-${timestamp}`,
            session_id,
            friendly_name: session.friendly_name,
            notification_type: data.notification_type,
            message: data.message,
            timestamp,
          };
          addNotificationToHistory(historyItem);
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
