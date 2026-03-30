import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { savingsGoalsAPI, SavingsGoalDTO, childrenAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

type ChildRow = { id: string; name: string; balance?: number };

/** Plantillas rápidas para «Nueva meta de ahorro» (Ahorro en Metas). */
export const PREDEFINED_SAVINGS_GOALS: {
  title: string;
  note: string;
  suggestedTarget: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    title: 'Videojuego',
    note: 'Ese juego o consola que quieres',
    suggestedTarget: '80',
    icon: 'game-controller-outline',
  },
  {
    title: 'Bicicleta',
    note: 'Bici, patinete o accesorios',
    suggestedTarget: '300',
    icon: 'bicycle-outline',
  },
  {
    title: 'Tablet o audífonos',
    note: 'Tecnología o música',
    suggestedTarget: '150',
    icon: 'headset-outline',
  },
  {
    title: 'Libro o curso',
    note: 'Aprender algo nuevo',
    suggestedTarget: '40',
    icon: 'book-outline',
  },
  {
    title: 'Ropa o zapatos',
    note: 'Algo especial que necesitas',
    suggestedTarget: '60',
    icon: 'shirt-outline',
  },
  {
    title: 'Salida o cumpleaños',
    note: 'Un plan con amigos o familia',
    suggestedTarget: '35',
    icon: 'ice-cream-outline',
  },
  {
    title: 'Regalo',
    note: 'Para alguien querido',
    suggestedTarget: '45',
    icon: 'gift-outline',
  },
  {
    title: 'Ahorro libre',
    note: 'Tu meta, tu ritmo',
    suggestedTarget: '100',
    icon: 'wallet-outline',
  },
];

