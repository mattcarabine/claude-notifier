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
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Session } from '@/types';
import { formatTimestamp } from '@/utils/format';

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

export default function SessionDetailScreen(): React.JSX.Element {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams<{
    id: string;
    session: string;
  }>();

  const session: Session | null = params.session
    ? JSON.parse(params.session)
    : null;

  if (!session) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          Session not found
        </Text>
      </View>
    );
  }

  const statusColor = getStatusColor(session.status);
  const statusLabel = getStatusLabel(session);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.statusSection}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusBadgeText}>{statusLabel}</Text>
        </View>
        <Text style={[styles.timestamp, { color: colors.tabIconDefault }]}>
          Last activity: {formatTimestamp(session.last_seen, true)}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Session Info
        </Text>

        <DetailRow
          label="Name"
          value={session.friendly_name}
          colors={colors}
        />

        <DetailRow
          label="Working Directory"
          value={session.cwd}
          copyable
          mono
          colors={colors}
        />

        <DetailRow
          label="Session ID"
          value={session.session_id}
          copyable
          mono
          colors={colors}
        />
      </View>

      {session.message && (
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Last Notification
          </Text>
          <Text style={[styles.message, { color: colors.text }]}>
            {session.message}
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
