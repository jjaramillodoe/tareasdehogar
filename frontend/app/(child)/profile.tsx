import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Colors } from '../../src/constants/colors';
import { authAPI, paymentsAPI, savingsGoalsAPI, statsAPI } from '../../src/services/api';

type SavingsGoal = {
  id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  is_completed: boolean;
};

type ChildPayment = {
  amount: number;
  payment_type?: string;
  created_at?: string;
  savings_allocated?: number | null;
};

export default function ChildProfileScreen() {
  const router = useRouter();
  const { selectedChild, family, logout } = useAuthStore();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [payments, setPayments] = useState<ChildPayment[]>([]);
  const [savingsStreak, setSavingsStreak] = useState(0);
  const [bestSavingsStreak, setBestSavingsStreak] = useState(0);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [cooldownLocked, setCooldownLocked] = useState(0);
  const [familyChallenge, setFamilyChallenge] = useState<{
    target_percent: number;
    all_children_hit_target: boolean;
    history?: { month_key: string; all_children_hit_target: boolean }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinModal, setPinModal] = useState<{ currentPin: string; newPin: string; confirmPin: string } | null>(
    null
  );
  const [savingPin, setSavingPin] = useState(false);

  const loadSavingsData = useCallback(async () => {
    if (!selectedChild) return;
    setLoading(true);
    try {
      const [goalData, paymentData, statsData] = await Promise.all([
        savingsGoalsAPI.getAll(selectedChild.id).catch(() => []),
        paymentsAPI.getForChild(selectedChild.id).catch(() => []),
        statsAPI.getChildStats(selectedChild.id).catch(() => null),
      ]);
      setGoals(goalData as SavingsGoal[]);
      setPayments(paymentData as ChildPayment[]);
      if (statsData) {
        setSavingsStreak(Number((statsData as any).savings_current_streak ?? 0));
        setBestSavingsStreak(Number((statsData as any).savings_best_streak ?? 0));
        setAvailableBalance(Number((statsData as any).available_balance ?? selectedChild.balance));
        setCooldownLocked(Number((statsData as any).cooldown_locked_amount ?? 0));
        setFamilyChallenge(((statsData as any).family_savings_challenge ?? null) as any);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useFocusEffect(
    useCallback(() => {
      void loadSavingsData();
    }, [loadSavingsData])
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const submitPinChange = async () => {
    if (!pinModal) return;
    if (!pinModal.newPin) {
      Alert.alert('Error', 'Ingresa un nuevo PIN');
      return;
    }
    if (pinModal.newPin.length < 4) {
      Alert.alert('Error', 'El PIN debe tener al menos 4 caracteres');
      return;
    }
    if (pinModal.newPin !== pinModal.confirmPin) {
      Alert.alert('Error', 'La confirmación del PIN no coincide');
      return;
    }
    setSavingPin(true);
    try {
      await authAPI.changeChildPin({
        current_pin: pinModal.currentPin || undefined,
        new_pin: pinModal.newPin,
      });
      setPinModal(null);
      Alert.alert('Listo', 'Tu PIN fue actualizado.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo cambiar el PIN');
    } finally {
      setSavingPin(false);
    }
  };

  const avatarSource =
    selectedChild?.gender === 'mujer'
      ? require('../../assets/images/mujer.png')
      : require('../../assets/images/hombre.png');

  const activeGoal = useMemo(
    () => goals.find((g) => !g.is_completed && g.saved_amount < g.target_amount),
    [goals]
  );
  const remainingGoalAmount = activeGoal
    ? Math.max(0, Number(activeGoal.target_amount) - Number(activeGoal.saved_amount))
    : 0;
  const averageChorePay = useMemo(() => {
    const chorePayments = payments.filter((p) => p.payment_type === 'chore' && p.amount > 0);
    if (chorePayments.length === 0) return 0;
    const total = chorePayments.reduce((sum, p) => sum + p.amount, 0);
    return total / chorePayments.length;
  }, [payments]);
  const choresLeftEstimate =
    activeGoal && averageChorePay > 0 ? Math.ceil(remainingGoalAmount / averageChorePay) : null;
  const autoSavePercent = Number(selectedChild?.savings_on_approve_percent ?? 0);
  const weeklyChallengeTarget = 20;
  const weeklyChallenge = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const weeklyChorePayments = payments.filter((p) => {
      if (p.payment_type !== 'chore') return false;
      if (!p.created_at) return false;
      const ts = new Date(p.created_at).getTime();
      return Number.isFinite(ts) && ts >= sevenDaysAgo;
    });
    const totalPaid = weeklyChorePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalSaved = weeklyChorePayments.reduce(
      (sum, p) => sum + Number(p.savings_allocated || 0),
      0
    );
    const percent = totalPaid > 0 ? (totalSaved / totalPaid) * 100 : 0;
    const reached = percent >= weeklyChallengeTarget;
    return {
      totalPaid,
      totalSaved,
      percent,
      reached,
      shortfallPercent: Math.max(0, weeklyChallengeTarget - percent),
    };
  }, [payments]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
        <Text style={styles.headerSubtitle}>Tu información</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {selectedChild ? (
          <View style={styles.card}>
            <View style={styles.avatarWrap}>
              <Image source={avatarSource} style={styles.avatar} />
            </View>
            <Text style={styles.name}>{selectedChild.name}</Text>
            <Text style={styles.meta}>
              {selectedChild.gender === 'mujer' ? 'Mujer' : 'Hombre'} · {selectedChild.age} años
            </Text>

            {selectedChild.alias ? <Text style={styles.alias}>Alias: {selectedChild.alias}</Text> : null}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Saldo actual</Text>
              <Text style={styles.infoValue}>
                {family?.currency} {selectedChild.balance.toFixed(2)}
              </Text>
              <Text style={styles.infoSubValue}>
                Disponible ahora: {family?.currency}{' '}
                {(availableBalance ?? selectedChild.balance).toFixed(2)} · en espera 24h:{' '}
                {family?.currency} {cooldownLocked.toFixed(2)}
              </Text>
            </View>

            <View style={styles.autoSaveCard}>
              <Text style={styles.autoSaveTitle}>Ahorro automático</Text>
              <Text style={styles.autoSaveValue}>{autoSavePercent.toFixed(0)}%</Text>
              <Text style={styles.autoSaveText}>
                De cada tarea aprobada, esta parte va primero a tu meta de ahorro.
              </Text>
              <Text style={styles.streakText}>
                Racha de ahorro: {savingsStreak} semana{savingsStreak === 1 ? '' : 's'} seguidas · mejor
                racha {bestSavingsStreak}
              </Text>
              {Number(family?.savings_match_percent ?? 0) > 0 &&
              Number(family?.savings_match_weekly_cap ?? 0) > 0 ? (
                <Text style={styles.matchText}>
                  Match familiar: +{Number(family?.savings_match_percent ?? 0).toFixed(0)}% de lo
                  que ahorres (tope semanal {family?.currency}{' '}
                  {Number(family?.savings_match_weekly_cap ?? 0).toFixed(2)}).
                </Text>
              ) : null}
              <Text style={styles.challengeFamilyText}>
                Reto familiar mensual: {Number(familyChallenge?.target_percent ?? family?.family_challenge_target_percent ?? 15).toFixed(0)}%
                {' '}de ahorro. {familyChallenge?.all_children_hit_target ? 'Insignia compartida activa.' : 'Sigan avanzando juntos.'}
              </Text>
              {familyChallenge?.history?.length ? (
                <Text style={styles.challengeFamilyHistory}>
                  Historial: {familyChallenge.history
                    .slice(0, 3)
                    .map((h) => `${h.month_key} ${h.all_children_hit_target ? 'OK' : '...'} `)
                    .join(' · ')}
                </Text>
              ) : null}
              <TouchableOpacity
                style={styles.familyBadgesLink}
                onPress={() => router.push('/(child)/family-badges')}
              >
                <Ionicons name="ribbon-outline" size={14} color={Colors.primary} />
                <Text style={styles.familyBadgesLinkText}>Ver insignias familiares</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.goalCard}>
              <View style={styles.goalCardHeader}>
                <Text style={styles.goalTitle}>Meta de ahorro activa</Text>
                {loading ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
              </View>
              {activeGoal ? (
                <>
                  <Text style={styles.goalName}>{activeGoal.title}</Text>
                  <Text style={styles.goalAmounts}>
                    {family?.currency} {Number(activeGoal.saved_amount).toFixed(2)} / {family?.currency}{' '}
                    {Number(activeGoal.target_amount).toFixed(2)}
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              (Number(activeGoal.saved_amount) / Number(activeGoal.target_amount)) * 100
                            )
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.goalHint}>
                    Te faltan {family?.currency} {remainingGoalAmount.toFixed(2)}
                    {choresLeftEstimate != null
                      ? ` (aprox. ${choresLeftEstimate} tarea${choresLeftEstimate === 1 ? '' : 's'})`
                      : ''}
                    .
                  </Text>
                </>
              ) : (
                <Text style={styles.goalHint}>
                  No tienes una meta activa. Pide a tu familia que cree una en la pestaña Metas.
                </Text>
              )}
            </View>

            <View style={styles.challengeCard}>
              <Text style={styles.challengeTitle}>
                Desafío semanal: ahorrar al menos {weeklyChallengeTarget}%
              </Text>
              <Text style={styles.challengeMetric}>
                Llevas {weeklyChallenge.percent.toFixed(1)}% esta semana
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.challengeFill,
                    {
                      width: `${Math.min(100, (weeklyChallenge.percent / weeklyChallengeTarget) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.challengeHint}>
                {weeklyChallenge.totalPaid > 0
                  ? weeklyChallenge.reached
                    ? 'Excelente: ya cumpliste tu desafío semanal.'
                    : `Te falta ahorrar ${weeklyChallenge.shortfallPercent.toFixed(1)}% para cumplirlo.`
                  : 'Aún no hay pagos aprobados esta semana para medir tu progreso.'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No hay perfil de hijo activo.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.logoutButton, { marginTop: 10 }]}
          onPress={() => setPinModal({ currentPin: '', newPin: '', confirmPin: '' })}
        >
          <Ionicons name="key-outline" size={20} color={Colors.primary} />
          <Text style={[styles.logoutText, { color: Colors.primary }]}>Cambiar mi PIN</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={!!pinModal} transparent animationType="slide" onRequestClose={() => setPinModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cambiar mi PIN</Text>
            <Text style={styles.modalHint}>Si ya tenías PIN, ingresa tu PIN actual.</Text>
            <TextInput
              style={styles.input}
              placeholder="PIN actual (si aplica)"
              placeholderTextColor={Colors.textLight}
              value={pinModal?.currentPin ?? ''}
              onChangeText={(currentPin) => pinModal && setPinModal({ ...pinModal, currentPin })}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={12}
            />
            <TextInput
              style={styles.input}
              placeholder="Nuevo PIN"
              placeholderTextColor={Colors.textLight}
              value={pinModal?.newPin ?? ''}
              onChangeText={(newPin) => pinModal && setPinModal({ ...pinModal, newPin })}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={12}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirmar PIN"
              placeholderTextColor={Colors.textLight}
              value={pinModal?.confirmPin ?? ''}
              onChangeText={(confirmPin) => pinModal && setPinModal({ ...pinModal, confirmPin })}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={12}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPinModal(null)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={submitPinChange} disabled={savingPin}>
                {savingPin ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalSaveText}>Guardar</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.surfaceAlt,
    marginBottom: 12,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  meta: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  alias: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  infoRow: {
    marginTop: 18,
    width: '100%',
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 12,
    padding: 14,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onSecondary,
  },
  infoSubValue: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  autoSaveCard: {
    marginTop: 14,
    width: '100%',
    borderRadius: 12,
    padding: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  autoSaveTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  autoSaveValue: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  autoSaveText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  streakText: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 6,
    fontWeight: '600',
  },
  matchText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 6,
    fontWeight: '600',
    lineHeight: 18,
  },
  challengeFamilyText: {
    fontSize: 12,
    color: Colors.secondaryDark,
    marginTop: 6,
    fontWeight: '600',
    lineHeight: 18,
  },
  challengeFamilyHistory: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  familyBadgesLink: {
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
  familyBadgesLinkText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  goalCard: {
    marginTop: 12,
    width: '100%',
    borderRadius: 12,
    padding: 14,
    backgroundColor: Colors.backgroundAlt,
    borderWidth: 1,
    borderColor: Colors.secondaryDark,
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 13,
    color: Colors.onSecondaryMuted,
    fontWeight: '700',
  },
  goalName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  goalAmounts: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  progressTrack: {
    marginTop: 10,
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  goalHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
  challengeCard: {
    marginTop: 12,
    width: '100%',
    borderRadius: 12,
    padding: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  challengeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  challengeMetric: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
  },
  challengeFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.success,
  },
  challengeHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  logoutButton: {
    marginTop: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalSaveText: {
    color: Colors.white,
    fontWeight: '700',
  },
});
