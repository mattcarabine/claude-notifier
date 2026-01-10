import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { NotificationItem } from '@/components/NotificationItem';
import { useNotificationHistory } from '@/hooks/useNotificationHistory';

export default function HistoryScreen(): React.JSX.Element {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { history, loading, refresh } = useNotificationHistory();

  useEffect(() => {
    refresh();
  }, []);

  function renderContent(): React.JSX.Element {
    if (loading && history.length === 0) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      );
    }

    if (history.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Notifications Yet
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.tabIconDefault }]}>
            When Claude needs your attention, notifications will appear here.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.tint}
          />
        }
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingVertical: 8,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});
