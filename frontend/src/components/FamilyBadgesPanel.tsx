import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

export type FamilyBadgeHistoryRow = {
  month_key: string;
  target_percent: number;
  all_children_hit_target: boolean;
};

function monthLabelEs(monthKey: string): string {
  const [y, m] = monthKey.split('-').map((x) => Number(x));
  if (!y || !m || m < 1 || m > 12) return monthKey;
  const names = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  return `${names[m - 1]} ${y}`;
}

export function FamilyBadgesPanel({
  history,
}: {
  history: FamilyBadgeHistoryRow[];
}) {
  if (!history.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="ribbon-outline" size={24} color={Colors.textLight} />
        <Text style={styles.emptyText}>Aun no hay historial de insignias familiares.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {history.map((h, idx) => (
        <View key={h.month_key} style={styles.card}>
          <View style={styles.head}>
            <View
              style={[
                styles.iconWrap,
                h.all_children_hit_target ? styles.iconWrapOk : null,
                h.all_children_hit_target && idx === 0 ? styles.iconWrapGold : null,
                h.all_children_hit_target && idx === 1 ? styles.iconWrapSilver : null,
                h.all_children_hit_target && idx === 2 ? styles.iconWrapBronze : null,
              ]}
            >
              <Ionicons
                name={h.all_children_hit_target ? 'trophy' : 'hourglass-outline'}
                size={18}
                color={
                  !h.all_children_hit_target
                    ? Colors.textSecondary
                    : idx === 0
                      ? '#B07A00'
                      : idx === 1
                        ? '#5F6A75'
                        : idx === 2
                          ? '#7A4E2A'
                          : Colors.success
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.month}>{monthLabelEs(h.month_key)}</Text>
              <Text style={styles.target}>Meta: {h.target_percent.toFixed(0)}% ahorro familiar</Text>
            </View>
            <Text style={[styles.state, h.all_children_hit_target ? styles.stateOk : null]}>
              {h.all_children_hit_target ? 'Completada' : 'En progreso'}
            </Text>
          </View>
            {h.all_children_hit_target && idx <= 2 ? (
              <View
                style={[
                  styles.rankChip,
                  idx === 0 ? styles.rankChipGold : null,
                  idx === 1 ? styles.rankChipSilver : null,
                  idx === 2 ? styles.rankChipBronze : null,
                ]}
              >
                <Text
                  style={[
                    styles.rankChipText,
                    idx === 0 ? styles.rankChipTextGold : null,
                    idx === 1 ? styles.rankChipTextSilver : null,
                    idx === 2 ? styles.rankChipTextBronze : null,
                  ]}
                >
                  {idx === 0 ? 'Oro' : idx === 1 ? 'Plata' : 'Bronce'}
                </Text>
              </View>
            ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapOk: {
    backgroundColor: Colors.success + '18',
  },
  iconWrapGold: {
    backgroundColor: '#F5D97A',
  },
  iconWrapSilver: {
    backgroundColor: '#D9DEE3',
  },
  iconWrapBronze: {
    backgroundColor: '#E1B18B',
  },
  month: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  target: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  state: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  stateOk: {
    color: Colors.success,
  },
  rankChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  rankChipGold: {
    backgroundColor: '#F5D97A',
    borderColor: '#E4BF4A',
  },
  rankChipSilver: {
    backgroundColor: '#D9DEE3',
    borderColor: '#B7C0CA',
  },
  rankChipBronze: {
    backgroundColor: '#E1B18B',
    borderColor: '#C98C5E',
  },
  rankChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rankChipTextGold: {
    color: '#7A5200',
  },
  rankChipTextSilver: {
    color: '#4A5663',
  },
  rankChipTextBronze: {
    color: '#6B3E20',
  },
  empty: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});