function parseAmount(raw: string): number | null {
  const n = parseFloat(raw.replace(',', '.'));
  if (Number.isNaN(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/** Relleno rápido: fracción del saldo (apartar) o de lo guardado en la meta (devolver). */
function amountFromPoolFraction(pool: number, fraction: number): string {
  if (!Number.isFinite(pool) || pool <= 0) return '0.00';
  const raw = Math.round(pool * fraction * 100) / 100;
  return Math.min(raw, pool).toFixed(2);
}

function milestoneSet(g: SavingsGoalDTO): Set<number> {
  return new Set((g.milestones_reached ?? []).map((x) => Number(x)));
}

const QUICK_PERCENT_FRACTIONS = [
  { label: '10%', fraction: 0.1 },
  { label: '25%', fraction: 0.25 },
  { label: '50%', fraction: 0.5 },
  { label: 'Todo', fraction: 1 },
] as const;

export function ParentSavingsGoalsSection({
  savingsGoals,
  childrenList,
  currency,
  onReload,
  onChildBalanceUpdated,
  refreshing,
}: {
  savingsGoals: SavingsGoalDTO[];
  childrenList: ChildRow[];
  currency: string;
  onReload: () => Promise<void>;
  /** Tras apartar/devolver dinero, el saldo del hijo debe bajar/subir; reforzamos con GET /children/:id */
  onChildBalanceUpdated?: (p: { childId: string; balance: number }) => void;
  refreshing: boolean;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [childId, setChildId] = useState('');
  const [saving, setSaving] = useState(false);
  const [amountModal, setAmountModal] = useState<null | { goal: SavingsGoalDTO; mode: 'allocate' | 'release' }>(
    null
  );
  const [amountStr, setAmountStr] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const openCreate = () => {
    setTitle('');
    setNote('');
    setTargetStr('');
    setChildId(childrenList[0]?.id ?? '');
    setShowCreate(true);
  };

  const openCreateWithPreset = (preset: (typeof PREDEFINED_SAVINGS_GOALS)[number]) => {
    setTitle(preset.title);
    setNote(preset.note);
    setTargetStr(preset.suggestedTarget);
    setChildId(childrenList[0]?.id ?? '');
    setShowCreate(true);
  };

  const submitCreate = async () => {
    const t = title.trim();
    const target = parseAmount(targetStr);
    if (!t || !childId || target == null) {
      Alert.alert('Revisa', 'Nombre, hijo y monto objetivo válidos');
      return;
    }
    setSaving(true);
    try {
      await savingsGoalsAPI.create({
        title: t,
        note: note.trim() || undefined,
        target_amount: target,
        child_id: childId,
      });
      setShowCreate(false);
      await onReload();
      Alert.alert('Listo', 'Meta de ahorro creada');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  };

  const getChildName = (id: string) => childrenList.find((c) => c.id === id)?.name ?? '—';
  const getBalance = (id: string) => {
    const b = childrenList.find((c) => c.id === id)?.balance;
    if (b == null || Number.isNaN(Number(b))) return 0;
    return Number(b);
  };

  const submitAmount = async () => {
    if (!amountModal) return;
    const amt = parseAmount(amountStr);
    if (amt == null) {
      Alert.alert('Revisa', 'Indica un monto válido');
      return;
    }
    const { goal, mode } = amountModal;
    setBusyId(goal.id);
    try {
      if (mode === 'allocate') {
        await savingsGoalsAPI.allocate(goal.id, amt);
      } else {
        await savingsGoalsAPI.release(goal.id, amt);
      }
      setAmountModal(null);
      setAmountStr('');
      await onReload();
      try {
        const fresh = await childrenAPI.getOne(goal.child_id);
        onChildBalanceUpdated?.({
          childId: fresh.id,
          balance: Number(fresh.balance) || 0,
        });
      } catch {
        /* onReload ya actualizó la lista si pudo */
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo completar');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (g: SavingsGoalDTO) => {
    const msg =
      g.saved_amount > 0
        ? `Hay ${currency} ${g.saved_amount.toFixed(2)} en esta meta. Se devolverán al saldo del hijo. ¿Eliminar?`
        : '¿Eliminar esta meta de ahorro?';
    Alert.alert('Eliminar meta de ahorro', msg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await savingsGoalsAPI.delete(g.id);
            await onReload();
            if (res.returned_to_balance > 0) {
              Alert.alert(
                'Listo',
                `Se devolvió ${currency} ${res.returned_to_balance.toFixed(2)} al saldo.`
              );
            }
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.detail || 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  const active = savingsGoals.filter((g) => !g.is_completed);
  const done = savingsGoals.filter((g) => g.is_completed);

  const progressPct = (g: SavingsGoalDTO) =>
    g.target_amount > 0 ? Math.min((g.saved_amount / g.target_amount) * 100, 100) : 0;

  if (childrenList.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={Colors.textLight} />
        <Text style={styles.emptyText}>Primero agrega hijos</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onReload} />}
      >
        <TouchableOpacity style={styles.createBanner} onPress={openCreate} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
          <Text style={styles.createBannerText}>Nueva meta de ahorro</Text>
        </TouchableOpacity>

        <Text style={styles.presetSectionTitle}>Metas de ahorro sugeridas</Text>
        <Text style={styles.presetSectionHint}>
          Toca una idea para rellenar el formulario (puedes cambiar montos y texto).
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetRow}
          style={styles.presetScroll}
        >
          {PREDEFINED_SAVINGS_GOALS.map((preset, index) => (
            <TouchableOpacity
              key={`${preset.title}-${index}`}
              style={styles.presetCard}
              onPress={() => openCreateWithPreset(preset)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.presetIconWrap,
                  {
                    backgroundColor:
                      index % 3 === 0
                        ? Colors.primary + '22'
                        : index % 3 === 1
                          ? Colors.secondary + '22'
                          : Colors.accent + '22',
                  },
                ]}
              >
                <Ionicons
                  name={preset.icon}
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
              <Text style={styles.presetCardTitle} numberOfLines={2}>
                {preset.title}
              </Text>
              <Text style={styles.presetCardMeta}>
                ~{currency} {preset.suggestedTarget}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.hint}>
          El dinero sale del saldo del hijo y queda apartado hasta que lo devuelvas o elimines la meta.
        </Text>

        {active.length > 0 && <Text style={styles.sectionTitle}>En progreso</Text>}
        {active.map((g) => (
          <View key={g.id} style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.iconWrap}>
                <Ionicons name="cash-outline" size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{g.title}</Text>
                <Text style={styles.cardMeta}>{getChildName(g.child_id)}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(g)}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
            {g.note ? <Text style={styles.note}>{g.note}</Text> : null}
            <View style={styles.progressBox}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPct(g)}%` }]} />
              </View>
              <Text style={styles.progressNumbers}>
                {currency} {g.saved_amount.toFixed(2)} / {g.target_amount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.milestoneRow}>
              {[25, 50, 75, 100].map((m) => {
                const reached = milestoneSet(g).has(m);
                return (
                  <View
                    key={`${g.id}-m-${m}`}
                    style={[styles.milestoneChip, reached && styles.milestoneChipOn]}
                  >
                    <Text style={[styles.milestoneChipText, reached && styles.milestoneChipTextOn]}>
                      {m}%
                    </Text>
                  </View>
                );
              })}
            </View>
            {g.last_milestone_reached != null ? (
              <Text style={styles.milestoneCelebrate}>
                {g.last_milestone_reached === 100
                  ? 'Meta completada. Excelente trabajo.'
                  : `Celebracion: alcanzaste ${g.last_milestone_reached}% de tu meta.`}
              </Text>
            ) : null}
            <Text style={styles.balanceHint}>
              Saldo disponible (hijo): {currency} {getBalance(g.child_id).toFixed(2)}
            </Text>
            <View style={styles.rowBtns}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => {
                  setAmountStr('');
                  setAmountModal({ goal: g, mode: 'allocate' });
                }}
                disabled={busyId === g.id}
              >
                <Text style={styles.btnSecondaryText}>Aportar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnOutline}
                onPress={() => {
                  setAmountStr('');
                  setAmountModal({ goal: g, mode: 'release' });
                }}
                disabled={busyId === g.id || g.saved_amount <= 0}
              >
                <Text style={styles.btnOutlineText}>Devolver al saldo</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {active.length === 0 && done.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>Aún no hay metas de ahorro</Text>
            <Text style={styles.emptySub}>
              Crea una meta con un monto objetivo; luego podréis apartar dinero del saldo del hijo.
            </Text>
          </View>
        )}

        {done.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Objetivo alcanzado</Text>
            {done.map((g) => (
              <View key={g.id} style={[styles.card, styles.cardDone]}>
                <View style={styles.cardHead}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.cardTitle}>{g.title}</Text>
                    <Text style={styles.cardMeta}>{getChildName(g.child_id)}</Text>
                  </View>
                </View>
                <Text style={styles.doneAmount}>
                  {currency} {g.saved_amount.toFixed(2)} guardados (meta {currency} {g.target_amount.toFixed(2)})
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nueva meta de ahorro</Text>
            <Text style={styles.inputLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej.: Bicicleta, videjuego…"
              placeholderTextColor={Colors.textLight}
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.inputLabel}>Nota (opcional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 64 }]}
              placeholder="Para qué ahorra"
              placeholderTextColor={Colors.textLight}
              value={note}
              onChangeText={setNote}
              multiline
            />
            <Text style={styles.inputLabel}>Monto objetivo</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="decimal-pad"
              value={targetStr}
              onChangeText={setTargetStr}
              placeholderTextColor={Colors.textLight}
            />
            <Text style={styles.inputLabel}>Hijo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childPick}>
              {childrenList.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, childId === c.id && styles.chipOn]}
                  onPress={() => setChildId(c.id)}
                >
                  <Text style={[styles.chipText, childId === c.id && styles.chipTextOn]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCreate(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOk, saving && { opacity: 0.7 }]}
                onPress={submitCreate}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.modalOkText}>Crear</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!amountModal}
        transparent
        animationType="fade"
        onRequestClose={() => setAmountModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {amountModal?.mode === 'allocate' ? 'Aportar a la meta' : 'Devolver al saldo'}
            </Text>
            {amountModal ? (
              <Text style={styles.modalBalanceHint}>
                {amountModal.mode === 'allocate' ? (
                  <>
                    Saldo disponible del hijo:{' '}
                    <Text style={styles.modalBalanceStrong}>
                      {currency} {getBalance(amountModal.goal.child_id).toFixed(2)}
                    </Text>
                    {'\n'}
                    <Text style={styles.modalBalanceSub}>No puedes apartar más que este saldo.</Text>
                  </>
                ) : (
                  <>
                    Apartado en esta meta:{' '}
                    <Text style={styles.modalBalanceStrong}>
                      {currency} {amountModal.goal.saved_amount.toFixed(2)}
                    </Text>
                    {'\n'}
                    <Text style={styles.modalBalanceSub}>Máximo que puedes devolver al saldo disponible.</Text>
                  </>
                )}
              </Text>
            ) : null}
            {amountModal ? (
              <View style={styles.pctQuickRow}>
                <Text style={styles.pctQuickLabel}>
                  {amountModal.mode === 'allocate'
                    ? 'Rápido (del saldo disponible)'
                    : 'Rápido (de lo apartado en la meta)'}
                </Text>
                <View style={styles.pctQuickBtns}>
                  {QUICK_PERCENT_FRACTIONS.map(({ label, fraction }) => (
                    <TouchableOpacity
                      key={label}
                      style={styles.pctQuickBtn}
                      onPress={() => {
                        const pool =
                          amountModal.mode === 'allocate'
                            ? getBalance(amountModal.goal.child_id)
                            : amountModal.goal.saved_amount;
                        setAmountStr(amountFromPoolFraction(pool, fraction));
                      }}
                    >
                      <Text style={styles.pctQuickBtnText}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Monto"
              keyboardType="decimal-pad"
              value={amountStr}
              onChangeText={setAmountStr}
              placeholderTextColor={Colors.textLight}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAmountModal(null)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOk, busyId && { opacity: 0.7 }]}
                onPress={submitAmount}
                disabled={!!busyId}
              >
                {busyId ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.modalOkText}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function ChildSavingsGoalsSection({ currency }: { currency: string }) {
  const { selectedChild, setSelectedChild } = useAuthStore();
  const [goals, setGoals] = useState<SavingsGoalDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amountModal, setAmountModal] = useState<null | { goal: SavingsGoalDTO; mode: 'allocate' | 'release' }>(
    null
  );
  const [amountStr, setAmountStr] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [milestoneToast, setMilestoneToast] = useState<null | { title: string; milestone: number }>(
    null
  );
  const prevMilestonesRef = React.useRef<Record<string, number>>({});
  const toastAnim = React.useRef(new Animated.Value(0)).current;
  const burstAnims = React.useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const loadGoals = useCallback(async () => {
    if (!selectedChild) return;
    try {
      const data = await savingsGoalsAPI.getAll(selectedChild.id);
      const prev = prevMilestonesRef.current;
      let newest: { title: string; milestone: number } | null = null;
      for (const g of data) {
        const nowMilestone = Number(g.last_milestone_reached ?? 0);
        const prevMilestone = Number(prev[g.id] ?? 0);
        if (nowMilestone > prevMilestone) {
          if (!newest || nowMilestone >= newest.milestone) {
            newest = { title: g.title, milestone: nowMilestone };
          }
        }
      }
      const nextMap: Record<string, number> = {};
      for (const g of data) nextMap[g.id] = Number(g.last_milestone_reached ?? 0);
      prevMilestonesRef.current = nextMap;
      setGoals(data);
      if (newest) setMilestoneToast(newest);
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [selectedChild?.id]);

  useEffect(() => {
    if (!milestoneToast) return;
    const isBigCelebration = milestoneToast.milestone === 100;
    toastAnim.setValue(0);
    burstAnims.forEach((a) => a.setValue(0));
    Animated.sequence([
      Animated.parallel([
        Animated.timing(toastAnim, {
          toValue: 1,
          duration: isBigCelebration ? 260 : 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        ...burstAnims.map((a, idx) =>
          Animated.timing(a, {
            toValue: 1,
            duration: (isBigCelebration ? 360 : 300) + idx * 24,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          })
        ),
      ]),
      Animated.delay(isBigCelebration ? 1700 : 1300),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: isBigCelebration ? 260 : 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setMilestoneToast(null));
  }, [milestoneToast, toastAnim]);

  useEffect(() => {
    setLoading(true);
    loadGoals();
  }, [loadGoals]);

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await loadGoals();
      if (selectedChild) {
        try {
          const c = await childrenAPI.getOne(selectedChild.id);
          setSelectedChild({
            ...selectedChild,
            balance: c.balance,
          });
        } catch {
          /* ignore */
        }
      }
    } finally {
      setRefreshing(false);
    }
  };

  const submitAmount = async () => {
    if (!amountModal || !selectedChild) return;
    const amt = parseAmount(amountStr);
    if (amt == null) {
      Alert.alert('Revisa', 'Indica un monto válido');
      return;
    }
    const { goal, mode } = amountModal;
    setBusyId(goal.id);
    try {
      if (mode === 'allocate') {
        await savingsGoalsAPI.allocate(goal.id, amt);
      } else {
        await savingsGoalsAPI.release(goal.id, amt);
      }
      setAmountModal(null);
      setAmountStr('');
      await refreshAll();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo completar');
    } finally {
      setBusyId(null);
    }
  };

  const progressPct = (g: SavingsGoalDTO) =>
    g.target_amount > 0 ? Math.min((g.saved_amount / g.target_amount) * 100, 100) : 0;

  if (!selectedChild) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Inicia sesión de nuevo</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const active = goals.filter((g) => !g.is_completed);
  const done = goals.filter((g) => g.is_completed);

  return (
    <>
      {milestoneToast ? (
        <>
          {['✨', '🎉', '⭐', '🏆'].map((glyph, idx) => (
            <Animated.Text
              key={`burst-${glyph}-${idx}`}
              pointerEvents="none"
              style={[
                styles.burstGlyph,
                {
                  left: 56 + idx * 68,
                  opacity: burstAnims[idx].interpolate({
                    inputRange: [0, 0.2, 1],
                    outputRange: [0, 1, 0],
                  }),
                  transform: [
                    {
                      translateY: burstAnims[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, -20 - idx * 2],
                      }),
                    },
                    {
                      scale: burstAnims[idx].interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.75, 1.02, 0.92],
                      }),
                    },
                  ],
                },
              ]}
            >
              {glyph}
            </Animated.Text>
          ))}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.celebrationToast,
              milestoneToast.milestone === 100 && styles.celebrationToastBig,
              {
                opacity: toastAnim,
                transform: [
                  {
                    translateY: toastAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-14, 0],
                    }),
                  },
                  {
                    scale: toastAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="sparkles" size={16} color={Colors.white} />
            <Text style={styles.celebrationToastText}>
              {milestoneToast.milestone === 100
                ? `Meta completa: ${milestoneToast.title}`
                : `Logro ${milestoneToast.milestone}%: ${milestoneToast.title}`}
            </Text>
            <Ionicons
              name={milestoneToast.milestone === 100 ? 'trophy' : 'ribbon'}
              size={16}
              color={Colors.white}
            />
          </Animated.View>
        </>
      ) : null}
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
      >
        <Text style={styles.hint}>
          Saldo disponible: {currency} {selectedChild.balance.toFixed(2)}. Pide ayuda a tu familia si necesitas una meta
          nueva.
        </Text>

        {goals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>Aún no hay metas de ahorro</Text>
            <Text style={styles.emptySub}>Cuando tus padres creen una, podrás apartar dinero aquí.</Text>
          </View>
        ) : (
          <>
            {active.length > 0 && <Text style={styles.sectionTitle}>En progreso</Text>}
            {active.map((g) => (
              <View key={g.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.iconWrap}>
                    <Ionicons name="cash-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{g.title}</Text>
                  </View>
                </View>
                {g.note ? <Text style={styles.note}>{g.note}</Text> : null}
                <View style={styles.progressBox}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progressPct(g)}%` }]} />
                  </View>
                  <Text style={styles.progressNumbers}>
                    {currency} {g.saved_amount.toFixed(2)} / {g.target_amount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.milestoneRow}>
                  {[25, 50, 75, 100].map((m) => {
                    const reached = milestoneSet(g).has(m);
                    return (
                      <View
                        key={`${g.id}-cm-${m}`}
                        style={[styles.milestoneChip, reached && styles.milestoneChipOn]}
                      >
                        <Text style={[styles.milestoneChipText, reached && styles.milestoneChipTextOn]}>
                          {m}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
                {g.last_milestone_reached != null ? (
                  <Text style={styles.milestoneCelebrate}>
                    {g.last_milestone_reached === 100
                      ? 'Meta completada. Excelente trabajo.'
                      : `Celebracion: alcanzaste ${g.last_milestone_reached}% de tu meta.`}
                  </Text>
                ) : null}
                <View style={styles.rowBtns}>
                  <TouchableOpacity
                    style={styles.btnSecondary}
                    onPress={() => {
                      setAmountStr('');
                      setAmountModal({ goal: g, mode: 'allocate' });
                    }}
                    disabled={busyId === g.id}
                  >
                    <Text style={styles.btnSecondaryText}>Aportar de mi saldo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnOutline}
                    onPress={() => {
                      setAmountStr('');
                      setAmountModal({ goal: g, mode: 'release' });
                    }}
                    disabled={busyId === g.id || g.saved_amount <= 0}
                  >
                    <Text style={styles.btnOutlineText}>Pasar a mi saldo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {done.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>¡Lo lograste!</Text>
                {done.map((g) => (
                  <View key={g.id} style={[styles.card, styles.cardDone]}>
                    <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                    <Text style={[styles.cardTitle, { marginLeft: 8, flex: 1 }]}>{g.title}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={!!amountModal} transparent animationType="fade" onRequestClose={() => setAmountModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {amountModal?.mode === 'allocate' ? '¿Cuánto apartas?' : '¿Cuánto vuelve a tu saldo?'}
            </Text>
            {amountModal && selectedChild ? (
              <Text style={styles.modalBalanceHint}>
                {amountModal.mode === 'allocate' ? (
                  <>
                    Tu saldo disponible:{' '}
                    <Text style={styles.modalBalanceStrong}>
                      {currency} {selectedChild.balance.toFixed(2)}
                    </Text>
                    {'\n'}
                    <Text style={styles.modalBalanceSub}>Solo puedes apartar hasta este monto.</Text>
                  </>
                ) : (
                  <>
                    En esta meta:{' '}
                    <Text style={styles.modalBalanceStrong}>
                      {currency} {amountModal.goal.saved_amount.toFixed(2)}
                    </Text>
                    {'\n'}
                    <Text style={styles.modalBalanceSub}>Máximo que puedes pasar de vuelta a tu saldo.</Text>
                  </>
                )}
              </Text>
            ) : null}
            {amountModal && selectedChild ? (
              <View style={styles.pctQuickRow}>
                <Text style={styles.pctQuickLabel}>
                  {amountModal.mode === 'allocate'
                    ? 'Rápido (de tu saldo disponible)'
                    : 'Rápido (de lo apartado en la meta)'}
                </Text>
                <View style={styles.pctQuickBtns}>
                  {QUICK_PERCENT_FRACTIONS.map(({ label, fraction }) => (
                    <TouchableOpacity
                      key={label}
                      style={styles.pctQuickBtn}
                      onPress={() => {
                        const pool =
                          amountModal.mode === 'allocate'
                            ? selectedChild.balance
                            : amountModal.goal.saved_amount;
                        setAmountStr(amountFromPoolFraction(pool, fraction));
                      }}
                    >
                      <Text style={styles.pctQuickBtnText}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Monto"
              keyboardType="decimal-pad"
              value={amountStr}
              onChangeText={setAmountStr}
              placeholderTextColor={Colors.textLight}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAmountModal(null)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalOk, busyId && { opacity: 0.7 }]} onPress={submitAmount} disabled={!!busyId}>
                {busyId ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.modalOkText}>Listo</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 280,
  },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginTop: 12 },
  hint: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  createBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary + '18',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  createBannerText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  presetSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  presetSectionHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  presetScroll: { marginBottom: 4 },
  presetRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
    paddingRight: 4,
  },
  presetCard: {
    width: 112,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  presetIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  presetCardMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardDone: { borderColor: Colors.success + '55' },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  note: { fontSize: 14, color: Colors.textSecondary, marginTop: 8, marginBottom: 4 },
  progressBox: { marginTop: 10 },
  progressBar: {
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressNumbers: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
  balanceHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 6 },
  milestoneRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  milestoneChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  milestoneChipOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '18',
  },
  milestoneChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  milestoneChipTextOn: {
    color: Colors.primary,
  },
  milestoneCelebrate: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  rowBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnSecondary: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnSecondaryText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnOutlineText: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  emptyCard: {
    alignItems: 'center',
    padding: 28,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.text, marginTop: 12 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  doneAmount: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  modalBalanceHint: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 14,
    lineHeight: 22,
  },
  modalBalanceStrong: {
    fontWeight: '700',
    color: Colors.primary,
  },
  modalBalanceSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  pctQuickRow: { marginBottom: 12 },
  pctQuickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  pctQuickBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  pctQuickBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary + '18',
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    margin: 4,
  },
  pctQuickBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
    backgroundColor: Colors.background,
  },
  childPick: { marginBottom: 12, maxHeight: 44 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, color: Colors.text },
  chipTextOn: { color: Colors.white, fontWeight: '600' },
  modalRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  modalOk: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  modalOkText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  celebrationToast: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
    elevation: 4,
  },
  celebrationToastBig: {
    backgroundColor: Colors.primary,
  },
  celebrationToastText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  burstGlyph: {
    position: 'absolute',
    top: 8,
    zIndex: 49,
    fontSize: 16,
  },
});
