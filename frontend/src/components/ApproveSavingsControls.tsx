import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Colors } from '../constants/colors';
import type { SavingsGoalDTO } from '../services/api';

export type ApproveSavingsMode = 'default' | 'percent' | 'amount';

export function buildSavingsApproveOpts(
  mode: ApproveSavingsMode,
  percentStr: string,
  amountStr: string,
  goalId: string
): {
  savings_percent?: number;
  savings_amount?: number;
  savings_goal_id?: string;
} {
  const o: {
    savings_percent?: number;
    savings_amount?: number;
    savings_goal_id?: string;
  } = {};
  const g = goalId.trim();
  if (g) o.savings_goal_id = g;
  if (mode === 'percent') {
    const p = parseFloat(percentStr.replace(',', '.'));
    if (!Number.isNaN(p)) o.savings_percent = Math.min(100, Math.max(0, p));
  } else if (mode === 'amount') {
    const a = parseFloat(amountStr.replace(',', '.'));
    if (!Number.isNaN(a) && a >= 0) o.savings_amount = a;
  }
  return o;
}

type Props = {
  currency: string;
  childDefaultPercent: number;
  goals: SavingsGoalDTO[];
  mode: ApproveSavingsMode;
  onModeChange: (m: ApproveSavingsMode) => void;
  percentStr: string;
  onPercentStrChange: (s: string) => void;
  amountStr: string;
  onAmountStrChange: (s: string) => void;
  goalId: string;
  onGoalIdChange: (id: string) => void;
  reasonNote: string;
  onReasonNoteChange: (s: string) => void;
};

export function ApproveSavingsControls({
  currency,
  childDefaultPercent,
  goals,
  mode,
  onModeChange,
  percentStr,
  onPercentStrChange,
  amountStr,
  onAmountStrChange,
  goalId,
  onGoalIdChange,
  reasonNote,
  onReasonNoteChange,
}: Props) {
  const activeGoals = goals.filter((g) => !g.is_completed);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Ahorro en esta aprobación</Text>
      <Text style={styles.sectionHint}>
        Elige cuánto del pago va a la meta de ahorro del hijo (además de la regla fija en su perfil, si la hay).
      </Text>

      <Text style={styles.inputLabel}>Meta destino</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalScroll}>
        <TouchableOpacity
          style={[styles.chip, goalId === '' && styles.chipOn]}
          onPress={() => onGoalIdChange('')}
        >
          <Text style={[styles.chipText, goalId === '' && styles.chipTextOn]}>Perfil del hijo</Text>
        </TouchableOpacity>
        {activeGoals.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[styles.chip, goalId === g.id && styles.chipOn]}
            onPress={() => onGoalIdChange(g.id)}
          >
            <Text style={[styles.chipText, goalId === g.id && styles.chipTextOn]} numberOfLines={1}>
              {g.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {activeGoals.length === 0 ? (
        <Text style={styles.warn}>
          No hay meta activa: crea una en Metas → Ahorro para apartar dinero.
        </Text>
      ) : null}

      <Text style={[styles.inputLabel, { marginTop: 12 }]}>Cómo repartir</Text>
      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segBtn, mode === 'default' && styles.segBtnOn]}
          onPress={() => onModeChange('default')}
        >
          <Text style={[styles.segText, mode === 'default' && styles.segTextOn]}>Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, mode === 'percent' && styles.segBtnOn]}
          onPress={() => onModeChange('percent')}
        >
          <Text style={[styles.segText, mode === 'percent' && styles.segTextOn]}>%</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, mode === 'amount' && styles.segBtnOn]}
          onPress={() => onModeChange('amount')}
        >
          <Text style={[styles.segText, mode === 'amount' && styles.segTextOn]}>Monto</Text>
        </TouchableOpacity>
      </View>

      {mode === 'default' ? (
        <Text style={styles.modeHint}>
          Se usa el porcentaje del perfil del hijo ({childDefaultPercent}%){' '}
          {goalId ? 'y la meta elegida arriba.' : '(y la meta preferida en su perfil, si existe).'}
        </Text>
      ) : null}

      {mode === 'percent' ? (
        <View style={styles.inlineField}>
          <Text style={styles.inputLabel}>Porcentaje a la meta (0–100)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. 20"
            keyboardType="decimal-pad"
            value={percentStr}
            onChangeText={onPercentStrChange}
            placeholderTextColor={Colors.textLight}
          />
        </View>
      ) : null}

      {mode === 'amount' ? (
        <View style={styles.inlineField}>
          <Text style={styles.inputLabel}>Monto a la meta ({currency})</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="decimal-pad"
            value={amountStr}
            onChangeText={onAmountStrChange}
            placeholderTextColor={Colors.textLight}
          />
        </View>
      ) : null}

      <View style={[styles.inlineField, { marginTop: 12 }]}>
        <Text style={styles.inputLabel}>¿Por que quiere ahorrar? (opcional)</Text>
        <TextInput
          style={[styles.input, { minHeight: 56 }]}
          placeholder="Ej.: para acercarme a mi bici"
          value={reasonNote}
          onChangeText={onReasonNoteChange}
          multiline
          placeholderTextColor={Colors.textLight}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  goalScroll: { marginBottom: 8, maxHeight: 44 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    maxWidth: 200,
  },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.text, fontWeight: '600' },
  chipTextOn: { color: Colors.white },
  warn: { fontSize: 12, color: Colors.warning, marginBottom: 4 },
  segment: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: Colors.background },
  segBtnOn: { backgroundColor: Colors.primary + '22' },
  segText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  segTextOn: { color: Colors.primary },
  modeHint: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, marginBottom: 4 },
  inlineField: { marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
});
