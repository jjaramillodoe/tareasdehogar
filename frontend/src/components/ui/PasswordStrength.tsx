import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Tones } from '../../theme';
import { passwordStrength } from '../../constants/auth';

const LEVELS = {
  1: { bar: Colors.accent, text: Tones.accent.fg },
  2: { bar: Colors.warning, text: Tones.warning.fg },
  3: { bar: Colors.success, text: Tones.success.fg },
} as const;

/** Three-segment strength meter; renders nothing for an empty password. */
export default function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => passwordStrength(password), [password]);
  if (!password) return null;
  const level = LEVELS[Math.max(1, strength.score) as 1 | 2 | 3];

  return (
    <View style={styles.wrap} accessibilityLabel={`Seguridad de la contraseña: ${strength.label}`}>
      <View style={styles.bars}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[styles.bar, strength.score >= n && { backgroundColor: level.bar }]} />
        ))}
      </View>
      <Text style={[styles.label, { color: level.text }]}>{strength.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.xs + 2,
  },
  bar: {
    flex: 1,
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    minWidth: 44,
    textAlign: 'right',
  },
});
