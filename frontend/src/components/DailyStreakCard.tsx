import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Elevation, Radius, Spacing, Tones, Type } from '../theme';
import { hapticStreak, hapticTap } from '../utils/feedback';
import ConfettiBurst from './ConfettiBurst';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const FLAME = '#FF6A00';

type Props = {
  streak: number;
  bestStreak?: number;
  /** Mon→Sun: true if the family/child completed at least one approved task that day */
  weekDone: boolean[];
  currency?: string;
  streakBonus?: number;
  compact?: boolean;
};

export default function DailyStreakCard({
  streak,
  bestStreak = 0,
  weekDone,
  currency = 'USD',
  streakBonus = 0,
  compact,
}: Props) {
  const [mode, setMode] = useState<'fire' | 'calendar'>('fire');
  const [confetti, setConfetti] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (streak <= 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [streak, pulse]);

  const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0
  const remaining = Math.max(0, 7 - (streak % 7 || (streak > 0 ? 7 : 0)));
  const daysToBonus = streak > 0 && streak % 7 === 0 ? 0 : remaining === 7 && streak === 0 ? 7 : remaining;

  const celebrate = async () => {
    await hapticStreak();
    setConfetti(true);
  };

  const switchMode = (next: 'fire' | 'calendar') => {
    void hapticTap();
    setMode(next);
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <ConfettiBurst visible={confetti} onDone={() => setConfetti(false)} />
      <View style={styles.topRow}>
        <Text style={Type.heading}>Racha diaria</Text>
        <View style={styles.toggle} accessibilityRole="tablist">
          {(['fire', 'calendar'] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.toggleChip, mode === m && styles.toggleChipOn]}
              onPress={() => switchMode(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
            >
              <Text style={[styles.toggleText, mode === m && styles.toggleTextOn]}>
                {m === 'fire' ? 'Racha' : 'Semana'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {mode === 'fire' ? (
        <Pressable
          onPress={celebrate}
          accessibilityRole="button"
          accessibilityLabel={`Racha de ${streak} días. Toca para celebrar`}
          style={({ pressed }) => [styles.counterRow, pressed && styles.counterPressed]}
        >
          <Animated.View style={[styles.flameBubble, { transform: [{ scale: pulse }] }]}>
            <Ionicons name="flame" size={30} color={FLAME} />
          </Animated.View>
          <View style={styles.counterText}>
            <Text style={styles.counterValue}>{streak}</Text>
            <Text style={Type.caption}>
              día{streak === 1 ? '' : 's'} consecutivo{streak === 1 ? '' : 's'}
              {bestStreak > streak ? ` · mejor: ${bestStreak}` : ''}
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.weekRow}>
          {WEEKDAYS.map((d, i) => {
            const done = Boolean(weekDone[i]);
            const isToday = i === todayIdx;
            return (
              <View key={d} style={styles.dayCol} accessibilityLabel={`${d}: ${done ? 'cumplido' : 'sin tareas'}`}>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{d}</Text>
                <View style={[styles.dayDot, done && styles.dayDotDone, isToday && !done && styles.dayDotToday]}>
                  {done ? (
                    <Ionicons name="checkmark" size={14} color={Colors.white} />
                  ) : isToday ? (
                    <Ionicons name="flame" size={13} color={FLAME} />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {streakBonus > 0 ? (
        <View style={styles.bonusRow}>
          <Ionicons name="gift" size={16} color={Tones.secondary.fg} />
          <Text style={styles.bonusText}>
            +{currency} {streakBonus.toFixed(2)} extra al llegar a 7 días
            {daysToBonus > 0 ? ` · faltan ${daysToBonus}d` : ' · ¡listo!'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderDark,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Elevation.card,
  },
  cardCompact: {
    padding: Spacing.md + 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Tones.neutral.bg,
    borderRadius: Radius.pill,
    padding: 3,
  },
  toggleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  toggleChipOn: {
    backgroundColor: Colors.surface,
    ...Elevation.low,
  },
  toggleText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  toggleTextOn: { color: Colors.text },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: '#FFF4EB',
  },
  counterPressed: {
    backgroundColor: '#FFEBDB',
  },
  flameBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  counterText: {
    flex: 1,
  },
  counterValue: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -1,
  },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', flex: 1, gap: 6 },
  dayLabel: { fontSize: 11, fontWeight: '700', color: Colors.textLight },
  dayLabelToday: { color: Colors.text, fontWeight: '800' },
  dayDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Tones.neutral.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotDone: { backgroundColor: Colors.success },
  dayDotToday: { borderWidth: 2, borderColor: FLAME, backgroundColor: Colors.surface },
  bonusRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondarySoft,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bonusText: { flex: 1, fontSize: 12, fontWeight: '700', color: Tones.secondary.fg },
});
