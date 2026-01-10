import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

interface FilterButtonProps {
  isActive: boolean;
  onPress: () => void;
}

export function FilterButton({ isActive, onPress }: FilterButtonProps): React.JSX.Element {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable onPress={onPress} style={styles.button}>
      <FontAwesome
        name="filter"
        size={18}
        color={isActive ? colors.tint : colors.tabIconDefault}
      />
      {isActive && (
        <View style={[styles.badge, { backgroundColor: colors.tint }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
