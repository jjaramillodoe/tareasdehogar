import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import type { SavingsSplitPreviewDTO } from '../services/api';

export function SavingsSplitPreviewBox({
  currency,
  loading,
  preview,
}: {
  currency: string;
  loading: boolean;
  preview: SavingsSplitPreviewDTO | null;
}) {
  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.muted}> Calculando reparto…</Text>
      </View>
    );
  }
  if (!preview) {
    return null;
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Resumen del pago</Text>
      <Text style={styles.line}>
        Total del pago:{' '}
        <Text style={styles.bold}>
          {currency} {preview.total_pay.toFixed(2)}
        </Text>
      </Text>
      <Text style={styles.line}>
        <Ionicons name="wallet-outline" size={16} color={Colors.primary} /> Al saldo disponible:{' '}
        <Text style={styles.bold}>
          {currency} {preview.to_balance.toFixed(2)}
        </Text>
      </Text>
      {preview.to_savings > 0 ? (
        <>
          <Text style={styles.line}>
            <Ionicons name="cash-outline" size={16} color={Colors.secondary} /> A la meta de ahorro:{' '}
            <Text style={styles.bold}>
              {currency} {preview.to_savings.toFixed(2)}
            </Text>
            {preview.goal_title ? <Text style={styles.meta}> («{preview.goal_title}»)</Text> : null}
          </Text>
          {preview.goal_just_completed ? (
            <Text style={styles.complete}>Con este pago se completará la meta.</Text>
          ) : null}
          {preview.auto_save_floor_applied ? (
            <Text style={styles.autoSaveNote}>
              Se aplicó ahorro automático mínimo
              {preview.auto_save_min_amount != null
                ? ` (${currency} ${preview.auto_save_min_amount.toFixed(2)})`
                : ''}
              .
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={styles.hint}>
          Todo va al saldo disponible. Puedes elegir meta, porcentaje o monto fijo arriba; si no hay meta
          activa, primero créala en Metas → Ahorro.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
  },
  muted: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  box: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  line: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
    color: Colors.primary,
  },
  meta: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  complete: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 4,
  },
  autoSaveNote: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    marginTop: 4,
  },
  hint: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
});
