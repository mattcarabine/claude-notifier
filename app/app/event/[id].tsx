import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { NotificationHistoryItem } from '@/types';
import { formatTimestamp } from '@/utils/format';

function getNotificationIcon(
  type: NotificationHistoryItem['notification_type']
): React.ComponentProps<typeof FontAwesome>['name'] {
  switch (type) {
    case 'permission_prompt':
      return 'shield';
    case 'elicitation_dialog':
      return 'question-circle';
    default:
      return 'bell';
  }
}

function getNotificationLabel(
  type: NotificationHistoryItem['notification_type']
): string {
  switch (type) {
    case 'permission_prompt':
      return 'Approval Needed';
    case 'elicitation_dialog':
      return 'Question';
    default:
      return 'Notification';
  }
}

function getNotificationColor(
  type: NotificationHistoryItem['notification_type']
): string {
  switch (type) {
    case 'permission_prompt':
      return '#ef4444'; // red
    case 'elicitation_dialog':
      return '#f59e0b'; // amber
    default:
      return '#6b7280'; // gray
  }
}

function DetailRow({
  label,
  value,
  copyable = false,
  mono = false,
  colors,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
  colors: typeof Colors.light;
}): React.JSX.Element {
  async function handleCopy(): Promise<void> {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${label} copied to clipboard`);
  }

  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>
        {label}
      </Text>
      <Pressable
        onPress={copyable ? handleCopy : undefined}
        style={styles.detailValueContainer}
      >
        <Text
          style={[
            styles.detailValue,
            { color: colors.text },
            mono && styles.mono,
          ]}
          selectable
        >
          {value}
        </Text>
        {copyable && (
          <Text style={[styles.copyHint, { color: colors.tint }]}>
            Tap to copy
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export default function EventDetailScreen(): React.JSX.Element {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams<{
    id: string;
    event: string;
  }>();

  const event: NotificationHistoryItem | null = params.event
    ? JSON.parse(params.event)
    : null;

  if (!event) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          Event not found
        </Text>
      </View>
    );
  }

  const notificationColor = getNotificationColor(event.notification_type);
  const notificationLabel = getNotificationLabel(event.notification_type);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.statusSection}>
        <View style={[styles.iconContainer, { backgroundColor: notificationColor + '20' }]}>
          <FontAwesome
            name={getNotificationIcon(event.notification_type)}
            size={32}
            color={notificationColor}
          />
        </View>
        <View style={[styles.statusBadge, { backgroundColor: notificationColor }]}>
          <Text style={styles.statusBadgeText}>{notificationLabel}</Text>
        </View>
        <Text style={[styles.timestamp, { color: colors.tabIconDefault }]}>
          {formatTimestamp(event.timestamp, true)}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Session Info
        </Text>

        <DetailRow
          label="Name"
          value={event.friendly_name}
          colors={colors}
        />

        {event.cwd && (
          <DetailRow
            label="Working Directory"
            value={event.cwd}
            copyable
            mono
            colors={colors}
          />
        )}

        <DetailRow
          label="Session ID"
          value={event.session_id}
          copyable
          mono
          colors={colors}
        />
      </View>

      {event.message && (
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Message
          </Text>
          <Text style={[styles.message, { color: colors.text }]}>
            {event.message}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 14,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValueContainer: {
    flexDirection: 'column',
  },
  detailValue: {
    fontSize: 16,
  },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
  },
  copyHint: {
    fontSize: 12,
    marginTop: 4,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
  },
  errorText: {
    fontSize: 18,
  },
});
