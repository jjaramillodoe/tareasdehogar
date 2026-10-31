import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_META, EXPRESS_MISSIONS, ExpressMissionTemplate } from '../constants/expressMissions';
import { choresAPI } from '../services/api';
import { hapticApprove, hapticTap } from '../utils/feedback';
import ConfettiBurst from './ConfettiBurst';
import Button from './ui/Button';
import Chip from './ui/Chip';
import IconTile from './ui/IconTile';
import { Colors, Elevation, Radius, Spacing, Type } from '../theme';

type ChildLite = { id: string; name: string };

type ChoreLite = {
  id: string;
  title: string;
  description?: string;
  amount: number;
  status: string;
  assigned_to?: string[];
};

type Props = {
  childrenList: ChildLite[];
  chores: ChoreLite[];
  currency: string;
  onChanged: () => void;
};

const PREFIX = '⚡ Express:';

function pickMissions(n: number, excludeTitles: string[]): ExpressMissionTemplate[] {
  const pool = EXPRESS_MISSIONS.filter((m) => !excludeTitles.some((t) => t.includes(m.title)));
  const src = pool.length >= n ? pool : EXPRESS_MISSIONS;
  const shuffled = [...src].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export default function DailyMissionsCard({ childrenList, chores, currency, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  const express = useMemo(
    () =>
      chores.filter(
        (c) =>
          c.title.startsWith(PREFIX) &&
          (c.status === 'pendiente' || c.status === 'completada')
      ),
    [chores]
  );

  const rotate = () => {
    spin.setValue(0);
    Animated.timing(spin, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const generate = async () => {
    if (childrenList.length === 0) {
      Alert.alert('Agrega hijos', 'Necesitas al menos un perfil para asignar misiones.');
      return;
    }
    setBusy(true);
    rotate();
    void hapticTap();
    try {
      const now = new Date();
      const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const templates = pickMissions(3, express.map((c) => c.title));
      await Promise.all(
        templates.map((tpl, i) => {
          const child = childrenList[i % childrenList.length];
          return choresAPI.create(
            `${PREFIX} ${tpl.title} (${child.name})`,
            `${tpl.description} · ${tpl.minutes} min · +${tpl.xp} XP`,
            tpl.amount,
            'unica',
            [child.id],
            todayIso
          );
        })
      );
      onChanged();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudieron generar misiones');
    } finally {
      setBusy(false);
    }
  };

  const completeMission = async (chore: ChoreLite) => {
    const childId = chore.assigned_to?.[0];
    if (!childId) return;
    setCompletingId(chore.id);
    try {
      await choresAPI.complete(chore.id, childId, 'Misión express cumplida');
      await hapticApprove();
      setConfetti(true);
      onChanged();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo completar');
    } finally {
      setCompletingId(null);
    }
  };

  const doneCount = express.filter((c) => c.status === 'completada').length;

  return (
    <View style={styles.card}>
      <ConfettiBurst visible={confetti} onDone={() => setConfetti(false)} />
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <IconTile icon="flash" tone="secondary" size={36} />
          <View style={styles.headText}>
            <Text style={Type.heading}>Misiones express</Text>
            <Text style={Type.caption}>
              {doneCount} de {Math.max(express.length, 3)} cumplidas hoy
            </Text>
          </View>
        </View>
        <Pressable
          onPress={generate}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Generar nuevas misiones"
          hitSlop={8}
          style={({ pressed }) => [styles.refreshBtn, pressed && styles.refreshBtnPressed]}
        >
          {busy ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: spin.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }}
            >
              <Ionicons name="refresh" size={20} color={Colors.primary} />
            </Animated.View>
          )}
        </Pressable>
      </View>

      {express.length === 0 ? (
        <Button
          label="Generar 3 misiones de hoy"
          icon="sparkles"
          variant="secondary"
          loading={busy}
          onPress={generate}
        />
      ) : (
        <View style={styles.list}>
          {express.slice(0, 4).map((chore, idx) => {
            const tpl =
              EXPRESS_MISSIONS.find((m) => chore.title.includes(m.title)) || EXPRESS_MISSIONS[0];
            const meta = CATEGORY_META[tpl.category];
            const childName =
              childrenList.find((c) => chore.assigned_to?.includes(c.id))?.name || 'Hijo';
            const waiting = chore.status === 'completada';
            return (
              <View key={chore.id} style={[styles.mission, idx > 0 && styles.missionDivided]}>
                <View style={styles.missionBody}>
                  <View style={styles.missionTop}>
                    <View style={[styles.cat, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.catText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <Text style={styles.xp}>+{tpl.xp} XP</Text>
                    <Text style={styles.pay}>
                      +{currency} {Number(chore.amount).toFixed(2)}
                    </Text>
                  </View>
                  <Text style={Type.bodyStrong} numberOfLines={1}>
                    {tpl.title}
                  </Text>
                  <Text style={Type.caption} numberOfLines={1}>
                    {childName} · {tpl.description}
                  </Text>
                </View>
                {waiting ? (
                  <Chip label="Por aprobar" tone="neutral" />
                ) : (
                  <Button
                    label="Cumplir"
                    icon="checkmark"
                    variant="kid"
                    fullWidth={false}
                    loading={completingId === chore.id}
                    style={styles.doBtn}
                    onPress={() => completeMission(chore)}
                  />
                )}
              </View>
            );
          })}
        </View>
      )}
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
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  headLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headText: { flex: 1, minWidth: 0 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  refreshBtnPressed: { backgroundColor: '#D3E5FF' },
  list: {},
  mission: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  missionDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  missionBody: { flex: 1, minWidth: 0, gap: 3 },
  missionTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  cat: { borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  catText: { fontSize: 11, fontWeight: '800' },
  xp: { fontSize: 12, fontWeight: '800', color: '#6D28D9' },
  pay: { fontSize: 12, fontWeight: '800', color: Colors.secondaryInk },
  doBtn: { minWidth: 104 },
});
