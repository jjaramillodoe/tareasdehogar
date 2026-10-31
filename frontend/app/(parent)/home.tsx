import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Keyboard,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import {
  familyAPI,
  childrenAPI,
  choresAPI,
  statsAPI,
  savingsGoalsAPI,
  withdrawalsAPI,
  SavingsSplitPreviewDTO,
  SavingsGoalDTO,
} from '../../src/services/api';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import FlagStripe from '../../src/components/FlagStripe';
import FirstRunChecklist from '../../src/components/FirstRunChecklist';
import { FamilyLocaleSection } from '../../src/components/FamilyLocaleSection';
import { SavingsSplitPreviewBox } from '../../src/components/SavingsSplitPreviewBox';
import AppModal, { AppModalActions, modalFieldStyles } from '../../src/components/AppModal';
import { resolveMediaUrl } from '../../src/utils/mediaUrl';
import { getChildAvatarSource, getParentAvatarSource } from '../../src/utils/avatars';

import {
  ApproveSavingsControls,
  buildSavingsApproveOpts,
  ApproveSavingsMode,
} from '../../src/components/ApproveSavingsControls';
import DailyStreakCard from '../../src/components/DailyStreakCard';
import DailyMissionsCard from '../../src/components/DailyMissionsCard';
import ConfettiBurst from '../../src/components/ConfettiBurst';
import { hapticApprove } from '../../src/utils/feedback';
import { weekDoneFromDates } from '../../src/utils/weekActivity';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Chip from '../../src/components/ui/Chip';
import IconButton from '../../src/components/ui/IconButton';
import IconTile from '../../src/components/ui/IconTile';
import ListRow from '../../src/components/ui/ListRow';
import SectionHeader from '../../src/components/ui/SectionHeader';
import StatTile from '../../src/components/ui/StatTile';
import { Colors, Radius, Spacing, Type } from '../../src/theme';

interface Child {
  id: string;
  name: string;
  age: number;
  alias?: string;
  gender?: 'mujer' | 'hombre' | null;
  balance: number;
  savings_on_approve_percent?: number;
  savings_on_approve_goal_id?: string | null;
}

interface Chore {
  id: string;
  title: string;
  amount: number;
  status: string;
  completed_by?: string;
  photo_url?: string | null;
  description?: string;
  assigned_to?: string[];
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
}

