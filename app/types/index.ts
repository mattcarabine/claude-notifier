export interface Session {
  session_id: string;
  friendly_name: string;
  cwd: string;
  status: 'active' | 'waiting';
  last_seen: number;
  notification_type?: 'permission_prompt' | 'elicitation_dialog' | 'finished';
  message?: string;
}

export interface NotificationHistoryItem {
  id: string;
  session_id: string;
  friendly_name: string;
  notification_type: 'permission_prompt' | 'elicitation_dialog' | 'finished';
  message?: string;
  timestamp: number;
}

export interface AblyMessage {
  name: string;
  data: {
    session_id: string;
    friendly_name?: string;
    cwd?: string;
    status?: 'active' | 'waiting';
    notification_type?: 'permission_prompt' | 'elicitation_dialog' | 'finished';
    message?: string;
    reason?: string;
    timestamp: number;
  };
}

export interface Config {
  ably_api_key: string | null;
}
