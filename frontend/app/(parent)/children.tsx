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
  TextInput,
  Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { childrenAPI, savingsGoalsAPI, SavingsGoalDTO } from '../../src/services/api';
import ParentScreenShell, { ParentHeaderAddButton } from '../../src/components/ParentScreenShell';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Chip from '../../src/components/ui/Chip';
import IconTile from '../../src/components/ui/IconTile';
import SquareIconButton from '../../src/components/ui/SquareIconButton';
import { Colors, Spacing, Type } from '../../src/theme';
import AppModal, { AppModalActions, modalFieldStyles } from '../../src/components/AppModal';
import { getChildAvatarSource } from '../../src/utils/avatars';

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
  current_streak?: number;
}

export default function ChildrenScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

    if (!editingChild && formData.pin.trim().length < 4) {
      Alert.alert('PIN requerido', 'Asigna un PIN de al menos 4 dígitos para que pueda entrar solo.');
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
          formData.pin.trim(),
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
    router.push('/(child)/home');
  };

  const totalBalance = children.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);

  if (!family) {
    return (
      <ParentScreenShell title="Hijos" subtitle="Gestiona perfiles familiares">
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
      title="Hijos"
      subtitle={
        isLoading
          ? 'Cargando…'
          : children.length === 0
            ? 'Agrega perfiles para empezar'
            : `${children.length} perfil${children.length === 1 ? '' : 'es'} · ${family.currency} ${totalBalance.toFixed(2)}`
      }
      loading={isLoading}
      headerRight={<ParentHeaderAddButton onPress={() => openModal()} />}
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadChildren();
            }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {children.length === 0 ? (
          <Card style={styles.emptyCard}>
            <IconTile icon="people" size={64} />
            <Text style={[Type.heading, styles.center]}>Aún no hay hijos registrados</Text>
            <Text style={[Type.body, styles.center]}>Agrega a tus hijos para asignarles tareas.</Text>
            <Button
              label="Agregar primer hijo"
              icon="person-add"
              style={styles.emptyButton}
              onPress={() => openModal()}
            />
          </Card>
        ) : (
          children.map((child) => {
            const savingsPct = Number(child.savings_on_approve_percent ?? 0);
            const streak = Number(child.current_streak || 0);
            return (
              <Card key={child.id} style={styles.childCard}>
                <View style={styles.childTopRow}>
                  <Image source={getChildAvatarSource(child.gender)} style={styles.childAvatar} />
                  <View style={styles.childInfo}>
                    <Text style={Type.heading} numberOfLines={1}>
                      {child.name}
                    </Text>
                    <Text style={Type.caption} numberOfLines={1}>
                      {child.age} años
                      {child.alias && child.alias !== child.name ? ` · ${child.alias}` : ''}
                    </Text>
                  </View>
                  <View style={styles.balance}>
                    <Text style={styles.balanceValue}>{child.balance.toFixed(2)}</Text>
                    <Text style={Type.caption}>Saldo {family.currency}</Text>
                  </View>
                </View>

                <View style={styles.chipsRow}>
                  <Chip label={`Ahorro automático ${savingsPct.toFixed(0)}%`} icon="leaf" tone="primary" />
                  {streak > 0 ? (
                    <Chip label={`Racha ${streak} día${streak === 1 ? '' : 's'}`} icon="flame" tone="warning" />
                  ) : null}
                </View>

                <View style={styles.cardActions}>
                  <Button
                    label="Ver como hijo"
                    icon="eye-outline"
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    style={styles.flex1}
                    onPress={() => handleViewAsChild(child)}
                  />
                  <Button
                    label="Editar"
                    icon="create-outline"
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    style={styles.flex1}
                    onPress={() => openModal(child)}
                  />
                  <SquareIconButton
                    icon="trash-outline"
                    label={`Eliminar ${child.name}`}
                    tone="danger"
                    onPress={() => handleDelete(child)}
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
        title={editingChild ? 'Editar Hijo' : 'Agregar Hijo'}
        icon={editingChild ? 'create' : 'person-add'}
        iconTone="primary"
        size="lg"
        footer={
          <AppModalActions
            onCancel={() => setShowModal(false)}
            confirmLabel="Guardar"
            onConfirm={handleSave}
            confirming={saving}
          />
        }
      >
        <Text style={modalFieldStyles.label}>Nombre *</Text>
        <TextInput
          style={modalFieldStyles.input}
          placeholder="Nombre del hijo"
          placeholderTextColor={Colors.textLight}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />

        <Text style={modalFieldStyles.label}>Edad (1-18) *</Text>
        <TextInput
          style={modalFieldStyles.input}
          placeholder="Edad"
          placeholderTextColor={Colors.textLight}
          value={formData.age}
          onChangeText={(text) => setFormData({ ...formData, age: text })}
          keyboardType="numeric"
          maxLength={2}
        />

        <Text style={modalFieldStyles.label}>Niña o Niño</Text>
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
            <Image
              source={getChildAvatarSource('mujer')}
              style={[
                styles.genderAvatarPreview,
                formData.gender === 'mujer' && styles.genderAvatarPreviewActive,
              ]}
            />
            <Text
              style={[
                styles.genderOptionText,
                formData.gender === 'mujer' && styles.genderOptionTextOnPink,
              ]}
            >
              Niña
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
            <Image
              source={getChildAvatarSource('hombre')}
              style={[
                styles.genderAvatarPreview,
                formData.gender === 'hombre' && styles.genderAvatarPreviewActive,
              ]}
            />
            <Text
              style={[
                styles.genderOptionText,
                formData.gender === 'hombre' && styles.genderOptionTextOnBlue,
              ]}
            >
              Niño
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={modalFieldStyles.label}>Alias (opcional)</Text>
        <TextInput
          style={modalFieldStyles.input}
          placeholder="Apodo o alias"
          placeholderTextColor={Colors.textLight}
          value={formData.alias}
          onChangeText={(text) => setFormData({ ...formData, alias: text })}
        />

        <Text style={modalFieldStyles.label}>
          {editingChild ? 'PIN (dejar vacío para no cambiar)' : 'PIN (obligatorio)'}
        </Text>
        <TextInput
          style={modalFieldStyles.input}
          placeholder="PIN de 4 dígitos"
          placeholderTextColor={Colors.textLight}
          value={formData.pin}
          onChangeText={(text) => setFormData({ ...formData, pin: text })}
          keyboardType="numeric"
          maxLength={12}
          secureTextEntry
        />
        <Text style={modalFieldStyles.hint}>
          Necesario para entrar como hijo con el código de familia
        </Text>

        {editingChild ? (
          <>
            <Text style={modalFieldStyles.label}>% del pago al aprobar tareas → ahorro</Text>
            <TextInput
              style={modalFieldStyles.input}
              placeholder="0"
              placeholderTextColor={Colors.textLight}
              value={formData.savingsPercent}
              onChangeText={(text) => setFormData({ ...formData, savingsPercent: text })}
              keyboardType="decimal-pad"
            />
            <Text style={modalFieldStyles.hint}>
              0 = todo va al saldo. Si hay meta de ahorro activa, esa parte se aparta al aprobar
              cada tarea (hasta completar la meta).
            </Text>
            <Text style={modalFieldStyles.label}>Meta preferida (opcional)</Text>
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
                  {g.title} ({family?.currency} {g.saved_amount.toFixed(0)} /{' '}
                  {g.target_amount.toFixed(0)})
                </Text>
              </TouchableOpacity>
            ))}
            {savingsGoalOptions.length === 0 ? (
              <Text style={modalFieldStyles.hint}>
                Crea una meta de ahorro en Metas → Ahorro para este hijo.
              </Text>
            ) : null}
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
  childCard: {
    gap: Spacing.md,
  },
  childTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  childAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  childInfo: {
    flex: 1,
    minWidth: 0,
  },
  balance: {
    alignItems: 'flex-end',
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  genderAvatarPreview: {
    width: 52,
    height: 52,
    borderRadius: 26,
    opacity: 0.85,
  },
  genderAvatarPreviewActive: {
    opacity: 1,
  },
  genderOptionMujerActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent + '14',
  },
  genderOptionHombreActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '14',
  },
  genderOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  genderOptionTextOnPink: {
    color: Colors.accent,
  },
  genderOptionTextOnBlue: {
    color: Colors.primary,
  },
  goalPickRow: {
    padding: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 8,
    backgroundColor: Colors.white,
  },
  goalPickRowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '14',
  },
  goalPickText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
});
