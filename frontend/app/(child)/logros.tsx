import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { achievementsAPI, statsAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import ChildScreenShell, { ChildEmptyState } from '../../src/components/ChildScreenShell';
import { shadow } from '../../src/utils/shadow';

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
      <ChildScreenShell title="Logros" showBack>
        <ChildEmptyState icon="alert-circle-outline" title="Inicia sesión de nuevo" />
      </ChildScreenShell>
    );
  }

  const earnedTypes = new Set(earnedList.map((e) => e.type));
  const entries = Object.entries(definitions);
  const unlocked = entries.filter(([k]) => earnedTypes.has(k)).length;

  return (
    <ChildScreenShell
      title="Logros"
      subtitle="Insignias por tareas, rachas y metas"
      loading={isLoading}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      showBack
      accent="yellow"
    >
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryIcon, { backgroundColor: Colors.primary + '14' }]}>
            <Ionicons name="checkmark-done" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.summaryText}>
            Tareas aprobadas:{' '}
            <Text style={styles.summaryBold}>{stats?.approved_tasks ?? 0}</Text>
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryIcon, { backgroundColor: Colors.secondary + '44' }]}>
            <Ionicons name="ribbon" size={20} color={Colors.secondaryInk} />
          </View>
          <Text style={styles.summaryText}>
            Desbloqueados:{' '}
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

      {entries.length === 0 ? (
        <ChildEmptyState
          icon="ribbon-outline"
          title="Sin logros aún"
          subtitle="No hay definiciones de logros disponibles."
        />
      ) : (
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
              <View key={key} style={[styles.badgeCard, !got && styles.badgeCardLocked]}>
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
      )}

      <Text style={styles.footerHint}>
        Sigue completando tareas y metas con tu familia para desbloquear más insignias.
      </Text>
    </ChildScreenShell>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 3, blur: 10, opacity: 0.08, elevation: 3 }),
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
    fontWeight: '500',
  },
  summaryBold: {
    fontWeight: '800',
    color: Colors.primary,
  },
  sectionLabel: {
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
    borderRadius: 16,
    padding: 14,
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
    borderRadius: 14,
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
    fontWeight: '800',
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
    fontWeight: '700',
    marginTop: 8,
  },
  badgePending: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 8,
    fontStyle: 'italic',
  },
  footerHint: {
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 18,
    marginTop: 24,
    textAlign: 'center',
  },
});
