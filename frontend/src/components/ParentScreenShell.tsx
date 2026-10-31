import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FlagStripe from './FlagStripe';
import { Colors, Elevation, Radius, Spacing, Type } from '../theme';
import { hapticTap } from '../utils/feedback';

type Props = {
  title: string;
  subtitle?: string;
  loading?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  /** Right-side header action (e.g. add button) */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
};

/** Parent screen chrome: flag stripe, light large-title header, neutral canvas body. */
export default function ParentScreenShell({
  title,
  subtitle,
  loading,
  showBack,
  onBack,
  headerRight,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <FlagStripe height={5} style={styles.flag} />
        <View style={styles.headerRow}>
          {showBack ? (
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
              onPress={() => {
                void hapticTap();
                (onBack || (() => router.back()))();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </Pressable>
          ) : null}
          <View style={styles.headerText}>
            <Text style={[Type.title, styles.title]} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text style={[Type.caption, styles.subtitle]} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

export function ParentHeaderAddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
      onPress={() => {
        void hapticTap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel="Agregar"
    >
      <Ionicons name="add" size={26} color={Colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  flag: {
    borderRadius: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md + 2,
    gap: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderDark,
    ...Elevation.low,
  },
  backBtnPressed: {
    backgroundColor: Colors.primarySoft,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 2,
  },
  headerRight: {
    marginLeft: Spacing.xs,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md + 2,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Elevation.low,
  },
  addButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  body: {
    flex: 1,
  },
});
