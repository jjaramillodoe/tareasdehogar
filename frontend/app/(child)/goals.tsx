import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { goalsAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import ChildScreenShell, { ChildEmptyState } from '../../src/components/ChildScreenShell';
import AccordionSection from '../../src/components/AccordionSection';
import { ChildSavingsGoalsSection } from '../../src/components/SavingsGoalsSections';
import { shadow } from '../../src/utils/shadow';

interface Goal {
  id: string;
  title: string;
  description?: string;
  target_tasks: number;
  bonus_amount: number;
  child_id: string;
  completed_tasks: number;
  is_completed: boolean;
  bonus_paid: boolean;
  goal_period?: string;
}

export default function ChildGoalsScreen() {
  const { selectedChild, family } = useAuthStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goalTab, setGoalTab] = useState<'tasks' | 'savings'>('tasks');

  const load = useCallback(async () => {
    if (!selectedChild) return;
    try {
      const data = await goalsAPI.getAll(selectedChild.id);
      setGoals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedChild]);

  useFocusEffect(
    useCallback(() => {
      if (selectedChild) {
        setIsLoading(true);
        load();
      }
    }, [selectedChild, load])
  );

  const progress = (g: Goal) =>
    Math.min((g.completed_tasks / Math.max(g.target_tasks, 1)) * 100, 100);

  const periodLabel = (g: Goal) =>
    g.goal_period === 'semanal' ? 'Semanal' : 'Personalizada';

  if (!selectedChild) {
    return (
      <ChildScreenShell title="Metas" subtitle="Inicia sesión de nuevo">
        <ChildEmptyState icon="alert-circle-outline" title="No hay sesión activa" />
      </ChildScreenShell>
    );
  }

  const active = goals.filter((g) => !g.is_completed);
  const done = goals.filter((g) => g.is_completed);
  const name = selectedChild.alias || selectedChild.name;

  const tabs = (
    <View style={styles.segment}>
      <TouchableOpacity
        style={[styles.segmentChip, goalTab === 'tasks' && styles.segmentChipActive]}
        onPress={() => setGoalTab('tasks')}
        activeOpacity={0.9}
      >
        <Text style={[styles.segmentText, goalTab === 'tasks' && styles.segmentTextActive]}>
          Por tareas
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.segmentChip, goalTab === 'savings' && styles.segmentChipActive]}
        onPress={() => setGoalTab('savings')}
        activeOpacity={0.9}
      >
        <Text style={[styles.segmentText, goalTab === 'savings' && styles.segmentTextActive]}>
          Ahorro
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (goalTab === 'savings') {
    return (
      <ChildScreenShell
        title="Metas"
        subtitle={`Objetivos de ${name}`}
        accent="yellow"
        headerExtra={tabs}
        scroll={false}
      >
        <View style={styles.savingsWrap}>
          <ChildSavingsGoalsSection currency={family?.currency ?? ''} />
        </View>
      </ChildScreenShell>
    );
  }

  return (
    <ChildScreenShell
      title="Metas"
      subtitle={
        goalTab === 'tasks'
          ? 'Completa tareas para avanzar; tu familia define el bono'
          : 'Propón una meta o aporta de tu saldo'
      }
      loading={isLoading}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      headerExtra={tabs}
      accent="yellow"
    >
      {goals.length === 0 ? (
        <ChildEmptyState
          icon="flag-outline"
          title="Aún no hay metas"
          subtitle="Cuando tus padres creen una meta para ti, aparecerá aquí con tu progreso."
        />
      ) : (
        <>
          {active.length > 0 && (
            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>En progreso</Text>
              <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCountText}>{active.length}</Text>
              </View>
            </View>
          )}
          {active.map((g) => (
            <View key={g.id} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.iconWrap}>
                  <Ionicons name="trophy" size={20} color={Colors.secondaryInk} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{g.title}</Text>
                  <Text style={styles.periodBadge}>{periodLabel(g)}</Text>
                </View>
              </View>
              {g.description ? <Text style={styles.desc}>{g.description}</Text> : null}
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${progress(g)}%` }]} />
              </View>
              <Text style={styles.progressTxt}>
                {g.completed_tasks} / {g.target_tasks} tareas
              </Text>
              <View style={styles.bonusRow}>
                <Ionicons name="gift-outline" size={18} color={Colors.accent} />
                <Text style={styles.bonusTxt}>
                  Bono: {family?.currency} {g.bonus_amount.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}

          {done.length > 0 && (
            <AccordionSection title="Completadas" count={done.length} defaultOpen={false}>
              {done.map((g) => (
                <View key={g.id} style={[styles.card, styles.cardDone]}>
                  <View style={styles.cardHead}>
                    <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                    <Text style={styles.cardTitle}>{g.title}</Text>
                  </View>
                  <Text style={styles.doneMeta}>
                    Bono {family?.currency} {g.bonus_amount.toFixed(2)}
                    {g.bonus_paid ? ' · Pagado' : ' · Pendiente de pago'}
                  </Text>
                </View>
              ))}
            </AccordionSection>
          )}
        </>
      )}
    </ChildScreenShell>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  segmentChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentChipActive: {
    backgroundColor: Colors.white,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
  },
  segmentTextActive: {
    color: Colors.primary,
  },
  savingsWrap: { flex: 1, marginTop: -4 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionCountBadgeMuted: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.textLight + '26',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sectionCountTextMuted: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 3, blur: 10, opacity: 0.08, elevation: 3 }),
  },
  cardDone: { borderColor: Colors.success + '40' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.secondary + '44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
  periodBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  desc: { fontSize: 14, color: Colors.textSecondary, marginTop: 10, lineHeight: 20 },
  barBg: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginTop: 14,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressTxt: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'right',
    fontWeight: '600',
  },
  bonusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  bonusTxt: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  doneMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 8, marginLeft: 32 },
});
