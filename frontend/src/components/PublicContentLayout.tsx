import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../store/authStore';
import FlagStripe from './FlagStripe';
import { shadow } from '../utils/shadow';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function PublicContentLayout({ title, subtitle, children }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isChildSession } = useAuthStore();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (isChildSession) {
      router.replace('/(child)/home');
    } else if (user) {
      router.replace('/(parent)/more');
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerBand, { paddingTop: Math.max(insets.top, 12) + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>HabitApp</Text>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        <FlagStripe height={5} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBand: {
    backgroundColor: Colors.primary,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 6, blur: 14, opacity: 0.28, elevation: 8 }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 16,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
});
