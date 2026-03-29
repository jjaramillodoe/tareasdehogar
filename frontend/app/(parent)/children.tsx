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
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { childrenAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface Child {
  id: string;
  name: string;
  age: number;
  alias?: string;
  balance: number;
  family_id: string;
}

export default function ChildrenScreen() {
  const router = useRouter();
  const { family, setSelectedChild } = useAuthStore();
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    alias: '',
    pin: '',
  });
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

  const openModal = (child?: Child) => {
    if (child) {
      setEditingChild(child);
      setFormData({
        name: child.name,
        age: child.age.toString(),
        alias: child.alias || '',
        pin: '',
      });
    } else {
      setEditingChild(null);
      setFormData({ name: '', age: '', alias: '', pin: '' });
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
        await childrenAPI.update(editingChild.id, {
          name: formData.name.trim(),
          age,
          alias: formData.alias.trim() || undefined,
          pin: formData.pin || undefined,
        });
        Alert.alert('Éxito', 'Hijo actualizado correctamente');
      } else {
        await childrenAPI.create(
          formData.name.trim(),
          age,
          formData.alias.trim() || undefined,
          formData.pin || undefined
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
                <Text style={styles.childInitial}>{child.name.charAt(0)}</Text>
              </View>
              <View style={styles.childInfo}>
                <Text style={styles.childName}>{child.name}</Text>
                {child.alias && child.alias !== child.name && (
                  <Text style={styles.childAlias}>Alias: {child.alias}</Text>
                )}
                <Text style={styles.childAge}>{child.age} años</Text>
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
    alignItems: 'center',
    marginBottom: 12,
  },
  childAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  childInfo: {
    flex: 1,
    marginLeft: 16,
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
  },
  cardActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
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
