import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { SessionFilterSettings } from '@/types';

interface SessionFilterModalProps {
  visible: boolean;
  settings: SessionFilterSettings;
  onSettingsChange: (settings: SessionFilterSettings) => void;
  onClose: () => void;
}

function formatExpiry(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = minutes / 60;
  if (hours === 1) {
    return '1 hour';
  }
  if (hours === 24) {
    return '24 hours';
  }
  return `${hours} hours`;
}

// Slider uses steps: 5, 15, 30, 60, 120, 360, 720, 1440 minutes
const EXPIRY_STEPS = [5, 15, 30, 60, 120, 360, 720, 1440];

function minutesToSliderValue(minutes: number): number {
  const index = EXPIRY_STEPS.findIndex((step) => step >= minutes);
  return index === -1 ? EXPIRY_STEPS.length - 1 : index;
}

function sliderValueToMinutes(value: number): number {
  return EXPIRY_STEPS[Math.round(value)] || 60;
}

export function SessionFilterModal({
  visible,
  settings,
  onSettingsChange,
  onClose,
}: SessionFilterModalProps): React.JSX.Element {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const sliderValue = minutesToSliderValue(settings.idleExpiryMinutes);

  function handleActiveOnlyChange(value: boolean): void {
    onSettingsChange({ ...settings, activeOnly: value });
  }

  function handleExpiryChange(value: number): void {
    const minutes = sliderValueToMinutes(value);
    onSettingsChange({ ...settings, idleExpiryMinutes: minutes });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modal,
            { backgroundColor: isDark ? '#1c1c1e' : '#fff' },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Filters</Text>
            <Pressable onPress={onClose} style={styles.doneButton}>
              <Text style={[styles.doneText, { color: colors.tint }]}>Done</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text }]}>
                Active sessions only
              </Text>
              <Switch
                value={settings.activeOnly}
                onValueChange={handleActiveOnlyChange}
                trackColor={{ false: '#767577', true: colors.tint }}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              Idle session expiry
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={EXPIRY_STEPS.length - 1}
              step={1}
              value={sliderValue}
              onValueChange={handleExpiryChange}
              minimumTrackTintColor={colors.tint}
              maximumTrackTintColor={isDark ? '#3a3a3c' : '#e5e5ea'}
              thumbTintColor={colors.tint}
            />
            <Text style={[styles.expiryValue, { color: colors.tabIconDefault }]}>
              {formatExpiry(settings.idleExpiryMinutes)}
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.3)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  doneButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  doneText: {
    fontSize: 17,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
  },
  slider: {
    marginTop: 12,
    marginHorizontal: -8,
  },
  expiryValue: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
