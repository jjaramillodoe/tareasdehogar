import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { childrenAPI, savingsGoalsAPI, SavingsGoalDTO } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface Child {
  id: string;
  name: string;
  age: number;
  alias?: string;
  gender?: 'mujer' | 'hombre' | null;
  balance: number;
  family_id: string;
  savings_on_approve_percent?: number;
  savings_on_approve_goal_id?: string | null;
}

function getChildAvatarSource(gender?: 'mujer' | 'hombre' | null) {
  if (gender === 'mujer') {
    return require('../../assets/images/mujer.png');
  }
  return require('../../assets/images/hombre.png');
}

export default function ChildrenScreen() {
  const router = useRouter();
  const { family, setSelectedChild } = useAuthStore();
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    age: string;
    alias: string;
    pin: string;
    gender: 'mujer' | 'hombre';
    savingsPercent: string;
    savingsGoalId: string;
  }>({
    name: '',
    age: '',
    alias: '',
    pin: '',
    gender: 'mujer',
    savingsPercent: '0',
    savingsGoalId: '',
  });
  const [savingsGoalOptions, setSavingsGoalOptions] = useState<SavingsGoalDTO[]>([]);
  const [saving, setSaving] = useState(false);

  const loadChildren = async () => {
    try {
      const data = await childrenAPI.getAll();
      setChildren(data);
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChildren();
    }, [])
  );

  const openModal = async (child?: Child) => {
    if (child) {
      setEditingChild(child);
      setFormData({
        name: child.name,
        age: child.age.toString(),
        alias: child.alias || '',
        pin: '',
        gender: child.gender === 'hombre' ? 'hombre' : 'mujer',
        savingsPercent:
          child.savings_on_approve_percent != null && !Number.isNaN(Number(child.savings_on_approve_percent))
            ? String(child.savings_on_approve_percent)
            : '0',
        savingsGoalId: child.savings_on_approve_goal_id || '',
      });
      try {
        const sg = await savingsGoalsAPI.getAll(child.id);
        setSavingsGoalOptions(sg.filter((g) => !g.is_completed));
      } catch {
        setSavingsGoalOptions([]);
      }
    } else {
      setEditingChild(null);
      setFormData({
        name: '',
        age: '',
        alias: '',
        pin: '',
        gender: 'mujer',
        savingsPercent: '0',
        savingsGoalId: '',
      });
      setSavingsGoalOptions([]);
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    const age = parseInt(formData.age);
    if (isNaN(age) || age < 1 || age >= 19) {
      Alert.alert('Error', 'La edad debe ser un número entre 1 y 18');
      return;
    }

    setSaving(true);
    try {
      if (editingChild) {
        const rawPct = parseFloat(formData.savingsPercent.replace(',', '.'));
        const savingsPct = Number.isNaN(rawPct) ? 0 : Math.min(100, Math.max(0, rawPct));
        await childrenAPI.update(editingChild.id, {
          name: formData.name.trim(),
          age,
          alias: formData.alias.trim() || undefined,
          pin: formData.pin || undefined,
          gender: formData.gender,
          savings_on_approve_percent: savingsPct,
          savings_on_approve_goal_id: formData.savingsGoalId.trim() || null,
        });
        Alert.alert('Éxito', 'Hijo actualizado correctamente');
      } else {
        await childrenAPI.create(
          formData.name.trim(),
          age,
          formData.alias.trim() || undefined,
          formData.pin || undefined,
          formData.gender
        );
        Alert.alert('Éxito', 'Hijo agregado correctamente');
      }
      setShowModal(false);
      loadChildren();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al guardar';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (child: Child) => {
    Alert.alert(
      'Eliminar Hijo',
      `¿Estás seguro de eliminar a ${child.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await childrenAPI.delete(child.id);
              Alert.alert('Éxito', 'Hijo eliminado correctamente');
              loadChildren();
            } catch (error: any) {
              const message = error.response?.data?.detail || 'Error al eliminar';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleViewAsChild = (child: Child) => {
    setSelectedChild(child);
    router.push('/(child)/tasks');
  };

  if (!family) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hijos</Text>
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
        <Text style={styles.headerTitle}>Hijos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openModal()}
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
              loadChildren();
            }}
          />
        }
      >
        {children.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>Aún no hay hijos registrados</Text>
            <Text style={styles.emptySubtext}>Agrega a tus hijos para asignarles tareas</Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => openModal()}
            >
              <Ionicons name="add" size={20} color={Colors.white} />
              <Text style={styles.addFirstButtonText}>Agregar Primer Hijo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          children.map((child) => (
            <View key={child.id} style={styles.childCard}>
              <View style={styles.childAvatar}>
                <Image source={getChildAvatarSource(child.gender)} style={styles.childAvatarImage} />
              </View>
              <View style={styles.childInfo}>
                <Text style={styles.childName} numberOfLines={1} ellipsizeMode="tail">
                  {child.name}
                </Text>
                {child.alias && child.alias !== child.name && (
                  <Text style={styles.childAlias} numberOfLines={1} ellipsizeMode="tail">
                    Alias: {child.alias}
                  </Text>
                )}
                <Text style={styles.childAge}>{child.age} años</Text>
                <View style={styles.savingsBadge}>
                  <Ionicons name="leaf-outline" size={12} color={Colors.primary} />
                  <Text style={styles.savingsBadgeText}>
                    Ahorro automático {Number(child.savings_on_approve_percent ?? 0).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.balanceContainer}>
                  <Ionicons name="wallet-outline" size={14} color={Colors.secondary} />
                  <Text style={styles.balanceText}>
                    {family.currency} {child.balance.toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.cardActionButton}
                  onPress={() => handleViewAsChild(child)}
                >
                  <Ionicons name="eye-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cardActionButton}
                  onPress={() => openModal(child)}
                >
                  <Ionicons name="pencil-outline" size={20} color={Colors.warning} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cardActionButton}
                  onPress={() => handleDelete(child)}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingChild ? 'Editar Hijo' : 'Agregar Hijo'}
            </Text>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Nombre del hijo"
                placeholderTextColor={Colors.textLight}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Edad (1-18) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Edad"
                placeholderTextColor={Colors.textLight}
                value={formData.age}
                onChangeText={(text) => setFormData({ ...formData, age: text })}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mujer o Hombre</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    formData.gender === 'mujer' && styles.genderOptionMujerActive,
                  ]}
                  onPress={() => setFormData({ ...formData, gender: 'mujer' })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: formData.gender === 'mujer' }}
                >
                  <Ionicons
                    name="female-outline"
                    size={22}
                    color={formData.gender === 'mujer' ? Colors.white : Colors.accent}
                  />
                  <Text
                    style={[
                      styles.genderOptionText,
                      formData.gender === 'mujer' && styles.genderOptionTextOnPink,
                    ]}
                  >
                    Mujer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    formData.gender === 'hombre' && styles.genderOptionHombreActive,
                  ]}
                  onPress={() => setFormData({ ...formData, gender: 'hombre' })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: formData.gender === 'hombre' }}
                >
                  <Ionicons
                    name="male-outline"
                    size={22}
                    color={formData.gender === 'hombre' ? Colors.white : Colors.primary}
                  />
                  <Text
                    style={[
                      styles.genderOptionText,
                      formData.gender === 'hombre' && styles.genderOptionTextOnBlue,
                    ]}
                  >
                    Hombre
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Alias (opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Apodo o alias"
                placeholderTextColor={Colors.textLight}
                value={formData.alias}
                onChangeText={(text) => setFormData({ ...formData, alias: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PIN (opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="PIN de 4 dígitos"
                placeholderTextColor={Colors.textLight}
                value={formData.pin}
                onChangeText={(text) => setFormData({ ...formData, pin: text })}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
              <Text style={styles.inputHint}>
                El PIN permite al hijo acceder a su vista
              </Text>
            </View>

            {editingChild ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>% del pago al aprobar tareas → ahorro</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textLight}
                  value={formData.savingsPercent}
                  onChangeText={(text) => setFormData({ ...formData, savingsPercent: text })}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputHint}>
                  0 = todo va al saldo. Si hay meta de ahorro activa, esa parte se aparta al aprobar cada tarea (hasta
                  completar la meta).
                </Text>
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Meta preferida (opcional)</Text>
                <TouchableOpacity
                  style={[
                    styles.goalPickRow,
                    !formData.savingsGoalId && styles.goalPickRowActive,
                  ]}
                  onPress={() => setFormData({ ...formData, savingsGoalId: '' })}
                >
                  <Text style={styles.goalPickText}>Primera meta activa (automático)</Text>
                </TouchableOpacity>
                {savingsGoalOptions.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[
                      styles.goalPickRow,
                      formData.savingsGoalId === g.id && styles.goalPickRowActive,
                    ]}
                    onPress={() => setFormData({ ...formData, savingsGoalId: g.id })}
                  >
                    <Text style={styles.goalPickText} numberOfLines={2}>
                      {g.title} ({family?.currency} {g.saved_amount.toFixed(0)} / {g.target_amount.toFixed(0)})
                    </Text>
                  </TouchableOpacity>
                ))}
                {savingsGoalOptions.length === 0 ? (
                  <Text style={styles.inputHint}>Crea una meta de ahorro en Metas → Ahorro para este hijo.</Text>
                ) : null}
              </View>
            ) : null}

            </ScrollView>

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
                  <Text style={styles.saveButtonText}>Guardar</Text>
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
  childCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  childAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.surfaceAlt,
  },
  childAvatarImage: {
    width: '100%',
    height: '100%',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  genderOptionMujerActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  genderOptionHombreActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  genderOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  genderOptionTextOnPink: {
    color: Colors.white,
  },
  genderOptionTextOnBlue: {
    color: Colors.white,
  },
  childInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
    minWidth: 0,
  },
  childName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  childAlias: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  childAge: {
    fontSize: 14,
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
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 4,
    flexShrink: 0,
    alignSelf: 'center',
  },
  cardActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
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
    maxHeight: '90%',
    width: '100%',
    maxWidth: 420,
  },
  modalScroll: {
    maxHeight: 420,
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
  inputHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  goalPickRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    backgroundColor: Colors.background,
  },
  goalPickRowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '14',
  },
  goalPickText: {
    fontSize: 14,
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
