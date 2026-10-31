import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Type } from '../../theme';
import { hapticTap } from '../../utils/feedback';

type Props = {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** Icon tile, avatar, etc. */
  leading?: React.ReactNode;
};

/** Selectable row (radio-style) with a clear selected state. */
export default function ChoiceRow({ title, description, selected, onPress, leading }: Props) {
  return (
    <Pressable
      onPress={() => {
        void hapticTap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && !selected && styles.rowPressed]}
    >
      {leading}
      <View style={styles.body}>
        <Text style={[Type.heading, styles.title, selected && styles.titleSelected]}>{title}</Text>
        {description ? <Text style={[Type.caption, styles.desc]}>{description}</Text> : null}
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={selected ? Colors.primary : Colors.borderDark}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  rowSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F2F7FF',
  },
  rowPressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
  },
  titleSelected: {
    color: Colors.primaryDark,
  },
  desc: {
    marginTop: 2,
  },
});
