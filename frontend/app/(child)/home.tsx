import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ChildScreenShell, {
  ChildHeaderSignOutButton,
} from '../../src/components/ChildScreenShell';
import { Colors } from '../../src/constants/colors';
import { childrenAPI, choresAPI, statsAPI, savingsGoalsAPI, SavingsGoalDTO } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { getChildAvatarSource } from '../../src/utils/avatars';
import { shadow } from '../../src/utils/shadow';
import DailyStreakCard from '../../src/components/DailyStreakCard';
import ChildWalletCard from '../../src/components/ChildWalletCard';
import { weekDoneFromDates } from '../../src/utils/weekActivity';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import IconTile from '../../src/components/ui/IconTile';
import ListRow from '../../src/components/ui/ListRow';
import SectionHeader from '../../src/components/ui/SectionHeader';
import { Spacing, Type } from '../../src/theme';

interface Chore {
  id: string;
  title: string;
  amount: number;
  status: string;
  completed_at?: string;
  scheduled_date?: string | null;
}

interface Stats {
  balance: number;
  pending_tasks: number;
  completed_tasks: number;
  approved_tasks: number;
}

export default function ChildHomeScreen() {
  const router = useRouter();
  const { selectedChild, family, setSelectedChild, logout, isChildSession } = useAuthStore();
  const [chores, setChores] = useState<Chore[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [taskStreak, setTaskStreak] = useState(0);
  const [bestTaskStreak, setBestTaskStreak] = useState(0);
  const [goals, setGoals] = useState<SavingsGoalDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            if (isChildSession) {
              await logout();
              router.replace('/');
            } else {
              setSelectedChild(null);
              router.replace('/(parent)/home');
            }
          })();
        },
      },
    ]);
  };

  const currency = family?.currency || 'USD';
  const displayName = selectedChild?.alias || selectedChild?.name || 'campeón';
  const childId = selectedChild?.id;

  const loadData = useCallback(async () => {
    if (!childId) return;
    try {
      const [choresData, statsData, childData, goalsData] = await Promise.all([
        choresAPI.getForChild(childId),
        statsAPI.getChildStats(childId),
        childrenAPI.getOne(childId),
        savingsGoalsAPI.getAll(childId).catch(() => [] as SavingsGoalDTO[]),
      ]);
      setChores(choresData);
      setStats(statsData);
      setStreak(Number(childData.savings_current_streak || 0));
      setBestStreak(Number(childData.savings_best_streak || 0));
      setTaskStreak(Number(childData.current_streak || 0));
      setBestTaskStreak(Number(childData.best_streak || 0));
      setGoals(goalsData);
      setSelectedChild(childData);
    } catch (error) {
      console.error('Error loading child home:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [childId, setSelectedChild]);

  useFocusEffect(
    useCallback(() => {
      if (childId) loadData();
    }, [childId, loadData])
  );

  const nextTasks = useMemo(
    () =>
      chores
        .filter((c) => c.status === 'pendiente')
        .sort((a, b) => {
          const da = a.scheduled_date ? String(a.scheduled_date).slice(0, 10) : '';
          const db = b.scheduled_date ? String(b.scheduled_date).slice(0, 10) : '';
          return da.localeCompare(db);
        })
        .slice(0, 3),
    [chores]
  );

  const weekDone = useMemo(
    () =>
      weekDoneFromDates(
        chores.filter((c) => c.status === 'aprobada' && c.completed_at).map((c) => String(c.completed_at))
      ),
    [chores]
  );

  const balance = stats?.balance ?? selectedChild?.balance ?? 0;

  if (!selectedChild) {
    return (
      <ChildScreenShell title="Inicio" subtitle="Sin sesión de hijo">
        <Text style={styles.emptyText}>No hay sesión de hijo activa.</Text>
      </ChildScreenShell>
    );
  }

  return (
    <ChildScreenShell
      title={`Hola, ${displayName}`}
      subtitle="Tu resumen de hoy"
      loading={isLoading}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}
      headerRight={<ChildHeaderSignOutButton onPress={handleSignOut} />}
      headerExtra={
        <View style={styles.balanceHero}>
          <View style={styles.balanceHeroTop}>
            <Image
              source={getChildAvatarSource(selectedChild.gender)}
              style={styles.avatar}
            />
            <View style={styles.balanceHeroText}>
              <Text style={styles.balanceLabel}>Tu saldo</Text>
              <Text style={styles.balanceValue}>
                {currency} {Number(balance).toFixed(2)}
              </Text>
            </View>
          </View>
          <View style={styles.streakRow}>
            <View style={styles.streakPill}>
              <Ionicons name="flame" size={16} color={Colors.secondaryInk} />
              <Text style={styles.streakText}>
                Ahorro: {streak} sem{streak === 1 ? '' : 's'}
                {bestStreak > 0 ? ` · mejor ${bestStreak}` : ''}
              </Text>
            </View>
            {taskStreak > 0 ? (
              <View style={[styles.streakPill, styles.streakPillSoft]}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                <Text style={styles.streakTextSoft}>Racha {taskStreak}d</Text>
              </View>
            ) : null}
          </View>
        </View>
      }
    >
      <DailyStreakCard
        streak={taskStreak}
        bestStreak={bestTaskStreak}
        weekDone={weekDone}
        currency={currency}
        streakBonus={Number((family as { streak_bonus_amount?: number } | null)?.streak_bonus_amount || 0)}
        compact
      />

      <View style={styles.section}>
        <SectionHeader
          title="Próximas tareas"
          count={nextTasks.length}
          actionLabel="Ver todas"
          onAction={() => router.push('/(child)/tasks')}
        />
        {nextTasks.length === 0 ? (
          <Card style={styles.allClear}>
            <IconTile icon="checkmark-done" tone="success" size={44} />
            <View style={styles.flex1}>
              <Text style={Type.bodyStrong}>¡Todo listo!</Text>
              <Text style={Type.caption}>No tienes tareas pendientes.</Text>
            </View>
          </Card>
        ) : (
          <Card padded={false} style={styles.listCard}>
            {nextTasks.map((chore, i) => (
              <ListRow
                key={chore.id}
                divided={i > 0}
                title={chore.title}
                leading={<IconTile icon="clipboard-outline" size={40} />}
                trailing={
                  <Text style={styles.taskAmount}>
                    +{currency} {Number(chore.amount).toFixed(2)}
                  </Text>
                }
                onPress={() => router.push('/(child)/tasks')}
              />
            ))}
          </Card>
        )}
      </View>

      <Button
        label="Completar una tarea"
        icon="rocket"
        variant="kid"
        size="lg"
        style={styles.cta}
        onPress={() => router.push('/(child)/tasks')}
      />

      <View style={styles.section}>
        <SectionHeader title="Sigue explorando" />
        <Card padded={false} style={styles.listCard}>
          <ListRow
            title="Metas y ahorro"
            subtitle="Avanza hacia lo que quieres"
            leading={<IconTile icon="trophy" tone="secondary" size={40} />}
            onPress={() => router.push('/(child)/goals')}
          />
          <ListRow
            divided
            title="Pagos"
            subtitle="Lo que ganaste y solicitaste"
            leading={<IconTile icon="wallet" tone="primary" size={40} />}
            onPress={() => router.push('/(child)/payments')}
          />
          <ListRow
            divided
            title="Más"
            subtitle="Logros, alertas y perfil"
            leading={<IconTile icon="grid" tone="accent" size={40} />}
            onPress={() => router.push('/(child)/more')}
          />
        </Card>
      </View>

      {selectedChild ? (
        <ChildWalletCard
          currency={currency}
          balance={Number(balance)}
          childId={selectedChild.id}
          goals={goals}
          onChanged={loadData}
        />
      ) : null}
    </ChildScreenShell>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.lg,
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  allClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  listCard: {
    overflow: 'hidden',
  },
  taskAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.secondaryInk,
  },
  cta: {
    marginTop: Spacing.lg,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  balanceHero: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 18,
    ...shadow({ color: Colors.primaryDark, offsetY: 4, blur: 12, opacity: 0.25, elevation: 4 }),
  },
  balanceHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  balanceHeroText: {
    flex: 1,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  balanceValue: {
    marginTop: 2,
    color: Colors.white,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  streakRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  streakPillSoft: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  streakText: {
    color: Colors.secondaryInk,
    fontSize: 12,
    fontWeight: '700',
  },
  streakTextSoft: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
