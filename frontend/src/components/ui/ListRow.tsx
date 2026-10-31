import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Type } from '../../theme';
import { hapticTap } from '../../utils/feedback';

type Props = {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  /** Custom right content; a chevron is shown when omitted and the row is pressable. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  /** Draw a hairline above the row (for stacked rows inside a Card). */
  divided?: boolean;
};

/** Tappable row for lists inside a Card: leading visual, title/subtitle, trailing content. */
export default function ListRow({ title, subtitle, leading, trailing, onPress, divided }: Props) {
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
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {leading}
      <View style={[styles.body, divided && styles.divided]}>
        <View style={styles.text}>
          <Text style={[Type.bodyStrong, styles.title]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={Type.caption} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing}
        {!trailing && onPress ? <Ionicons name="chevron-forward" size={18} color={Colors.textLight} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingLeft: Spacing.lg,
  },
  pressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.lg,
    minHeight: 64,
  },
  divided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
  },
});
