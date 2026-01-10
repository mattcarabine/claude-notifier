import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { NotificationHistoryItem } from '@/types';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { formatTimestamp, truncateName } from '@/utils/format';

interface NotificationItemProps {
  item: NotificationHistoryItem;
}

function getNotificationIcon(
  type: NotificationHistoryItem['notification_type']
): React.ComponentProps<typeof FontAwesome>['name'] {
  switch (type) {
    case 'permission_prompt':
      return 'shield';
    case 'elicitation_dialog':
      return 'question-circle';
    case 'finished':
      return 'check-circle';
    default:
      return 'bell';
  }
}

function getNotificationLabel(
  type: NotificationHistoryItem['notification_type']
): string {
  switch (type) {
    case 'permission_prompt':
      return 'Approval needed';
    case 'elicitation_dialog':
      return 'Question';
    case 'finished':
      return 'Finished';
    default:
      return 'Notification';
  }
}

export function NotificationItem({ item }: NotificationItemProps): React.JSX.Element {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const displayName = truncateName(item.friendly_name);

  return (
    <View style={[styles.item, { backgroundColor: colors.background }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
        <FontAwesome
          name={getNotificationIcon(item.notification_type)}
          size={20}
          color={colors.tint}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.type, { color: colors.tint }]}>
            {getNotificationLabel(item.notification_type)}
          </Text>
          <Text style={[styles.timestamp, { color: colors.tabIconDefault }]}>
            {formatTimestamp(item.timestamp, true)}
          </Text>
        </View>

        <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>

        {item.message && (
          <Text
            style={[styles.message, { color: colors.tabIconDefault }]}
            numberOfLines={2}
          >
            {item.message}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  type: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
  },
});
