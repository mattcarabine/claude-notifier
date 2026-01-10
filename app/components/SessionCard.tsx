import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Session } from '@/types';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { formatTimestamp, truncateName } from '@/utils/format';

interface SessionCardProps {
  session: Session;
  onPress?: () => void;
}

function getStatusColor(status: Session['status']): string {
  switch (status) {
    case 'waiting':
      return '#f59e0b'; // amber
    case 'idle':
      return '#6b7280'; // gray
    case 'active':
    default:
      return '#10b981'; // green
  }
}

function getStatusLabel(session: Session): string {
  if (session.status === 'active') {
    return 'Active';
  }

  if (session.status === 'idle') {
    return 'Idle';
  }

  switch (session.notification_type) {
    case 'permission_prompt':
      return 'Needs Approval';
    case 'elicitation_dialog':
      return 'Has Question';
    case 'finished':
      return 'Finished';
    default:
      return 'Waiting';
  }
}

const ACTIVE_PHRASES = [
  'Spelunking...',
  'Cogitating...',
  'Whirring...',
  'Pondering...',
  'Ruminating...',
  'Tinkering...',
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getStatusMessage(session: Session): string {
  if (session.status === 'waiting' && session.message) {
    return session.message;
  }

  if (session.status === 'idle') {
    return 'Claude has finished executing';
  }

  // Active status - use deterministic phrase based on session_id
  const index = hashCode(session.session_id) % ACTIVE_PHRASES.length;
  return ACTIVE_PHRASES[index];
}

export function SessionCard({ session, onPress }: SessionCardProps): React.JSX.Element {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const displayName = truncateName(session.friendly_name);

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.background }]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(session.status) },
          ]}
        />
        <Text style={[styles.statusText, { color: colors.text }]}>
          {getStatusLabel(session)}
        </Text>
        <Text style={[styles.timestamp, { color: colors.tabIconDefault }]}>
          {formatTimestamp(session.last_seen)}
        </Text>
      </View>

      <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>

      <Text
        style={[styles.message, { color: colors.tabIconDefault }]}
        numberOfLines={2}
      >
        {getStatusMessage(session)}
      </Text>

      <Text style={[styles.cwd, { color: colors.tabIconDefault }]} numberOfLines={1}>
        {session.cwd}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    marginBottom: 8,
  },
  cwd: {
    fontSize: 12,
    fontFamily: 'SpaceMono',
  },
});
