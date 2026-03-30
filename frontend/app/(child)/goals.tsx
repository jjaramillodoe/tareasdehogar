import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { goalsAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import FlagStripe from '../../src/components/FlagStripe';
import { ChildSavingsGoalsSection } from '../../src/components/SavingsGoalsSections';

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
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Inicia sesión de nuevo</Text>
      </View>
    );
  }

  const active = goals.filter((g) => !g.is_completed);
  const done = goals.filter((g) => g.is_completed);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis metas</Text>
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentChip, goalTab === 'tasks' && styles.segmentChipActive]}
            onPress={() => setGoalTab('tasks')}
          >
            <Text style={[styles.segmentText, goalTab === 'tasks' && styles.segmentTextActive]}>Por tareas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentChip, goalTab === 'savings' && styles.segmentChipActive]}
            onPress={() => setGoalTab('savings')}
          >
            <Text style={[styles.segmentText, goalTab === 'savings' && styles.segmentTextActive]}>Ahorro</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          {goalTab === 'tasks'
            ? 'Completa tareas para avanzar; tu familia define el bono'
            : 'Apartar dinero de tu saldo para una meta que elijan tus padres'}
        </Text>
      </View>
      <FlagStripe height={3} />

      {goalTab === 'savings' ? (
        <View style={styles.savingsWrap}>
          <ChildSavingsGoalsSection currency={family?.currency ?? ''} />
        </View>
      ) : isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollPad}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
      >
        {goals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="flag-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>Aún no hay metas</Text>
            <Text style={styles.emptySub}>
              Cuando tus padres creen una meta para ti, aparecerá aquí con tu progreso.
            </Text>
          </View>
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
                    <Ionicons name="trophy" size={20} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{g.title}</Text>
                    <Text style={styles.periodBadge}>{periodLabel(g)}</Text>
                  </View>
                </View>
                {g.description ? (
                  <Text style={styles.desc}>{g.description}</Text>
                ) : null}
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${progress(g)}%` }]} />
                </View>
                <Text style={styles.progressTxt}>
                  {g.completed_tasks} / {g.target_tasks} tareas
                </Text>
                <View style={styles.bonusRow}>
                  <Ionicons name="gift-outline" size={18} color={Colors.secondary} />
                  <Text style={styles.bonusTxt}>
                    Bono: {family?.currency} {g.bonus_amount.toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}

            {done.length > 0 && (
              <>
                <View style={[styles.sectionHeadRow, { marginTop: 8 }]}>
                  <Text style={styles.sectionTitle}>Completadas</Text>
                  <View style={styles.sectionCountBadgeMuted}>
                    <Text style={styles.sectionCountTextMuted}>{done.length}</Text>
                  </View>
                </View>
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
              </>
            )}
          </>
        )}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  emptyText: { color: Colors.textSecondary },
  header: {
    padding: 20,
    paddingTop: 56,
    backgroundColor: Colors.surface,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  segment: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  segmentChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentChipActive: {
    backgroundColor: Colors.primary + '22',
    borderColor: Colors.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.primary,
  },
  savingsWrap: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 10, lineHeight: 20 },
  content: { flex: 1 },
  scrollPad: { padding: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
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
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.text, marginTop: 12 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardDone: { borderWidth: 1, borderColor: Colors.success + '40' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, flex: 1 },
  periodBadge: {
    fontSize: 11,
    fontWeight: '600',
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
  },
  bonusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  bonusTxt: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  doneMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 8, marginLeft: 32 },
});
