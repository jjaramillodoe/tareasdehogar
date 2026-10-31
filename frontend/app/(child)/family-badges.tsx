import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { statsAPI } from '../../src/services/api';
import { FamilyBadgesPanel, FamilyBadgeHistoryRow } from '../../src/components/FamilyBadgesPanel';
import { useAuthStore } from '../../src/store/authStore';
import ChildScreenShell from '../../src/components/ChildScreenShell';

export default function ChildFamilyBadgesScreen() {
  const { selectedChild } = useAuthStore();
  const [history, setHistory] = useState<FamilyBadgeHistoryRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!selectedChild) return;
    try {
      const rep = await statsAPI.getChildStats(selectedChild.id);
      const rows = ((rep as any)?.family_savings_challenge?.history ?? []) as FamilyBadgeHistoryRow[];
      setHistory(rows);
    } finally {
      setRefreshing(false);
    }
  }, [selectedChild]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <ChildScreenShell
      title="Insignias familiares"
      subtitle="Así va el reto compartido de ahorro en tu familia"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
      showBack
      accent="yellow"
    >
      <View style={styles.panel}>
        <FamilyBadgesPanel history={history} />
      </View>
    </ChildScreenShell>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
});
