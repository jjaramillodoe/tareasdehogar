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
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { goalsAPI, childrenAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface Child {
  id: string;
  name: string;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  target_tasks: number;
  bonus_amount: number;
  child_id: string;
  completed_tasks: number;
  is_completed: boolean;
  bonus_paid: boolean;
}

export default function GoalsScreen() {
  const { family } = useAuthStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_tasks: '',
    bonus_amount: '',
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [goalsData, childrenData] = await Promise.all([
        goalsAPI.getAll(),
        childrenAPI.getAll(),
      ]);
      setGoals(goalsData);
      setChildren(childrenData);
      if (childrenData.length > 0 && !selectedChildId) {
        setSelectedChildId(childrenData[0].id);
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
    }, [])
  );

  const handleCreateGoal = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }
    const target = parseInt(formData.target_tasks);
    if (isNaN(target) || target < 1) {
      Alert.alert('Error', 'Las tareas objetivo deben ser mayor a 0');
      return;
    }
    const bonus = parseFloat(formData.bonus_amount);
    if (isNaN(bonus) || bonus <= 0) {
      Alert.alert('Error', 'El bono debe ser mayor a 0');
      return;
    }
    if (!selectedChildId) {
      Alert.alert('Error', 'Selecciona un hijo');
      return;
    }

    setSaving(true);
    try {
      await goalsAPI.create(
        formData.title.trim(),
        formData.description.trim() || undefined,
        target,
        bonus,
        selectedChildId
      );
      Alert.alert('Éxito', 'Meta creada correctamente');
      setShowModal(false);
      setFormData({ title: '', description: '', target_tasks: '', bonus_amount: '' });
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al crear la meta';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handlePayBonus = async (goal: Goal) => {
    Alert.alert(
      'Pagar Bono',
      `¿Pagar ${family?.currency} ${goal.bonus_amount} a ${getChildName(goal.child_id)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar',
          onPress: async () => {
            try {
              await goalsAPI.payBonus(goal.id);
              Alert.alert('Éxito', '¡Bono pagado!');
              loadData();
            } catch (error: any) {
              const message = error.response?.data?.detail || 'Error al pagar';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleDeleteGoal = async (goalId: string) => {
    Alert.alert('Eliminar Meta', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await goalsAPI.delete(goalId);
            loadData();
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  const getChildName = (childId: string) => {
    return children.find((c) => c.id === childId)?.name || 'Desconocido';
  };

  const getProgress = (goal: Goal) => {
    return Math.min((goal.completed_tasks / goal.target_tasks) * 100, 100);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const activeGoals = goals.filter((g) => !g.is_completed);
  const completedGoals = goals.filter((g) => g.is_completed);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Metas y Bonos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
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
        {children.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>Primero agrega hijos</Text>
          </View>
        ) : (
          <>
            {/* Active Goals */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Metas Activas</Text>
              {activeGoals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="flag-outline" size={48} color={Colors.textLight} />
                  <Text style={styles.emptyStateText}>No hay metas activas</Text>
                  <Text style={styles.emptyStateSubtext}>Crea una meta para motivar a tus hijos</Text>
                </View>
              ) : (
                activeGoals.map((goal) => (
                  <View key={goal.id} style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                      <View style={styles.goalIcon}>
                        <Ionicons name="flag" size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.goalInfo}>
                        <Text style={styles.goalTitle}>{goal.title}</Text>
                        <Text style={styles.goalChild}>{getChildName(goal.child_id)}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteGoal(goal.id)}>
                        <Ionicons name="trash-outline" size={20} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                    {goal.description && (
                      <Text style={styles.goalDescription}>{goal.description}</Text>
                    )}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${getProgress(goal)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {goal.completed_tasks} / {goal.target_tasks} tareas
                      </Text>
                    </View>
                    <View style={styles.goalFooter}>
                      <View style={styles.bonusBadge}>
                        <Ionicons name="gift" size={16} color={Colors.secondary} />
                        <Text style={styles.bonusText}>
                          Bono: {family?.currency} {goal.bonus_amount}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Metas Completadas</Text>
                {completedGoals.map((goal) => (
                  <View key={goal.id} style={[styles.goalCard, styles.completedCard]}>
                    <View style={styles.goalHeader}>
                      <View style={[styles.goalIcon, { backgroundColor: Colors.success + '20' }]}>
                        <Ionicons name="checkmark" size={20} color={Colors.success} />
                      </View>
                      <View style={styles.goalInfo}>
                        <Text style={styles.goalTitle}>{goal.title}</Text>
                        <Text style={styles.goalChild}>{getChildName(goal.child_id)}</Text>
                      </View>
                      {goal.bonus_paid ? (
                        <View style={styles.paidBadge}>
                          <Text style={styles.paidBadgeText}>Pagado</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.payButton}
                          onPress={() => handlePayBonus(goal)}
                        >
                          <Text style={styles.payButtonText}>Pagar Bono</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.goalFooter}>
                      <View style={styles.bonusBadge}>
                        <Ionicons name="gift" size={16} color={Colors.secondary} />
                        <Text style={styles.bonusText}>
                          {family?.currency} {goal.bonus_amount}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Create Goal Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nueva Meta</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Título *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Semana productiva"
                placeholderTextColor={Colors.textLight}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Descripción de la meta..."
                placeholderTextColor={Colors.textLight}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Tareas Objetivo *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="5"
                  placeholderTextColor={Colors.textLight}
                  value={formData.target_tasks}
                  onChangeText={(text) => setFormData({ ...formData, target_tasks: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Bono ({family?.currency}) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="50"
                  placeholderTextColor={Colors.textLight}
                  value={formData.bonus_amount}
                  onChangeText={(text) => setFormData({ ...formData, bonus_amount: text })}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Asignar a *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.childSelector}>
                  {children.map((child) => (
                    <TouchableOpacity
                      key={child.id}
                      style={[
                        styles.childOption,
                        selectedChildId === child.id && styles.childOptionActive,
                      ]}
                      onPress={() => setSelectedChildId(child.id)}
                    >
                      <Text
                        style={[
                          styles.childOptionText,
                          selectedChildId === child.id && styles.childOptionTextActive,
                        ]}
                      >
                        {child.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleCreateGoal}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Crear Meta</Text>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
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
    fontWeight: '500',
    color: Colors.text,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  completedCard: {
    borderWidth: 2,
    borderColor: Colors.success + '40',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  goalChild: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  goalDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'right',
  },
  goalFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  bonusText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary,
  },
  paidBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  payButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  payButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
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
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
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
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  childSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  childOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  childOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  childOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  childOptionTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
});
