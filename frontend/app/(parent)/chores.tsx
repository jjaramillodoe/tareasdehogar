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
  TextInput,
  Platform,
  Pressable,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { choresAPI, childrenAPI, savingsGoalsAPI, SavingsSplitPreviewDTO, SavingsGoalDTO } from '../../src/services/api';
import { SavingsSplitPreviewBox } from '../../src/components/SavingsSplitPreviewBox';
import {
  ApproveSavingsControls,
  buildSavingsApproveOpts,
  ApproveSavingsMode,
} from '../../src/components/ApproveSavingsControls';
import AppModal, { AppModalActions, modalFieldStyles } from '../../src/components/AppModal';
import { Ionicons } from '@expo/vector-icons';
import ParentScreenShell, { ParentHeaderAddButton } from '../../src/components/ParentScreenShell';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Chip from '../../src/components/ui/Chip';
import IconTile from '../../src/components/ui/IconTile';
import Notice from '../../src/components/ui/Notice';
import SquareIconButton from '../../src/components/ui/SquareIconButton';
import { Colors, Radius, Spacing, Tone, Type } from '../../src/theme';
import { getChildAvatarSource } from '../../src/utils/avatars';
import { shadow } from '../../src/utils/shadow';


interface Child {
  id: string;
  name: string;
  age: number;
  gender?: 'mujer' | 'hombre' | null;
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

const statusTones: Record<string, Tone> = {
  pendiente: 'neutral',
  completada: 'warning',
  aprobada: 'success',
  rechazada: 'accent',
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
  const insets = useSafeAreaInsets();
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
  const [approveSavingsReasonNote, setApproveSavingsReasonNote] = useState('');

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
    setApproveSavingsReasonNote('');
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
      await choresAPI.approve(confirmApproveChore.id, {
        ...savingsOpts,
        savings_reason_note: approveSavingsReasonNote.trim() || undefined,
      });
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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      pendiente: 0,
      completada: 0,
      aprobada: 0,
      rechazada: 0,
    };
    for (const c of chores) {
      if (counts[c.status] != null) counts[c.status] += 1;
    }
    return counts;
  }, [chores]);

  const pendingReviewCount = statusCounts.completada;

  if (!family) {
    return (
      <ParentScreenShell title="Tareas" subtitle="Asigna y aprueba recompensas">
        <View style={styles.contentInner}>
          <Card style={styles.emptyCard}>
            <IconTile icon="home" size={64} />
            <Text style={[Type.heading, styles.center]}>Primero debes crear una familia</Text>
            <Button
              label="Ir a Inicio"
              variant="secondary"
              style={styles.emptyButton}
              onPress={() => router.push('/(parent)/home')}
            />
          </Card>
        </View>
      </ParentScreenShell>
    );
  }

  return (
    <ParentScreenShell
      title="Tareas"
      subtitle={
        isLoading
          ? 'Cargando…'
          : chores.length === 0
            ? 'Crea la primera tarea familiar'
            : pendingReviewCount > 0
              ? `${pendingReviewCount} por aprobar · ${chores.length} total`
              : `${chores.length} tarea${chores.length === 1 ? '' : 's'} en total`
      }
      loading={isLoading}
      headerRight={<ParentHeaderAddButton onPress={openNewChoreOptions} />}
    >
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {([null, 'pendiente', 'completada', 'aprobada', 'rechazada'] as const).map((status) => {
            const active = filter === status;
            const count = status ? statusCounts[status] : chores.length;
            return (
              <Pressable
                key={status ?? 'all'}
                style={[styles.filterTab, active && styles.filterTabActive]}
                onPress={() => setFilter(status)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                {status ? (
                  <View style={[styles.filterDot, { backgroundColor: active ? Colors.white : statusColors[status] }]} />
                ) : null}
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                  {status ? statusLabels[status] : 'Todas'}
                </Text>
                <Text style={[styles.filterCount, active && styles.filterCountActive]}>{count}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {children.length === 0 ? (
          <Card style={styles.emptyCard}>
            <IconTile icon="people" size={64} />
            <Text style={[Type.heading, styles.center]}>Primero agrega hijos</Text>
            <Text style={[Type.body, styles.center]}>Necesitas hijos registrados para asignar tareas.</Text>
            <Button
              label="Ir a Hijos"
              variant="secondary"
              style={styles.emptyButton}
              onPress={() => router.push('/(parent)/children')}
            />
          </Card>
        ) : filteredChores.length === 0 ? (
          <Card style={styles.emptyCard}>
            <IconTile icon="clipboard" size={64} />
            <Text style={[Type.heading, styles.center]}>
              {filter ? 'No hay tareas con este estado' : 'Aún no hay tareas'}
            </Text>
            <Text style={[Type.body, styles.center]}>
              {filter ? 'Prueba con otro filtro.' : 'Crea tareas para tus hijos.'}
            </Text>
            {!filter ? (
              <Button
                label="Crear primera tarea"
                icon="add"
                style={styles.emptyButton}
                onPress={() => openModal()}
              />
            ) : null}
          </Card>
        ) : (
          filteredChores.map((chore) => {
            const assignees = chore.assigned_to
              .map((id) => children.find((c) => c.id === id))
              .filter((c): c is Child => Boolean(c));
            const completer = children.find((c) => c.id === chore.completed_by);
            const showCompleter = chore.status === 'completada' && Boolean(completer);
            const showAssignees = !(showCompleter && assignees.length === 1 && assignees[0].id === completer?.id);
            return (
              <Card key={chore.id} style={styles.choreCard}>
                <View style={styles.choreHeader}>
                  <View style={styles.choreInfo}>
                    <Text style={Type.heading} numberOfLines={2}>
                      {chore.title}
                    </Text>
                    <View style={styles.choreMeta}>
                      <Chip label={statusLabels[chore.status]} tone={statusTones[chore.status] ?? 'neutral'} />
                      <Chip label={frequencyLabels[chore.frequency]} icon="repeat" tone="neutral" />
                    </View>
                  </View>
                  <Text style={styles.choreAmount}>
                    {family.currency} {chore.amount.toFixed(2)}
                  </Text>
                </View>

                {chore.description ? (
                  <Text style={Type.caption} numberOfLines={3}>
                    {chore.description}
                  </Text>
                ) : null}

                {showAssignees ? (
                  <View style={styles.assignedTo}>
                    <View style={styles.avatarStack}>
                      {assignees.slice(0, 3).map((c, i) => (
                        <Image
                          key={c.id}
                          source={getChildAvatarSource(c.gender)}
                          style={[styles.assigneeAvatar, i > 0 && styles.assigneeAvatarOverlap]}
                        />
                      ))}
                    </View>
                    <Text style={[Type.caption, styles.flex1]} numberOfLines={1}>
                      {getChildNames(chore.assigned_to)}
                    </Text>
                  </View>
                ) : null}

                {showCompleter && completer ? (
                  <Notice tone="primary" icon="checkmark-circle">
                    Completada por {completer.name}
                    {chore.comment ? ` · «${chore.comment}»` : ''}
                  </Notice>
                ) : null}

                <View style={styles.choreActions}>
                  {chore.status === 'completada' ? (
                    <>
                      <Button
                        label="Rechazar"
                        variant="secondary"
                        size="sm"
                        fullWidth={false}
                        style={styles.flex1}
                        onPress={() => handleReject(chore.id)}
                      />
                      <Button
                        label="Aprobar"
                        icon="checkmark"
                        size="sm"
                        fullWidth={false}
                        style={styles.flex1}
                        onPress={() => setConfirmApproveChore(chore)}
                      />
                    </>
                  ) : chore.status === 'rechazada' || chore.status === 'aprobada' ? (
                    <Button
                      label="Restablecer"
                      icon="refresh"
                      variant="secondary"
                      size="sm"
                      fullWidth={false}
                      style={styles.flex1}
                      onPress={() => handleReset(chore.id)}
                    />
                  ) : (
                    <View style={styles.flex1} />
                  )}
                  <SquareIconButton icon="create-outline" label={`Editar ${chore.title}`} onPress={() => openModal(chore)} />
                  <SquareIconButton
                    icon="trash-outline"
                    label={`Eliminar ${chore.title}`}
                    tone="danger"
                    onPress={() => handleDelete(chore)}
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <AppModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editingChore ? 'Editar Tarea' : 'Crear Tarea'}
        icon={editingChore ? 'create' : 'add-circle'}
        iconTone="primary"
        size="lg"
        footer={
          <AppModalActions
            onCancel={() => setShowModal(false)}
            confirmLabel={editingChore ? 'Guardar' : 'Crear tarea'}
            onConfirm={handleSave}
            confirming={saving}
          />
        }
      >
        <Text style={modalFieldStyles.label}>Título *</Text>
        <TextInput
          style={modalFieldStyles.input}
          placeholder="Ej: Limpiar cuarto"
          placeholderTextColor={Colors.textLight}
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
        />

        <Text style={modalFieldStyles.label}>Descripción de la tarea</Text>
        <TextInput
          style={[modalFieldStyles.input, modalFieldStyles.inputMultiline]}
          placeholder="Descripción detallada..."
          placeholderTextColor={Colors.textLight}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={3}
        />

        <Text style={modalFieldStyles.label}>Monto a pagar ({family.currency}) *</Text>
        <TextInput
          style={modalFieldStyles.input}
          placeholder="0.00"
          placeholderTextColor={Colors.textLight}
          value={formData.amount}
          onChangeText={(text) => setFormData({ ...formData, amount: text })}
          keyboardType="decimal-pad"
        />

        <Text style={modalFieldStyles.label}>Frecuencia</Text>
        <Text style={modalFieldStyles.hint}>
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

        <Text style={modalFieldStyles.label}>Fecha en calendario (opcional)</Text>
        <Text style={modalFieldStyles.hint}>
          Se muestra en Tareas → Calendario (formato AAAA-MM-DD)
        </Text>
        {Platform.OS === 'web' ? (
          <TextInput
            style={modalFieldStyles.input}
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
              <AppModal
                visible={showDateModal}
                onClose={() => setShowDateModal(false)}
                title="Elegir fecha"
                icon="calendar"
                iconTone="primary"
                variant="card"
                scrollable={false}
                footer={
                  <AppModalActions
                    onCancel={() => setShowDateModal(false)}
                    confirmLabel="Listo"
                    onConfirm={() => {
                      setFormData((prev) => ({
                        ...prev,
                        scheduled_date: toISODateLocal(datePickerTemp),
                      }));
                      setShowDateModal(false);
                    }}
                  />
                }
              >
                <DateTimePicker
                  value={datePickerTemp}
                  mode="date"
                  display="spinner"
                  onChange={(_, d) => d && setDatePickerTemp(d)}
                  themeVariant="light"
                />
              </AppModal>
            ) : null}
          </>
        )}

        {!editingChore ? (
          <>
            <Text style={modalFieldStyles.label}>Días consecutivos</Text>
            <Text style={modalFieldStyles.hint}>
              Número de días seguidos con la misma tarea (1 = un solo día). Si es mayor a 1, debes
              elegir la fecha de inicio arriba. Máximo 31.
            </Text>
            <TextInput
              style={modalFieldStyles.input}
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
          </>
        ) : null}

        <Text style={modalFieldStyles.label}>Asignar a *</Text>
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
                  selectedChildren.includes(child.id) && styles.childOptionCheckActive,
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
      </AppModal>

      <AppModal
        visible={showPredefinedModal}
        onClose={() => setShowPredefinedModal(false)}
        title="Nueva Tarea"
        subtitle="Selecciona una tarea predefinida o crea una personalizada"
        icon="list"
        iconTone="primary"
        size="lg"
      >
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

        {predefinedChores.map((chore, index) => (
          <TouchableOpacity
            key={index}
            style={styles.predefinedItem}
            onPress={() => selectPredefinedChore(chore)}
          >
            <View
              style={[
                styles.predefinedIcon,
                {
                  backgroundColor:
                    index % 3 === 0
                      ? Colors.primary + '20'
                      : index % 3 === 1
                        ? Colors.secondary + '20'
                        : Colors.accent + '20',
                },
              ]}
            >
              <Ionicons
                name={chore.icon as any}
                size={22}
                color={
                  index % 3 === 0
                    ? Colors.primary
                    : index % 3 === 1
                      ? Colors.secondary
                      : Colors.accent
                }
              />
            </View>
            <View style={styles.predefinedInfo}>
              <Text style={styles.predefinedTitle}>{chore.title}</Text>
              <Text style={styles.predefinedDesc} numberOfLines={1}>
                {chore.description}
              </Text>
            </View>
            <Text style={styles.predefinedAmount}>
              {family?.currency} {chore.amount}
            </Text>
          </TouchableOpacity>
        ))}
      </AppModal>

      <AppModal
        visible={!!confirmApproveChore}
        onClose={() => setConfirmApproveChore(null)}
        title="Confirmar aprobación"
        subtitle={
          confirmApproveChore
            ? `${confirmApproveChore.title} · ${family?.currency} ${confirmApproveChore.amount.toFixed(2)}`
            : undefined
        }
        icon="checkmark-circle"
        iconTone="success"
        size="lg"
        footer={
          <AppModalActions
            onCancel={() => setConfirmApproveChore(null)}
            confirmLabel="Aprobar y pagar"
            onConfirm={submitConfirmedApprove}
            confirming={approvingChore}
            confirmTone="success"
          />
        }
      >
        {confirmApproveChore?.completed_by ? (
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
              reasonNote={approveSavingsReasonNote}
              onReasonNoteChange={setApproveSavingsReasonNote}
            />
            <SavingsSplitPreviewBox
              currency={family?.currency ?? ''}
              loading={approveSplitLoading}
              preview={approveSplitPreview}
            />
          </>
        ) : null}
      </AppModal>
    </ParentScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  center: {
    textAlign: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
  },
  emptyButton: {
    marginTop: Spacing.sm,
  },
  filterContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  filterScroll: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderDark,
  },
  filterTabActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  filterCount: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textLight,
  },
  filterCountActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  choreCard: {
    gap: Spacing.md,
  },
  choreHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  choreInfo: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
  },
  choreMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choreAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.secondaryInk,
  },
  assignedTo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  assigneeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  assigneeAvatarOverlap: {
    marginLeft: -8,
  },
  choreActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  frequencyOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
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
    fontWeight: '700',
    color: Colors.secondaryInk,
  },
});
