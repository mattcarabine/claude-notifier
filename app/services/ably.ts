import Ably from 'ably';
import { AblyMessage, NotificationHistoryItem } from '@/types';

let ablyClient: Ably.Realtime | null = null;
let channel: Ably.RealtimeChannel | null = null;

const MESSAGE_HISTORY_LIMIT = 50;
const MAX_HISTORY_PAGES = 5; // Max 500 messages for pagination
let messageHistory: Array<{ message: AblyMessage; receivedAt: number }> = [];

export interface DebugMessageHistoryItem {
  message: AblyMessage;
  receivedAt: number;
}

export function getMessageHistory(): DebugMessageHistoryItem[] {
  return [...messageHistory];
}

export function clearMessageHistory(): void {
  messageHistory = [];
}

export function initializeAbly(apiKey: string): Ably.Realtime {
  if (ablyClient) {
    ablyClient.close();
  }

  ablyClient = new Ably.Realtime({ key: apiKey });
  // Use rewind to get recent messages when attaching to channel
  channel = ablyClient.channels.get('claude-sessions', {
    params: { rewind: '2m' },
  });

  return ablyClient;
}

export function closeAbly(): void {
  if (ablyClient) {
    ablyClient.close();
    ablyClient = null;
    channel = null;
  }
}

export interface SubscribeOptions {
  onError?: (error: Error) => void;
}

export function subscribeToMessages(
  callback: (message: AblyMessage) => void,
  options?: SubscribeOptions
): void {
  if (!channel) return;

  const { onError } = options ?? {};

  // Monitor channel state for errors
  channel.on('failed', (stateChange) => {
    const error = new Error(
      `Channel failed: ${stateChange.reason?.message ?? 'Unknown error'}`
    );
    console.error(error);
    onError?.(error);
  });

  // Subscribe to all messages (rewind is configured via channel params)
  channel.subscribe((message: Ably.InboundMessage) => {
    try {
      const ablyMessage: AblyMessage = {
        id: message.id, // Capture Ably's unique message ID
        name: message.name ?? '',
        data: message.data as AblyMessage['data'],
      };

      // Store in debug history buffer
      messageHistory.push({ message: ablyMessage, receivedAt: Date.now() });
      if (messageHistory.length > MESSAGE_HISTORY_LIMIT) {
        messageHistory.shift();
      }

      callback(ablyMessage);
    } catch (error) {
      console.error('Error processing Ably message:', error);
      // Don't rethrow - allow subscription to continue
    }
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
    const allItems: NotificationHistoryItem[] = [];
    let page = await channel.history({ limit: 100 });
    let pageCount = 0;

    while (page && pageCount < MAX_HISTORY_PAGES) {
      const pageItems = page.items
        .filter((msg) => msg.name === 'status_update' && msg.data?.notification_type)
        .map((msg) => {
          const data = msg.data as AblyMessage['data'];
          return {
            // Use Ably message ID for reliable deduplication
            id: msg.id ?? `${data.session_id}-${data.timestamp}`,
            session_id: data.session_id,
            friendly_name: data.friendly_name ?? 'Unknown',
            notification_type: data.notification_type!,
            message: data.message,
            cwd: data.cwd,
            timestamp: data.timestamp,
          };
        });

      allItems.push(...pageItems);

      if (page.hasNext()) {
        const nextPage = await page.next();
        if (nextPage) {
          page = nextPage;
          pageCount++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return allItems;
  } catch (error) {
    console.error('Error fetching channel history:', error);
    return [];
  }
}

// Fetch recent messages for recovery after non-resumed reconnect
export async function getRecentMessagesForRecovery(
  sinceMinutes: number = 5
): Promise<AblyMessage[]> {
  if (!channel) return [];

  try {
    const messages: AblyMessage[] = [];
    const cutoffTime = Date.now() - sinceMinutes * 60 * 1000;
    let page = await channel.history({ limit: 100 });

    while (page) {
      for (const msg of page.items) {
        // Stop if we've gone past the cutoff time
        if (msg.timestamp && msg.timestamp < cutoffTime) {
          return messages;
        }

        messages.push({
          id: msg.id,
          name: msg.name ?? '',
          data: msg.data as AblyMessage['data'],
        });
      }

      if (page.hasNext()) {
        const nextPage = await page.next();
        if (nextPage) {
          page = nextPage;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return messages;
  } catch (error) {
    console.error('Error fetching recovery messages:', error);
    return [];
  }
}
