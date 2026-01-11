import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initializeAbly,
  closeAbly,
  subscribeToMessages,
  unsubscribeFromMessages,
  getRecentMessagesForRecovery,
} from '@/services/ably';
import { getAblyApiKey } from '@/services/storage';
import { AblyMessage } from '@/types';

interface UseAblyReturn {
  isConnected: boolean;
  connectionState: string;
}

interface UseAblyOptions {
  // How far back to fetch history on initial connect (in minutes)
  // Default: 1440 (24 hours)
  initialRecoveryMinutes?: number;
  // How far back to fetch on reconnect (in minutes)
  // Default: 10
  reconnectRecoveryMinutes?: number;
}

const MAX_PROCESSED_IDS = 1000;
const PRUNE_TO_SIZE = 500;
const DEFAULT_INITIAL_RECOVERY_MINUTES = 1440; // 24 hours
const DEFAULT_RECONNECT_RECOVERY_MINUTES = 10;

export function useAbly(
  onMessageCallback?: (message: AblyMessage) => void,
  options?: UseAblyOptions
): UseAblyReturn {
  const {
    initialRecoveryMinutes = DEFAULT_INITIAL_RECOVERY_MINUTES,
    reconnectRecoveryMinutes = DEFAULT_RECONNECT_RECOVERY_MINUTES,
  } = options ?? {};

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const processedMessageIds = useRef<Set<string>>(new Set());
  const onMessageCallbackRef = useRef(onMessageCallback);
  const hasConnectedOnce = useRef(false);

  // Keep callback ref up to date
  useEffect(() => {
    onMessageCallbackRef.current = onMessageCallback;
  }, [onMessageCallback]);

  // Handle recovery - fetch history and process messages
  const handleRecovery = useCallback(async (minutes: number) => {
    if (!onMessageCallbackRef.current) return;

    console.log(`Fetching recovery messages for last ${minutes} minutes...`);
    const recoveryMessages = await getRecentMessagesForRecovery(minutes);

    // Process in chronological order (oldest first), skipping already-processed
    const chronological = recoveryMessages.reverse();
    let processedCount = 0;
    for (const msg of chronological) {
      if (msg.id && processedMessageIds.current.has(msg.id)) {
        continue; // Skip already processed
      }
      if (msg.id) {
        processedMessageIds.current.add(msg.id);
      }
      onMessageCallbackRef.current(msg);
      processedCount++;
    }

    // Prune processed IDs set to prevent memory growth
    if (processedMessageIds.current.size > MAX_PROCESSED_IDS) {
      const idsArray = Array.from(processedMessageIds.current);
      processedMessageIds.current = new Set(idsArray.slice(-PRUNE_TO_SIZE));
    }

    console.log(`Recovery complete: ${processedCount} new messages (${chronological.length - processedCount} duplicates skipped)`);
  }, []);

  const connect = useCallback((apiKey: string): void => {
    const client = initializeAbly(apiKey);

    client.connection.on('connected', (stateChange) => {
      setIsConnected(true);
      setConnectionState('connected');

      // First connection: fetch full history to rebuild session state
      if (!hasConnectedOnce.current) {
        hasConnectedOnce.current = true;
        handleRecovery(initialRecoveryMinutes);
        return;
      }

      // Reconnection: check if seamless resume or need shorter recovery
      // The 'resumed' property may exist at runtime even if not in types
      const wasResumed = (stateChange as { resumed?: boolean }).resumed;
      if (wasResumed === false) {
        handleRecovery(reconnectRecoveryMinutes);
      }
    });

    client.connection.on('disconnected', () => {
      setIsConnected(false);
      setConnectionState('disconnected');
    });

    client.connection.on('failed', () => {
      setIsConnected(false);
      setConnectionState('failed');
    });

    client.connection.on('connecting', () => {
      setConnectionState('connecting');
    });

    client.connection.on('suspended', () => {
      setConnectionState('suspended');
    });
  }, [handleRecovery, initialRecoveryMinutes, reconnectRecoveryMinutes]);

  const disconnect = useCallback((): void => {
    unsubscribeFromMessages();
    closeAbly();
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  // Subscribe to messages when connected and callback provided
  useEffect(() => {
    if (isConnected && onMessageCallback) {
      // Wrap callback to track processed message IDs
      const wrappedCallback = (message: AblyMessage) => {
        if (message.id) {
          // Skip if already processed (from recovery or rewind)
          if (processedMessageIds.current.has(message.id)) {
            return;
          }
          processedMessageIds.current.add(message.id);

          // Prune if needed
          if (processedMessageIds.current.size > MAX_PROCESSED_IDS) {
            const idsArray = Array.from(processedMessageIds.current);
            processedMessageIds.current = new Set(idsArray.slice(-PRUNE_TO_SIZE));
          }
        }
        onMessageCallback(message);
      };

      subscribeToMessages(wrappedCallback, {
        onError: (error) => console.error('Ably subscription error:', error),
      });
      return () => unsubscribeFromMessages();
    }
  }, [isConnected, onMessageCallback]);

  // Auto-connect on mount if API key exists
  useEffect(() => {
    let mounted = true;

    async function autoConnect(): Promise<void> {
      const apiKey = await getAblyApiKey();
      if (apiKey && mounted) {
        connect(apiKey);
      }
    }

    autoConnect();

    return () => {
      mounted = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionState,
  };
}
