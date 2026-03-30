import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { paymentsAPI, statsAPI, withdrawalsAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface Payment {
  id: string;
  child_id: string;
  chore_id: string;
  chore_title: string;
  amount: number;
  status: string;
  created_at: string;
  payment_type?: string;
  purpose_note?: string | null;
  savings_allocated?: number | null;
  savings_reason_note?: string | null;
}

interface WithdrawalRow {
  id: string;
  child_id: string;
  amount: number;
  status: string;
  note?: string | null;
  purpose_type?: 'necesidad' | 'deseo' | null;
  goal_impact_note?: string | null;
  created_at: string;
}

function paymentTypeLabel(t?: string) {
  switch (t) {
    case 'savings_streak_bonus':
      return 'Bono racha ahorro';
    case 'savings_match':
      return 'Match ahorro';
    case 'goal_bonus':
      return 'Bono meta';
    case 'withdrawal':
      return 'Retiro';
    case 'quality_bonus':
      return 'Bono calidad';
    default:
      return 'Tarea';
  }
}

export default function ChildPaymentsScreen() {
  const router = useRouter();
  const { selectedChild, family } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [cooldownLocked, setCooldownLocked] = useState<number>(0);
  const [wdAmount, setWdAmount] = useState('');
  const [wdNote, setWdNote] = useState('');
  const [wdPurposeType, setWdPurposeType] = useState<'necesidad' | 'deseo' | ''>('');
  const [wdGoalImpact, setWdGoalImpact] = useState('');
  const [wdSubmitting, setWdSubmitting] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!selectedChild) return;

    try {
      const [data, wd, stats] = await Promise.all([
        paymentsAPI.getForChild(selectedChild.id),
        withdrawalsAPI.list().catch(() => []),
        statsAPI.getChildStats(selectedChild.id).catch(() => null),
      ]);
      setPayments(data);
      setWithdrawals(
        (wd as WithdrawalRow[]).filter((w) => w.child_id === selectedChild.id)
      );
      if (stats) {
        setAvailableBalance(Number((stats as any).available_balance ?? selectedChild.balance));
        setCooldownLocked(Number((stats as any).cooldown_locked_amount ?? 0));
      } else {
        setAvailableBalance(selectedChild.balance);
        setCooldownLocked(0);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedChild]);

  useFocusEffect(
    useCallback(() => {
      if (selectedChild) {
        loadPayments();
      }
    }, [selectedChild, loadPayments])
  );

  const isWithdrawal = (p: Payment) => p.payment_type === 'withdrawal';
  const totalIngresos = payments.filter((p) => !isWithdrawal(p)).reduce((sum, p) => sum + p.amount, 0);
  const totalRetiros = payments.filter(isWithdrawal).reduce((sum, p) => sum + p.amount, 0);
  const netHistorial = totalIngresos - totalRetiros;
  const pendingWd = withdrawals.find((w) => w.status === 'pending');
  const pendingWdCount = withdrawals.filter((w) => w.status === 'pending').length;
  const availableNow = availableBalance ?? selectedChild.balance;

  const submitWithdrawal = async () => {
    if (!selectedChild) return;
    const amount = parseFloat(wdAmount.replace(',', '.'));
    if (!amount || amount <= 0) {
      Alert.alert('Monto', 'Ingresa un monto válido');
      return;
    }
    if (!wdPurposeType) {
      Alert.alert('Reflexión', 'Elige si es una necesidad o un deseo.');
      return;
    }
    setWdSubmitting(true);
    try {
      await withdrawalsAPI.request(
        selectedChild.id,
        amount,
        wdNote.trim() || undefined,
        wdPurposeType,
        wdGoalImpact.trim() || undefined
      );
      setShowWithdrawModal(false);
      setWdAmount('');
      setWdNote('');
      setWdPurposeType('');
      setWdGoalImpact('');
      await loadPayments();
      Alert.alert('Enviado', 'Tu padre o tutor revisará la solicitud.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo enviar');
    } finally {
      setWdSubmitting(false);
    }
  };

  if (!selectedChild) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Historial de Pagos</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No hay hijo seleccionado</Text>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Historial de Pagos</Text>
        <Text style={styles.headerSubtitle}>Movimientos y retiros</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPayments();
            }}
          />
        }
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryBreakdown}>
            <Text style={styles.summaryBreakdownLine}>
              Ingresos: {family?.currency} {totalIngresos.toFixed(2)}
            </Text>
            {totalRetiros > 0 ? (
              <Text style={styles.summaryBreakdownDebit}>
                Retiros: −{family?.currency} {totalRetiros.toFixed(2)}
              </Text>
            ) : null}
          </View>
          <Text style={styles.summaryLabel}>Neto del historial</Text>
          <Text style={styles.summaryAmount}>
            {family?.currency} {netHistorial.toFixed(2)}
          </Text>
          <Text style={styles.summaryCount}>{payments.length} movimientos</Text>
          <Text style={styles.balanceHint}>
            Saldo actual: {family?.currency} {selectedChild.balance.toFixed(2)}
          </Text>
          <Text style={styles.balanceHint}>
            Disponible ahora: {family?.currency} {(availableBalance ?? selectedChild.balance).toFixed(2)}
          </Text>
          <Text style={styles.balanceHint}>
            En espera (24h): {family?.currency} {cooldownLocked.toFixed(2)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen semanal amigable</Text>
          <TouchableOpacity style={styles.reportLink} onPress={() => router.push('/(child)/report')}>
            <Text style={styles.reportLinkText}>Ver reporte completo (7/14/30 dias)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.withdrawSection}>
          {pendingWd ? (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingBannerText}>
                Tienes {pendingWdCount} solicitud(es) pendiente(s)
              </Text>
              <Text style={styles.pendingBannerSubtext}>
                Puedes enviar otra mientras tu padre/madre revisa.
              </Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={() => setShowWithdrawModal(true)}
          >
            <Text style={styles.withdrawBtnText}>Solicitar retiro de dinero</Text>
          </TouchableOpacity>
        </View>

        {withdrawals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>Mis solicitudes de retiro</Text>
              <View style={styles.sectionCountBadgeMuted}>
                <Text style={styles.sectionCountTextMuted}>{withdrawals.length}</Text>
              </View>
            </View>
            {withdrawals.map((w) => (
              <View key={w.id} style={styles.wdCard}>
                <View style={styles.wdTopRow}>
                  <Text style={styles.wdAmount}>
                    {family?.currency} {w.amount.toFixed(2)}
                  </Text>
                  <View style={styles.wdStatusBadge}>
                    <Text style={styles.wdStatus}>
                      {w.status === 'pending'
                        ? 'Pendiente'
                        : w.status === 'approved'
                          ? 'Aprobado'
                          : w.status}
                    </Text>
                  </View>
                </View>
                {w.purpose_type ? (
                  <Text style={styles.wdPurpose}>
                    {w.purpose_type === 'necesidad' ? 'Necesidad' : 'Deseo'}
                  </Text>
                ) : null}
                {w.goal_impact_note ? <Text style={styles.wdImpact}>{w.goal_impact_note}</Text> : null}
                <Text style={styles.wdDate}>
                  {new Date(w.created_at).toLocaleDateString('es-ES')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Payments List */}
        <View style={styles.section}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Pagos Recibidos</Text>
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCountText}>{payments.length}</Text>
            </View>
          </View>
          {payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyStateText}>Aún no tienes pagos</Text>
              <Text style={styles.emptyStateSubtext}>
                Completa tareas para recibir pagos
              </Text>
            </View>
          ) : (
            payments.map((payment) => {
              const wd = isWithdrawal(payment);
              return (
                <View key={payment.id} style={styles.paymentCard}>
                  <View
                    style={[
                      styles.paymentIcon,
                      wd ? styles.paymentIconDebit : styles.paymentIconCredit,
                    ]}
                  >
                    <Ionicons
                      name={wd ? 'arrow-down-circle' : 'checkmark-circle'}
                      size={24}
                      color={wd ? Colors.accent : Colors.success}
                    />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text
                      style={[styles.paymentTypeTag, wd && styles.paymentTypeTagDebit]}
                    >
                      {paymentTypeLabel(payment.payment_type)}
                    </Text>
                    <Text style={styles.paymentTitle}>{payment.chore_title}</Text>
                    {!wd &&
                    payment.savings_allocated != null &&
                    payment.savings_allocated > 0 ? (
                      <Text style={styles.savingsMini}>
                        +{family?.currency} {payment.savings_allocated.toFixed(2)} a tu ahorro
                      </Text>
                    ) : null}
                    {payment.purpose_note ? (
                      <Text style={styles.purposeMini}>{payment.purpose_note}</Text>
                    ) : null}
                    {payment.savings_reason_note ? (
                      <Text style={styles.purposeMini}>Motivo ahorro: {payment.savings_reason_note}</Text>
                    ) : null}
                    <Text style={styles.paymentDate}>
                      {new Date(payment.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.paymentAmountContainer}>
                    <Text style={[styles.paymentAmount, wd && styles.paymentAmountDebit]}>
                      {wd ? '−' : '+'}
                      {family?.currency} {payment.amount.toFixed(2)}
                    </Text>
                    <View
                      style={[styles.statusBadge, wd && styles.statusBadgeDebit]}
                    >
                      <Text
                        style={[styles.statusBadgeText, wd && styles.statusBadgeTextDebit]}
                      >
                        {payment.status === 'aprobado' ? 'Aprobado' : 'Pagado'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={showWithdrawModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Solicitar retiro</Text>
            <Text style={styles.modalSub}>
              Máximo disponible: {family?.currency}{' '}
              {availableNow.toFixed(2)}
            </Text>
            <View style={styles.quickPctRow}>
              {[10, 25, 50, 75, 100].map((pct) => (
                <TouchableOpacity
                  key={pct}
                  style={styles.quickPctChip}
                  onPress={() =>
                    setWdAmount(((availableNow * pct) / 100).toFixed(2))
                  }
                >
                  <Text style={styles.quickPctChipText}>{pct}%</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.quickPctHint}>
              Selección rápida según tu saldo disponible ahora.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Monto"
              placeholderTextColor={Colors.textLight}
              keyboardType="decimal-pad"
              value={wdAmount}
              onChangeText={setWdAmount}
            />
            <TextInput
              style={[styles.modalInput, { minHeight: 72 }]}
              placeholder="Nota (opcional)"
              placeholderTextColor={Colors.textLight}
              value={wdNote}
              onChangeText={setWdNote}
              multiline
            />
            <Text style={styles.reflectLabel}>¿Es necesidad o deseo?</Text>
            <View style={styles.reflectRow}>
              <TouchableOpacity
                style={[
                  styles.reflectOption,
                  wdPurposeType === 'necesidad' && styles.reflectOptionActive,
                ]}
                onPress={() => setWdPurposeType('necesidad')}
              >
                <Text
                  style={[
                    styles.reflectOptionText,
                    wdPurposeType === 'necesidad' && styles.reflectOptionTextActive,
                  ]}
                >
                  Necesidad
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reflectOption, wdPurposeType === 'deseo' && styles.reflectOptionActive]}
                onPress={() => setWdPurposeType('deseo')}
              >
                <Text
                  style={[
                    styles.reflectOptionText,
                    wdPurposeType === 'deseo' && styles.reflectOptionTextActive,
                  ]}
                >
                  Deseo
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalInput, { minHeight: 62 }]}
              placeholder="¿Cómo impacta tu meta de ahorro? (opcional)"
              placeholderTextColor={Colors.textLight}
              value={wdGoalImpact}
              onChangeText={setWdGoalImpact}
              multiline
            />
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowWithdrawModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOk, wdSubmitting && { opacity: 0.7 }]}
                onPress={submitWithdrawal}
                disabled={wdSubmitting}
              >
                {wdSubmitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalOkText}>Enviar</Text>
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
    padding: 20,
    paddingTop: 56,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.secondaryDark,
  },
  summaryBreakdown: {
    alignSelf: 'stretch',
    marginBottom: 12,
    gap: 4,
  },
  summaryBreakdownLine: {
    fontSize: 13,
    color: Colors.onSecondaryMuted,
    textAlign: 'center',
  },
  summaryBreakdownDebit: {
    fontSize: 13,
    color: Colors.onSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.onSecondaryMuted,
    opacity: 1,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.onSecondary,
    marginTop: 8,
  },
  summaryCount: {
    fontSize: 14,
    color: Colors.onSecondaryMuted,
    opacity: 1,
    marginTop: 8,
  },
  balanceHint: {
    fontSize: 13,
    color: Colors.onSecondaryMuted,
    marginTop: 10,
  },
  reportLink: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '12',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  reportLinkText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  withdrawSection: {
    marginBottom: 16,
  },
  withdrawBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  withdrawBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  pendingBanner: {
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pendingBannerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  pendingBannerSubtext: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 6,
  },
  wdCard: {
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wdTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  wdAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  wdStatusBadge: {
    backgroundColor: Colors.primary + '16',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  wdStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  wdDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  wdPurpose: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  wdImpact: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  quickPctRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  quickPctChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.primary + '12',
    borderWidth: 1,
    borderColor: Colors.primary + '2b',
  },
  quickPctChipText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  quickPctHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  reflectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  reflectRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  reflectOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  reflectOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '16',
  },
  reflectOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  reflectOptionTextActive: {
    color: Colors.primary,
  },
  modalCancel: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalOk: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  modalOkText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  paymentTypeTag: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  paymentTypeTagDebit: {
    color: Colors.accentDark,
  },
  purposeMini: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  savingsMini: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
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
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  paymentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentIconCredit: {
    backgroundColor: Colors.success + '20',
  },
  paymentIconDebit: {
    backgroundColor: Colors.accent + '18',
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  paymentDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  paymentAmountContainer: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
  },
  paymentAmountDebit: {
    color: Colors.accent,
  },
  statusBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  statusBadgeDebit: {
    backgroundColor: Colors.accent + '18',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.success,
  },
  statusBadgeTextDebit: {
    color: Colors.accentDark,
  },
});