type FamilyChallengeChild = {
  child_id: string;
  name: string;
  earned: number;
  saved: number;
  saved_percent: number;
  hit_target: boolean;
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, family, setFamily, refreshUser } = useAuthStore();
  const firstName = (user?.name || '').trim().split(/\s+/)[0] || 'familia';
  const [children, setChildren] = useState<Child[]>([]);
  const [pendingChores, setPendingChores] = useState<Chore[]>([]);
  const [completedChores, setCompletedChores] = useState<Chore[]>([]);
  const [allChores, setAllChores] = useState<Chore[]>([]);
  const [weekDone, setWeekDone] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [familyStreak, setFamilyStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [choresTotalCount, setChoresTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [familyCountryCode, setFamilyCountryCode] = useState('MX');
  const [familyCurrency, setFamilyCurrency] = useState('MXN');
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [approveTarget, setApproveTarget] = useState<Chore | null>(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [qualityBonus, setQualityBonus] = useState('');
  const [approving, setApproving] = useState(false);
  const [splitPreview, setSplitPreview] = useState<SavingsSplitPreviewDTO | null>(null);
  const [splitLoading, setSplitLoading] = useState(false);
  const [approveSavingsGoals, setApproveSavingsGoals] = useState<SavingsGoalDTO[]>([]);
  const [approveSavingsMode, setApproveSavingsMode] = useState<ApproveSavingsMode>('default');
  const [approveSavingsPercentStr, setApproveSavingsPercentStr] = useState('0');
  const [approveSavingsAmountStr, setApproveSavingsAmountStr] = useState('');
  const [approveSavingsGoalId, setApproveSavingsGoalId] = useState('');
  const [approveSavingsReasonNote, setApproveSavingsReasonNote] = useState('');
  const [familyChallenge, setFamilyChallenge] = useState<{
    target_percent: number;
    all_children_hit_target: boolean;
    children: FamilyChallengeChild[];
    history?: { month_key: string; target_percent: number; all_children_hit_target: boolean }[];
  } | null>(null);
  const [pendingCashNeeded, setPendingCashNeeded] = useState(0);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedChoreIds, setSelectedChoreIds] = useState<string[]>([]);
  const [bulkApproving, setBulkApproving] = useState(false);

  const totalApprovePay = useMemo(() => {
    if (!approveTarget) return 0;
    const b = parseFloat(qualityBonus.replace(',', '.'));
    const bonus = Number.isNaN(b) || b < 0 ? 0 : b;
    return approveTarget.amount + bonus;
  }, [approveTarget, qualityBonus]);

  const approveChild = useMemo(() => {
    if (!approveTarget?.completed_by) return undefined;
    return children.find((c) => c.id === approveTarget.completed_by);
  }, [approveTarget?.completed_by, children]);

  const childDefaultApprovePct = useMemo(() => {
    if (approveChild?.savings_on_approve_percent == null) return 0;
    const p = Number(approveChild.savings_on_approve_percent);
    return Number.isNaN(p) ? 0 : p;
  }, [approveChild]);

  useEffect(() => {
    if (!approveTarget?.completed_by) {
      setApproveSavingsGoals([]);
      return;
    }
    const ch = children.find((c) => c.id === approveTarget.completed_by);
    const pct =
      ch?.savings_on_approve_percent != null && !Number.isNaN(Number(ch.savings_on_approve_percent))
        ? Number(ch.savings_on_approve_percent)
        : 0;
    setApproveSavingsMode('default');
    setApproveSavingsPercentStr(String(pct));
    setApproveSavingsAmountStr('');
    setApproveSavingsGoalId('');
    setApproveSavingsReasonNote('');
    let cancelled = false;
    savingsGoalsAPI
      .getAll(approveTarget.completed_by)
      .then((data) => {
        if (!cancelled) {
          setApproveSavingsGoals(
            data.filter((g) => !g.is_completed && (g.status || 'active') === 'active')
          );
        }
      })
      .catch(() => {
        if (!cancelled) setApproveSavingsGoals([]);
      });
    return () => {
      cancelled = true;
    };
  }, [approveTarget?.id]);

  useEffect(() => {
    if (!approveTarget?.completed_by || totalApprovePay <= 0) {
      setSplitPreview(null);
      return;
    }
    const opts = buildSavingsApproveOpts(
      approveSavingsMode,
      approveSavingsPercentStr,
      approveSavingsAmountStr,
      approveSavingsGoalId
    );
    let cancelled = false;
    setSplitLoading(true);
    choresAPI
      .previewSavingsSplit(approveTarget.completed_by, totalApprovePay, opts)
      .then((data) => {
        if (!cancelled) setSplitPreview(data);
      })
      .catch(() => {
        if (!cancelled) setSplitPreview(null);
      })
      .finally(() => {
        if (!cancelled) setSplitLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    approveTarget?.id,
    approveTarget?.completed_by,
    totalApprovePay,
    approveSavingsMode,
    approveSavingsPercentStr,
    approveSavingsAmountStr,
    approveSavingsGoalId,
  ]);

  const loadData = async () => {
    if (!useAuthStore.getState().token) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      await refreshUser();

      const { user: currentUser } = useAuthStore.getState();
      if (currentUser?.family_id) {
        try {
          const familyData = await familyAPI.getMy();
          setFamily(familyData);

          const childrenData = await childrenAPI.getAll();
          setChildren(childrenData);

          const allChores = await choresAPI.getAll();
          setAllChores(allChores);
          setChoresTotalCount(allChores.length);
          setPendingChores(allChores.filter((c: Chore) => c.status === 'completada'));
          setCompletedChores(allChores.filter((c: Chore) => c.status === 'aprobada'));
          const withdrawals = (await withdrawalsAPI.list().catch(() => [])) as Withdrawal[];
          const pendingW = withdrawals.filter((w) => w.status === 'pending');
          setPendingWithdrawalsCount(pendingW.length);
          setPendingCashNeeded(
            pendingW.reduce((sum, w) => sum + Number(w.amount || 0), 0)
          );
          const report = await statsAPI.getFamilyReport(30);
          setFamilyChallenge((report as any).family_savings_challenge ?? null);
          const daily = (report as { daily_stats?: Record<string, { tasks_completed: number }> }).daily_stats || {};
          const activeDates = Object.entries(daily)
            .filter(([, s]) => Number(s.tasks_completed || 0) > 0)
            .map(([d]) => d);
          setWeekDone(weekDoneFromDates(activeDates));
          const kids = (report as { children_stats?: { current_streak?: number }[] }).children_stats || [];
          setFamilyStreak(Math.max(0, ...kids.map((k) => Number(k.current_streak || 0))));
        } catch (e) {
          console.log('No family yet');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.family_id])
  );

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para la familia');
      return;
    }

    setCreatingFamily(true);
    try {
      const newFamily = await familyAPI.create({
        name: familyName.trim(),
        currency: familyCurrency,
        country_code: familyCountryCode,
      });
      setFamily(newFamily);
      await refreshUser();
      setShowFamilyModal(false);
      setFamilyName('');
      Alert.alert('Éxito', 'Familia creada correctamente');
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al crear la familia';
      Alert.alert('Error', message);
    } finally {
      setCreatingFamily(false);
    }
  };

  const submitApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      const savingsOpts = buildSavingsApproveOpts(
        approveSavingsMode,
        approveSavingsPercentStr,
        approveSavingsAmountStr,
        approveSavingsGoalId
      );
      await choresAPI.approve(approveTarget.id, {
        rating,
        parent_feedback: feedback.trim() || undefined,
        quality_bonus: qualityBonus.trim() ? parseFloat(qualityBonus) : undefined,
        savings_reason_note: approveSavingsReasonNote.trim() || undefined,
        ...savingsOpts,
      });
      await hapticApprove();
      setShowConfetti(true);
      Keyboard.dismiss();
      setApproveTarget(null);
      loadData();
      // Alert after modal unmounts — on iOS, Alert while a Modal is visible often does not appear.
      setTimeout(() => {
        Alert.alert('Éxito', 'Tarea aprobada y pago realizado');
      }, 300);
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al aprobar la tarea';
      Alert.alert('Error', message);
    } finally {
      setApproving(false);
    }
  };

  const toggleChoreSelected = (choreId: string) => {
    setSelectedChoreIds((prev) =>
      prev.includes(choreId) ? prev.filter((id) => id !== choreId) : [...prev, choreId]
    );
  };

  const runBulkApprove = (choreIds?: string[]) => {
    const targets = choreIds?.length
      ? pendingChores.filter((c) => choreIds.includes(c.id))
      : pendingChores;
    if (targets.length === 0) {
      Alert.alert('Sin tareas', 'No hay tareas para aprobar.');
      return;
    }
    const total = targets.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const currency = family?.currency || '';
    Alert.alert(
      choreIds?.length ? 'Aprobar seleccionadas' : 'Aprobar todas',
      `Se aprobarán ${targets.length} tarea(s) por ${currency} ${total.toFixed(2)}.\n\nSe usa el % de ahorro por defecto de cada hijo (sin bono de calidad).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: async () => {
            setBulkApproving(true);
            try {
              const res = await choresAPI.approveBulk({
                chore_ids: targets.map((c) => c.id),
                rating: 5,
              });
              setSelectMode(false);
              setSelectedChoreIds([]);
              await loadData();
              Alert.alert(
                'Listo',
                `Aprobadas: ${res.approved_count}` +
                  (res.skipped_count ? `\nOmitidas: ${res.skipped_count}` : '') +
                  `\nTotal: ${currency} ${Number(res.total_amount).toFixed(2)}`
              );
            } catch (error: any) {
              const message = error.response?.data?.detail || 'Error al aprobar en lote';
              Alert.alert('Error', message);
            } finally {
              setBulkApproving(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectChore = async (choreId: string) => {
    Alert.alert(
      'Rechazar tarea',
      '¿Estás seguro de rechazar esta tarea?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              await choresAPI.reject(choreId);
              Alert.alert('Éxito', 'Tarea rechazada');
              loadData();
            } catch (error: any) {
              const message = error.response?.data?.detail || 'Error al rechazar la tarea';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const getChildName = (childId: string) => {
    const child = children.find(c => c.id === childId);
    return child?.name || 'Desconocido';
  };

  const totalBalance = children.reduce((sum, child) => sum + child.balance, 0);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const currency = family?.currency ?? '';
  const pendingTotal = pendingChores.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const goalsCardHint =
    pendingWithdrawalsCount > 0
      ? `${pendingWithdrawalsCount} retiro(s) · ${currency} ${pendingCashNeeded.toFixed(2)}`
      : 'Metas, bonos y retiros';
  const journeyHint = familyChallenge
    ? familyChallenge.all_children_hit_target
      ? 'Reto familiar cumplido este mes'
      : `Reto: ${familyChallenge.target_percent.toFixed(0)}% de ahorro`
    : 'Reportes e insignias';

  const openApprove = (chore: Chore) => {
    setApproveTarget(chore);
    setRating(5);
    setFeedback('');
    setQualityBonus('');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <FlagStripe height={5} style={styles.flag} />
        <View style={styles.headerRow}>
          <Image
            source={getParentAvatarSource(user?.gender)}
            style={styles.parentAvatar}
            contentFit="cover"
          />
          <View style={styles.headerText}>
            <Text style={Type.caption} numberOfLines={1}>
              {family ? `Familia ${family.name}` : 'HabitApp'}
            </Text>
            <Text style={[Type.title, styles.greeting]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {greeting}, {firstName}
            </Text>
          </View>
          <IconButton
            icon="notifications-outline"
            label="Notificaciones"
            onPress={() => router.push('/(parent)/notifications')}
          />
          <IconButton
            icon="person-outline"
            label="Mi perfil"
            onPress={() => router.push('/(parent)/profile')}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentInner, { paddingBottom: Spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {!family ? (
          <Card style={styles.noFamilyCard}>
            <IconTile icon="home" size={64} />
            <Text style={[Type.heading, styles.center]}>Aún no tienes una familia</Text>
            <Text style={[Type.body, styles.center]}>
              Crea tu familia para empezar a agregar hijos y tareas.
            </Text>
            <Button
              label="Crear familia"
              icon="add"
              style={styles.noFamilyButton}
              onPress={() => {
                setFamilyName('');
                setFamilyCountryCode('MX');
                setFamilyCurrency('MXN');
                setShowFamilyModal(true);
              }}
            />
          </Card>
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatTile
                label="Por revisar"
                value={String(pendingChores.length)}
                icon="hourglass-outline"
                tone={pendingChores.length > 0 ? 'accent' : 'neutral'}
              />
              <StatTile
                label={`Saldo ${currency}`.trim()}
                value={totalBalance.toFixed(2)}
                icon="wallet-outline"
                tone="secondary"
                onPress={() => router.push('/(parent)/children')}
              />
              <StatTile
                label="Retiros"
                value={String(pendingWithdrawalsCount)}
                icon="cash-outline"
                tone={pendingWithdrawalsCount > 0 ? 'primary' : 'neutral'}
                onPress={() => router.push('/(parent)/profile')}
              />
            </View>

            <FirstRunChecklist
              hasFamily={Boolean(family)}
              childrenCount={children.length}
              choresCount={choresTotalCount}
              hasChildLoginCode={Boolean(family.child_login_code)}
            />

            <View style={styles.section}>
              <SectionHeader
                title="Por aprobar"
                count={pendingChores.length}
                actionLabel={pendingChores.length > 1 ? (selectMode ? 'Cancelar' : 'Seleccionar') : undefined}
                onAction={() => {
                  if (bulkApproving) return;
                  if (selectMode) {
                    setSelectMode(false);
                    setSelectedChoreIds([]);
                  } else {
                    setSelectMode(true);
                    setSelectedChoreIds(pendingChores.map((c) => c.id));
                  }
                }}
              />

              {pendingChores.length === 0 ? (
                <Card style={styles.allClear}>
                  <IconTile icon="checkmark-done" tone="success" size={44} />
                  <View style={styles.flex1}>
                    <Text style={Type.bodyStrong}>Todo al día</Text>
                    <Text style={Type.caption}>No hay tareas esperando tu aprobación.</Text>
                  </View>
                </Card>
              ) : (
                <View style={styles.choreList}>
                  {pendingChores.map((chore) => {
                    const selected = selectMode && selectedChoreIds.includes(chore.id);
                    const kid = children.find((c) => c.id === chore.completed_by);
                    return (
                      <Card key={chore.id} padded={false} style={[styles.choreCard, selected && styles.choreCardSelected]}>
                        <Pressable
                          style={styles.choreMain}
                          onPress={() => (selectMode ? toggleChoreSelected(chore.id) : openApprove(chore))}
                          accessibilityRole={selectMode ? 'checkbox' : 'button'}
                          accessibilityState={selectMode ? { checked: selected } : undefined}
                          accessibilityHint={selectMode ? undefined : 'Abre la aprobación'}
                        >
                          {selectMode ? (
                            <Ionicons
                              name={selected ? 'checkbox' : 'square-outline'}
                              size={24}
                              color={selected ? Colors.primary : Colors.textLight}
                            />
                          ) : null}
                          {chore.photo_url ? (
                            <Image
                              source={{ uri: resolveMediaUrl(chore.photo_url) || chore.photo_url }}
                              style={styles.choreThumb}
                              contentFit="cover"
                            />
                          ) : (
                            <IconTile icon="clipboard-outline" size={52} />
                          )}
                          <View style={styles.choreInfo}>
                            <Text style={Type.bodyStrong} numberOfLines={2}>
                              {chore.title}
                            </Text>
                            <View style={styles.choreKid}>
                              <Image
                                source={getChildAvatarSource(kid?.gender)}
                                style={styles.choreKidAvatar}
                                contentFit="cover"
                              />
                              <Text style={Type.caption} numberOfLines={1}>
                                {getChildName(chore.completed_by || '')}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.choreAmount}>
                            {currency} {chore.amount.toFixed(2)}
                          </Text>
                        </Pressable>
                        {!selectMode ? (
                          <View style={styles.choreActions}>
                            <Button
                              label="Rechazar"
                              variant="secondary"
                              fullWidth={false}
                              style={styles.flex1}
                              onPress={() => handleRejectChore(chore.id)}
                            />
                            <Button
                              label="Aprobar"
                              icon="checkmark"
                              fullWidth={false}
                              style={styles.flex1}
                              onPress={() => openApprove(chore)}
                            />
                          </View>
                        ) : null}
                      </Card>
                    );
                  })}

                  {selectMode ? (
                    <Button
                      label={`Aprobar seleccionadas (${selectedChoreIds.length})`}
                      icon="checkmark-done"
                      size="lg"
                      loading={bulkApproving}
                      disabled={selectedChoreIds.length === 0}
                      onPress={() => runBulkApprove(selectedChoreIds)}
                    />
                  ) : pendingChores.length > 1 ? (
                    <Button
                      label={`Aprobar todas · ${currency} ${pendingTotal.toFixed(2)}`}
                      icon="checkmark-done"
                      variant="secondary"
                      loading={bulkApproving}
                      onPress={() => runBulkApprove()}
                    />
                  ) : null}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <SectionHeader
                title="Tus hijos"
                actionLabel={children.length > 0 ? 'Ver todos' : undefined}
                onAction={() => router.push('/(parent)/children')}
              />
              {children.length === 0 ? (
                <Card style={styles.allClear}>
                  <IconTile icon="people-outline" size={44} />
                  <View style={styles.flex1}>
                    <Text style={Type.bodyStrong}>Aún no hay hijos</Text>
                    <Text
                      style={styles.inlineLink}
                      onPress={() => router.push('/(parent)/children')}
                      accessibilityRole="link"
                    >
                      Agregar primer hijo
                    </Text>
                  </View>
                </Card>
              ) : (
                <Card padded={false} style={styles.listCard}>
                  {children.map((child, i) => (
                    <ListRow
                      key={child.id}
                      divided={i > 0}
                      title={child.name}
                      subtitle={`${child.age} años · Ahorro auto ${Number(child.savings_on_approve_percent ?? 0).toFixed(0)}%`}
                      leading={
                        <Image
                          source={getChildAvatarSource(child.gender)}
                          style={styles.childAvatar}
                          contentFit="cover"
                        />
                      }
                      trailing={
                        <View style={styles.childBalance}>
                          <Text style={styles.balanceValue}>{child.balance.toFixed(2)}</Text>
                          <Text style={Type.caption}>{currency}</Text>
                        </View>
                      }
                      onPress={() => router.push('/(parent)/children')}
                    />
                  ))}
                </Card>
              )}
            </View>

            <View style={styles.section}>
              <ConfettiBurst visible={showConfetti} onDone={() => setShowConfetti(false)} />
              <DailyStreakCard
                streak={familyStreak}
                weekDone={weekDone}
                currency={family.currency}
                streakBonus={Number((family as { streak_bonus_amount?: number }).streak_bonus_amount || 0)}
              />
              <DailyMissionsCard
                childrenList={children.map((c) => ({ id: c.id, name: c.name }))}
                chores={allChores}
                currency={family.currency}
                onChanged={loadData}
              />
            </View>

            {familyChallenge ? (
              <View style={styles.section}>
                <Card style={styles.challengeCard}>
                  <View style={styles.challengeHead}>
                    <IconTile
                      icon={familyChallenge.all_children_hit_target ? 'ribbon' : 'trophy'}
                      tone={familyChallenge.all_children_hit_target ? 'success' : 'primary'}
                      size={40}
                    />
                    <View style={styles.flex1}>
                      <Text style={Type.heading}>
                        Reto familiar: ahorrar {familyChallenge.target_percent.toFixed(0)}%
                      </Text>
                      <Text style={Type.caption}>
                        {familyChallenge.all_children_hit_target
                          ? 'Insignia compartida desbloqueada. Todos van cumpliendo el reto.'
                          : 'Aún no lo cumple toda la familia. Sigan ahorrando este mes.'}
                      </Text>
                    </View>
                  </View>
                  {familyChallenge.children.map((c) => {
                    const target = Math.max(familyChallenge.target_percent || 1, 1);
                    const progress = Math.min(100, (c.saved_percent / target) * 100);
                    return (
                      <View key={c.child_id} style={styles.challengeRow}>
                        <View style={styles.challengeRowTop}>
                          <Text style={Type.bodyStrong}>{c.name}</Text>
                          <Text style={[styles.challengePct, c.hit_target && styles.challengePctOk]}>
                            {c.saved_percent.toFixed(1)}%
                          </Text>
                        </View>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${progress}%`,
                                backgroundColor: c.hit_target ? Colors.success : Colors.primary,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                  {familyChallenge.history && familyChallenge.history.length > 0 ? (
                    <View style={styles.challengeHistory}>
                      <Text style={Type.eyebrow}>Historial reciente</Text>
                      {familyChallenge.history.slice(0, 4).map((h) => (
                        <View key={h.month_key} style={styles.challengeHistoryRow}>
                          <Text style={Type.caption}>{h.month_key}</Text>
                          <Chip
                            label={h.all_children_hit_target ? 'Completado' : 'En progreso'}
                            tone={h.all_children_hit_target ? 'success' : 'neutral'}
                          />
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Text
                    style={styles.inlineLink}
                    onPress={() => router.push('/(parent)/family-badges')}
                    accessibilityRole="link"
                  >
                    Ver insignias familiares
                  </Text>
                </Card>
              </View>
            ) : null}

            <View style={styles.section}>
              <SectionHeader title="Atajos" />
              <Card padded={false} style={styles.listCard}>
                <ListRow
                  title="Nueva tarea"
                  subtitle="Asigna algo de la casa"
                  leading={<IconTile icon="add" tone="accent" size={40} />}
                  onPress={() => router.push('/(parent)/chores')}
                />
                <ListRow
                  divided
                  title="Agregar hijo"
                  subtitle="Perfil, PIN y ahorro"
                  leading={<IconTile icon="person-add-outline" tone="primary" size={40} />}
                  onPress={() => router.push('/(parent)/children')}
                />
                <ListRow
                  divided
                  title="Metas y retiros"
                  subtitle={goalsCardHint}
                  leading={<IconTile icon="trophy-outline" tone="secondary" size={40} />}
                  onPress={() =>
                    router.push(pendingWithdrawalsCount > 0 ? '/(parent)/profile' : '/(parent)/goals')
                  }
                />
                <ListRow
                  divided
                  title="Progreso familiar"
                  subtitle={journeyHint}
                  leading={<IconTile icon="map-outline" tone="success" size={40} />}
                  onPress={() =>
                    router.push(familyChallenge ? '/(parent)/family-badges' : '/(parent)/reports')
                  }
                />
              </Card>
            </View>
          </>
        )}
      </ScrollView>

      <AppModal
        visible={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="Aprobar tarea"
        icon="checkmark-circle"
        iconTone="success"
        size="lg"
        footer={
          <AppModalActions
            onCancel={() => setApproveTarget(null)}
            confirmLabel="Aprobar y pagar"
            onConfirm={submitApprove}
            confirming={approving}
            confirmTone="success"
          />
        }
      >
        {approveTarget?.photo_url ? (
          <Image
            source={{
              uri: resolveMediaUrl(approveTarget.photo_url) || approveTarget.photo_url,
            }}
            style={styles.evidenceImage}
            contentFit="contain"
          />
        ) : null}
        <Text style={modalFieldStyles.label}>Calificación (1–5)</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => setRating(n)}>
              <Ionicons
                name={n <= rating ? 'star' : 'star-outline'}
                size={32}
                color={n <= rating ? Colors.secondary : Colors.textLight}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={modalFieldStyles.label}>Bono extra por buen trabajo (opcional)</Text>
        <TextInput
          style={modalFieldStyles.input}
          placeholder="0"
          keyboardType="decimal-pad"
          value={qualityBonus}
          onChangeText={setQualityBonus}
          placeholderTextColor={Colors.textLight}
        />
        <Text style={modalFieldStyles.label}>Feedback para tu hijo (opcional)</Text>
        <TextInput
          style={[modalFieldStyles.input, modalFieldStyles.inputMultiline]}
          placeholder="¡Buen trabajo!"
          value={feedback}
          onChangeText={setFeedback}
          multiline
          placeholderTextColor={Colors.textLight}
        />
        {approveTarget?.completed_by ? (
          <>
            <ApproveSavingsControls
              currency={family?.currency ?? ''}
              childDefaultPercent={childDefaultApprovePct}
              goals={approveSavingsGoals}
              mode={approveSavingsMode}
              onModeChange={(m) => {
                setApproveSavingsMode(m);
                if (m === 'percent' && approveChild?.savings_on_approve_percent != null) {
                  const p = Number(approveChild.savings_on_approve_percent);
                  if (!Number.isNaN(p)) setApproveSavingsPercentStr(String(p));
                }
              }}
              percentStr={approveSavingsPercentStr}
              onPercentStrChange={setApproveSavingsPercentStr}
              amountStr={approveSavingsAmountStr}
              onAmountStrChange={setApproveSavingsAmountStr}
              goalId={approveSavingsGoalId}
              onGoalIdChange={setApproveSavingsGoalId}
              reasonNote={approveSavingsReasonNote}
              onReasonNoteChange={setApproveSavingsReasonNote}
            />
            <SavingsSplitPreviewBox
              currency={family?.currency ?? ''}
              loading={splitLoading}
              preview={splitPreview}
            />
          </>
        ) : null}
      </AppModal>

      <AppModal
        visible={showFamilyModal}
        onClose={() => setShowFamilyModal(false)}
        title="Crear Familia"
        icon="people"
        iconTone="primary"
        size="lg"
        footer={
          <AppModalActions
            onCancel={() => setShowFamilyModal(false)}
            confirmLabel="Crear"
            onConfirm={handleCreateFamily}
            confirming={creatingFamily}
          />
        }
      >
        <Text style={modalFieldStyles.label}>Nombre de la Familia</Text>
        <TextInput
          style={modalFieldStyles.input}
          placeholder="Ej: Familia García"
          placeholderTextColor={Colors.textLight}
          value={familyName}
          onChangeText={setFamilyName}
        />
        <FamilyLocaleSection
          countryCode={familyCountryCode}
          currency={familyCurrency}
          onCountryChange={setFamilyCountryCode}
          onCurrencyChange={setFamilyCurrency}
        />
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  center: {
    textAlign: 'center',
  },
  header: {
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  flag: {
    borderRadius: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md + 2,
  },
  parentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 2,
  },
  greeting: {
    fontSize: 22,
    lineHeight: 28,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.xs,
  },
  section: {
    marginTop: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
    marginBottom: Spacing.sm,
  },
  noFamilyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
    marginTop: Spacing.lg,
  },
  noFamilyButton: {
    marginTop: Spacing.sm,
  },
  allClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  choreList: {
    gap: Spacing.md,
  },
  choreCard: {
    borderRadius: Radius.xl,
  },
  choreCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  choreMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md + 2,
  },
  choreThumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceAlt,
  },
  choreInfo: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  choreKid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  choreKidAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  choreAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.secondaryInk,
  },
  choreActions: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
    paddingHorizontal: Spacing.md + 2,
    paddingBottom: Spacing.md + 2,
  },
  listCard: {
    overflow: 'hidden',
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  childBalance: {
    alignItems: 'flex-end',
    marginRight: 2,
  },
  balanceValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  inlineLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
  challengeCard: {
    gap: Spacing.md,
  },
  challengeHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  challengeRow: {
    gap: 6,
  },
  challengeRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengePct: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  challengePctOk: {
    color: Colors.success,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  challengeHistory: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  challengeHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  evidenceImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: Colors.background,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
});
