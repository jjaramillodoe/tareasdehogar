import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  Share,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import * as Clipboard from 'expo-clipboard';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { authAPI, familyAPI, paymentsAPI, childrenAPI, withdrawalsAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { countryLabel } from '../../src/constants/spanishLocales';
import { FamilyLocaleSection } from '../../src/components/FamilyLocaleSection';
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

interface Member {
  id: string;
  name: string;
  email: string;
  family_role: string;
}
type FamilyRole = 'owner' | 'admin' | 'parent';

interface Withdrawal {
  id: string;
  child_id: string;
  amount: number;
  status: string;
  note?: string | null;
  purpose_type?: 'necesidad' | 'deseo' | null;
  goal_impact_note?: string | null;
  parent_note?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

interface AuditRow {
  id: string;
  action: string;
  created_at: string;
  actor_user_id?: string | null;
  actor_child_id?: string | null;
}

interface RestorePreviewState {
  backup: Record<string, unknown>;
  family_matches: boolean;
  backup_counts: Record<string, number>;
  current_counts: Record<string, number>;
}

interface DiagnosticsData {
  server_time: string;
  api_status: string;
  db_status: string;
  family_id: string;
  last_backup_at?: string | null;
}

interface SessionRow {
  id: string;
  device_name: string;
  created_at?: string;
  last_seen_at?: string;
  is_current: boolean;
}

function paymentTypeLabel(t?: string) {
  switch (t) {
    case 'savings_streak_bonus':
      return 'Bono racha ahorro';
    case 'savings_match':
      return 'Match de ahorro';
    case 'goal_bonus':
      return 'Bono por meta';
    case 'withdrawal':
      return 'Retiro';
    case 'quality_bonus':
      return 'Bono calidad';
    case 'chore':
    default:
      return 'Tarea';
  }
}

function roleLabel(role?: string | null) {
  if (role === 'owner') return 'Administrador';
  return 'Padre / tutor';
}

interface Child {
  id: string;
  name: string;
  balance: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const { user, family, setFamily, logout } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [familyName, setFamilyName] = useState(family?.name || '');
  const [familyCountryCode, setFamilyCountryCode] = useState(family?.country_code ?? '');
  const [familyCurrency, setFamilyCurrency] = useState(family?.currency || 'MXN');
  const [saving, setSaving] = useState(false);
  const [matchPercent, setMatchPercent] = useState(String(family?.savings_match_percent ?? 0));
  const [matchWeeklyCap, setMatchWeeklyCap] = useState(String(family?.savings_match_weekly_cap ?? 0));
  const [familyChallengePercent, setFamilyChallengePercent] = useState(
    String(family?.family_challenge_target_percent ?? 15)
  );
  const [streakBonusAmount, setStreakBonusAmount] = useState(String(family?.streak_bonus_amount ?? 0));
  const [notificationsParentsEnabled, setNotificationsParentsEnabled] = useState(
    family?.notifications_enabled_for_parents ?? true
  );
  const [notificationsChildrenEnabled, setNotificationsChildrenEnabled] = useState(
    family?.notifications_enabled_for_children ?? true
  );
  const [quietHoursStart, setQuietHoursStart] = useState(
    family?.notifications_quiet_hours_start != null ? String(family.notifications_quiet_hours_start) : ''
  );
  const [quietHoursEnd, setQuietHoursEnd] = useState(
    family?.notifications_quiet_hours_end != null ? String(family.notifications_quiet_hours_end) : ''
  );
  const [quietPickerVisible, setQuietPickerVisible] = useState(false);
  const [quietPickerTarget, setQuietPickerTarget] = useState<'start' | 'end'>('start');
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState(
    String(family?.min_withdrawal_amount ?? 0)
  );
  const [maxWithdrawalAmount, setMaxWithdrawalAmount] = useState(
    String(family?.max_withdrawal_amount ?? 0)
  );
  const [maxDailyWithdrawalPerChild, setMaxDailyWithdrawalPerChild] = useState(
    String(family?.max_daily_withdrawal_per_child ?? 0)
  );
  const [demoModeEnabled, setDemoModeEnabled] = useState(family?.demo_mode_enabled ?? false);
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(
    String(family?.auto_logout_minutes ?? 0)
  );
  const [pinFailedAttemptLimit, setPinFailedAttemptLimit] = useState(
    String((family as any)?.pin_failed_attempt_limit ?? 5)
  );
  const [pinLockoutMinutes, setPinLockoutMinutes] = useState(
    String((family as any)?.pin_lockout_minutes ?? 15)
  );
  const [resetRoleMin, setResetRoleMin] = useState<FamilyRole>(
    (family?.permission_reset_activity_min_role as FamilyRole) ?? 'owner'
  );
  const [approveWithdrawalRoleMin, setApproveWithdrawalRoleMin] = useState<FamilyRole>(
    (family?.permission_approve_withdrawals_min_role as FamilyRole) ?? 'parent'
  );
  const [editGoalsRoleMin, setEditGoalsRoleMin] = useState<FamilyRole>(
    (family?.permission_edit_goals_min_role as FamilyRole) ?? 'parent'
  );
  const [members, setMembers] = useState<Member[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [purposeModal, setPurposeModal] = useState<{ paymentId: string; note: string } | null>(null);
  const [savingPurpose, setSavingPurpose] = useState(false);
  const [withdrawApprove, setWithdrawApprove] = useState<{
    id: string;
    note: string;
    childName: string;
    amount: number;
    purposeType?: 'necesidad' | 'deseo' | null;
    goalImpactNote?: string | null;
  } | null>(null);
  const [resolvingWithdrawal, setResolvingWithdrawal] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [closingSessions, setClosingSessions] = useState(false);
  const [childPinModal, setChildPinModal] = useState<{
    childId: string;
    newPin: string;
    confirmPin: string;
  } | null>(null);
  const [changingChildPin, setChangingChildPin] = useState(false);
  const [bulkApproveModal, setBulkApproveModal] = useState<{ maxAmount: string; note: string } | null>(
    null
  );
  const [bulkApproving, setBulkApproving] = useState(false);
  const [resettingActivity, setResettingActivity] = useState(false);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [restorePreview, setRestorePreview] = useState<RestorePreviewState | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [runningDemoSeed, setRunningDemoSeed] = useState(false);
  const [runningDemoClear, setRunningDemoClear] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [paymentsData, childrenData, membersData, withdrawalsData, auditData, diagnosticsData, sessionsData] =
        await Promise.all([
        paymentsAPI.getAll().catch(() => []),
        childrenAPI.getAll().catch(() => []),
        familyAPI.getMembers().catch(() => []),
        withdrawalsAPI.list().catch(() => []),
        familyAPI.getAuditLog(15).catch(() => []),
        familyAPI.diagnostics().catch(() => null),
        authAPI.getSessions().catch(() => []),
      ]);
      setPayments(paymentsData);
      setChildren(childrenData);
      setMembers(membersData);
      setWithdrawals(withdrawalsData);
      setAuditRows(auditData);
      setDiagnostics(diagnosticsData);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (family) {
        loadData();
        setFamilyName(family.name);
        setFamilyCountryCode(family.country_code ?? '');
        setFamilyCurrency(family.currency);
        setMatchPercent(String(family.savings_match_percent ?? 0));
        setMatchWeeklyCap(String(family.savings_match_weekly_cap ?? 0));
        setFamilyChallengePercent(String(family.family_challenge_target_percent ?? 15));
        setStreakBonusAmount(String(family.streak_bonus_amount ?? 0));
        setNotificationsParentsEnabled(family.notifications_enabled_for_parents ?? true);
        setNotificationsChildrenEnabled(family.notifications_enabled_for_children ?? true);
        setQuietHoursStart(
          family.notifications_quiet_hours_start != null
            ? String(family.notifications_quiet_hours_start)
            : ''
        );
        setQuietHoursEnd(
          family.notifications_quiet_hours_end != null
            ? String(family.notifications_quiet_hours_end)
            : ''
        );
        setMinWithdrawalAmount(String(family.min_withdrawal_amount ?? 0));
        setMaxWithdrawalAmount(String(family.max_withdrawal_amount ?? 0));
        setMaxDailyWithdrawalPerChild(String(family.max_daily_withdrawal_per_child ?? 0));
        setDemoModeEnabled(family.demo_mode_enabled ?? false);
        setAutoLogoutMinutes(String(family.auto_logout_minutes ?? 0));
        setPinFailedAttemptLimit(String((family as any).pin_failed_attempt_limit ?? 5));
        setPinLockoutMinutes(String((family as any).pin_lockout_minutes ?? 15));
        setResetRoleMin((family.permission_reset_activity_min_role as FamilyRole) ?? 'owner');
        setApproveWithdrawalRoleMin(
          (family.permission_approve_withdrawals_min_role as FamilyRole) ?? 'parent'
        );
        setEditGoalsRoleMin((family.permission_edit_goals_min_role as FamilyRole) ?? 'parent');
      }
    }, [family])
  );

  const handleUpdateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Error', 'El nombre de la familia es requerido');
      return;
    }

    setSaving(true);
    try {
      const parsedMatchPercent = Number(matchPercent.replace(',', '.'));
      const parsedMatchWeeklyCap = Number(matchWeeklyCap.replace(',', '.'));
      const parsedFamilyChallengePercent = Number(familyChallengePercent.replace(',', '.'));
      const parsedStreakBonusAmount = Number(streakBonusAmount.replace(',', '.'));
      const parsedMinWithdrawal = Number(minWithdrawalAmount.replace(',', '.'));
      const parsedMaxWithdrawal = Number(maxWithdrawalAmount.replace(',', '.'));
      const parsedMaxDaily = Number(maxDailyWithdrawalPerChild.replace(',', '.'));
      const parsedAutoLogout = Number(autoLogoutMinutes.replace(',', '.'));
      const parsedPinFailedLimit = Number(pinFailedAttemptLimit.replace(',', '.'));
      const parsedPinLockoutMinutes = Number(pinLockoutMinutes.replace(',', '.'));
      const parsedQuietStart = quietHoursStart.trim() === '' ? null : Number(quietHoursStart);
      const parsedQuietEnd = quietHoursEnd.trim() === '' ? null : Number(quietHoursEnd);
      if (
        Number.isNaN(parsedMatchPercent) ||
        parsedMatchPercent < 0 ||
        parsedMatchPercent > 100 ||
        Number.isNaN(parsedMatchWeeklyCap) ||
        parsedMatchWeeklyCap < 0 ||
        Number.isNaN(parsedFamilyChallengePercent) ||
        parsedFamilyChallengePercent < 0 ||
        parsedFamilyChallengePercent > 100 ||
        Number.isNaN(parsedStreakBonusAmount) ||
        parsedStreakBonusAmount < 0 ||
        Number.isNaN(parsedMinWithdrawal) ||
        parsedMinWithdrawal < 0 ||
        Number.isNaN(parsedMaxWithdrawal) ||
        parsedMaxWithdrawal < 0 ||
        Number.isNaN(parsedMaxDaily) ||
        parsedMaxDaily < 0 ||
        Number.isNaN(parsedAutoLogout) ||
        parsedAutoLogout < 0 ||
        parsedAutoLogout > 1440 ||
        Number.isNaN(parsedPinFailedLimit) ||
        parsedPinFailedLimit < 3 ||
        parsedPinFailedLimit > 10 ||
        Number.isNaN(parsedPinLockoutMinutes) ||
        parsedPinLockoutMinutes < 1 ||
        parsedPinLockoutMinutes > 120 ||
        (parsedQuietStart != null &&
          (Number.isNaN(parsedQuietStart) || parsedQuietStart < 0 || parsedQuietStart > 23)) ||
        (parsedQuietEnd != null &&
          (Number.isNaN(parsedQuietEnd) || parsedQuietEnd < 0 || parsedQuietEnd > 23))
      ) {
        Alert.alert('Error', 'Revisa los campos de configuración');
        setSaving(false);
        return;
      }
      const updated = await familyAPI.update({
        name: familyName.trim(),
        currency: familyCurrency,
        ...(familyCountryCode ? { country_code: familyCountryCode } : {}),
        savings_match_percent: parsedMatchPercent,
        savings_match_weekly_cap: parsedMatchWeeklyCap,
        family_challenge_target_percent: parsedFamilyChallengePercent,
        streak_bonus_amount: parsedStreakBonusAmount,
        notifications_enabled_for_parents: notificationsParentsEnabled,
        notifications_enabled_for_children: notificationsChildrenEnabled,
        ...(parsedQuietStart != null ? { notifications_quiet_hours_start: parsedQuietStart } : {}),
        ...(parsedQuietEnd != null ? { notifications_quiet_hours_end: parsedQuietEnd } : {}),
        min_withdrawal_amount: parsedMinWithdrawal,
        max_withdrawal_amount: parsedMaxWithdrawal,
        max_daily_withdrawal_per_child: parsedMaxDaily,
        demo_mode_enabled: demoModeEnabled,
        auto_logout_minutes: parsedAutoLogout,
        pin_failed_attempt_limit: parsedPinFailedLimit,
        pin_lockout_minutes: parsedPinLockoutMinutes,
        permission_reset_activity_min_role: resetRoleMin,
        permission_approve_withdrawals_min_role: approveWithdrawalRoleMin,
        permission_edit_goals_min_role: editGoalsRoleMin,
      });
      setFamily(updated);
      setShowEditModal(false);
      Alert.alert('Éxito', 'Familia actualizada correctamente');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al actualizar';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión',
        onPress: () => {
          logout();
          router.replace('/');
        },
      },
    ]);
  };

  const getChildName = (childId: string) => {
    return children.find((c) => c.id === childId)?.name || 'Desconocido';
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const handleCreateInvite = async () => {
    setInviteLoading(true);
    try {
      const res = await familyAPI.createInvite();
      const expires = new Date(res.expires_at).toLocaleString('es-ES');
      const inviteMessage =
        `Te invito a HabitApp para gestionar tareas y ahorro en familia.\n\n` +
        `Código de invitación: ${res.code}\n` +
        `Válido hasta: ${expires}\n\n` +
        `Únete desde la app y usa este código al registrarte.`;
      Alert.alert('Compartir invitación', '¿Cómo quieres enviar la invitación?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Copiar código',
          onPress: async () => {
            await Clipboard.setStringAsync(res.code);
            Alert.alert('Listo', 'Código copiado al portapapeles.');
          },
        },
        {
          text: 'Compartir',
          onPress: async () => {
            try {
              await Share.share({
                message: inviteMessage,
                title: 'Invitación a HabitApp',
              });
            } catch {
              await Clipboard.setStringAsync(res.code);
              Alert.alert('Listo', 'No se pudo abrir compartir. Código copiado al portapapeles.');
            }
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo crear el código');
    } finally {
      setInviteLoading(false);
    }
  };

  const savePurpose = async () => {
    if (!purposeModal) return;
    setSavingPurpose(true);
    try {
      const updated = await paymentsAPI.updatePurpose(purposeModal.paymentId, purposeModal.note);
      setPayments((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
      setPurposeModal(null);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo guardar');
    } finally {
      setSavingPurpose(false);
    }
  };

  const confirmApproveWithdrawal = async () => {
    if (!withdrawApprove) return;
    setResolvingWithdrawal(true);
    try {
      await withdrawalsAPI.approve(withdrawApprove.id, withdrawApprove.note.trim() || undefined);
      const list = await withdrawalsAPI.list();
      setWithdrawals(list);
      const pay = await paymentsAPI.getAll();
      setPayments(pay);
      setWithdrawApprove(null);
      Alert.alert('Listo', 'Retiro aprobado y registrado.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo aprobar');
    } finally {
      setResolvingWithdrawal(false);
    }
  };

  const rejectWithdrawal = (id: string) => {
    Alert.alert('Rechazar retiro', '¿Confirmas rechazar esta solicitud?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar',
        style: 'destructive',
        onPress: async () => {
          try {
            await withdrawalsAPI.reject(id);
            setWithdrawals(await withdrawalsAPI.list());
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.detail || 'No se pudo rechazar');
          }
        },
      },
    ]);
  };

  const submitChangePassword = async () => {
    if (!passwordModal) return;
    if (!passwordModal.currentPassword || !passwordModal.newPassword) {
      Alert.alert('Error', 'Completa los campos de contraseña');
      return;
    }
    if (passwordModal.newPassword.length < 4) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 4 caracteres');
      return;
    }
    if (passwordModal.newPassword !== passwordModal.confirmPassword) {
      Alert.alert('Error', 'La confirmación no coincide');
      return;
    }
    setChangingPassword(true);
    try {
      await authAPI.changePassword(passwordModal.currentPassword, passwordModal.newPassword);
      setPasswordModal(null);
      Alert.alert('Listo', 'Tu contraseña fue actualizada.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo cambiar la contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  const closeAllSessions = () => {
    if (closingSessions) return;
    Alert.alert(
      'Cerrar todas las sesiones',
      'Esto cerrará tu sesión en todos los dispositivos. Tendrás que iniciar sesión otra vez.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesiones',
          style: 'destructive',
          onPress: async () => {
            setClosingSessions(true);
            try {
              await authAPI.logoutAllSessions();
              await logout();
              router.replace('/');
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.detail || 'No se pudo cerrar sesiones');
            } finally {
              setClosingSessions(false);
            }
          },
        },
      ]
    );
  };

  const revokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await authAPI.revokeSession(sessionId);
      await loadData();
      Alert.alert('Listo', 'Sesión cerrada');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo cerrar la sesión');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const submitChangeChildPin = async () => {
    if (!childPinModal) return;
    if (!childPinModal.childId) {
      Alert.alert('Error', 'Selecciona un hijo');
      return;
    }
    if (!childPinModal.newPin) {
      Alert.alert('Error', 'Ingresa el nuevo PIN');
      return;
    }
    if (childPinModal.newPin.length < 4) {
      Alert.alert('Error', 'El PIN debe tener al menos 4 caracteres');
      return;
    }
    if (childPinModal.newPin !== childPinModal.confirmPin) {
      Alert.alert('Error', 'La confirmación del PIN no coincide');
      return;
    }
    setChangingChildPin(true);
    try {
      await authAPI.changeChildPin({
        child_id: childPinModal.childId,
        new_pin: childPinModal.newPin,
      });
      setChildPinModal(null);
      Alert.alert('Listo', 'PIN del hijo actualizado.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo cambiar el PIN');
    } finally {
      setChangingChildPin(false);
    }
  };

  const confirmBulkApproveSmall = async () => {
    if (!bulkApproveModal) return;
    const parsedMax = Number(bulkApproveModal.maxAmount.replace(',', '.'));
    if (Number.isNaN(parsedMax) || parsedMax <= 0) {
      Alert.alert('Error', 'Ingresa un monto máximo válido');
      return;
    }
    setBulkApproving(true);
    try {
      const res = await withdrawalsAPI.approveSmallBulk(parsedMax, bulkApproveModal.note.trim() || undefined);
      setWithdrawals(await withdrawalsAPI.list());
      setPayments(await paymentsAPI.getAll());
      setBulkApproveModal(null);
      Alert.alert(
        'Listo',
        `Aprobadas: ${res.approved_count}\nOmitidas: ${res.skipped_count}\nTotal: ${family?.currency} ${Number(res.total_amount || 0).toFixed(2)}`
      );
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo aprobar en lote');
    } finally {
      setBulkApproving(false);
    }
  };

  const confirmResetActivity = () => {
    if (resettingActivity) return;
    Alert.alert(
      'Resetear datos de actividad',
      'Esto borrará Tareas, Metas, Logros, Alertas y movimientos relacionados de toda la familia. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmación final',
              '¿Seguro que quieres resetear todos los datos de actividad ahora?',
              [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Sí, resetear',
                  style: 'destructive',
                  onPress: async () => {
                    setResettingActivity(true);
                    try {
                      const res = await familyAPI.resetActivity();
                      await loadData();
                      const deleted = res?.deleted ?? {};
                      const total = Object.values(deleted).reduce(
                        (sum, n) => sum + Number(n || 0),
                        0
                      );
                      Alert.alert('Listo', `Se resetearon los datos de actividad.\nRegistros eliminados: ${total}`);
                    } catch (e: any) {
                      Alert.alert('Error', e.response?.data?.detail || 'No se pudo resetear');
                    } finally {
                      setResettingActivity(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const runPartialReset = () => {
    Alert.alert(
      'Reset parcial',
      'Borra Tareas, Metas, Logros y Alertas, manteniendo saldos de hijos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aplicar',
          style: 'destructive',
          onPress: async () => {
            setResettingActivity(true);
            try {
              await familyAPI.partialResetActivity({
                chores: true,
                goals: true,
                savings_goals: true,
                achievements: true,
                notifications: true,
                payments: true,
                withdrawals: true,
                family_challenge_history: true,
                reset_children_balance_and_streaks: false,
              });
              await loadData();
              Alert.alert('Listo', 'Reset parcial aplicado.');
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.detail || 'No se pudo aplicar reset parcial');
            } finally {
              setResettingActivity(false);
            }
          },
        },
      ]
    );
  };

  const exportActivityBackup = async () => {
    if (exportingBackup) return;
    setExportingBackup(true);
    try {
      const backup = await familyAPI.exportActivityBackup();
      const json = JSON.stringify(backup, null, 2);
      const counts = backup.counts ?? {};
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const familySafe = String(family?.name || 'familia')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-');
      const filename = `habitapp-backup-${familySafe}-${stamp}.json`;
      const baseDir = FileSystemLegacy.documentDirectory ?? FileSystemLegacy.cacheDirectory;
      const fileUri = `${baseDir}${filename}`;
      await FileSystemLegacy.writeAsStringAsync(fileUri, json, {
        encoding: FileSystemLegacy.EncodingType.UTF8,
      });
      const summary = `Respaldo listo (${new Date(backup.exported_at).toLocaleString('es-ES')})\n\n` +
        `Tareas: ${Number(counts.chores || 0)}\n` +
        `Metas: ${Number(counts.goals || 0)}\n` +
        `Metas ahorro: ${Number(counts.savings_goals || 0)}\n` +
        `Logros: ${Number(counts.achievements || 0)}\n` +
        `Alertas: ${Number(counts.notifications || 0)}\n\n` +
        `Archivo: ${filename}`;
      Alert.alert('Exportar respaldo', summary, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Copiar JSON',
          onPress: async () => {
            await Clipboard.setStringAsync(json);
            Alert.alert('Listo', 'Respaldo copiado al portapapeles.');
          },
        },
        {
          text: 'Compartir archivo',
          onPress: async () => {
            try {
              const canShareFile = await Sharing.isAvailableAsync();
              if (canShareFile) {
                await Sharing.shareAsync(fileUri, {
                  dialogTitle: 'Respaldo HabitApp',
                  mimeType: 'application/json',
                  UTI: 'public.json',
                });
              } else {
                await Share.share({
                  title: 'Respaldo HabitApp',
                  message: json,
                });
              }
            } catch {
              await Clipboard.setStringAsync(json);
              Alert.alert('Listo', 'No se pudo compartir. Respaldo copiado al portapapeles.');
            }
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo exportar el respaldo');
    } finally {
      setExportingBackup(false);
    }
  };

  const importActivityBackup = async () => {
    if (restoringBackup) return;
    setRestoringBackup(true);
    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (pick.canceled || !pick.assets?.length) {
        setRestoringBackup(false);
        return;
      }
      const file = pick.assets[0];
      const raw = await FileSystemLegacy.readAsStringAsync(file.uri, {
        encoding: FileSystemLegacy.EncodingType.UTF8,
      });
      const backup = JSON.parse(raw) as Record<string, unknown>;
      const preview = await familyAPI.restoreActivity(backup, false);
      setRestorePreview({
        backup,
        family_matches: !!preview.family_matches,
        backup_counts: preview.backup_counts ?? {},
        current_counts: preview.current_counts ?? {},
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo leer/restaurar el archivo');
    } finally {
      setRestoringBackup(false);
    }
  };

  const applyRestoreFromPreview = async () => {
    if (!restorePreview) return;
    try {
      setRestoringBackup(true);
      const applyRes = await familyAPI.restoreActivity(restorePreview.backup, true);
      setRestorePreview(null);
      await loadData();
      const ins = applyRes.inserted_counts ?? {};
      const total = Object.values(ins).reduce((s, n) => s + Number(n || 0), 0);
      Alert.alert('Listo', `Restauración aplicada. Registros restaurados: ${total}`);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo restaurar');
    } finally {
      setRestoringBackup(false);
    }
  };

  const refreshDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const d = await familyAPI.diagnostics();
      setDiagnostics(d);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo cargar diagnóstico');
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  const runDemoSeed = async () => {
    if (runningDemoSeed) return;
    setRunningDemoSeed(true);
    try {
      const res = await familyAPI.demoSeed();
      await loadData();
      Alert.alert('Listo', `Demo generada: ${JSON.stringify(res.created)}`);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo generar demo');
    } finally {
      setRunningDemoSeed(false);
    }
  };

  const runDemoClear = () => {
    Alert.alert('Limpiar demo', 'Esto eliminará actividad demo de la familia.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpiar',
        style: 'destructive',
        onPress: async () => {
          if (runningDemoClear) return;
          setRunningDemoClear(true);
          try {
            const res = await familyAPI.demoClear();
            await loadData();
            Alert.alert('Listo', `Demo limpiada: ${JSON.stringify(res.deleted)}`);
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.detail || 'No se pudo limpiar demo');
          } finally {
            setRunningDemoClear(false);
          }
        },
      },
    ]);
  };

  const onChangeMemberRole = async (memberId: string, role: 'admin' | 'parent') => {
    try {
      await familyAPI.updateMemberRole(memberId, role);
      await loadData();
      Alert.alert('Listo', 'Rol actualizado');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo actualizar el rol');
    }
  };

  const applyEcuadorRecommendedValues = () => {
    setFamilyCountryCode('EC');
    setFamilyCurrency('USD');
    setMatchPercent('10');
    setMatchWeeklyCap('5');
    setFamilyChallengePercent('15');
    setStreakBonusAmount('1');
    setMinWithdrawalAmount('1');
    setMaxWithdrawalAmount('20');
    setMaxDailyWithdrawalPerChild('20');
    setAutoLogoutMinutes('30');
    setPinFailedAttemptLimit('5');
    setPinLockoutMinutes('15');
    Alert.alert('Listo', 'Se cargaron valores recomendados para Ecuador. Puedes ajustarlos antes de guardar.');
  };

  const hourText = (value: string, placeholder: string) =>
    value !== '' ? `${String(value).padStart(2, '0')}:00` : placeholder;

  const toHourDate = (value: string) => {
    const d = new Date();
    const h = Number(value);
    d.setHours(Number.isFinite(h) ? h : 0, 0, 0, 0);
    return d;
  };

  const openQuietHourPicker = (target: 'start' | 'end') => {
    setQuietPickerTarget(target);
    setQuietPickerVisible(true);
  };

  const onQuietHourChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed' || !selectedDate) {
      setQuietPickerVisible(false);
      return;
    }
    const nextHour = String(selectedDate.getHours());
    if (quietPickerTarget === 'start') setQuietHoursStart(nextHour);
    else setQuietHoursEnd(nextHour);
    setQuietPickerVisible(false);
  };

  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending');
  const pendingCashNeeded = pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
          />
        }
      >
        {/* User Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Image source={require('../../assets/images/padres.png')} style={styles.avatarImage} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{roleLabel(user?.family_role)}</Text>
            </View>
          </View>
        </View>

        {/* Family Info */}
        {family && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Familia</Text>
              <TouchableOpacity onPress={() => setShowEditModal(true)}>
                <Ionicons name="pencil" size={20} color={Colors.primary} />
              </TouchableOpacity>
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
                {pendingWithdrawals.length > 0
                  ? `${pendingWithdrawals.length} retiro(s) pendientes por pagar`
                  : 'No hay retiros pendientes ahora'}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nombre</Text>
                <Text style={styles.infoValue}>{family.name}</Text>
              </View>
              {family.country_code ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>País o región</Text>
                  <Text style={styles.infoValue}>{countryLabel(family.country_code)}</Text>
                </View>
              ) : null}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Moneda</Text>
                <Text style={styles.infoValue}>{family.currency}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Match de ahorro</Text>
                <Text style={styles.infoValue}>
                  {Number((family as any).savings_match_percent ?? 0).toFixed(0)}%
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tope semanal de match</Text>
                <Text style={styles.infoValue}>
                  {family.currency} {Number((family as any).savings_match_weekly_cap ?? 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Reto familiar mensual</Text>
                <Text style={styles.infoValue}>
                  {Number((family as any).family_challenge_target_percent ?? 15).toFixed(0)}%
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bono racha (cada 4 semanas)</Text>
                <Text style={styles.infoValue}>
                  {family.currency} {Number((family as any).streak_bonus_amount ?? 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Retiro mínimo / máximo</Text>
                <Text style={styles.infoValue}>
                  {family.currency} {Number((family as any).min_withdrawal_amount ?? 0).toFixed(2)} /{' '}
                  {Number((family as any).max_withdrawal_amount ?? 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Máx diario por hijo</Text>
                <Text style={styles.infoValue}>
                  {family.currency} {Number((family as any).max_daily_withdrawal_per_child ?? 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Demo mode</Text>
                <Text style={styles.infoValue}>
                  {(family as any).demo_mode_enabled ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Auto logout</Text>
                <Text style={styles.infoValue}>
                  {Number((family as any).auto_logout_minutes ?? 0) > 0
                    ? `${Number((family as any).auto_logout_minutes ?? 0)} min`
                    : 'Desactivado'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bloqueo PIN por intentos</Text>
                <Text style={styles.infoValue}>
                  {(family as any).pin_failed_attempt_limit ?? 5} intentos /{' '}
                  {(family as any).pin_lockout_minutes ?? 15} min
                </Text>
              </View>
              {(family as { child_login_code?: string }).child_login_code ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Código para hijos</Text>
                  <Text style={[styles.infoValue, styles.codeValue]} selectable>
                    {(family as { child_login_code?: string }).child_login_code}
                  </Text>
                </View>
              ) : null}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hijos</Text>
                <Text style={styles.infoValue}>{children.length}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total pagado</Text>
                <Text style={[styles.infoValue, styles.totalPaid]}>
                  {family.currency} {totalPaid.toFixed(2)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.inviteButton}
              onPress={handleCreateInvite}
              disabled={inviteLoading}
            >
              {inviteLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color={Colors.white} />
                  <Text style={styles.inviteButtonText}>Invitar a otro padre o tutor</Text>
                </>
              )}
            </TouchableOpacity>

            {members.length > 0 && (
              <View style={styles.membersBlock}>
                <Text style={styles.membersTitle}>Padres y tutores</Text>
                {members.map((m) => (
                  <View key={m.id} style={styles.memberRow}>
                    <View>
                      <Text style={styles.memberName}>{m.name}</Text>
                      <Text style={styles.memberEmail}>{m.email}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      <Text style={styles.memberRole}>{roleLabel(m.family_role)}</Text>
                      {String(user?.family_role).toLowerCase() === 'owner' &&
                      m.id !== user?.id &&
                      String(m.family_role).toLowerCase() !== 'owner' ? (
                        <View style={styles.memberRoleActions}>
                          <TouchableOpacity
                            style={[
                              styles.roleMiniChip,
                              String(m.family_role).toLowerCase() === 'admin' && styles.roleMiniChipActive,
                            ]}
                            onPress={() => onChangeMemberRole(m.id, 'admin')}
                          >
                            <Text
                              style={[
                                styles.roleMiniChipText,
                                String(m.family_role).toLowerCase() === 'admin' &&
                                  styles.roleMiniChipTextActive,
                              ]}
                            >
                              Admin
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.roleMiniChip,
                              String(m.family_role).toLowerCase() === 'parent' && styles.roleMiniChipActive,
                            ]}
                            onPress={() => onChangeMemberRole(m.id, 'parent')}
                          >
                            <Text
                              style={[
                                styles.roleMiniChipText,
                                String(m.family_role).toLowerCase() === 'parent' &&
                                  styles.roleMiniChipTextActive,
                              ]}
                            >
                              Parent
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {family && pendingWithdrawals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Solicitudes de retiro</Text>
              <TouchableOpacity
                style={styles.bulkApproveBtn}
                onPress={() => setBulkApproveModal({ maxAmount: '5', note: '' })}
              >
                <Text style={styles.bulkApproveBtnText}>Aprobar peque. &lt; X</Text>
              </TouchableOpacity>
            </View>
            {pendingWithdrawals.map((w) => (
              <View key={w.id} style={styles.withdrawalCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentTitle}>
                    {getChildName(w.child_id)} · {family.currency} {w.amount.toFixed(2)}
                  </Text>
                  {w.note ? (
                    <Text style={styles.paymentChild}>{w.note}</Text>
                  ) : null}
                  {w.purpose_type ? (
                    <Text style={styles.withdrawMeta}>
                      Tipo: {w.purpose_type === 'necesidad' ? 'Necesidad' : 'Deseo'}
                    </Text>
                  ) : null}
                  {w.goal_impact_note ? (
                    <Text style={styles.withdrawGoalNote}>Meta: {w.goal_impact_note}</Text>
                  ) : null}
                  <Text style={styles.paymentDate}>
                    {new Date(w.created_at).toLocaleString('es-ES')}
                  </Text>
                </View>
                <View style={styles.withdrawalActions}>
                  <TouchableOpacity
                    style={styles.approveW}
                    onPress={() =>
                      setWithdrawApprove({
                        id: w.id,
                        note: '',
                        childName: getChildName(w.child_id),
                        amount: w.amount,
                        purposeType: w.purpose_type,
                        goalImpactNote: w.goal_impact_note,
                      })
                    }
                  >
                    <Text style={styles.approveWText}>Aprobar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => rejectWithdrawal(w.id)}>
                    <Text style={styles.rejectWText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Payments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pagos Recientes</Text>
          {payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aún no hay pagos realizados</Text>
            </View>
          ) : (
            payments.slice(0, 10).map((payment) => (
              <TouchableOpacity
                key={payment.id}
                style={styles.paymentCard}
                onPress={() =>
                  setPurposeModal({
                    paymentId: payment.id,
                    note: payment.purpose_note ?? '',
                  })
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.paymentIcon,
                    payment.payment_type === 'withdrawal' && styles.paymentIconWithdrawal,
                  ]}
                >
                  <Ionicons
                    name={payment.payment_type === 'withdrawal' ? 'arrow-down-circle' : 'cash'}
                    size={20}
                    color={
                      payment.payment_type === 'withdrawal' ? Colors.accent : Colors.secondary
                    }
                  />
                </View>
                <View style={styles.paymentInfo}>
                  <Text
                    style={[
                      styles.paymentTypeTag,
                      payment.payment_type === 'withdrawal' && styles.paymentTypeTagWithdrawal,
                    ]}
                  >
                    {paymentTypeLabel(payment.payment_type)}
                  </Text>
                  <Text style={styles.paymentTitle}>{payment.chore_title}</Text>
                  <Text style={styles.paymentChild}>
                    Para: {getChildName(payment.child_id)}
                  </Text>
                  {payment.payment_type !== 'withdrawal' &&
                  payment.savings_allocated != null &&
                  payment.savings_allocated > 0 ? (
                    <Text style={styles.savingsLine}>
                      Ahorro: {family?.currency} {payment.savings_allocated.toFixed(2)}
                    </Text>
                  ) : null}
                  {payment.purpose_note ? (
                    <Text style={styles.purposeNote} numberOfLines={2}>
                      Uso: {payment.purpose_note}
                    </Text>
                  ) : (
                    <Text style={styles.tapHint}>Toca para añadir nota de uso</Text>
                  )}
                  {payment.savings_reason_note ? (
                    <Text style={styles.purposeNote} numberOfLines={2}>
                      Motivo ahorro: {payment.savings_reason_note}
                    </Text>
                  ) : null}
                  <Text style={styles.paymentDate}>
                    {new Date(payment.created_at).toLocaleDateString('es-ES')}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.paymentAmount,
                    payment.payment_type === 'withdrawal' && styles.paymentAmountWithdrawal,
                  ]}
                >
                  {payment.payment_type === 'withdrawal' ? '−' : ''}
                  {family?.currency} {payment.amount.toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información legal</Text>
          <View style={styles.legalCard}>
            <TouchableOpacity
              style={styles.legalMenuItem}
              onPress={() => router.push('/(public)/how-it-works')}
            >
              <Ionicons name="book-outline" size={20} color={Colors.primary} />
              <Text style={styles.legalMenuText}>Cómo funciona la app</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.legalMenuItem}
              onPress={() => router.push('/(public)/privacy')}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
              <Text style={styles.legalMenuText}>Política de privacidad</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.legalMenuItem}
              onPress={() => router.push('/(public)/privacy-minors')}
            >
              <Ionicons name="people-outline" size={20} color={Colors.primary} />
              <Text style={styles.legalMenuText}>Privacidad y menores</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.legalMenuItem, styles.legalMenuItemLast]}
              onPress={() => router.push('/(public)/terms')}
            >
              <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
              <Text style={styles.legalMenuText}>Términos de uso</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguridad</Text>
          <View style={styles.legalCard}>
            <TouchableOpacity
              style={styles.legalMenuItem}
              onPress={() =>
                setPasswordModal({ currentPassword: '', newPassword: '', confirmPassword: '' })
              }
            >
              <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
              <Text style={styles.legalMenuText}>Cambiar mi contraseña</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.legalMenuItem}
              onPress={() =>
                setChildPinModal({
                  childId: children[0]?.id ?? '',
                  newPin: '',
                  confirmPin: '',
                })
              }
            >
              <Ionicons name="key-outline" size={20} color={Colors.primary} />
              <Text style={styles.legalMenuText}>Cambiar PIN de un hijo</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.legalMenuItem, styles.legalMenuItemLast]}
              onPress={closeAllSessions}
              disabled={closingSessions}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={styles.legalMenuText}>
                {closingSessions ? 'Cerrando sesiones...' : 'Cerrar todas las sesiones'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </TouchableOpacity>
            {sessions.length > 0 ? (
              <View style={styles.sessionsBlock}>
                <Text style={styles.sessionsTitle}>Sesiones activas</Text>
                {sessions.map((s) => (
                  <View key={s.id} style={styles.sessionRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.sessionName}>
                        {s.device_name} {s.is_current ? '(este dispositivo)' : ''}
                      </Text>
                      <Text style={styles.sessionMeta}>
                        Última actividad:{' '}
                        {s.last_seen_at ? new Date(s.last_seen_at).toLocaleString('es-ES') : 'Sin dato'}
                      </Text>
                    </View>
                    {!s.is_current ? (
                      <TouchableOpacity
                        style={styles.sessionCloseButton}
                        onPress={() => revokeSession(s.id)}
                        disabled={revokingSessionId === s.id}
                      >
                        {revokingSessionId === s.id ? (
                          <ActivityIndicator color={Colors.error} size="small" />
                        ) : (
                          <Text style={styles.sessionCloseButtonText}>Cerrar</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Administración</Text>
          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>Resetear datos de actividad</Text>
            <Text style={styles.dangerHint}>
              Borra en un paso: Tareas, Metas, Logros, Alertas y movimientos de actividad de la familia.
            </Text>
            <TouchableOpacity
              style={[styles.secondaryAdminButton, exportingBackup && styles.buttonDisabled]}
              onPress={exportActivityBackup}
              disabled={exportingBackup}
            >
              {exportingBackup ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={16} color={Colors.primary} />
                  <Text style={styles.secondaryAdminButtonText}>Exportar respaldo JSON</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryAdminButton, restoringBackup && styles.buttonDisabled]}
              onPress={importActivityBackup}
              disabled={restoringBackup}
            >
              {restoringBackup ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={16} color={Colors.primary} />
                  <Text style={styles.secondaryAdminButtonText}>Importar respaldo JSON</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryAdminButton, resettingActivity && styles.buttonDisabled]}
              onPress={runPartialReset}
              disabled={resettingActivity}
            >
              <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
              <Text style={styles.secondaryAdminButtonText}>Reset parcial</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryAdminButton, runningDemoSeed && styles.buttonDisabled]}
              onPress={runDemoSeed}
              disabled={runningDemoSeed}
            >
              {runningDemoSeed ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="flask-outline" size={16} color={Colors.primary} />
                  <Text style={styles.secondaryAdminButtonText}>Cargar demo</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryAdminButton, runningDemoClear && styles.buttonDisabled]}
              onPress={runDemoClear}
              disabled={runningDemoClear}
            >
              {runningDemoClear ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={16} color={Colors.primary} />
                  <Text style={styles.secondaryAdminButtonText}>Limpiar demo</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dangerButton, resettingActivity && styles.buttonDisabled]}
              onPress={confirmResetActivity}
              disabled={resettingActivity}
            >
              {resettingActivity ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color={Colors.white} />
                  <Text style={styles.dangerButtonText}>Resetear actividad</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Diagnóstico</Text>
            <TouchableOpacity onPress={refreshDiagnostics} disabled={loadingDiagnostics}>
              <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>API</Text>
              <Text style={styles.infoValue}>{diagnostics?.api_status ?? '...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>DB</Text>
              <Text style={styles.infoValue}>{diagnostics?.db_status ?? '...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Servidor</Text>
              <Text style={styles.infoValue}>
                {diagnostics?.server_time
                  ? new Date(diagnostics.server_time).toLocaleString('es-ES')
                  : '...'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Último respaldo</Text>
              <Text style={styles.infoValue}>
                {diagnostics?.last_backup_at
                  ? new Date(diagnostics.last_backup_at).toLocaleString('es-ES')
                  : 'Sin registro'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bitácora reciente</Text>
          <View style={styles.legalCard}>
            {auditRows.length === 0 ? (
              <Text style={{ padding: 14, color: Colors.textSecondary, fontSize: 13 }}>
                Sin eventos recientes.
              </Text>
            ) : (
              auditRows.slice(0, 8).map((row, idx) => (
                <View
                  key={row.id}
                  style={[
                    styles.legalMenuItem,
                    idx === Math.min(auditRows.length, 8) - 1 && styles.legalMenuItemLast,
                  ]}
                >
                  <Ionicons name="time-outline" size={18} color={Colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.legalMenuText}>{row.action.replaceAll('_', ' ')}</Text>
                    <Text style={styles.paymentDate}>
                      {new Date(row.created_at).toLocaleString('es-ES')}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Family Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator
              style={[
                styles.modalScroll,
                { maxHeight: Math.min(windowHeight * 0.74, 640) },
              ]}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.modalTitle}>Editar Familia</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre de la Familia</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nombre de la familia"
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
              <TouchableOpacity style={styles.recommendBtn} onPress={applyEcuadorRecommendedValues}>
                <Ionicons name="sparkles-outline" size={14} color={Colors.primary} />
                <Text style={styles.recommendBtnText}>Valores recomendados Ecuador</Text>
              </TouchableOpacity>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Match por ahorro (%)</Text>
                <Text style={styles.inputHint}>Ejemplo: 10% o 20% de match por ahorro semanal.</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 20"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                  value={matchPercent}
                  onChangeText={setMatchPercent}
                />
                <View style={styles.pickRow}>
                  {['0', '5', '10', '20'].map((v) => (
                    <TouchableOpacity
                      key={`match-${v}`}
                      style={[styles.pickChip, matchPercent === v && styles.pickChipActive]}
                      onPress={() => setMatchPercent(v)}
                    >
                      <Text style={[styles.pickChipText, matchPercent === v && styles.pickChipTextActive]}>
                        {v}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tope semanal por hijo</Text>
                <Text style={styles.inputHint}>Monto máximo del match en una semana.</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 50"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                  value={matchWeeklyCap}
                  onChangeText={setMatchWeeklyCap}
                />
                <View style={styles.pickRow}>
                  {['0', '5', '10', '20'].map((v) => (
                    <TouchableOpacity
                      key={`weekly-cap-${v}`}
                      style={[styles.pickChip, matchWeeklyCap === v && styles.pickChipActive]}
                      onPress={() => setMatchWeeklyCap(v)}
                    >
                      <Text
                        style={[styles.pickChipText, matchWeeklyCap === v && styles.pickChipTextActive]}
                      >
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reto familiar mensual (%)</Text>
                <Text style={styles.inputHint}>Meta de ahorro familiar por mes.</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 15"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                  value={familyChallengePercent}
                  onChangeText={setFamilyChallengePercent}
                />
                <View style={styles.pickRow}>
                  {['10', '15', '20', '25'].map((v) => (
                    <TouchableOpacity
                      key={`challenge-${v}`}
                      style={[styles.pickChip, familyChallengePercent === v && styles.pickChipActive]}
                      onPress={() => setFamilyChallengePercent(v)}
                    >
                      <Text
                        style={[
                          styles.pickChipText,
                          familyChallengePercent === v && styles.pickChipTextActive,
                        ]}
                      >
                        {v}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bono por racha (cada 4 semanas)</Text>
                <Text style={styles.inputHint}>Bono extra por constancia de ahorro.</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 5"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                  value={streakBonusAmount}
                  onChangeText={setStreakBonusAmount}
                />
                <View style={styles.pickRow}>
                  {['0', '1', '2', '5'].map((v) => (
                    <TouchableOpacity
                      key={`streak-${v}`}
                      style={[styles.pickChip, streakBonusAmount === v && styles.pickChipActive]}
                      onPress={() => setStreakBonusAmount(v)}
                    >
                      <Text
                        style={[styles.pickChipText, streakBonusAmount === v && styles.pickChipTextActive]}
                      >
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Retiro mínimo permitido</Text>
                <Text style={styles.inputHint}>Si pones 0, no habrá mínimo.</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 1"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                  value={minWithdrawalAmount}
                  onChangeText={setMinWithdrawalAmount}
                />
                <View style={styles.pickRow}>
                  {['0', '1', '2', '5'].map((v) => (
                    <TouchableOpacity
                      key={`min-w-${v}`}
                      style={[styles.pickChip, minWithdrawalAmount === v && styles.pickChipActive]}
                      onPress={() => setMinWithdrawalAmount(v)}
                    >
                      <Text
                        style={[styles.pickChipText, minWithdrawalAmount === v && styles.pickChipTextActive]}
                      >
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Retiro máximo permitido (0 = sin límite)</Text>
                <Text style={styles.inputHint}>Límite por solicitud de retiro.</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 20"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                  value={maxWithdrawalAmount}
                  onChangeText={setMaxWithdrawalAmount}
                />
                <View style={styles.pickRow}>
                  {['0', '10', '20', '30'].map((v) => (
                    <TouchableOpacity
                      key={`max-w-${v}`}
                      style={[styles.pickChip, maxWithdrawalAmount === v && styles.pickChipActive]}
                      onPress={() => setMaxWithdrawalAmount(v)}
                    >
                      <Text
                        style={[styles.pickChipText, maxWithdrawalAmount === v && styles.pickChipTextActive]}
                      >
                        {v === '0' ? 'Sin límite' : v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Máximo diario por hijo (0 = sin límite)</Text>
                <Text style={styles.inputHint}>Control total diario de retiros por hijo.</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 30"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                  value={maxDailyWithdrawalPerChild}
                  onChangeText={setMaxDailyWithdrawalPerChild}
                />
                <View style={styles.pickRow}>
                  {['0', '10', '20', '30'].map((v) => (
                    <TouchableOpacity
                      key={`daily-w-${v}`}
                      style={[styles.pickChip, maxDailyWithdrawalPerChild === v && styles.pickChipActive]}
                      onPress={() => setMaxDailyWithdrawalPerChild(v)}
                    >
                      <Text
                        style={[
                          styles.pickChipText,
                          maxDailyWithdrawalPerChild === v && styles.pickChipTextActive,
                        ]}
                      >
                        {v === '0' ? 'Sin límite' : v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Horas silenciosas alertas</Text>
                <Text style={styles.inputHint}>Selecciona hora de inicio y fin (solo hora).</Text>
                <View style={styles.inlineRow}>
                  <TouchableOpacity
                    style={[styles.textInput, styles.inlineInput, styles.timeFieldButton]}
                    onPress={() => openQuietHourPicker('start')}
                  >
                    <Text style={quietHoursStart !== '' ? styles.timeFieldValue : styles.timeFieldPlaceholder}>
                      {hourText(quietHoursStart, 'Inicio')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.textInput, styles.inlineInput, styles.timeFieldButton]}
                    onPress={() => openQuietHourPicker('end')}
                  >
                    <Text style={quietHoursEnd !== '' ? styles.timeFieldValue : styles.timeFieldPlaceholder}>
                      {hourText(quietHoursEnd, 'Fin')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.pickRow}>
                  {[
                    { id: 'night', label: '22:00-06:00', start: '22', end: '6' },
                    { id: 'late', label: '23:00-07:00', start: '23', end: '7' },
                    { id: 'school', label: '21:00-06:00', start: '21', end: '6' },
                    { id: 'off', label: 'Sin horario', start: '', end: '' },
                  ].map((preset) => {
                    const isActive = quietHoursStart === preset.start && quietHoursEnd === preset.end;
                    return (
                      <TouchableOpacity
                        key={preset.id}
                        style={[styles.pickChip, isActive && styles.pickChipActive]}
                        onPress={() => {
                          setQuietHoursStart(preset.start);
                          setQuietHoursEnd(preset.end);
                        }}
                      >
                        <Text style={[styles.pickChipText, isActive && styles.pickChipTextActive]}>
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {quietPickerVisible ? (
                <DateTimePicker
                  value={toHourDate(quietPickerTarget === 'start' ? quietHoursStart : quietHoursEnd)}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onQuietHourChange}
                />
              ) : null}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Alertas para padres</Text>
                <View style={styles.booleanRow}>
                  <TouchableOpacity
                    style={[styles.booleanChip, notificationsParentsEnabled && styles.booleanChipOn]}
                    onPress={() => setNotificationsParentsEnabled(true)}
                  >
                    <Text
                      style={[styles.booleanChipText, notificationsParentsEnabled && styles.booleanChipTextOn]}
                    >
                      Activas
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.booleanChip, !notificationsParentsEnabled && styles.booleanChipOn]}
                    onPress={() => setNotificationsParentsEnabled(false)}
                  >
                    <Text
                      style={[styles.booleanChipText, !notificationsParentsEnabled && styles.booleanChipTextOn]}
                    >
                      Silenciadas
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Alertas para hijos</Text>
                <View style={styles.booleanRow}>
                  <TouchableOpacity
                    style={[styles.booleanChip, notificationsChildrenEnabled && styles.booleanChipOn]}
                    onPress={() => setNotificationsChildrenEnabled(true)}
                  >
                    <Text
                      style={[styles.booleanChipText, notificationsChildrenEnabled && styles.booleanChipTextOn]}
                    >
                      Activas
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.booleanChip, !notificationsChildrenEnabled && styles.booleanChipOn]}
                    onPress={() => setNotificationsChildrenEnabled(false)}
                  >
                    <Text
                      style={[styles.booleanChipText, !notificationsChildrenEnabled && styles.booleanChipTextOn]}
                    >
                      Silenciadas
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Demo mode</Text>
                <View style={styles.booleanRow}>
                  <TouchableOpacity
                    style={[styles.booleanChip, demoModeEnabled && styles.booleanChipOn]}
                    onPress={() => setDemoModeEnabled(true)}
                  >
                    <Text style={[styles.booleanChipText, demoModeEnabled && styles.booleanChipTextOn]}>
                      Activo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.booleanChip, !demoModeEnabled && styles.booleanChipOn]}
                    onPress={() => setDemoModeEnabled(false)}
                  >
                    <Text style={[styles.booleanChipText, !demoModeEnabled && styles.booleanChipTextOn]}>
                      Inactivo
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Auto logout (minutos, 0=off)</Text>
                <View style={styles.booleanRow}>
                  {[0, 15, 30, 60].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.booleanChip, Number(autoLogoutMinutes) === n && styles.booleanChipOn]}
                      onPress={() => setAutoLogoutMinutes(String(n))}
                    >
                      <Text
                        style={[
                          styles.booleanChipText,
                          Number(autoLogoutMinutes) === n && styles.booleanChipTextOn,
                        ]}
                      >
                        {n === 0 ? 'Off' : `${n}m`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.textInput, { marginTop: 8 }]}
                  placeholder="Ej. 20"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="number-pad"
                  value={autoLogoutMinutes}
                  onChangeText={setAutoLogoutMinutes}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Máximo intentos PIN fallidos (3-10)</Text>
                <Text style={styles.inputHint}>Después se bloquea temporalmente.</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 5"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="number-pad"
                  value={pinFailedAttemptLimit}
                  onChangeText={setPinFailedAttemptLimit}
                />
                <View style={styles.pickRow}>
                  {['3', '5', '7', '10'].map((v) => (
                    <TouchableOpacity
                      key={`pin-limit-${v}`}
                      style={[styles.pickChip, pinFailedAttemptLimit === v && styles.pickChipActive]}
                      onPress={() => setPinFailedAttemptLimit(v)}
                    >
                      <Text
                        style={[styles.pickChipText, pinFailedAttemptLimit === v && styles.pickChipTextActive]}
                      >
                        {v} intentos
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bloqueo PIN (minutos, 1-120)</Text>
                <Text style={styles.inputHint}>Tiempo de bloqueo tras superar intentos.</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 15"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="number-pad"
                  value={pinLockoutMinutes}
                  onChangeText={setPinLockoutMinutes}
                />
                <View style={styles.pickRow}>
                  {['5', '15', '30', '60'].map((v) => (
                    <TouchableOpacity
                      key={`pin-lock-${v}`}
                      style={[styles.pickChip, pinLockoutMinutes === v && styles.pickChipActive]}
                      onPress={() => setPinLockoutMinutes(v)}
                    >
                      <Text
                        style={[styles.pickChipText, pinLockoutMinutes === v && styles.pickChipTextActive]}
                      >
                        {v} min
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Permiso mínimo para resetear actividad</Text>
                <View style={styles.pickRow}>
                  {(['owner', 'admin', 'parent'] as FamilyRole[]).map((r) => (
                    <TouchableOpacity
                      key={`reset-${r}`}
                      style={[styles.pickChip, resetRoleMin === r && styles.pickChipActive]}
                      onPress={() => setResetRoleMin(r)}
                    >
                      <Text style={[styles.pickChipText, resetRoleMin === r && styles.pickChipTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Permiso mínimo para aprobar retiros</Text>
                <View style={styles.pickRow}>
                  {(['owner', 'admin', 'parent'] as FamilyRole[]).map((r) => (
                    <TouchableOpacity
                      key={`withdraw-${r}`}
                      style={[styles.pickChip, approveWithdrawalRoleMin === r && styles.pickChipActive]}
                      onPress={() => setApproveWithdrawalRoleMin(r)}
                    >
                      <Text
                        style={[
                          styles.pickChipText,
                          approveWithdrawalRoleMin === r && styles.pickChipTextActive,
                        ]}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Permiso mínimo para editar metas</Text>
                <View style={styles.pickRow}>
                  {(['owner', 'admin', 'parent'] as FamilyRole[]).map((r) => (
                    <TouchableOpacity
                      key={`goals-${r}`}
                      style={[styles.pickChip, editGoalsRoleMin === r && styles.pickChipActive]}
                      onPress={() => setEditGoalsRoleMin(r)}
                    >
                      <Text style={[styles.pickChipText, editGoalsRoleMin === r && styles.pickChipTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleUpdateFamily}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!purposeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setPurposeModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nota de uso del dinero</Text>
            <Text style={styles.modalHint}>
              Opcional: para qué usaron o usarán este dinero (aprende hábitos financieros).
            </Text>
            <TextInput
              style={[styles.textInput, { minHeight: 100 }]}
              placeholder="Ej.: guardé para un videojuego"
              placeholderTextColor={Colors.textLight}
              value={purposeModal?.note ?? ''}
              onChangeText={(note) => purposeModal && setPurposeModal({ ...purposeModal, note })}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setPurposeModal(null)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, savingPurpose && styles.buttonDisabled]}
                onPress={savePurpose}
                disabled={savingPurpose}
              >
                {savingPurpose ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!withdrawApprove}
        animationType="slide"
        transparent
        onRequestClose={() => setWithdrawApprove(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Aprobar retiro</Text>
            {withdrawApprove ? (
              <View style={styles.withdrawSummaryBox}>
                <Text style={styles.withdrawSummaryMain}>
                  {withdrawApprove.childName} · {family?.currency} {withdrawApprove.amount.toFixed(2)}
                </Text>
                {withdrawApprove.purposeType ? (
                  <Text style={styles.withdrawSummaryMeta}>
                    Tipo: {withdrawApprove.purposeType === 'necesidad' ? 'Necesidad' : 'Deseo'}
                  </Text>
                ) : null}
                {withdrawApprove.goalImpactNote ? (
                  <Text style={styles.withdrawSummaryMeta}>Meta: {withdrawApprove.goalImpactNote}</Text>
                ) : null}
              </View>
            ) : null}
            <Text style={styles.modalHint}>Nota interna (opcional) sobre el pago en efectivo.</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej.: pagado en efectivo el sábado"
              placeholderTextColor={Colors.textLight}
              value={withdrawApprove?.note ?? ''}
              onChangeText={(note) =>
                withdrawApprove && setWithdrawApprove({ ...withdrawApprove, note })
              }
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setWithdrawApprove(null)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, resolvingWithdrawal && styles.buttonDisabled]}
                onPress={confirmApproveWithdrawal}
                disabled={resolvingWithdrawal}
              >
                {resolvingWithdrawal ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Confirmar pago</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!bulkApproveModal}
        animationType="slide"
        transparent
        onRequestClose={() => setBulkApproveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Aprobar retiros pequeños</Text>
            <Text style={styles.modalHint}>
              Se aprobarán todos los pendientes con monto menor o igual a este valor.
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Monto máximo (X)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. 5"
                placeholderTextColor={Colors.textLight}
                keyboardType="decimal-pad"
                value={bulkApproveModal?.maxAmount ?? ''}
                onChangeText={(maxAmount) =>
                  bulkApproveModal && setBulkApproveModal({ ...bulkApproveModal, maxAmount })
                }
              />
              <View style={styles.quickMaxRow}>
                {[2, 5, 10].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.quickMaxChip,
                      Number((bulkApproveModal?.maxAmount ?? '').replace(',', '.')) === v &&
                        styles.quickMaxChipActive,
                    ]}
                    onPress={() =>
                      bulkApproveModal &&
                      setBulkApproveModal({ ...bulkApproveModal, maxAmount: String(v) })
                    }
                  >
                    <Text
                      style={[
                        styles.quickMaxChipText,
                        Number((bulkApproveModal?.maxAmount ?? '').replace(',', '.')) === v &&
                          styles.quickMaxChipTextActive,
                      ]}
                    >
                      {'<= '}
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nota interna (opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej.: pago en efectivo hoy"
                placeholderTextColor={Colors.textLight}
                value={bulkApproveModal?.note ?? ''}
                onChangeText={(note) =>
                  bulkApproveModal && setBulkApproveModal({ ...bulkApproveModal, note })
                }
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setBulkApproveModal(null)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, bulkApproving && styles.buttonDisabled]}
                onPress={confirmBulkApproveSmall}
                disabled={bulkApproving}
              >
                {bulkApproving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Aprobar lote</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!passwordModal}
        animationType="slide"
        transparent
        onRequestClose={() => setPasswordModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar contraseña</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña actual</Text>
              <TextInput
                style={styles.textInput}
                secureTextEntry
                value={passwordModal?.currentPassword ?? ''}
                onChangeText={(currentPassword) =>
                  passwordModal && setPasswordModal({ ...passwordModal, currentPassword })
                }
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nueva contraseña</Text>
              <TextInput
                style={styles.textInput}
                secureTextEntry
                value={passwordModal?.newPassword ?? ''}
                onChangeText={(newPassword) =>
                  passwordModal && setPasswordModal({ ...passwordModal, newPassword })
                }
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmar nueva contraseña</Text>
              <TextInput
                style={styles.textInput}
                secureTextEntry
                value={passwordModal?.confirmPassword ?? ''}
                onChangeText={(confirmPassword) =>
                  passwordModal && setPasswordModal({ ...passwordModal, confirmPassword })
                }
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setPasswordModal(null)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, changingPassword && styles.buttonDisabled]}
                disabled={changingPassword}
                onPress={submitChangePassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!childPinModal}
        animationType="slide"
        transparent
        onRequestClose={() => setChildPinModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar PIN de hijo</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hijo</Text>
              <View style={styles.pickRow}>
                {children.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.pickChip, childPinModal?.childId === c.id && styles.pickChipActive]}
                    onPress={() => childPinModal && setChildPinModal({ ...childPinModal, childId: c.id })}
                  >
                    <Text
                      style={[
                        styles.pickChipText,
                        childPinModal?.childId === c.id && styles.pickChipTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nuevo PIN</Text>
              <TextInput
                style={styles.textInput}
                value={childPinModal?.newPin ?? ''}
                onChangeText={(newPin) => childPinModal && setChildPinModal({ ...childPinModal, newPin })}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={12}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmar PIN</Text>
              <TextInput
                style={styles.textInput}
                value={childPinModal?.confirmPin ?? ''}
                onChangeText={(confirmPin) =>
                  childPinModal && setChildPinModal({ ...childPinModal, confirmPin })
                }
                secureTextEntry
                keyboardType="number-pad"
                maxLength={12}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setChildPinModal(null)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, changingChildPin && styles.buttonDisabled]}
                disabled={changingChildPin}
                onPress={submitChangeChildPin}
              >
                {changingChildPin ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!restorePreview}
        animationType="slide"
        transparent
        onRequestClose={() => setRestorePreview(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vista previa de restauración</Text>
            <Text style={styles.modalHint}>
              {restorePreview?.family_matches
                ? 'La familia del respaldo coincide.'
                : 'ATENCION: el respaldo parece de otra familia.'}
            </Text>
            <View style={styles.legalCard}>
              {[
                ['Tareas', 'chores'],
                ['Pagos', 'payments'],
                ['Metas', 'goals'],
                ['Metas ahorro', 'savings_goals'],
                ['Retiros', 'withdrawals'],
                ['Logros', 'achievements'],
                ['Alertas', 'notifications'],
              ].map(([label, key]) => (
                <View key={key} style={styles.legalMenuItem}>
                  <Text style={styles.legalMenuText}>{label}</Text>
                  <Text style={styles.infoValue}>
                    {Number(restorePreview?.backup_counts?.[key] || 0)} /{' '}
                    {Number(restorePreview?.current_counts?.[key] || 0)}
                  </Text>
                </View>
              ))}
              <View style={[styles.legalMenuItem, styles.legalMenuItemLast]}>
                <Text style={[styles.paymentDate, { flex: 1 }]}>
                  Formato: respaldo / actual. Si aplicas, se reemplaza la actividad actual.
                </Text>
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setRestorePreview(null)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (!restorePreview?.family_matches || restoringBackup) && styles.buttonDisabled]}
                onPress={applyRestoreFromPreview}
                disabled={!restorePreview?.family_matches || restoringBackup}
              >
                {restoringBackup ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Aplicar restauración</Text>
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight + '30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  cashReadyCard: {
    backgroundColor: Colors.success + '14',
    borderWidth: 1,
    borderColor: Colors.success + '44',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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
    fontSize: 22,
    fontWeight: '800',
    color: Colors.success,
  },
  cashReadyHint: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  totalPaid: {
    color: Colors.secondary,
    fontWeight: '600',
  },
  codeValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  inviteButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  membersBlock: {
    marginTop: 20,
  },
  membersTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  memberEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  memberRole: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  memberRoleActions: {
    flexDirection: 'row',
    gap: 6,
  },
  roleMiniChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.surfaceAlt,
  },
  roleMiniChipActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}1A`,
  },
  roleMiniChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  roleMiniChipTextActive: {
    color: Colors.primary,
  },
  withdrawalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  withdrawalActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  approveW: {
    backgroundColor: Colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approveWText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  rejectWText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  withdrawMeta: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  withdrawGoalNote: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  paymentTypeTag: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  purposeNote: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 4,
    fontStyle: 'italic',
  },
  savingsLine: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  tapHint: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
  },
  modalHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
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
  paymentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  paymentChild: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  paymentDate: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  paymentIconWithdrawal: {
    backgroundColor: Colors.accent + '18',
  },
  paymentTypeTagWithdrawal: {
    color: Colors.accentDark,
  },
  paymentAmountWithdrawal: {
    color: Colors.accent,
  },
  legalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  legalMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  legalMenuItemLast: {
    borderBottomWidth: 0,
  },
  legalMenuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  sessionsBlock: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  sessionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 10,
    marginBottom: 6,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  sessionName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  sessionMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sessionCloseButton: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: `${Colors.error}0F`,
  },
  sessionCloseButtonText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
    gap: 8,
  },
  logoutButtonText: {
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
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '92%',
  },
  modalScroll: {
    width: '100%',
  },
  modalScrollContent: {
    paddingBottom: 8,
    flexGrow: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineInput: {
    flex: 1,
  },
  timeFieldButton: {
    justifyContent: 'center',
    minHeight: 56,
  },
  timeFieldValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  timeFieldPlaceholder: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '500',
  },
  booleanRow: {
    flexDirection: 'row',
    gap: 8,
  },
  booleanChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  booleanChipOn: {
    borderColor: Colors.primary + '88',
    backgroundColor: Colors.primary + '18',
  },
  booleanChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  booleanChipTextOn: {
    color: Colors.primary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
    lineHeight: 16,
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
    marginTop: 16,
    paddingTop: 4,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  withdrawSummaryBox: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  withdrawSummaryMain: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  withdrawSummaryMeta: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bulkApproveBtn: {
    backgroundColor: Colors.success + '22',
    borderWidth: 1,
    borderColor: Colors.success + '55',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  bulkApproveBtnText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  quickMaxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  quickMaxChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickMaxChipActive: {
    borderColor: Colors.success + '88',
    backgroundColor: Colors.success + '20',
  },
  quickMaxChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  quickMaxChipTextActive: {
    color: Colors.success,
  },
  pickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'flex-start',
    gap: 8,
    marginTop: 10,
    width: '100%',
  },
  pickChip: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pickChipActive: {
    borderColor: Colors.primary + '88',
    backgroundColor: Colors.primary + '18',
  },
  pickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  recommendBtn: {
    marginTop: -4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '55',
    borderRadius: 10,
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  recommendBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  pickChipTextActive: {
    color: Colors.primary,
  },
  dangerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error + '44',
    padding: 12,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.error,
  },
  dangerHint: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  secondaryAdminButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary + '55',
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryAdminButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  dangerButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dangerButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
});
