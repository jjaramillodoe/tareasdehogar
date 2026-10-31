import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import ParentScreenShell from '../../src/components/ParentScreenShell';
import { Colors } from '../../src/constants/colors';
import { statsAPI } from '../../src/services/api';
import { FamilyBadgesPanel, FamilyBadgeHistoryRow } from '../../src/components/FamilyBadgesPanel';

export default function ParentFamilyBadgesScreen() {
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
    <ParentScreenShell
      title="Insignias familiares"
      subtitle="Historial mensual del reto de ahorro compartido."
      showBack
    >
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <FamilyBadgesPanel history={history} />
      </ScrollView>
    </ParentScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
});
