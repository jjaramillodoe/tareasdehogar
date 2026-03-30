import React from 'react';
import { Stack } from 'expo-router';

export default function PublicLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="how-it-works" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="privacy-minors" />
      <Stack.Screen name="terms" />
    </Stack>
  );
}
