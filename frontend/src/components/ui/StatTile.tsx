import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Elevation, Radius, Spacing, Tone, Tones } from '../../theme';
import { hapticTap } from '../../utils/feedback';

type Props = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  onPress?: () => void;
};

/** Compact metric tile for summary rows. */
export default function StatTile({ label, value, icon, tone = 'primary', onPress }: Props) {
  const t = Tones[tone];
  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              void hapticTap();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={18} color={t.fg} />
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderDark,
    ...Elevation.low,
  },
  pressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  icon: {
    alignSelf: 'flex-start',
    padding: 6,
    borderRadius: Radius.sm + 2,
    marginBottom: Spacing.sm,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
