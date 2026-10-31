import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Type } from '../../theme';

type Props = {
  title: string;
  /** Optional count pill next to the title (highlighted when > 0). */
  count?: number;
  /** Text link on the right, e.g. "Ver todos". */
  actionLabel?: string;
  onAction?: () => void;
};

export default function SectionHeader({ title, count, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <Text style={[Type.heading, styles.title]} accessibilityRole="header">
          {title}
        </Text>
        {count !== undefined ? (
          <View style={[styles.count, count > 0 ? styles.countOn : styles.countOff]}>
            <Text style={[styles.countText, count > 0 ? styles.countTextOn : styles.countTextOff]}>
              {count}
            </Text>
          </View>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Text style={styles.action} onPress={onAction} accessibilityRole="button" suppressHighlighting>
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 18,
  },
  count: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countOn: {
    backgroundColor: Colors.accent,
  },
  countOff: {
    backgroundColor: Colors.border,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
  },
  countTextOn: {
    color: Colors.white,
  },
  countTextOff: {
    color: Colors.textSecondary,
  },
  action: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    paddingVertical: Spacing.xs,
  },
});
