import { useState, useEffect, useCallback } from 'react';
import {
  initializeAbly,
  closeAbly,
  subscribeToMessages,
  unsubscribeFromMessages,
} from '@/services/ably';
import { getAblyApiKey } from '@/services/storage';
import { AblyMessage } from '@/types';

interface UseAblyReturn {
  isConnected: boolean;
  connectionState: string;
}

export function useAbly(
  onMessageCallback?: (message: AblyMessage) => void
): UseAblyReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');

  const connect = useCallback((apiKey: string): void => {
    const client = initializeAbly(apiKey);

    client.connection.on('connected', () => {
      setIsConnected(true);
      setConnectionState('connected');
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
  }, []);

  const disconnect = useCallback((): void => {
    unsubscribeFromMessages();
    closeAbly();
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  // Subscribe to messages when connected and callback provided
  useEffect(() => {
    if (isConnected && onMessageCallback) {
      subscribeToMessages(onMessageCallback);
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
