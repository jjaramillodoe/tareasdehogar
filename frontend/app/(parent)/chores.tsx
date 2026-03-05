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
import { choresAPI, childrenAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface Child {
  id: string;
  name: string;
  age: number;
}

interface Chore {
  id: string;
  title: string;
  description?: string;
  amount: number;
  frequency: string;
  assigned_to: string[];
  status: string;
  completed_by?: string;
  completed_at?: string;
  comment?: string;
}

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  completada: 'Completada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

const statusColors: Record<string, string> = {
  pendiente: Colors.warning,
  completada: Colors.primary,
  aprobada: Colors.success,
  rechazada: Colors.error,
};

const frequencyLabels: Record<string, string> = {
  unica: 'Única',
  diaria: 'Diaria',
  semanal: 'Semanal',
};

export default function ChoresScreen() {
  const router = useRouter();
  const { family } = useAuthStore();
  const [chores, setChores] = useState<Chore[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    frequency: 'unica',
  });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [choresData, childrenData] = await Promise.all([
        choresAPI.getAll(),
        childrenAPI.getAll(),
      ]);
      setChores(choresData);
      setChildren(childrenData);
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

  const openModal = (chore?: Chore) => {
    if (chore) {
      setEditingChore(chore);
      setFormData({
        title: chore.title,
        description: chore.description || '',
        amount: chore.amount.toString(),
        frequency: chore.frequency,
      });
      setSelectedChildren(chore.assigned_to);
    } else {
      setEditingChore(null);
      setFormData({ title: '', description: '', amount: '', frequency: 'unica' });
      setSelectedChildren([]);
    }
    setShowModal(true);
  };

  const toggleChildSelection = (childId: string) => {
    setSelectedChildren((prev) =>
      prev.includes(childId)
        ? prev.filter((id) => id !== childId)
        : [...prev, childId]
    );
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor a 0');
      return;
    }

    if (selectedChildren.length === 0) {
      Alert.alert('Error', 'Debes asignar la tarea a al menos un hijo');
      return;
    }

    setSaving(true);
    try {
      if (editingChore) {
        await choresAPI.update(editingChore.id, {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          amount,
          frequency: formData.frequency,
          assigned_to: selectedChildren,
        });
        Alert.alert('Éxito', 'Tarea actualizada correctamente');
      } else {
        await choresAPI.create(
          formData.title.trim(),
          formData.description.trim() || undefined,
          amount,
          formData.frequency,
          selectedChildren
        );
        Alert.alert('Éxito', 'Tarea creada correctamente');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al guardar';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (chore: Chore) => {
    Alert.alert(
      'Eliminar Tarea',
      `¿Estás seguro de eliminar "${chore.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await choresAPI.delete(chore.id);
              Alert.alert('Éxito', 'Tarea eliminada correctamente');
              loadData();
            } catch (error: any) {
              const message = error.response?.data?.detail || 'Error al eliminar';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleApprove = async (choreId: string) => {
    try {
      await choresAPI.approve(choreId);
      Alert.alert('Éxito', 'Tarea aprobada y pago realizado');
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al aprobar';
      Alert.alert('Error', message);
    }
  };

  const handleReject = async (choreId: string) => {
    try {
      await choresAPI.reject(choreId);
      Alert.alert('Éxito', 'Tarea rechazada');
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al rechazar';
      Alert.alert('Error', message);
    }
  };

  const handleReset = async (choreId: string) => {
    try {
      await choresAPI.reset(choreId);
      Alert.alert('Éxito', 'Tarea restablecida a pendiente');
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al restablecer';
      Alert.alert('Error', message);
    }
  };

  const getChildNames = (childIds: string[]) => {
    return childIds
      .map((id) => children.find((c) => c.id === id)?.name || 'Desconocido')
      .join(', ');
  };

  const filteredChores = filter
    ? chores.filter((c) => c.status === filter)
    : chores;

  if (!family) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tareas</Text>
        </View>
        <View style={styles.noFamilyContainer}>
          <Ionicons name="home-outline" size={64} color={Colors.textLight} />
          <Text style={styles.noFamilyText}>Primero debes crear una familia</Text>
          <TouchableOpacity
            style={styles.goHomeButton}
            onPress={() => router.push('/(parent)/home')}
          >
            <Text style={styles.goHomeButtonText}>Ir a Inicio</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tareas</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openModal()}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterTab, !filter && styles.filterTabActive]}
            onPress={() => setFilter(null)}
          >
            <Text style={[styles.filterTabText, !filter && styles.filterTabTextActive]}>
              Todas ({chores.length})
            </Text>
          </TouchableOpacity>
          {['pendiente', 'completada', 'aprobada', 'rechazada'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterTab, filter === status && styles.filterTabActive]}
              onPress={() => setFilter(status)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === status && styles.filterTabTextActive,
                ]}
              >
                {statusLabels[status]} ({chores.filter((c) => c.status === status).length})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
            <Text style={styles.emptySubtext}>
              Necesitas hijos registrados para asignar tareas
            </Text>
            <TouchableOpacity
              style={styles.goChildrenButton}
              onPress={() => router.push('/(parent)/children')}
            >
              <Text style={styles.goChildrenButtonText}>Ir a Hijos</Text>
            </TouchableOpacity>
          </View>
        ) : filteredChores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>
              {filter ? 'No hay tareas con este estado' : 'Aún no hay tareas'}
            </Text>
            <Text style={styles.emptySubtext}>Crea tareas para tus hijos</Text>
            {!filter && (
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() => openModal()}
              >
                <Ionicons name="add" size={20} color={Colors.white} />
                <Text style={styles.addFirstButtonText}>Crear Primera Tarea</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredChores.map((chore) => (
            <View key={chore.id} style={styles.choreCard}>
              <View style={styles.choreHeader}>
                <View style={styles.choreInfo}>
                  <Text style={styles.choreTitle}>{chore.title}</Text>
                  <View style={styles.choreMeta}>
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
                    <View style={styles.frequencyBadge}>
                      <Text style={styles.frequencyBadgeText}>
                        {frequencyLabels[chore.frequency]}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.choreAmount}>
                  {family.currency} {chore.amount.toFixed(2)}
                </Text>
              </View>

              {chore.description && (
                <Text style={styles.choreDescription}>{chore.description}</Text>
              )}

              <View style={styles.assignedTo}>
                <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.assignedToText}>
                  {getChildNames(chore.assigned_to)}
                </Text>
              </View>

              {chore.status === 'completada' && chore.completed_by && (
                <View style={styles.completedInfo}>
                  <Text style={styles.completedByText}>
                    Completada por: {children.find((c) => c.id === chore.completed_by)?.name}
                  </Text>
                  {chore.comment && (
                    <Text style={styles.commentText}>"{chore.comment}"</Text>
                  )}
                </View>
              )}

              <View style={styles.choreActions}>
                {chore.status === 'completada' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleApprove(chore.id)}
                    >
                      <Ionicons name="checkmark" size={16} color={Colors.white} />
                      <Text style={styles.actionBtnText}>Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleReject(chore.id)}
                    >
                      <Ionicons name="close" size={16} color={Colors.white} />
                      <Text style={styles.actionBtnText}>Rechazar</Text>
                    </TouchableOpacity>
                  </>
                )}
                {(chore.status === 'rechazada' || chore.status === 'aprobada') && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.resetBtn]}
                    onPress={() => handleReset(chore.id)}
                  >
                    <Ionicons name="refresh" size={16} color={Colors.white} />
                    <Text style={styles.actionBtnText}>Restablecer</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn]}
                  onPress={() => openModal(chore)}
                >
                  <Ionicons name="pencil" size={16} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(chore)}
                >
                  <Ionicons name="trash" size={16} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingChore ? 'Editar Tarea' : 'Crear Tarea'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Título *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: Limpiar cuarto"
                  placeholderTextColor={Colors.textLight}
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Descripción de la tarea</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Descripción detallada..."
                  placeholderTextColor={Colors.textLight}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Monto a pagar ({family.currency}) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLight}
                  value={formData.amount}
                  onChangeText={(text) => setFormData({ ...formData, amount: text })}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Frecuencia</Text>
                <View style={styles.frequencyOptions}>
                  {(['unica', 'diaria', 'semanal'] as const).map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyOption,
                        formData.frequency === freq && styles.frequencyOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, frequency: freq })}
                    >
                      <Text
                        style={[
                          styles.frequencyOptionText,
                          formData.frequency === freq && styles.frequencyOptionTextActive,
                        ]}
                      >
                        {frequencyLabels[freq]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Asignar a *</Text>
                <View style={styles.childrenGrid}>
                  {children.map((child) => (
                    <TouchableOpacity
                      key={child.id}
                      style={[
                        styles.childOption,
                        selectedChildren.includes(child.id) && styles.childOptionActive,
                      ]}
                      onPress={() => toggleChildSelection(child.id)}
                    >
                      <View
                        style={[
                          styles.childOptionCheck,
                          selectedChildren.includes(child.id) &&
                            styles.childOptionCheckActive,
                        ]}
                      >
                        {selectedChildren.includes(child.id) && (
                          <Ionicons name="checkmark" size={14} color={Colors.white} />
                        )}
                      </View>
                      <Text style={styles.childOptionText}>{child.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingChore ? 'Guardar' : 'Crear tarea'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  filterContainer: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: Colors.background,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  noFamilyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noFamilyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  goHomeButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  goHomeButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
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
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  goChildrenButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  goChildrenButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  addFirstButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  choreCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  choreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  choreInfo: {
    flex: 1,
  },
  choreTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  choreMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
  },
  frequencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  frequencyBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  choreAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  choreDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  assignedTo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  assignedToText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  completedInfo: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  completedByText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  commentText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  choreActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.white,
  },
  approveBtn: {
    backgroundColor: Colors.success,
  },
  rejectBtn: {
    backgroundColor: Colors.error,
  },
  resetBtn: {
    backgroundColor: Colors.primary,
  },
  editBtn: {
    backgroundColor: Colors.warning,
  },
  deleteBtn: {
    backgroundColor: Colors.error,
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
    marginTop: 40,
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
  frequencyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  frequencyOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  frequencyOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  frequencyOptionTextActive: {
    color: Colors.white,
  },
  childrenGrid: {
    gap: 8,
  },
  childOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  childOptionActive: {
    backgroundColor: Colors.primaryLight + '20',
    borderColor: Colors.primary,
  },
  childOptionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childOptionCheckActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  childOptionText: {
    fontSize: 15,
    color: Colors.text,
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
