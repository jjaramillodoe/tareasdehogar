import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { achievementsAPI, statsAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import FlagStripe from '../../src/components/FlagStripe';

type Definition = { title: string; description: string; icon: string };

const ICON_MAP: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  star: 'star',
  medal: 'medal-outline',
  trophy: 'trophy',
  ribbon: 'ribbon-outline',
  flame: 'flame',
  flag: 'flag-outline',
  cash: 'cash-outline',
  wallet: 'wallet-outline',
  crown: 'ribbon',
};

interface Earned {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  child_id: string;
  earned_at: string;
}

function iconName(raw: string): React.ComponentProps<typeof Ionicons>['name'] {
  return ICON_MAP[raw] || 'ribbon-outline';
}

export default function ChildLogrosScreen() {
  const { selectedChild } = useAuthStore();
  const [definitions, setDefinitions] = useState<Record<string, Definition>>({});
  const [earnedList, setEarnedList] = useState<Earned[]>([]);
  const [stats, setStats] = useState<{ approved_tasks: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!selectedChild) return;
    try {
      const [defs, earned, st] = await Promise.all([
        achievementsAPI.getDefinitions() as Promise<Record<string, Definition>>,
        achievementsAPI.getForChild(selectedChild.id) as Promise<Earned[]>,
        statsAPI.getChildStats(selectedChild.id),
      ]);
      setDefinitions(defs || {});
      setEarnedList(earned || []);
      setStats({ approved_tasks: st.approved_tasks ?? 0 });
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

  if (!selectedChild) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Inicia sesión de nuevo</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const earnedTypes = new Set(earnedList.map((e) => e.type));
  const entries = Object.entries(definitions);
  const unlocked = entries.filter(([k]) => earnedTypes.has(k)).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis logros</Text>
        <Text style={styles.headerSubtitle}>
          Insignias por tareas aprobadas, rachas, metas y recompensas acumuladas
        </Text>
      </View>
      <FlagStripe height={3} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollPad}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="checkmark-done-outline" size={22} color={Colors.primary} />
            <Text style={styles.summaryText}>
              Tareas aprobadas:{' '}
              <Text style={styles.summaryBold}>{stats?.approved_tasks ?? 0}</Text>
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="ribbon-outline" size={22} color={Colors.secondary} />
            <Text style={styles.summaryText}>
              Logros desbloqueados:{' '}
              <Text style={styles.summaryBold}>
                {unlocked} / {entries.length || '—'}
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionLabel}>Insignias</Text>
          <View style={styles.sectionCountBadge}>
            <Text style={styles.sectionCountText}>{entries.length}</Text>
          </View>
        </View>
        <View style={styles.grid}>
          {entries.map(([key, def]) => {
            const got = earnedTypes.has(key);
            const earned = earnedList.find((e) => e.type === key);
            const when = earned?.earned_at
              ? new Date(earned.earned_at).toLocaleDateString('es', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : null;
            return (
              <View
                key={key}
                style={[styles.badgeCard, !got && styles.badgeCardLocked]}
              >
                <View style={[styles.badgeIconWrap, !got && styles.badgeIconWrapMuted]}>
                  <Ionicons
                    name={got ? iconName(def.icon) : 'lock-closed'}
                    size={28}
                    color={got ? Colors.primary : Colors.textLight}
                  />
                </View>
                <Text style={[styles.badgeTitle, !got && styles.badgeTitleMuted]} numberOfLines={2}>
                  {def.title}
                </Text>
                <Text style={styles.badgeDesc} numberOfLines={3}>
                  {def.description}
                </Text>
                {got && when ? (
                  <Text style={styles.badgeDate}>{when}</Text>
                ) : (
                  <Text style={styles.badgePending}>Pendiente</Text>
                )}
              </View>
            );
          })}
        </View>

        {entries.length === 0 ? (
          <Text style={styles.hint}>No hay definiciones de logros disponibles.</Text>
        ) : null}

        <Text style={styles.footerHint}>
          Sigue completando tareas y metas con tu familia para desbloquear más insignias. Las rachas
          cuentan cuando aprueban tus tareas varios días seguidos.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
  scrollPad: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  summaryBold: {
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 0,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '47%',
    flexGrow: 1,
    maxWidth: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 168,
  },
  badgeCardLocked: {
    opacity: 0.85,
    backgroundColor: Colors.surfaceAlt,
  },
  badgeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeIconWrapMuted: {
    backgroundColor: Colors.border,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  badgeTitleMuted: {
    color: Colors.textSecondary,
  },
  badgeDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    flex: 1,
  },
  badgeDate: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '600',
    marginTop: 8,
  },
  badgePending: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 8,
    fontStyle: 'italic',
  },
  hint: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  footerHint: {
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 18,
    marginTop: 24,
    textAlign: 'center',
  },
});
