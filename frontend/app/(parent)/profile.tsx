import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { familyAPI, paymentsAPI, childrenAPI } from '../../src/services/api';
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
}

interface Child {
  id: string;
  name: string;
  balance: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, family, setFamily, logout } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [familyName, setFamilyName] = useState(family?.name || '');
  const [familyCurrency, setFamilyCurrency] = useState(family?.currency || 'MXN');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [paymentsData, childrenData] = await Promise.all([
        paymentsAPI.getAll().catch(() => []),
        childrenAPI.getAll().catch(() => []),
      ]);
      setPayments(paymentsData);
      setChildren(childrenData);
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
        setFamilyCurrency(family.currency);
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
      const updated = await familyAPI.update({
        name: familyName.trim(),
        currency: familyCurrency,
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
            <Text style={styles.avatarText}>{user?.name.charAt(0)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Padre/Tutor</Text>
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
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nombre</Text>
                <Text style={styles.infoValue}>{family.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Moneda</Text>
                <Text style={styles.infoValue}>{family.currency}</Text>
              </View>
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
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentIcon}>
                  <Ionicons name="cash" size={20} color={Colors.secondary} />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>{payment.chore_title}</Text>
                  <Text style={styles.paymentChild}>
                    Para: {getChildName(payment.child_id)}
                  </Text>
                  <Text style={styles.paymentDate}>
                    {new Date(payment.created_at).toLocaleDateString('es-ES')}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>
                  {family?.currency} {payment.amount.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Logout Button */}
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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Moneda</Text>
              <View style={styles.currencyOptions}>
                {['MXN', 'USD', 'EUR', 'COP'].map((currency) => (
                  <TouchableOpacity
                    key={currency}
                    style={[
                      styles.currencyOption,
                      familyCurrency === currency && styles.currencyOptionActive,
                    ]}
                    onPress={() => setFamilyCurrency(currency)}
                  >
                    <Text
                      style={[
                        styles.currencyOptionText,
                        familyCurrency === currency && styles.currencyOptionTextActive,
                      ]}
                    >
                      {currency}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

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
  currencyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currencyOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  currencyOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  currencyOptionTextActive: {
    color: Colors.white,
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
