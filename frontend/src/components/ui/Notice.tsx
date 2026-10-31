import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing, Tone, Tones, Type } from '../../theme';

type Props = {
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Inline tinted message (info, success, warning). */
export default function Notice({ tone = 'primary', icon = 'information-circle', children, style }: Props) {
  const t = Tones[tone];
  return (
    <View style={[styles.box, { backgroundColor: t.bg }, style]} accessibilityLiveRegion="polite">
      <Ionicons name={icon} size={18} color={t.fg} style={styles.icon} />
      <Text style={[Type.caption, styles.text, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontWeight: '600',
  },
});
