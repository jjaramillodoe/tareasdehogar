import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { choresAPI, statsAPI, childrenAPI, paymentsAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface Chore {
  id: string;
  title: string;
  description?: string;
  amount: number;
  frequency: string;
  status: string;
}

interface Stats {
  balance: number;
  pending_tasks: number;
  completed_tasks: number;
  approved_tasks: number;
}

interface ChildPayment {
  amount: number;
  payment_type?: string;
  created_at?: string;
  savings_allocated?: number | null;
}

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  completada: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

const statusColors: Record<string, string> = {
  pendiente: Colors.warning,
  completada: Colors.primary,
  aprobada: Colors.success,
  rechazada: Colors.error,
};

export default function ChildTasksScreen() {
  const router = useRouter();
  const { selectedChild, setSelectedChild, family, isChildSession, logout } = useAuthStore();
  const [chores, setChores] = useState<Chore[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);
  const [comment, setComment] = useState('');
  const [completing, setCompleting] = useState(false);
  const [childData, setChildData] = useState(selectedChild);
  const [payments, setPayments] = useState<ChildPayment[]>([]);
  const [showChallengeToast, setShowChallengeToast] = useState(false);
  const [hadChallengeCompleted, setHadChallengeCompleted] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedChild || isExiting) return;

    try {
      const [choresData, statsData, updatedChild, paymentsData] = await Promise.all([
        choresAPI.getForChild(selectedChild.id),
        statsAPI.getChildStats(selectedChild.id),
        childrenAPI.getOne(selectedChild.id),
        paymentsAPI.getForChild(selectedChild.id).catch(() => []),
      ]);
      setChores(choresData);
      setStats(statsData);
      setChildData(updatedChild);
      setPayments(paymentsData as ChildPayment[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedChild, isExiting]);

  useFocusEffect(
    useCallback(() => {
      if (selectedChild && !isExiting) {
        loadData();
      }
    }, [selectedChild, loadData, isExiting])
  );

  const pickEvidencePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso', 'Necesitamos acceso a tus fotos para adjuntar evidencia.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const mime = result.assets[0].mimeType || 'image/jpeg';
      setPhotoUri(`data:${mime};base64,${result.assets[0].base64}`);
    }
  };

  const handleCompleteChore = async () => {
    if (!selectedChore || !selectedChild) return;

    setCompleting(true);
    try {
      await choresAPI.complete(
        selectedChore.id,
        selectedChild.id,
        comment.trim() || undefined,
        photoUri || undefined
      );
      Alert.alert('Éxito', 'Tarea marcada como completada. Esperando aprobación.');
      setShowCompleteModal(false);
      setComment('');
      setPhotoUri(null);
      setSelectedChore(null);
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al completar la tarea';
      Alert.alert('Error', message);
    } finally {
      setCompleting(false);
    }
  };

  const openCompleteModal = (chore: Chore) => {
    setSelectedChore(chore);
    setComment('');
    setPhotoUri(null);
    setShowCompleteModal(true);
  };

  const handleBack = () => {
    if (isChildSession) {
      setIsExiting(true);
      // Defer logout until after paint so we never render "no child" while still on this screen.
      setTimeout(() => {
        void (async () => {
          await logout();
          router.replace('/');
        })();
      }, 0);
    } else {
      setIsExiting(true);
      setTimeout(() => {
        setSelectedChild(null);
        router.replace('/(parent)/home');
      }, 0);
    }
  };

  const weeklyChallengeTarget = 20;
  const weeklySavingsChallenge = useMemo(() => {
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
    return {
      reached: percent >= weeklyChallengeTarget,
      percent,
      totalPaid,
    };
  }, [payments]);

  useEffect(() => {
    if (!weeklySavingsChallenge.reached) {
      setShowChallengeToast(false);
      setHadChallengeCompleted(false);
      return;
    }
    if (!hadChallengeCompleted) {
      setShowChallengeToast(true);
      setHadChallengeCompleted(true);
      const timer = setTimeout(() => setShowChallengeToast(false), 2600);
      return () => clearTimeout(timer);
    }
  }, [weeklySavingsChallenge.reached, hadChallengeCompleted]);

  if (isExiting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!selectedChild) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vista de Hijo</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={styles.errorText}>No hay hijo seleccionado</Text>
          <TouchableOpacity style={styles.goBackButton} onPress={handleBack}>
            <Text style={styles.goBackButtonText}>Volver al inicio</Text>
          </TouchableOpacity>
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

  const pendingChores = chores.filter((c) => c.status === 'pendiente');
  const otherChores = chores.filter((c) => c.status !== 'pendiente');
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{childData?.name || selectedChild.name}</Text>
          <Text style={styles.headerSubtitle}>
            {isChildSession ? 'Tareas y fotos' : 'Vista de hijo'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
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
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceIcon}>
            <Ionicons name="wallet" size={32} color={Colors.onSecondary} />
          </View>
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>Mi Saldo</Text>
            <Text style={styles.balanceAmount}>
              {family?.currency} {childData?.balance?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.pending_tasks}</Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.completed_tasks}</Text>
              <Text style={styles.statLabel}>Completadas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.approved_tasks}</Text>
              <Text style={styles.statLabel}>Aprobadas</Text>
            </View>
          </View>
        )}

        <View style={styles.challengeBadgeCard}>
          <Ionicons
            name={weeklySavingsChallenge.reached ? 'trophy' : 'trophy-outline'}
            size={20}
            color={weeklySavingsChallenge.reached ? Colors.secondaryDark : Colors.primary}
          />
          <Text style={styles.challengeBadgeText}>
            Desafío semanal ahorro {weeklyChallengeTarget}%: {weeklySavingsChallenge.percent.toFixed(1)}%
            {weeklySavingsChallenge.reached
              ? ' ¡Cumplido!'
              : weeklySavingsChallenge.totalPaid > 0
                ? ' en progreso'
                : ' (sin pagos aún)'}
          </Text>
        </View>

        {/* Pending Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Tareas Pendientes</Text>
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCountText}>{pendingChores.length}</Text>
            </View>
          </View>
          {pendingChores.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              <Text style={styles.emptyStateText}>¡No tienes tareas pendientes!</Text>
            </View>
          ) : (
            pendingChores.map((chore) => (
              <View key={chore.id} style={styles.choreCard}>
                <View style={styles.choreInfo}>
                  <View style={styles.choreTopRow}>
                    <Text style={styles.choreTitle}>{chore.title}</Text>
                    <View style={styles.rewardPill}>
                      <Text style={styles.rewardPillText}>
                        {family?.currency} {chore.amount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  {chore.description && (
                    <Text style={styles.choreDescription}>{chore.description}</Text>
                  )}
                  <Text style={styles.choreRewardLabel}>Recompensa por completar</Text>
                </View>
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={() => openCompleteModal(chore)}
                >
                  <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
                  <Text style={styles.completeButtonText}>Completar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Other Tasks */}
        {otherChores.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>Otras Tareas</Text>
              <View style={styles.sectionCountBadgeMuted}>
                <Text style={styles.sectionCountTextMuted}>{otherChores.length}</Text>
              </View>
            </View>
            {otherChores.map((chore) => (
              <View key={chore.id} style={styles.otherChoreCard}>
                <View style={styles.choreInfo}>
                  <View style={styles.choreTopRow}>
                    <Text style={styles.choreTitle}>{chore.title}</Text>
                    <Text style={styles.choreRewardSmall}>
                      {family?.currency} {chore.amount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.choreStatusContainer}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColors[chore.status] },
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>
                        {statusLabels[chore.status]}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Complete Modal */}
      <Modal
        visible={showCompleteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Marcar como completada</Text>
            <Text style={styles.modalSubtitle}>{selectedChore?.title}</Text>
            <Text style={styles.modalHint}>
              Opcional: una foto ayuda a tu familia a verificar el trabajo antes de aprobar.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Comentario (opcional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="¿Algún comentario sobre la tarea?"
                placeholderTextColor={Colors.textLight}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity style={styles.photoBtn} onPress={pickEvidencePhoto}>
              <Ionicons name="camera-outline" size={22} color={Colors.primary} />
              <Text style={styles.photoBtnText}>
                {photoUri ? 'Cambiar foto de evidencia' : 'Adjuntar foto de la tarea'}
              </Text>
            </TouchableOpacity>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.previewPhoto} contentFit="cover" />
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, completing && styles.buttonDisabled]}
                onPress={handleCompleteChore}
                disabled={completing}
              >
                {completing ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Marcar como completada</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showChallengeToast ? (
        <View style={styles.challengeToast}>
          <Ionicons name="trophy" size={18} color={Colors.white} />
          <Text style={styles.challengeToastText}>Desafío semanal completado. ¡Sigue así!</Text>
          <Ionicons name="sparkles" size={16} color={Colors.secondaryLight} />
          <TouchableOpacity
            onPress={() => setShowChallengeToast(false)}
            style={styles.challengeToastClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>
      ) : null}
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
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: Colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  goBackButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  goBackButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  balanceCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.secondaryDark,
  },
  balanceIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeBadgeCard: {
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  challengeBadgeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  balanceInfo: {
    marginLeft: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.onSecondaryMuted,
    opacity: 1,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.onSecondary,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
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
    color: Colors.text,
    marginTop: 12,
  },
  choreCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  choreInfo: {
    marginBottom: 12,
  },
  choreTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  choreTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  choreDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  rewardPill: {
    marginTop: 8,
    backgroundColor: Colors.secondary + '33',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.secondaryDark,
  },
  rewardPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSecondary,
  },
  choreRewardLabel: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  otherChoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  choreStatusContainer: {
    marginTop: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  choreRewardSmall: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
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
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 8,
  },
  photoBtnText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  previewPhoto: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: Colors.background,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  inputGroup: {
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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
  submitButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.success,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  challengeToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 88,
    backgroundColor: Colors.primaryDark,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  challengeToastText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  challengeToastClose: {
    marginLeft: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white + '20',
  },
});
