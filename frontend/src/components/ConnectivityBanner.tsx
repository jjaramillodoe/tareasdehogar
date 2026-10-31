import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { useNetworkStore } from '../store/networkStore';

export default function ConnectivityBanner() {
  const insets = useSafeAreaInsets();
  const isOffline = useNetworkStore((s) => s.isOffline);

  if (!isOffline) return null;

  return (
    <View style={[styles.banner, { paddingTop: Math.max(insets.top, 8) }]}>
      <Text style={styles.text}>Sin conexión. Algunas acciones no se guardarán.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 14,
    paddingBottom: 8,
    alignItems: 'center',
  },
  text: {
    color: Colors.onSecondary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
