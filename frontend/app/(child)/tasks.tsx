import React, { useState, useCallback } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { choresAPI, statsAPI, childrenAPI } from '../../src/services/api';
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
  const { selectedChild, setSelectedChild, family } = useAuthStore();
  const [chores, setChores] = useState<Chore[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);
  const [comment, setComment] = useState('');
  const [completing, setCompleting] = useState(false);
  const [childData, setChildData] = useState(selectedChild);

  const loadData = async () => {
    if (!selectedChild) return;

    try {
      const [choresData, statsData, updatedChild] = await Promise.all([
        choresAPI.getForChild(selectedChild.id),
        statsAPI.getChildStats(selectedChild.id),
        childrenAPI.getOne(selectedChild.id),
      ]);
      setChores(choresData);
      setStats(statsData);
      setChildData(updatedChild);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (selectedChild) {
        loadData();
      }
    }, [selectedChild?.id])
  );

  const handleCompleteChore = async () => {
    if (!selectedChore || !selectedChild) return;

    setCompleting(true);
    try {
      await choresAPI.complete(selectedChore.id, selectedChild.id, comment.trim() || undefined);
      Alert.alert('Éxito', 'Tarea marcada como completada. Esperando aprobación.');
      setShowCompleteModal(false);
      setComment('');
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
    setShowCompleteModal(true);
  };

  const handleBack = () => {
    setSelectedChild(null);
    router.replace('/(parent)/home');
  };

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
          <Text style={styles.headerSubtitle}>Vista de hijo</Text>
        </View>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push('/(child)/payments')}
        >
          <Ionicons name="receipt-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
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
            <Ionicons name="wallet" size={32} color={Colors.white} />
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

        {/* Pending Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tareas Pendientes</Text>
          {pendingChores.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              <Text style={styles.emptyStateText}>¡No tienes tareas pendientes!</Text>
            </View>
          ) : (
            pendingChores.map((chore) => (
              <View key={chore.id} style={styles.choreCard}>
                <View style={styles.choreInfo}>
                  <Text style={styles.choreTitle}>{chore.title}</Text>
                  {chore.description && (
                    <Text style={styles.choreDescription}>{chore.description}</Text>
                  )}
                  <Text style={styles.choreReward}>
                    Recompensa: {family?.currency} {chore.amount.toFixed(2)}
                  </Text>
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
            <Text style={styles.sectionTitle}>Otras Tareas</Text>
            {otherChores.map((chore) => (
              <View key={chore.id} style={styles.otherChoreCard}>
                <View style={styles.choreInfo}>
                  <Text style={styles.choreTitle}>{chore.title}</Text>
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
                <Text style={styles.choreRewardSmall}>
                  {family?.currency} {chore.amount.toFixed(2)}
                </Text>
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
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  balanceIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceInfo: {
    marginLeft: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
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
  },
  choreInfo: {
    marginBottom: 12,
  },
  choreTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  choreDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  choreReward: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary,
    marginTop: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
    fontWeight: '600',
    color: Colors.secondary,
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
  modalSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
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
});
