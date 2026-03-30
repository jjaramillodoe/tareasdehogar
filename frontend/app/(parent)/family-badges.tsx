import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { statsAPI } from '../../src/services/api';
import { FamilyBadgesPanel, FamilyBadgeHistoryRow } from '../../src/components/FamilyBadgesPanel';

export default function ParentFamilyBadgesScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<FamilyBadgeHistoryRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const rep = await statsAPI.getFamilyReport(30);
      const rows = ((rep as any)?.family_savings_challenge?.history ?? []) as FamilyBadgeHistoryRow[];
      setHistory(rows);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Insignias familiares</Text>
      </View>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          void load();
        }} />}
      >
        <Text style={styles.subtitle}>Historial mensual del reto de ahorro compartido.</Text>
        <FamilyBadgesPanel history={history} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text },
  content: { flex: 1, padding: 16 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
});

