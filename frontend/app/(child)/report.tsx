import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { paymentsAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

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
      <View style={styles.center}>
        <Text style={styles.muted}>No hay hijo seleccionado.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Reporte</Text>
        <Text style={styles.subtitle}>Tus avances de ahorro y gasto</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.segment}>
          {[7, 14].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.segBtn, rangeDays === n && styles.segBtnOn]}
              onPress={() => setRangeDays(n as RangeDays)}
            >
              <Text style={[styles.segText, rangeDays === n && styles.segTextOn]}>{n}d</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tendencia amigable ({rangeDays} dias)</Text>
          <View style={styles.barsRow}>
            {chart.days.map((d) => (
              <View key={d.key} style={styles.dayCol}>
                <View style={styles.stack}>
                  <View style={[styles.barEarned, { height: Math.max(3, (d.earned / chart.maxVal) * 42) }]} />
                  <View style={[styles.barSaved, { height: Math.max(3, (d.saved / chart.maxVal) * 42) }]} />
                  <View style={[styles.barSpent, { height: Math.max(3, (d.spent / chart.maxVal) * 42) }]} />
                </View>
                <Text style={styles.dayLabel}>{d.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.metric}>Ganado: {family?.currency} {chart.earned.toFixed(2)}</Text>
          <Text style={styles.metric}>Ahorrado: {family?.currency} {chart.saved.toFixed(2)}</Text>
          <Text style={styles.metric}>Gastado: {family?.currency} {chart.spent.toFixed(2)}</Text>
          <Text style={styles.metricStrong}>Saldo actual: {family?.currency} {selectedChild.balance.toFixed(2)}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  muted: { color: Colors.textSecondary, fontSize: 14 },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: Colors.surface },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  content: { flex: 1, padding: 16 },
  segment: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 14,
  },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: Colors.surface },
  segBtnOn: { backgroundColor: Colors.primary + '18' },
  segText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  segTextOn: { color: Colors.primary },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
  dayCol: { alignItems: 'center', flex: 1 },
  stack: { height: 46, flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 4 },
  barEarned: { width: 4, backgroundColor: Colors.success, borderRadius: 2 },
  barSaved: { width: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  barSpent: { width: 4, backgroundColor: Colors.accent, borderRadius: 2 },
  dayLabel: { fontSize: 10, color: Colors.textSecondary, textTransform: 'capitalize' },
  metric: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  metricStrong: { fontSize: 13, color: Colors.text, marginTop: 6, fontWeight: '700' },
});
