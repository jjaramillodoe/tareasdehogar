import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { choresAPI, statsAPI, childrenAPI, paymentsAPI, mediaAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { shadow } from '../../src/utils/shadow';
import Button from '../../src/components/ui/Button';
import { resolveMediaUrl } from '../../src/utils/mediaUrl';
import AppModal, { AppModalActions, modalFieldStyles } from '../../src/components/AppModal';
import ChildScreenShell, {
  ChildEmptyState,
  ChildStatPill,
} from '../../src/components/ChildScreenShell';


interface Chore {
  id: string;
  title: string;
  description?: string;
  amount: number;
  frequency: string;
  status: string;
  scheduled_date?: string | null;
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

  const applyPickedAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.uri) return;
    setPhotoUri(asset.uri);
  };

  const pickEvidencePhoto = () => {
    Alert.alert('Evidencia', '¿Cómo quieres agregar la foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cámara',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso', 'Necesitamos acceso a la cámara.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.55,
          });
          if (!result.canceled && result.assets[0]) {
            await applyPickedAsset(result.assets[0]);
          }
        },
      },
      {
        text: 'Galería',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso', 'Necesitamos acceso a tus fotos.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.55,
          });
          if (!result.canceled && result.assets[0]) {
            await applyPickedAsset(result.assets[0]);
          }
        },
      },
    ]);
  };

  const handleCompleteChore = async () => {
    if (!selectedChore || !selectedChild) return;

    setCompleting(true);
    try {
      let photoUrl: string | undefined;
      if (photoUri) {
        if (photoUri.startsWith('http') || photoUri.startsWith('/uploads/')) {
          photoUrl = photoUri;
        } else {
          const uploaded = await mediaAPI.uploadEvidence(photoUri, 'image/jpeg');
          photoUrl = uploaded.url;
        }
      }
      await choresAPI.complete(
        selectedChore.id,
        selectedChild.id,
        comment.trim() || undefined,
        photoUrl
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
      <ChildScreenShell title="Tareas" subtitle="Sin hijo seleccionado" showBack onBack={handleBack}>
        <ChildEmptyState
          icon="alert-circle-outline"
          title="No hay hijo seleccionado"
          subtitle="Vuelve al inicio e intenta de nuevo."
        />
        <TouchableOpacity style={styles.goBackButton} onPress={handleBack}>
          <Text style={styles.goBackButtonText}>Volver al inicio</Text>
        </TouchableOpacity>
      </ChildScreenShell>
    );
  }

  const pendingChores = chores
    .filter((c) => c.status === 'pendiente')
    .sort((a, b) => {
      const da = a.scheduled_date ? String(a.scheduled_date).slice(0, 10) : '';
      const db = b.scheduled_date ? String(b.scheduled_date).slice(0, 10) : '';
      return da.localeCompare(db);
    });
  const inReviewChores = chores.filter((c) => c.status === 'completada' || c.status === 'rechazada');
  const recentApproved = chores.filter((c) => c.status === 'aprobada').slice(0, 8);
  const otherChores = [...inReviewChores, ...recentApproved];
  const displayName = childData?.alias || childData?.name || selectedChild.name;
  const currency = family?.currency || 'USD';

  return (
    <View style={styles.container}>
      <ChildScreenShell
        title="Tareas"
        subtitle={`${displayName} · completa y gana`}
        loading={isLoading}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadData();
        }}
        headerExtra={
          <View style={styles.balanceHero}>
            <Text style={styles.balanceLabel}>Tu saldo</Text>
            <Text style={styles.balanceAmount}>
              {currency} {Number(childData?.balance ?? 0).toFixed(2)}
            </Text>
            <View style={styles.challengePill}>
              <Ionicons
                name={weeklySavingsChallenge.reached ? 'trophy' : 'flame'}
                size={16}
                color={Colors.secondaryInk}
              />
              <Text style={styles.challengePillText}>
                Ahorro semanal {weeklyChallengeTarget}%:{' '}
                {weeklySavingsChallenge.percent.toFixed(0)}%
                {weeklySavingsChallenge.reached ? ' · ¡Cumplido!' : ''}
              </Text>
            </View>
          </View>
        }
      >
        {stats ? (
          <View style={styles.statsRow}>
            <ChildStatPill icon="time-outline" value={stats.pending_tasks} label="Pendientes" tone="primary" />
            <ChildStatPill icon="hourglass-outline" value={stats.completed_tasks} label="En revisión" tone="secondary" />
            <ChildStatPill icon="checkmark-circle" value={stats.approved_tasks} label="Aprobadas" tone="success" />
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Pendientes</Text>
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCountText}>{pendingChores.length}</Text>
            </View>
          </View>
          {pendingChores.length === 0 ? (
            <ChildEmptyState
              icon="checkmark-circle"
              title="¡No tienes tareas pendientes!"
              subtitle="Cuando tu familia asigne algo nuevo, aparecerá aquí."
            />
          ) : (
            pendingChores.map((chore) => (
              <View key={chore.id} style={styles.choreCard}>
                <View style={styles.choreTopRow}>
                  <View style={styles.choreIcon}>
                    <Ionicons name="clipboard-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.choreText}>
                    <Text style={styles.choreTitle}>{chore.title}</Text>
                    {chore.description ? (
                      <Text style={styles.choreDescription}>{chore.description}</Text>
                    ) : null}
                    <Text style={styles.choreAmount}>
                      {currency} {chore.amount.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <Button
                  label="Completar"
                  icon="rocket"
                  variant="kid"
                  style={styles.completeButton}
                  onPress={() => openCompleteModal(chore)}
                />
              </View>
            ))
          )}
        </View>

        {otherChores.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>En revisión y recientes</Text>
              <View style={styles.sectionCountBadgeMuted}>
                <Text style={styles.sectionCountTextMuted}>{otherChores.length}</Text>
              </View>
            </View>
            {otherChores.map((chore) => (
              <View key={chore.id} style={styles.otherChoreCard}>
                <View style={styles.choreTopRow}>
                  <View style={[styles.choreIcon, { backgroundColor: statusColors[chore.status] + '22' }]}>
                    <Ionicons name="document-text-outline" size={18} color={statusColors[chore.status]} />
                  </View>
                  <View style={styles.choreText}>
                    <Text style={styles.choreTitle}>{chore.title}</Text>
                    <Text style={styles.choreAmount}>
                      {currency} {chore.amount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors[chore.status] }]}>
                    <Text style={styles.statusBadgeText}>{statusLabels[chore.status]}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {!isChildSession ? (
          <TouchableOpacity style={styles.parentExit} onPress={handleBack}>
            <Ionicons name="exit-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.parentExitText}>Salir de vista de hijo</Text>
          </TouchableOpacity>
        ) : null}
      </ChildScreenShell>

      <AppModal
        visible={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Marcar como completada"
        subtitle={selectedChore?.title}
        icon="checkmark-circle-outline"
        iconTone="success"
        variant="sheet"
        size="lg"
        footer={
          <AppModalActions
            onCancel={() => setShowCompleteModal(false)}
            confirmLabel="Marcar como completada"
            onConfirm={handleCompleteChore}
            confirming={completing}
            confirmTone="success"
          />
        }
      >
        <Text style={modalFieldStyles.hint}>
          Opcional: una foto ayuda a tu familia a verificar el trabajo antes de aprobar.
        </Text>
        <Text style={modalFieldStyles.label}>Comentario (opcional)</Text>
        <TextInput
          style={[modalFieldStyles.input, modalFieldStyles.inputMultiline]}
          placeholder="¿Algún comentario sobre la tarea?"
          placeholderTextColor={Colors.textLight}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
        />
        <TouchableOpacity style={styles.photoBtn} onPress={pickEvidencePhoto}>
          <Ionicons name="camera-outline" size={22} color={Colors.primary} />
          <Text style={styles.photoBtnText}>
            {photoUri ? 'Cambiar foto de evidencia' : 'Foto con cámara o galería'}
          </Text>
        </TouchableOpacity>
        {photoUri ? (
          <Image
            source={{ uri: resolveMediaUrl(photoUri) || photoUri }}
            style={styles.previewPhoto}
            contentFit="cover"
          />
        ) : null}
      </AppModal>

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
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  name: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.6,
    marginTop: 2,
  },
  hint: {
    marginTop: 4,
    marginBottom: 18,
    fontSize: 14,
    color: Colors.textSecondary,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
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
  balanceHero: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 18,
    ...shadow({ color: Colors.primaryDark, offsetY: 4, blur: 12, opacity: 0.25, elevation: 4 }),
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  balanceAmount: {
    marginTop: 4,
    color: Colors.white,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  challengePill: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  challengePillText: {
    color: Colors.secondaryInk,
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
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
  choreCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 3, blur: 10, opacity: 0.08, elevation: 3 }),
  },
  choreTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  choreIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choreText: {
    flex: 1,
  },
  choreTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  choreDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  choreAmount: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  completeButton: {
    marginTop: 14,
  },
  otherChoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  parentExit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  parentExitText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
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
    ...shadow({ color: Colors.black, offsetX: 0, offsetY: 4, blur: 8, opacity: 0.18, elevation: 8 }),
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
