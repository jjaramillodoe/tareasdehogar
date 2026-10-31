import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from '../src/constants/colors';
import SplashScreen from '../src/components/SplashScreen';
import ConnectivityBanner from '../src/components/ConnectivityBanner';
import { registerForPushNotificationsAsync } from '../src/services/push';

export default function RootLayout() {
  const {
    initialize,
    isInitialized,
    isLoading,
    touchActivity,
    enforceAutoLogout,
    token,
  } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        enforceAutoLogout().catch(() => undefined);
        touchActivity().catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [enforceAutoLogout, touchActivity]);

  useEffect(() => {
    const timer = setInterval(() => {
      enforceAutoLogout().catch(() => undefined);
    }, 30000);
    return () => clearInterval(timer);
  }, [enforceAutoLogout]);

  useEffect(() => {
    if (!token) return;
    registerForPushNotificationsAsync().catch(() => undefined);
  }, [token]);
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </SafeAreaProvider>
    );
  }

  if (!isInitialized || isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ConnectivityBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(parent)" />
        <Stack.Screen name="(child)" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
