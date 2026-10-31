import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Elevation } from '../../theme';
import { hapticTap } from '../../utils/feedback';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  size?: number;
};

/** Round icon-only button for headers (white surface, hairline border). */
export default function IconButton({ icon, label, onPress, size = 40 }: Props) {
  return (
    <Pressable
      onPress={() => {
        void hapticTap();
        onPress();
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={Colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderDark,
    ...Elevation.low,
  },
  pressed: {
    backgroundColor: Colors.primarySoft,
  },
});
