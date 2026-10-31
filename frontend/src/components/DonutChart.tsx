import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Colors } from '../constants/colors';

export type DonutSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type Props = {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerTitle: string;
  centerSubtitle?: string;
};

const PALETTE = [
  Colors.primary,
  Colors.accent,
  Colors.secondaryDark,
  Colors.success,
  Colors.primaryLight,
  Colors.accentDark,
];

/** Assign brand colors by index when caller doesn't pass color. */
export function colorForIndex(i: number): string {
  return PALETTE[i % PALETTE.length];
}

/**
 * Simple SVG donut. Segments with value 0 are skipped.
 * Empty data shows a muted ring.
 */
export default function DonutChart({
  slices,
  size = 180,
  strokeWidth = 22,
  centerTitle,
  centerSubtitle,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const segments = useMemo(() => {
    const positive = slices.filter((s) => s.value > 0);
    const total = positive.reduce((sum, s) => sum + s.value, 0);
    if (total <= 0) return { arcs: [] as { color: string; length: number; offset: number }[], total: 0 };

    let offset = 0;
    const arcs = positive.map((s) => {
      const length = (s.value / total) * circumference;
      const arc = { color: s.color, length, offset };
      offset += length;
      return arc;
    });
    return { arcs, total };
  }, [slices, circumference]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={Colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {segments.arcs.map((arc, i) => (
            <Circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              stroke={arc.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${arc.length} ${circumference - arc.length}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
            />
          ))}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.centerTitle} numberOfLines={1}>
          {centerTitle}
        </Text>
        {centerSubtitle ? (
          <Text style={styles.centerSubtitle} numberOfLines={2}>
            {centerSubtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  centerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  centerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
