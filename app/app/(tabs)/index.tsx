import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Session, SessionFilterSettings } from '@/types';
import Colors from '@/constants/Colors';
import { SessionCard } from '@/components/SessionCard';
import { FilterButton } from '@/components/FilterButton';
import { SessionFilterModal } from '@/components/SessionFilterModal';
import { useAbly } from '@/hooks/useAbly';
import { useSessions } from '@/hooks/useSessions';
import {
  getSessionFilterSettings,
  setSessionFilterSettings,
} from '@/services/storage';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
} from '@/services/notifications';

const BANNER_DISMISSED_KEY = 'push_notification_banner_dismissed';

const DEFAULT_FILTER_SETTINGS: SessionFilterSettings = {
  activeOnly: false,
  idleExpiryMinutes: 60,
};

const CONNECTION_COLORS: Record<string, string> = {
  connected: '#10b981',
  connecting: '#f59e0b',
};

const CONNECTION_LABELS: Record<string, string> = {
  connected: 'Connected to Ably',
  connecting: 'Connecting...',
};

export default function SessionsScreen(): React.JSX.Element {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [filterSettings, setFilterSettings] = useState<SessionFilterSettings>(DEFAULT_FILTER_SETTINGS);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [pushToken, setPushToken] = useState<string | null | undefined>(undefined);
  const [bannerDismissed, setBannerDismissed] = useState(true);

  const { sessions, handleMessage } = useSessions({
    idleExpiryMinutes: filterSettings.idleExpiryMinutes,
  });
  const { connectionState } = useAbly(handleMessage);

  const filteredSessions = useMemo(() => {
    if (!filterSettings.activeOnly) {
      return sessions;
    }
    // Show only sessions where Claude is actively working
    return sessions.filter((session) => session.status === 'active');
  }, [sessions, filterSettings.activeOnly]);

  const isFilterActive = filterSettings.activeOnly;

  function handleSessionPress(session: Session): void {
    router.push({
      pathname: '/session/[id]',
      params: {
        id: session.session_id,
        session: JSON.stringify(session),
      },
    });
  }

  async function handleFilterSettingsChange(newSettings: SessionFilterSettings): Promise<void> {
    setFilterSettings(newSettings);
    await setSessionFilterSettings(newSettings);
  }

  useEffect(() => {
    async function loadSettings(): Promise<void> {
      const settings = await getSessionFilterSettings();
      setFilterSettings(settings);
    }
    loadSettings();
  }, []);

  useEffect(() => {
    async function initPushNotifications(): Promise<void> {
      const dismissed = await AsyncStorage.getItem(BANNER_DISMISSED_KEY);
      setBannerDismissed(dismissed === 'true');

      const token = await registerForPushNotifications();
      setPushToken(token);
    }

    initPushNotifications();

    const receivedSubscription = addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    const responseSubscription = addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  async function handleDismissBanner(): Promise<void> {
    setBannerDismissed(true);
    await AsyncStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  }

  const showPushWarning = pushToken === null && !bannerDismissed;

  const statusColor = CONNECTION_COLORS[connectionState] ?? '#ef4444';
  const statusLabel = CONNECTION_LABELS[connectionState] ?? 'Disconnected';

  function renderContent(): React.JSX.Element {
    if (filteredSessions.length > 0) {
      return (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.session_id}
          renderItem={({ item }) => (
            <SessionCard session={item} onPress={() => handleSessionPress(item)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    if (connectionState === 'connecting') {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      );
    }

    const emptyMessage = filterSettings.activeOnly && sessions.length > 0
      ? 'No active sessions. Adjust filters to see all sessions.'
      : 'Start a Claude Code session on your Mac to see it here.';

    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No Active Sessions
        </Text>
        <Text style={[styles.emptyDescription, { color: colors.tabIconDefault }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statusBar}>
        <Pressable
          style={styles.statusIndicator}
          onPress={() => router.push('/debug')}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: colors.tabIconDefault }]}>
            {statusLabel}
          </Text>
        </Pressable>
        <View style={styles.statusBarSpacer} />
        <FilterButton
          isActive={isFilterActive}
          onPress={() => setFilterModalVisible(true)}
        />
      </View>
      {showPushWarning && (
        <View style={styles.warningBanner}>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Push Notifications Unavailable</Text>
            <Text style={styles.warningText}>
              Run "npx eas init" in the app folder to enable push notifications.
            </Text>
          </View>
          <Pressable onPress={handleDismissBanner} style={styles.dismissButton}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </Pressable>
        </View>
      )}
      {renderContent()}
      <SessionFilterModal
        visible={filterModalVisible}
        settings={filterSettings}
        onSettingsChange={handleFilterSettingsChange}
        onClose={() => setFilterModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
  },
  statusBarSpacer: {
    flex: 1,
  },
  list: {
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  warningBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f59e0b',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 13,
    color: '#a16207',
  },
  dismissButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
});
