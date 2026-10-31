import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Tones } from '../../theme';
import { hapticTap } from '../../utils/feedback';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'danger';
};

/** Compact 40pt square icon action (edit, delete) for card footers. */
export default function SquareIconButton({ icon, label, onPress, tone = 'neutral' }: Props) {
  const danger = tone === 'danger';
  return (
    <Pressable
      onPress={() => {
        void hapticTap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: danger ? Colors.accentSoft : Tones.neutral.bg },
        pressed && { backgroundColor: danger ? '#FFD3DB' : Colors.border },
      ]}
    >
      <Ionicons name={icon} size={18} color={danger ? Colors.error : Colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
