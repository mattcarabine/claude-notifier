import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAbly } from '@/hooks/useAbly';
import { useSessions } from '@/hooks/useSessions';
import { getMessageHistory, DebugMessageHistoryItem } from '@/services/ably';

export default function DebugScreen(): React.JSX.Element {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];

  const [refreshing, setRefreshing] = useState(false);
  const [messageHistory, setMessageHistory] = useState<DebugMessageHistoryItem[]>(getMessageHistory);
  const [snapshotTime] = useState(new Date());

  const { sessions, handleMessage } = useSessions({ finishedExpiryMinutes: 60 });
  const { connectionState } = useAbly(handleMessage);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setMessageHistory(getMessageHistory());
    setRefreshing(false);
  }, []);

  function formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleTimeString();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#e5e5e5' }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Debug Console</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={[styles.closeButtonText, { color: colors.tint }]}>Done</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.section, { backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Connection State</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.tabIconDefault }]}>State:</Text>
            <Text style={[styles.value, { color: colors.text }]}>{connectionState}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.tabIconDefault }]}>Snapshot:</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {snapshotTime.toLocaleTimeString()}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Sessions ({sessions.length})
          </Text>
          <ScrollView horizontal style={styles.jsonContainer}>
            <Text style={[styles.json, { color: colors.text }]}>
              {JSON.stringify(sessions, null, 2)}
            </Text>
          </ScrollView>
        </View>

        <View style={[styles.section, { backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recent Messages ({messageHistory.length})
          </Text>
          <Text style={[styles.hint, { color: colors.tabIconDefault }]}>
            Pull to refresh
          </Text>
          {messageHistory.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
              No messages received yet
            </Text>
          ) : (
            messageHistory.slice().reverse().map((item, index) => (
              <View
                key={`${item.receivedAt}-${index}`}
                style={[styles.messageItem, { borderTopColor: isDark ? '#333' : '#e5e5e5' }]}
              >
                <View style={styles.messageHeader}>
                  <Text style={[styles.messageName, { color: colors.tint }]}>
                    {item.message.name}
                  </Text>
                  <Text style={[styles.messageTime, { color: colors.tabIconDefault }]}>
                    {formatTimestamp(item.receivedAt)}
                  </Text>
                </View>
                <ScrollView horizontal style={styles.jsonContainer}>
                  <Text style={[styles.json, { color: colors.text }]}>
                    {JSON.stringify(item.message.data, null, 2)}
                  </Text>
                </ScrollView>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    marginRight: 8,
  },
  value: {
    fontSize: 13,
    fontFamily: 'SpaceMono',
  },
  hint: {
    fontSize: 11,
    marginBottom: 8,
  },
  jsonContainer: {
    maxHeight: 200,
  },
  json: {
    fontSize: 11,
    fontFamily: 'SpaceMono',
    lineHeight: 16,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  messageItem: {
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  messageName: {
    fontSize: 13,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 11,
  },
});
