import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/colors';

const PALETTE = [Colors.secondary, Colors.primary, Colors.accent, Colors.success, Colors.white];

type Props = {
  visible: boolean;
  onDone?: () => void;
};

/**
 * Lightweight confetti overlay (no canvas-confetti — works on native + web).
 */
export default function ConfettiBurst({ visible, onDone }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        key: i,
        x: (i * 53) % 100,
        color: PALETTE[i % PALETTE.length],
        delay: (i % 6) * 40,
        rotate: (i * 37) % 180,
        size: 6 + (i % 4) * 2,
      })),
    []
  );
  const anims = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!visible) return;
    anims.forEach((a) => a.setValue(0));
    Animated.stagger(
      18,
      anims.map((a, i) =>
        Animated.timing(a, {
          toValue: 1,
          duration: 900 + (i % 5) * 80,
          delay: pieces[i].delay,
          useNativeDriver: true,
        })
      )
    ).start(({ finished }) => {
      if (finished) onDone?.();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={p.key}
          style={[
            styles.piece,
            {
              left: `${p.x}%`,
              width: p.size,
              height: p.size * 1.4,
              backgroundColor: p.color,
              opacity: anims[i].interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
              transform: [
                {
                  translateY: anims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 220],
                  }),
                },
                {
                  rotate: anims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${p.rotate + 120}deg`],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 8,
    borderRadius: 2,
  },
});
