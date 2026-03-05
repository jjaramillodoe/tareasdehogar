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
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { familyAPI, childrenAPI, choresAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface Child {
  id: string;
  name: string;
  age: number;
  alias?: string;
  balance: number;
}

interface Chore {
  id: string;
  title: string;
  amount: number;
  status: string;
  completed_by?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, family, setFamily, refreshUser, logout } = useAuthStore();
  const [children, setChildren] = useState<Child[]>([]);
  const [pendingChores, setPendingChores] = useState<Chore[]>([]);
  const [completedChores, setCompletedChores] = useState<Chore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [familyCurrency, setFamilyCurrency] = useState('MXN');
  const [creatingFamily, setCreatingFamily] = useState(false);

  const loadData = async () => {
    try {
      await refreshUser();
      
      if (user?.family_id) {
        try {
          const familyData = await familyAPI.getMy();
          setFamily(familyData);
          
          const childrenData = await childrenAPI.getAll();
          setChildren(childrenData);
          
          const allChores = await choresAPI.getAll();
          setPendingChores(allChores.filter((c: Chore) => c.status === 'completada'));
          setCompletedChores(allChores.filter((c: Chore) => c.status === 'aprobada'));
        } catch (e) {
          console.log('No family yet');
        }
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
    }, [user?.family_id])
  );

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para la familia');
      return;
    }

    setCreatingFamily(true);
    try {
      const newFamily = await familyAPI.create(familyName.trim(), familyCurrency);
      setFamily(newFamily);
      await refreshUser();
      setShowFamilyModal(false);
      setFamilyName('');
      Alert.alert('Éxito', 'Familia creada correctamente');
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al crear la familia';
      Alert.alert('Error', message);
    } finally {
      setCreatingFamily(false);
    }
  };

  const handleApproveChore = async (choreId: string) => {
    try {
      await choresAPI.approve(choreId);
      Alert.alert('Éxito', 'Tarea aprobada y pago realizado');
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al aprobar la tarea';
      Alert.alert('Error', message);
    }
  };

  const handleRejectChore = async (choreId: string) => {
    Alert.alert(
      'Rechazar tarea',
      '¿Estás seguro de rechazar esta tarea?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              await choresAPI.reject(choreId);
              Alert.alert('Éxito', 'Tarea rechazada');
              loadData();
            } catch (error: any) {
              const message = error.response?.data?.detail || 'Error al rechazar la tarea';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const getChildName = (childId: string) => {
    const child = children.find(c => c.id === childId);
    return child?.name || 'Desconocido';
  };

  const totalBalance = children.reduce((sum, child) => sum + child.balance, 0);

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
        <View>
          <Text style={styles.greeting}>¡Hola, {user?.name}!</Text>
          <Text style={styles.subtitle}>
            {family ? `Familia ${family.name}` : 'Sin familia'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert('Cerrar Sesión', '¿Deseas cerrar sesión?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Cerrar Sesión', onPress: () => { logout(); router.replace('/'); } },
            ]);
          }}
        >
          <Ionicons name="log-out-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
      >
        {!family ? (
          <View style={styles.noFamilyContainer}>
            <Ionicons name="home-outline" size={64} color={Colors.textLight} />
            <Text style={styles.noFamilyText}>Aún no tienes una familia creada</Text>
            <Text style={styles.noFamilySubtext}>
              Crea tu familia para empezar a agregar hijos y tareas
            </Text>
            <TouchableOpacity
              style={styles.createFamilyButton}
              onPress={() => setShowFamilyModal(true)}
            >
              <Ionicons name="add" size={20} color={Colors.white} />
              <Text style={styles.createFamilyButtonText}>Crear Familia</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: Colors.primary }]}>
                <Ionicons name="people" size={24} color={Colors.white} />
                <Text style={styles.statValue}>{children.length}</Text>
                <Text style={styles.statLabel}>Hijos</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: Colors.secondary }]}>
                <Ionicons name="cash" size={24} color={Colors.white} />
                <Text style={styles.statValue}>
                  {family.currency} {totalBalance.toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>Saldo Total</Text>
              </View>
            </View>

            {/* Pending Approvals */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tareas por Aprobar</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingChores.length}</Text>
                </View>
              </View>
              {pendingChores.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No hay tareas pendientes de aprobación</Text>
                </View>
              ) : (
                pendingChores.map((chore) => (
                  <View key={chore.id} style={styles.choreCard}>
                    <View style={styles.choreInfo}>
                      <Text style={styles.choreTitle}>{chore.title}</Text>
                      <Text style={styles.choreChild}>
                        Completada por: {getChildName(chore.completed_by || '')}
                      </Text>
                      <Text style={styles.choreAmount}>
                        {family.currency} {chore.amount.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.choreActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApproveChore(chore.id)}
                      >
                        <Ionicons name="checkmark" size={20} color={Colors.white} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleRejectChore(chore.id)}
                      >
                        <Ionicons name="close" size={20} color={Colors.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => router.push('/(parent)/children')}
                >
                  <Ionicons name="person-add" size={24} color={Colors.primary} />
                  <Text style={styles.quickActionText}>Agregar Hijo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => router.push('/(parent)/chores')}
                >
                  <Ionicons name="add-circle" size={24} color={Colors.secondary} />
                  <Text style={styles.quickActionText}>Nueva Tarea</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Children Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resumen de Hijos</Text>
              {children.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Aún no hay hijos registrados</Text>
                  <TouchableOpacity onPress={() => router.push('/(parent)/children')}>
                    <Text style={styles.emptyStateLink}>Agregar primer hijo</Text>
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
                      <Text style={styles.childAge}>{child.age} años</Text>
                    </View>
                    <View style={styles.childBalance}>
                      <Text style={styles.balanceLabel}>Saldo</Text>
                      <Text style={styles.balanceValue}>
                        {family.currency} {child.balance.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Create Family Modal */}
      <Modal
        visible={showFamilyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFamilyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear Familia</Text>
            
            <View style={styles.modalInput}>
              <Text style={styles.inputLabel}>Nombre de la Familia</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Familia García"
                placeholderTextColor={Colors.textLight}
                value={familyName}
                onChangeText={setFamilyName}
              />
            </View>

            <View style={styles.modalInput}>
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
                style={styles.modalCancelButton}
                onPress={() => setShowFamilyModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, creatingFamily && styles.buttonDisabled]}
                onPress={handleCreateFamily}
                disabled={creatingFamily}
              >
                {creatingFamily ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Crear</Text>
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
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  noFamilyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noFamilyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  noFamilySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createFamilyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createFamilyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  badge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
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
  emptyStateLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  choreCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  choreInfo: {
    flex: 1,
  },
  choreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  choreChild: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  choreAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
    marginTop: 4,
  },
  choreActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  childCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  childInfo: {
    flex: 1,
    marginLeft: 12,
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  childAge: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  childBalance: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
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
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
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
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalSubmitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
