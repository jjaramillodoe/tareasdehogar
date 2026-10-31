import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { Colors, Elevation, Radius, Spacing } from '../../theme';

type Props = ViewProps & {
  elevation?: keyof typeof Elevation;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** White surface with a hairline border and a tight neutral shadow. */
export default function Card({ elevation = 'card', padded = true, style, children, ...rest }: Props) {
  return (
    <View style={[styles.card, padded && styles.padded, Elevation[elevation], style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderDark,
  },
  padded: {
    padding: Spacing.lg,
  },
});
