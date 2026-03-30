import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { choresAPI, childrenAPI, savingsGoalsAPI, SavingsSplitPreviewDTO, SavingsGoalDTO } from '../../src/services/api';
import { SavingsSplitPreviewBox } from '../../src/components/SavingsSplitPreviewBox';
import {
  ApproveSavingsControls,
  buildSavingsApproveOpts,
  ApproveSavingsMode,
} from '../../src/components/ApproveSavingsControls';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface Child {
  id: string;
  name: string;
  age: number;
  savings_on_approve_percent?: number;
  savings_on_approve_goal_id?: string | null;
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
  scheduled_date?: string | null;
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

function parseISODateLocal(s: string): Date | null {
  if (!s || s.length < 10) return null;
  const parts = s.trim().slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

// Predefined chores list with relative amount for Ecuador
const predefinedChores = [
  { title: 'Tender la cama', description: 'Tender y acomodar la cama al despertar', amount: 2, icon: 'bed-outline' },
  { title: 'Ordenar el cuarto', description: 'Recoger ropa, juguetes y dejar el cuarto en orden', amount: 3, icon: 'bed-outline' },
  { title: 'Limpiar el cuarto', description: 'Barrer, ordenar y limpiar superficies del cuarto', amount: 4, icon: 'home-outline' },
  { title: 'Limpiar la sala', description: 'Barrer, trapear y ordenar la sala', amount: 5, icon: 'tv-outline' },
  { title: 'Limpiar el comedor', description: 'Limpiar la mesa, sillas y ordenar el comedor', amount: 4, icon: 'restaurant-outline' },
  { title: 'Limpiar la cocina', description: 'Lavar, limpiar la estufa, el mesón y barrer', amount: 6, icon: 'restaurant-outline' },
  { title: 'Lavar los platos', description: 'Lavar y secar todos los platos y utensilios', amount: 4, icon: 'water-outline' },
  { title: 'Guardar los platos', description: 'Secar y guardar platos, vasos y cubiertos', amount: 3, icon: 'file-tray-outline' },
  { title: 'Poner la mesa', description: 'Poner platos, vasos y cubiertos antes de comer', amount: 2, icon: 'grid-outline' },
  { title: 'Recoger la mesa', description: 'Quitar platos, limpiar y dejar la mesa ordenada', amount: 2, icon: 'albums-outline' },
  { title: 'Ayudar con la cena', description: 'Ayudar a preparar la cena o servir la comida', amount: 5, icon: 'restaurant-outline' },
  { title: 'Preparar un desayuno sencillo', description: 'Preparar desayuno básico y dejar limpio', amount: 5, icon: 'cafe-outline' },

  { title: 'Sacar la basura', description: 'Recoger las fundas y sacar la basura', amount: 3, icon: 'trash-outline' },
  { title: 'Separar reciclaje', description: 'Separar plástico, cartón y botellas para reciclar', amount: 3, icon: 'leaf-outline' },
  { title: 'Barrer el patio', description: 'Barrer hojas, tierra y dejar limpio el patio', amount: 4, icon: 'leaf-outline' },
  { title: 'Trapear el piso', description: 'Trapear el piso de una o varias áreas de la casa', amount: 5, icon: 'water-outline' },
  { title: 'Barrer la casa', description: 'Barrer sala, cocina y pasillos', amount: 5, icon: 'home-outline' },
  { title: 'Aspirar la casa', description: 'Aspirar alfombras, muebles y habitaciones', amount: 6, icon: 'home-outline' },
  { title: 'Limpiar el polvo', description: 'Quitar el polvo de muebles, mesas y repisas', amount: 4, icon: 'sparkles-outline' },
  { title: 'Limpiar ventanas', description: 'Limpiar vidrios y marcos de las ventanas', amount: 6, icon: 'scan-outline' },
  { title: 'Limpiar espejos', description: 'Limpiar espejos del baño o dormitorios', amount: 3, icon: 'eye-outline' },
  { title: 'Limpiar el baño', description: 'Limpiar inodoro, lavabo, espejo y piso', amount: 6, icon: 'water-outline' },
  { title: 'Limpiar la nevera', description: 'Sacar productos, limpiar bandejas y ordenar', amount: 8, icon: 'snow-outline' },

  { title: 'Lavar la ropa', description: 'Lavar, tender y recoger la ropa', amount: 8, icon: 'shirt-outline' },
  { title: 'Doblar la ropa', description: 'Doblar y organizar la ropa limpia', amount: 4, icon: 'shirt-outline' },
  { title: 'Guardar la ropa', description: 'Guardar ropa en cajones o closet', amount: 3, icon: 'file-tray-stacked-outline' },
  { title: 'Planchar la ropa', description: 'Planchar y dejar lista la ropa', amount: 8, icon: 'shirt-outline' },
  { title: 'Ordenar el clóset', description: 'Organizar ropa, zapatos y accesorios', amount: 5, icon: 'file-tray-stacked-outline' },

  { title: 'Recoger los juguetes', description: 'Guardar juguetes y ordenar el área', amount: 2, icon: 'cube-outline' },
  { title: 'Guardar los libros', description: 'Ordenar libros, cuadernos y útiles', amount: 2, icon: 'book-outline' },
  { title: 'Organizar la mochila', description: 'Revisar y ordenar cuadernos, útiles y tareas', amount: 3, icon: 'briefcase-outline' },
  { title: 'Hacer la tarea', description: 'Completar las tareas escolares del día', amount: 5, icon: 'book-outline' },
  { title: 'Leer 30 minutos', description: 'Leer un libro o texto asignado por 30 minutos', amount: 3, icon: 'reader-outline' },

  { title: 'Regar las plantas', description: 'Regar macetas y plantas del patio o jardín', amount: 3, icon: 'flower-outline' },
  { title: 'Cuidar el jardín', description: 'Quitar hojas secas y arreglar plantas', amount: 5, icon: 'leaf-outline' },

  { title: 'Alimentar a las mascotas', description: 'Dar comida y agua a las mascotas', amount: 3, icon: 'paw-outline' },
  { title: 'Pasear al perro', description: 'Pasear al perro por 20 a 30 minutos', amount: 4, icon: 'paw-outline' },
  { title: 'Limpiar el área de la mascota', description: 'Limpiar cama, plato o espacio de la mascota', amount: 4, icon: 'paw-outline' },

  { title: 'Lavar el carro', description: 'Lavar, enjuagar y secar el carro', amount: 10, icon: 'car-outline' },
  { title: 'Limpiar por dentro el carro', description: 'Recoger basura y limpiar asientos y tablero', amount: 7, icon: 'car-sport-outline' },

  { title: 'Hacer un mandado', description: 'Ir a la tienda o realizar un encargo cercano', amount: 5, icon: 'storefront-outline' },
  { title: 'Ayudar con las compras', description: 'Cargar, ordenar y guardar las compras', amount: 4, icon: 'cart-outline' },

  { title: 'Cuidar a un hermanito', description: 'Ayudar a vigilar o entretener a un hermanito', amount: 6, icon: 'people-outline' },
  { title: 'Ayudar a poner orden general', description: 'Apoyar en varias tareas pequeñas de la casa', amount: 4, icon: 'home-outline' },
];

export default function ChoresScreen() {
  const router = useRouter();
  const { family } = useAuthStore();
  const [chores, setChores] = useState<Chore[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPredefinedModal, setShowPredefinedModal] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    frequency: 'unica',
    scheduled_date: '',
    consecutive_days: '1',
  });
  const [showDateModal, setShowDateModal] = useState(false);
  const [datePickerTemp, setDatePickerTemp] = useState(new Date());
  const [androidDatePicker, setAndroidDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [confirmApproveChore, setConfirmApproveChore] = useState<Chore | null>(null);
  const [approveSplitPreview, setApproveSplitPreview] = useState<SavingsSplitPreviewDTO | null>(null);
  const [approveSplitLoading, setApproveSplitLoading] = useState(false);
  const [approvingChore, setApprovingChore] = useState(false);
  const [approveSavingsGoals, setApproveSavingsGoals] = useState<SavingsGoalDTO[]>([]);
  const [approveSavingsMode, setApproveSavingsMode] = useState<ApproveSavingsMode>('default');
  const [approveSavingsPercentStr, setApproveSavingsPercentStr] = useState('0');
  const [approveSavingsAmountStr, setApproveSavingsAmountStr] = useState('');
  const [approveSavingsGoalId, setApproveSavingsGoalId] = useState('');

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

  useEffect(() => {
    if (!confirmApproveChore?.completed_by) {
      setApproveSavingsGoals([]);
      return;
    }
    const ch = children.find((c) => c.id === confirmApproveChore.completed_by);
    const pct =
      ch?.savings_on_approve_percent != null && !Number.isNaN(Number(ch.savings_on_approve_percent))
        ? Number(ch.savings_on_approve_percent)
        : 0;
    setApproveSavingsMode('default');
    setApproveSavingsPercentStr(String(pct));
    setApproveSavingsAmountStr('');
    setApproveSavingsGoalId('');
    let cancelled = false;
    savingsGoalsAPI
      .getAll(confirmApproveChore.completed_by)
      .then((data) => {
        if (!cancelled) setApproveSavingsGoals(data);
      })
      .catch(() => {
        if (!cancelled) setApproveSavingsGoals([]);
      });
    return () => {
      cancelled = true;
    };
  }, [confirmApproveChore?.id]);

  useEffect(() => {
    if (!confirmApproveChore?.completed_by) {
      setApproveSplitPreview(null);
      return;
    }
    const amt = confirmApproveChore.amount;
    const opts = buildSavingsApproveOpts(
      approveSavingsMode,
      approveSavingsPercentStr,
      approveSavingsAmountStr,
      approveSavingsGoalId
    );
    let cancelled = false;
    setApproveSplitLoading(true);
    choresAPI
      .previewSavingsSplit(confirmApproveChore.completed_by, amt, opts)
      .then((d) => {
        if (!cancelled) setApproveSplitPreview(d);
      })
      .catch(() => {
        if (!cancelled) setApproveSplitPreview(null);
      })
      .finally(() => {
        if (!cancelled) setApproveSplitLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    confirmApproveChore?.id,
    confirmApproveChore?.completed_by,
    confirmApproveChore?.amount,
    approveSavingsMode,
    approveSavingsPercentStr,
    approveSavingsAmountStr,
    approveSavingsGoalId,
  ]);

  const confirmApproveChild = useMemo(() => {
    if (!confirmApproveChore?.completed_by) return undefined;
    return children.find((c) => c.id === confirmApproveChore.completed_by);
  }, [confirmApproveChore?.completed_by, children]);

  const confirmChildDefaultPct = useMemo(() => {
    if (confirmApproveChild?.savings_on_approve_percent == null) return 0;
    const p = Number(confirmApproveChild.savings_on_approve_percent);
    return Number.isNaN(p) ? 0 : p;
  }, [confirmApproveChild]);

  const submitConfirmedApprove = async () => {
    if (!confirmApproveChore) return;
    setApprovingChore(true);
    try {
      const savingsOpts = buildSavingsApproveOpts(
        approveSavingsMode,
        approveSavingsPercentStr,
        approveSavingsAmountStr,
        approveSavingsGoalId
      );
      await choresAPI.approve(confirmApproveChore.id, savingsOpts);
      setConfirmApproveChore(null);
      Alert.alert('Éxito', 'Tarea aprobada y pago realizado');
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al aprobar';
      Alert.alert('Error', message);
    } finally {
      setApprovingChore(false);
    }
  };

  const openModal = (chore?: Chore) => {
    if (chore) {
      setEditingChore(chore);
      setFormData({
        title: chore.title,
        description: chore.description || '',
        amount: chore.amount.toString(),
        frequency: chore.frequency,
        scheduled_date: chore.scheduled_date
          ? String(chore.scheduled_date).slice(0, 10)
          : '',
        consecutive_days: '1',
      });
      setSelectedChildren(chore.assigned_to);
    } else {
      setEditingChore(null);
      setFormData({
        title: '',
        description: '',
        amount: '',
        frequency: 'unica',
        scheduled_date: '',
        consecutive_days: '1',
      });
      setSelectedChildren([]);
    }
    setShowModal(true);
  };

  const selectPredefinedChore = (predefined: typeof predefinedChores[0]) => {
    setFormData({
      title: predefined.title,
      description: predefined.description,
      amount: predefined.amount.toString(),
      frequency: 'unica',
      scheduled_date: '',
      consecutive_days: '1',
    });
    setShowPredefinedModal(false);
    setShowModal(true);
  };

  const openNewChoreOptions = () => {
    setEditingChore(null);
    setFormData({
      title: '',
      description: '',
      amount: '',
      frequency: 'unica',
      scheduled_date: '',
      consecutive_days: '1',
    });
    setSelectedChildren([]);
    setShowPredefinedModal(true);
  };

  const toggleChildSelection = (childId: string) => {
    setSelectedChildren((prev) =>
      prev.includes(childId)
        ? prev.filter((id) => id !== childId)
        : [...prev, childId]
    );
  };

  const openCalendar = () => {
    setDatePickerTemp(parseISODateLocal(formData.scheduled_date) || new Date());
    if (Platform.OS === 'web') {
      return;
    }
    if (Platform.OS === 'android') {
      setAndroidDatePicker(true);
    } else {
      setShowDateModal(true);
    }
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

    const rawN = parseInt(formData.consecutive_days, 10);
    const consecutiveDays = Number.isFinite(rawN) ? Math.min(31, Math.max(1, rawN)) : 1;
    if (!editingChore && consecutiveDays > 1 && !formData.scheduled_date.trim()) {
      Alert.alert(
        'Fecha requerida',
        'Para crear tareas en días consecutivos elige primero la fecha de inicio en el calendario.'
      );
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
          scheduled_date: formData.scheduled_date.trim() || undefined,
        });
        Alert.alert('Éxito', 'Tarea actualizada correctamente');
      } else {
        const created = await choresAPI.create(
          formData.title.trim(),
          formData.description.trim() || undefined,
          amount,
          formData.frequency,
          selectedChildren,
          formData.scheduled_date.trim() || undefined,
          consecutiveDays
        );
        const list = Array.isArray(created) ? created : [created];
        Alert.alert(
          'Éxito',
          list.length > 1
            ? `Se crearon ${list.length} tareas (una por cada día consecutivo).`
            : 'Tarea creada correctamente'
        );
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
          onPress={openNewChoreOptions}
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
                    <Text style={styles.commentText}>
                      «{chore.comment}»
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.choreActions}>
                {chore.status === 'completada' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => setConfirmApproveChore(chore)}
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
                <Text style={styles.frequencyHint}>
                  Única: un solo ciclo. Diaria: pensada para repetir cada día. Semanal: cada semana. Usa la
                  fecha y «días consecutivos» para planificar varios días seguidos en el calendario.
                </Text>
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
                <Text style={styles.inputLabel}>Fecha en calendario (opcional)</Text>
                <Text style={styles.fieldHint}>Se muestra en Tareas → Calendario (formato AAAA-MM-DD)</Text>
                {Platform.OS === 'web' ? (
                  <TextInput
                    style={styles.textInput}
                    placeholder="2026-03-15"
                    placeholderTextColor={Colors.textLight}
                    value={formData.scheduled_date}
                    onChangeText={(text) => setFormData({ ...formData, scheduled_date: text })}
                  />
                ) : (
                  <>
                    <View style={styles.dateRow}>
                      <TouchableOpacity style={styles.datePickerBtn} onPress={openCalendar}>
                        <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
                        <Text style={styles.datePickerBtnText} numberOfLines={1}>
                          {formData.scheduled_date.trim()
                            ? formData.scheduled_date
                            : 'Elegir fecha en calendario'}
                        </Text>
                      </TouchableOpacity>
                      {formData.scheduled_date.trim() ? (
                        <TouchableOpacity
                          onPress={() => setFormData({ ...formData, scheduled_date: '' })}
                          hitSlop={8}
                        >
                          <Text style={styles.clearDate}>Quitar</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    {androidDatePicker ? (
                      <DateTimePicker
                        value={parseISODateLocal(formData.scheduled_date) || new Date()}
                        mode="date"
                        display="default"
                        onChange={(e, d) => {
                          setAndroidDatePicker(false);
                          if (e.type === 'dismissed' || !d) return;
                          setFormData((prev) => ({ ...prev, scheduled_date: toISODateLocal(d) }));
                        }}
                      />
                    ) : null}
                    {Platform.OS === 'ios' ? (
                      <Modal visible={showDateModal} transparent animationType="slide">
                        <View style={styles.dateModalOverlay}>
                          <View style={styles.dateModalSheet}>
                            <View style={styles.dateModalToolbar}>
                              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                                <Text style={styles.dateModalToolbarBtn}>Cancelar</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    scheduled_date: toISODateLocal(datePickerTemp),
                                  }));
                                  setShowDateModal(false);
                                }}
                              >
                                <Text style={[styles.dateModalToolbarBtn, styles.dateModalToolbarDone]}>
                                  Listo
                                </Text>
                              </TouchableOpacity>
                            </View>
                            <DateTimePicker
                              value={datePickerTemp}
                              mode="date"
                              display="spinner"
                              onChange={(_, d) => d && setDatePickerTemp(d)}
                              themeVariant="light"
                            />
                          </View>
                        </View>
                      </Modal>
                    ) : null}
                  </>
                )}
              </View>

              {!editingChore ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Días consecutivos</Text>
                  <Text style={styles.fieldHint}>
                    Número de días seguidos con la misma tarea (1 = un solo día). Si es mayor a 1, debes
                    elegir la fecha de inicio arriba. Máximo 31.
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="1"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="number-pad"
                    value={formData.consecutive_days}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        consecutive_days: text.replace(/[^0-9]/g, '') || '1',
                      })
                    }
                  />
                </View>
              ) : null}

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

      {/* Predefined Chores Modal */}
      <Modal
        visible={showPredefinedModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPredefinedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.predefinedModalContent}>
            <View style={styles.predefinedModalHeader}>
              <Text style={styles.modalTitle}>Nueva Tarea</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPredefinedModal(false)}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.predefinedSubtitle}>
              Selecciona una tarea predefinida o crea una personalizada
            </Text>

            {/* Custom Task Button */}
            <TouchableOpacity
              style={styles.customTaskButton}
              onPress={() => {
                setShowPredefinedModal(false);
                setShowModal(true);
              }}
            >
              <View style={styles.customTaskIcon}>
                <Ionicons name="create-outline" size={24} color={Colors.white} />
              </View>
              <View style={styles.customTaskInfo}>
                <Text style={styles.customTaskTitle}>Tarea Personalizada</Text>
                <Text style={styles.customTaskDesc}>Crea una tarea con tu descripción</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.predefinedSectionTitle}>Tareas Predefinidas</Text>

            <ScrollView style={styles.predefinedList} showsVerticalScrollIndicator={false}>
              {predefinedChores.map((chore, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.predefinedItem}
                  onPress={() => selectPredefinedChore(chore)}
                >
                  <View style={[styles.predefinedIcon, { backgroundColor: index % 3 === 0 ? Colors.primary + '20' : index % 3 === 1 ? Colors.secondary + '20' : Colors.accent + '20' }]}>
                    <Ionicons 
                      name={chore.icon as any} 
                      size={22} 
                      color={index % 3 === 0 ? Colors.primary : index % 3 === 1 ? Colors.secondary : Colors.accent} 
                    />
                  </View>
                  <View style={styles.predefinedInfo}>
                    <Text style={styles.predefinedTitle}>{chore.title}</Text>
                    <Text style={styles.predefinedDesc} numberOfLines={1}>{chore.description}</Text>
                  </View>
                  <Text style={styles.predefinedAmount}>
                    {family?.currency} {chore.amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!confirmApproveChore}
        animationType="fade"
        transparent
        onRequestClose={() => setConfirmApproveChore(null)}
      >
        <View style={styles.approveModalOverlay}>
          <View style={[styles.approveConfirmBox, { maxHeight: '92%' }]}>
            {confirmApproveChore ? (
              <>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 440 }}
                >
                  <Text style={styles.modalTitle}>Confirmar aprobación</Text>
                  <Text style={styles.approveChoreTitle}>{confirmApproveChore.title}</Text>
                  <Text style={styles.approveSub}>
                    Monto de la tarea: {family?.currency} {confirmApproveChore.amount.toFixed(2)}
                  </Text>
                  {confirmApproveChore.completed_by ? (
                    <>
                      <ApproveSavingsControls
                        currency={family?.currency ?? ''}
                        childDefaultPercent={confirmChildDefaultPct}
                        goals={approveSavingsGoals}
                        mode={approveSavingsMode}
                        onModeChange={(m) => {
                          setApproveSavingsMode(m);
                          if (m === 'percent' && confirmApproveChild?.savings_on_approve_percent != null) {
                            const p = Number(confirmApproveChild.savings_on_approve_percent);
                            if (!Number.isNaN(p)) setApproveSavingsPercentStr(String(p));
                          }
                        }}
                        percentStr={approveSavingsPercentStr}
                        onPercentStrChange={setApproveSavingsPercentStr}
                        amountStr={approveSavingsAmountStr}
                        onAmountStrChange={setApproveSavingsAmountStr}
                        goalId={approveSavingsGoalId}
                        onGoalIdChange={setApproveSavingsGoalId}
                      />
                      <SavingsSplitPreviewBox
                        currency={family?.currency ?? ''}
                        loading={approveSplitLoading}
                        preview={approveSplitPreview}
                      />
                    </>
                  ) : null}
                </ScrollView>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setConfirmApproveChore(null)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, approvingChore && styles.buttonDisabled]}
                    onPress={submitConfirmedApprove}
                    disabled={approvingChore}
                  >
                    {approvingChore ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={styles.saveButtonText}>Aprobar y pagar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
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
  approveModalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  approveConfirmBox: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  approveChoreTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  approveSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
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
  frequencyHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 10,
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  datePickerBtnText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  clearDate: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
  dateModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  dateModalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  dateModalToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  dateModalToolbarBtn: {
    fontSize: 17,
    color: Colors.primary,
  },
  dateModalToolbarDone: {
    fontWeight: '700',
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
  // Predefined Modal Styles
  predefinedModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  predefinedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeButton: {
    padding: 8,
  },
  predefinedSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  customTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  customTaskIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customTaskInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  customTaskDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  predefinedSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  predefinedList: {
    maxHeight: 400,
  },
  predefinedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  predefinedIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  predefinedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  predefinedTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  predefinedDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  predefinedAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary,
  },
});
