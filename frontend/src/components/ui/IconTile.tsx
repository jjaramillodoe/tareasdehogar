import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Tone, Tones } from '../../theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  size?: number;
  /** Optional corner badge, e.g. a step number. */
  badge?: string;
};

/** Rounded square with a tinted background and an icon. */
export default function IconTile({ icon, tone = 'primary', size = 48, badge }: Props) {
  const t = Tones[tone];
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size > 40 ? Radius.lg : Radius.md, backgroundColor: t.bg },
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.44)} color={t.fg} />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: t.fg }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
});
