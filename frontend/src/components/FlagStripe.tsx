import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../constants/colors';

type Props = {
  height?: number;
  style?: ViewStyle;
};

/** Thin tricolor bar inspired by the Ecuador flag (amarillo · azul · rojo). */
export default function FlagStripe({ height = 5, style }: Props) {
  return (
    <View style={[styles.row, { height }, style]}>
      <View style={styles.yellow} />
      <View style={styles.blue} />
      <View style={styles.red} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    overflow: 'hidden',
    borderRadius: 4,
  },
  yellow: {
    flex: 2,
    backgroundColor: Colors.flagYellow,
  },
  blue: {
    flex: 1,
    backgroundColor: Colors.flagBlue,
  },
  red: {
    flex: 1,
    backgroundColor: Colors.flagRed,
  },
});
