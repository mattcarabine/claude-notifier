export interface Session {
  session_id: string;
  friendly_name: string;
  cwd: string;
  status: 'active' | 'idle' | 'waiting' | 'zombie';
  last_seen: number;
  notification_type?: 'permission_prompt' | 'elicitation_dialog';
  message?: string;
}

export interface NotificationHistoryItem {
  id: string;
  session_id: string;
  friendly_name: string;
  notification_type: 'permission_prompt' | 'elicitation_dialog';
  message?: string;
  cwd?: string;
  timestamp: number;
}

export interface AblyMessage {
  id?: string; // Ably's unique message ID for reliable deduplication
  name: string;
  data: {
    session_id: string;
    friendly_name?: string;
    cwd?: string;
    status?: 'active' | 'idle' | 'waiting' | 'zombie';
    notification_type?: 'permission_prompt' | 'elicitation_dialog';
    message?: string;
    reason?: string;
    timestamp: number;
  };
}

export interface Config {
  ably_api_key: string | null;
}

export interface SessionFilterSettings {
  activeOnly: boolean;
  idleExpiryMinutes: number; // 5 to 1440 (24 hours)
}
