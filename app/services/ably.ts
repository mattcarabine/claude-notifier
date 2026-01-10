import Ably from 'ably';
import { AblyMessage, NotificationHistoryItem } from '@/types';

let ablyClient: Ably.Realtime | null = null;
let channel: Ably.RealtimeChannel | null = null;

export function initializeAbly(apiKey: string): Ably.Realtime {
  if (ablyClient) {
    ablyClient.close();
  }

  ablyClient = new Ably.Realtime({ key: apiKey });
  channel = ablyClient.channels.get('claude-sessions');

  return ablyClient;
}

export function closeAbly(): void {
  if (ablyClient) {
    ablyClient.close();
    ablyClient = null;
    channel = null;
  }
}

export function subscribeToMessages(
  callback: (message: AblyMessage) => void
): void {
  if (!channel) return;

  channel.subscribe((message) => {
    callback({
      name: message.name ?? '',
      data: message.data as AblyMessage['data'],
    });
  });
}

export function unsubscribeFromMessages(): void {
  if (channel) {
    channel.unsubscribe();
  }
}

export async function getChannelHistory(): Promise<NotificationHistoryItem[]> {
  if (!channel) return [];

  try {
    const history = await channel.history({ limit: 100 });

    return history.items
      .filter((msg) => msg.name === 'status_update' && msg.data?.notification_type)
      .map((msg) => {
        const data = msg.data as AblyMessage['data'];
        return {
          id: `${data.session_id}-${data.timestamp}`,
          session_id: data.session_id,
          friendly_name: data.friendly_name ?? 'Unknown',
          notification_type: data.notification_type!,
          message: data.message,
          timestamp: data.timestamp,
        };
      });
  } catch (error) {
    console.error('Error fetching channel history:', error);
    return [];
  }
}
