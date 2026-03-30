import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Keyboard,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
import { Colors } from '../../src/constants/colors';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import FlagStripe from '../../src/components/FlagStripe';
import { FamilyLocaleSection } from '../../src/components/FamilyLocaleSection';
import { SavingsSplitPreviewBox } from '../../src/components/SavingsSplitPreviewBox';
import {
  ApproveSavingsControls,
  buildSavingsApproveOpts,
  ApproveSavingsMode,
} from '../../src/components/ApproveSavingsControls';

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

function getChildAvatarSource(gender?: 'mujer' | 'hombre' | null) {
  if (gender === 'mujer') {
    return require('../../assets/images/mujer.png');
  }
  return require('../../assets/images/hombre.png');
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, family, setFamily, refreshUser, logout } = useAuthStore();
  const [children, setChildren] = useState<Child[]>([]);
  const [pendingChores, setPendingChores] = useState<Chore[]>([]);
  const [completedChores, setCompletedChores] = useState<Chore[]>([]);
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
        if (!cancelled) setApproveSavingsGoals(data);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>¡Hola, {user?.name}!</Text>
          <Text style={styles.subtitle}>
            {family ? `Familia ${family.name}` : 'Sin familia'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert('Cerrar Sesión', '¿Deseas cerrar sesión?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Cerrar Sesión', onPress: () => { logout(); router.replace('/'); } },
            ]);
          }}
        >
          <Ionicons name="log-out-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <FlagStripe height={4} />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
      >
        {!family ? (
          <View style={styles.noFamilyContainer}>
            <Ionicons name="home-outline" size={64} color={Colors.textLight} />
            <Text style={styles.noFamilyText}>Aún no tienes una familia creada</Text>
            <Text style={styles.noFamilySubtext}>
              Crea tu familia para empezar a agregar hijos y tareas
            </Text>
            <TouchableOpacity
              style={styles.createFamilyButton}
              onPress={() => {
                setFamilyName('');
                setFamilyCountryCode('MX');
                setFamilyCurrency('MXN');
                setShowFamilyModal(true);
              }}
            >
              <Ionicons name="add" size={20} color={Colors.white} />
              <Text style={styles.createFamilyButtonText}>Crear Familia</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: Colors.primary }]}>
                <Ionicons name="people" size={24} color={Colors.white} />
                <Text style={styles.statValue}>{children.length}</Text>
                <Text style={styles.statLabel}>Hijos</Text>
              </View>
              <View style={[styles.statCard, styles.statCardYellow]}>
                <Ionicons name="wallet" size={24} color={Colors.onSecondary} />
                <Text style={[styles.statValue, styles.statOnYellow]}>
                  {family.currency} {totalBalance.toFixed(2)}
                </Text>
                <Text style={[styles.statLabel, styles.statLabelOnYellow]}>Saldo Total</Text>
              </View>
            </View>
            <View style={styles.cashReadyCard}>
              <View style={styles.cashReadyHead}>
                <Ionicons name="cash-outline" size={18} color={Colors.success} />
                <Text style={styles.cashReadyTitle}>Dinero a tener listo</Text>
              </View>
              <Text style={styles.cashReadyAmount}>
                {family.currency} {pendingCashNeeded.toFixed(2)}
              </Text>
              <Text style={styles.cashReadyHint}>
                {pendingWithdrawalsCount > 0
                  ? `${pendingWithdrawalsCount} retiro(s) pendientes por pagar a hijos`
                  : 'No hay retiros pendientes ahora'}
              </Text>
              {pendingWithdrawalsCount > 0 ? (
                <TouchableOpacity
                  style={styles.cashReadyAction}
                  onPress={() => router.push('/(parent)/profile')}
                >
                  <Text style={styles.cashReadyActionText}>Ver solicitudes</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.success} />
                </TouchableOpacity>
              ) : null}
            </View>

            {familyChallenge ? (
              <View style={styles.section}>
                <View style={styles.familyChallengeCard}>
                  <View style={styles.familyChallengeHead}>
                    <Ionicons
                      name={familyChallenge.all_children_hit_target ? 'ribbon' : 'people-outline'}
                      size={20}
                      color={familyChallenge.all_children_hit_target ? Colors.success : Colors.primary}
                    />
                    <Text style={styles.familyChallengeTitle}>
                      Reto familiar mensual: ahorrar {familyChallenge.target_percent.toFixed(0)}%
                    </Text>
                  </View>
                  <Text style={styles.familyChallengeStatus}>
                    {familyChallenge.all_children_hit_target
                      ? 'Insignia compartida desbloqueada. Todos van cumpliendo el reto.'
                      : 'Aun no lo cumple toda la familia. Sigan ahorrando este mes.'}
                  </Text>
                  {familyChallenge.children.map((c) => (
                    <View key={c.child_id} style={styles.familyChallengeRow}>
                      <Text style={styles.familyChallengeChildName}>{c.name}</Text>
                      <Text
                        style={[
                          styles.familyChallengeChildPct,
                          c.hit_target ? styles.familyChallengeChildPctOk : null,
                        ]}
                      >
                        {c.saved_percent.toFixed(1)}%
                      </Text>
                    </View>
                  ))}
                  {familyChallenge.history && familyChallenge.history.length > 0 ? (
                    <View style={styles.familyChallengeHistory}>
                      <Text style={styles.familyChallengeHistoryTitle}>Historial reciente</Text>
                      {familyChallenge.history.slice(0, 4).map((h) => (
                        <View key={h.month_key} style={styles.familyChallengeHistoryRow}>
                          <Text style={styles.familyChallengeHistoryMonth}>{h.month_key}</Text>
                          <Text
                            style={[
                              styles.familyChallengeHistoryState,
                              h.all_children_hit_target ? styles.familyChallengeHistoryStateOk : null,
                            ]}
                          >
                            {h.all_children_hit_target ? 'Completado' : 'En progreso'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={styles.familyChallengeLink}
                    onPress={() => router.push('/(parent)/family-badges')}
                  >
                    <Ionicons name="ribbon-outline" size={14} color={Colors.primary} />
                    <Text style={styles.familyChallengeLinkText}>Ver insignias familiares</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* Pending Approvals */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tareas por Aprobar</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingChores.length}</Text>
                </View>
              </View>
              {pendingChores.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No hay tareas pendientes de aprobación</Text>
                </View>
              ) : (
                pendingChores.map((chore) => (
                  <View key={chore.id} style={styles.choreCard}>
                    {chore.photo_url ? (
                      <Image
                        source={{ uri: chore.photo_url }}
                        style={styles.choreThumb}
                        contentFit="cover"
                      />
                    ) : null}
                    <View style={styles.choreInfo}>
                      <Text style={styles.choreTitle}>{chore.title}</Text>
                      <Text style={styles.choreChild}>
                        Completada por: {getChildName(chore.completed_by || '')}
                      </Text>
                      <Text style={styles.choreAmount}>
                        {family.currency} {chore.amount.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.choreActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => {
                          setApproveTarget(chore);
                          setRating(5);
                          setFeedback('');
                          setQualityBonus('');
                        }}
                      >
                        <Ionicons name="checkmark" size={20} color={Colors.white} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleRejectChore(chore.id)}
                      >
                        <Ionicons name="close" size={20} color={Colors.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => router.push('/(parent)/children')}
                >
                  <Ionicons name="person-add-outline" size={26} color={Colors.primary} />
                  <Text style={styles.quickActionText}>Agregar Hijo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => router.push('/(parent)/chores')}
                >
                  <Ionicons name="add-circle-outline" size={26} color={Colors.accent} />
                  <Text style={styles.quickActionText}>Nueva Tarea</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Children Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resumen de Hijos</Text>
              {children.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Aún no hay hijos registrados</Text>
                  <TouchableOpacity onPress={() => router.push('/(parent)/children')}>
                    <Text style={styles.emptyStateLink}>Agregar primer hijo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                children.map((child) => (
                  <View key={child.id} style={styles.childCard}>
                    <View style={styles.childAvatar}>
                      <Image
                        source={getChildAvatarSource(child.gender)}
                        style={styles.childAvatarImage}
                        contentFit="cover"
                      />
                    </View>
                    <View style={styles.childInfo}>
                      <Text style={styles.childName}>{child.name}</Text>
                      <Text style={styles.childAge}>{child.age} años</Text>
                      <View style={styles.savingsBadge}>
                        <Ionicons name="leaf-outline" size={12} color={Colors.primary} />
                        <Text style={styles.savingsBadgeText}>
                          Ahorro automático {Number(child.savings_on_approve_percent ?? 0).toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                    <View style={styles.childBalance}>
                      <Text style={styles.balanceLabel}>Saldo</Text>
                      <Text style={styles.balanceValue}>
                        {family.currency} {child.balance.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={!!approveTarget}
        animationType="slide"
        transparent
        onRequestClose={() => setApproveTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView
              style={styles.approveModalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.approveModalScrollContent}
            >
              <Text style={styles.modalTitle}>Aprobar tarea</Text>
              {approveTarget?.photo_url ? (
                <Image
                  source={{ uri: approveTarget.photo_url }}
                  style={styles.evidenceImage}
                  contentFit="contain"
                />
              ) : null}
              <Text style={styles.approveHint}>Calificación (1–5)</Text>
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
              <Text style={styles.inputLabel}>Bono extra por buen trabajo (opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0"
                keyboardType="decimal-pad"
                value={qualityBonus}
                onChangeText={setQualityBonus}
                placeholderTextColor={Colors.textLight}
              />
              <Text style={styles.inputLabel}>Feedback para tu hijo (opcional)</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 72 }]}
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
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setApproveTarget(null)}>
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, approving && styles.buttonDisabled]}
                onPress={submitApprove}
                disabled={approving}
              >
                {approving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Aprobar y pagar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Family Modal */}
      <Modal
        visible={showFamilyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFamilyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              <Text style={styles.modalTitle}>Crear Familia</Text>

              <View style={styles.modalInput}>
                <Text style={styles.inputLabel}>Nombre de la Familia</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: Familia García"
                  placeholderTextColor={Colors.textLight}
                  value={familyName}
                  onChangeText={setFamilyName}
                />
              </View>

              <FamilyLocaleSection
                countryCode={familyCountryCode}
                currency={familyCurrency}
                onCountryChange={setFamilyCountryCode}
                onCurrencyChange={setFamilyCurrency}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowFamilyModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, creatingFamily && styles.buttonDisabled]}
                onPress={handleCreateFamily}
                disabled={creatingFamily}
              >
                {creatingFamily ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Crear</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.surface,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  noFamilyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noFamilyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  noFamilySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createFamilyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createFamilyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statCardYellow: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.secondaryDark,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 8,
  },
  statOnYellow: {
    color: Colors.onSecondary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
  statLabelOnYellow: {
    color: Colors.onSecondaryMuted,
    opacity: 1,
  },
  cashReadyCard: {
    backgroundColor: Colors.success + '14',
    borderWidth: 1,
    borderColor: Colors.success + '44',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  cashReadyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cashReadyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success,
  },
  cashReadyAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.success,
  },
  cashReadyHint: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cashReadyAction: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.success + '12',
  },
  cashReadyActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  badge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyStateLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  choreCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  choreThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  choreInfo: {
    flex: 1,
  },
  evidenceImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: Colors.background,
  },
  approveHint: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  choreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  choreChild: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  choreAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSecondary,
    marginTop: 4,
  },
  choreActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  childCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.surfaceAlt,
  },
  childAvatarImage: {
    width: '100%',
    height: '100%',
  },
  childInfo: {
    flex: 1,
    marginLeft: 12,
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  childAge: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  savingsBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '12',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  childBalance: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '92%',
    flexDirection: 'column',
  },
  approveModalScroll: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 460,
  },
  approveModalScrollContent: {
    paddingBottom: 8,
  },
  modalScroll: {
    maxHeight: 480,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalSubmitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  familyChallengeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  familyChallengeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  familyChallengeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  familyChallengeStatus: {
    marginTop: 6,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  familyChallengeRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  familyChallengeChildName: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
  familyChallengeChildPct: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  familyChallengeChildPctOk: {
    color: Colors.success,
  },
  familyChallengeHistory: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  familyChallengeHistoryTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  familyChallengeHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  familyChallengeHistoryMonth: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  familyChallengeHistoryState: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  familyChallengeHistoryStateOk: {
    color: Colors.success,
  },
  familyChallengeLink: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '12',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  familyChallengeLinkText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
});
