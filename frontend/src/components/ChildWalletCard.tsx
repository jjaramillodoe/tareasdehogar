import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { SavingsGoalDTO, withdrawalsAPI } from '../services/api';
import { hapticTap } from '../utils/feedback';
import { shadow } from '../utils/shadow';

const SHOP = [
  { id: 'ice', title: 'Helado', amount: 2, icon: 'ice-cream-outline' as const },
  { id: 'game', title: '30 min extra de juego', amount: 3, icon: 'game-controller-outline' as const },
  { id: 'movie', title: 'Peli en familia', amount: 5, icon: 'film-outline' as const },
];

type Props = {
  currency: string;
  balance: number;
  childId: string;
  goals: SavingsGoalDTO[];
  onChanged?: () => void;
};

export default function ChildWalletCard({ currency, balance, childId, goals, onChanged }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const active = goals.filter((g) => !g.is_completed && (g.status || 'active') === 'active');

  const redeem = (item: (typeof SHOP)[number]) => {
    if (balance < item.amount) {
      Alert.alert('Saldo insuficiente', `Necesitas ${currency} ${item.amount.toFixed(2)}.`);
      return;
    }
    Alert.alert('Pedir recompensa', `¿Solicitar “${item.title}” por ${currency} ${item.amount.toFixed(2)}? Tu familia debe aprobarlo.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Pedir',
        onPress: async () => {
          setBusyId(item.id);
          try {
            await hapticTap();
            await withdrawalsAPI.request(childId, item.amount, item.title, 'deseo');
            Alert.alert('Enviado', 'Tu familia verá la solicitud para aprobarla.');
            onChanged?.();
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.detail || 'No se pudo solicitar');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Tu billetera</Text>
      {active.length === 0 ? (
        <Text style={styles.empty}>Cuando tengas una meta de ahorro, el avance sale aquí.</Text>
      ) : (
        active.slice(0, 3).map((g) => {
          const pct = Math.min(100, (Number(g.saved_amount) / Math.max(Number(g.target_amount), 1)) * 100);
          return (
            <View key={g.id} style={styles.goalRow}>
              <View style={styles.goalHead}>
                <Text style={styles.goalTitle} numberOfLines={1}>
                  {g.title}
                </Text>
                <Text style={styles.goalPct}>{pct.toFixed(0)}%</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.goalMeta}>
                {currency} {Number(g.saved_amount).toFixed(2)} / {Number(g.target_amount).toFixed(2)}
              </Text>
            </View>
          );
        })
      )}

      <Text style={styles.shopTitle}>Tienda (pide a tu familia)</Text>
      <View style={styles.shopRow}>
        {SHOP.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.shopCard}
            onPress={() => redeem(item)}
            disabled={busyId === item.id}
            activeOpacity={0.85}
          >
            <Ionicons name={item.icon} size={22} color={Colors.primary} />
            <Text style={styles.shopName} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.shopPrice}>
              {currency} {item.amount.toFixed(0)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 3, blur: 8, opacity: 0.06, elevation: 2 }),
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  empty: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', marginBottom: 8 },
  goalRow: { marginBottom: 12 },
  goalHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: Colors.text, marginRight: 8 },
  goalPct: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  track: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  goalMeta: { marginTop: 4, fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  shopTitle: { marginTop: 6, marginBottom: 10, fontSize: 14, fontWeight: '800', color: Colors.text },
  shopRow: { flexDirection: 'row', gap: 8 },
  shopCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 96,
  },
  shopName: { fontSize: 11, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  shopPrice: { fontSize: 12, fontWeight: '800', color: Colors.secondaryInk },
});
