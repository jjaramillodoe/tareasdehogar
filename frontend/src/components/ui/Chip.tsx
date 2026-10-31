import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing, Tone, Tones } from '../../theme';

type Props = {
  label: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

/** Small solid-tinted pill for statuses and tags. */
export default function Chip({ label, tone = 'primary', icon, style }: Props) {
  const t = Tones[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} /> : null}
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: Radius.pill,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
  },
});
