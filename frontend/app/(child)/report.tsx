import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { paymentsAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import ChildScreenShell, { ChildEmptyState } from '../../src/components/ChildScreenShell';
import { shadow } from '../../src/utils/shadow';

interface Payment {
  id: string;
  amount: number;
  created_at: string;
  payment_type?: string;
  savings_allocated?: number | null;
}

type RangeDays = 7 | 14;

export default function ChildReportScreen() {
  const { selectedChild, family } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState<RangeDays>(7);

  const load = useCallback(async () => {
    if (!selectedChild) return;
    try {
      const data = await paymentsAPI.getForChild(selectedChild.id);
      setPayments(data);
    } finally {
      setIsLoading(false);
    }
  }, [selectedChild]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const chart = useMemo(() => {
    const days: { key: string; label: string; earned: number; saved: number; spent: number }[] = [];
    const now = new Date();
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('es-ES', { weekday: 'short' });
      days.push({ key, label, earned: 0, saved: 0, spent: 0 });
    }
    const map = new Map(days.map((d) => [d.key, d]));
    for (const p of payments) {
      const key = new Date(p.created_at).toISOString().slice(0, 10);
      const row = map.get(key);
      if (!row) continue;
      const amt = Number(p.amount || 0);
      if (p.payment_type === 'withdrawal') {
        row.spent += amt;
      } else {
        row.earned += amt;
        row.saved += Number(p.savings_allocated || 0);
      }
    }
    const earned = days.reduce((s, d) => s + d.earned, 0);
    const saved = days.reduce((s, d) => s + d.saved, 0);
    const spent = days.reduce((s, d) => s + d.spent, 0);
    const maxVal = Math.max(1, ...days.map((d) => Math.max(d.earned, d.saved, d.spent)));
    return { days, earned, saved, spent, maxVal };
  }, [payments, rangeDays]);

  if (!selectedChild) {
    return (
      <ChildScreenShell title="Reporte" showBack>
        <ChildEmptyState icon="alert-circle-outline" title="No hay hijo seleccionado" />
      </ChildScreenShell>
    );
  }

  const currency = family?.currency || 'USD';

  return (
    <ChildScreenShell
      title="Reporte"
      subtitle="Tus avances de ahorro y gasto"
      loading={isLoading}
      showBack
      accent="blue"
      headerExtra={
        <View style={styles.segment}>
          {[7, 14].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.segBtn, rangeDays === n && styles.segBtnOn]}
              onPress={() => setRangeDays(n as RangeDays)}
            >
              <Text style={[styles.segText, rangeDays === n && styles.segTextOn]}>{n} días</Text>
            </TouchableOpacity>
          ))}
        </View>
      }
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Saldo actual</Text>
        <Text style={styles.heroValue}>
          {currency} {Number(selectedChild.balance).toFixed(2)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tendencia ({rangeDays} días)</Text>
        <View style={styles.barsRow}>
          {chart.days.map((d) => (
            <View key={d.key} style={styles.dayCol}>
              <View style={styles.stack}>
                <View style={[styles.barEarned, { height: Math.max(3, (d.earned / chart.maxVal) * 48) }]} />
                <View style={[styles.barSaved, { height: Math.max(3, (d.saved / chart.maxVal) * 48) }]} />
                <View style={[styles.barSpent, { height: Math.max(3, (d.spent / chart.maxVal) * 48) }]} />
              </View>
              <Text style={styles.dayLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.legendText}>Ganado</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.legendText}>Ahorrado</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
            <Text style={styles.legendText}>Gastado</Text>
          </View>
        </View>
        <Text style={styles.metric}>
          Ganado: {currency} {chart.earned.toFixed(2)}
        </Text>
        <Text style={styles.metric}>
          Ahorrado: {currency} {chart.saved.toFixed(2)}
        </Text>
        <Text style={styles.metric}>
          Gastado: {currency} {chart.spent.toFixed(2)}
        </Text>
      </View>
    </ChildScreenShell>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginTop: 14,
    backgroundColor: Colors.surface,
  },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  segBtnOn: { backgroundColor: Colors.primary + '18' },
  segText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  segTextOn: { color: Colors.primary },
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 8, blur: 18, opacity: 0.28, elevation: 8 }),
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroValue: {
    marginTop: 6,
    color: Colors.white,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 3, blur: 10, opacity: 0.08, elevation: 3 }),
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 56,
  },
  dayCol: { alignItems: 'center', flex: 1 },
  stack: { height: 52, flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 4 },
  barEarned: { width: 4, backgroundColor: Colors.success, borderRadius: 2 },
  barSaved: { width: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  barSpent: { width: 4, backgroundColor: Colors.accent, borderRadius: 2 },
  dayLabel: { fontSize: 10, color: Colors.textSecondary, textTransform: 'capitalize', fontWeight: '600' },
  legend: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  metric: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, fontWeight: '600' },
});
