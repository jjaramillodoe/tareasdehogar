import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FlagStripe from './FlagStripe';
import Card from './ui/Card';
import IconTile from './ui/IconTile';
import { Colors, Elevation, Radius, Spacing, Tones, Type } from '../theme';
import { hapticTap } from '../utils/feedback';

type Props = {
  title: string;
  subtitle?: string;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Extra block under the title (e.g. the blue balance card) */
  headerExtra?: React.ReactNode;
  /** Right-side header action */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /** @deprecated Kept for call-site compat; no longer affects the header */
  accent?: 'yellow' | 'blue';
  showBack?: boolean;
  onBack?: () => void;
  /** Use ScrollView (default) or plain View for nested scroll content */
  scroll?: boolean;
};

/** Child screen chrome: same light large-title header as the parent area; `headerExtra` sits below the title. */
export default function ChildScreenShell({
  title,
  subtitle,
  loading,
  refreshing,
  onRefresh,
  headerExtra,
  headerRight,
  children,
  showBack,
  onBack,
  scroll = true,
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

  const band = (
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
          <Text style={[Type.title, styles.title]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} accessibilityRole="header">
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
      {headerExtra ? <View style={styles.headerExtra}>{headerExtra}</View> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {band}
      {scroll ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, styles.fill, { paddingBottom: insets.bottom + 12 }]}>
          {children}
        </View>
      )}
    </View>
  );
}

export function ChildHeaderSignOutButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.signOutBtn, pressed && styles.backBtnPressed]}
      onPress={() => {
        void hapticTap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      hitSlop={8}
    >
      <Ionicons name="log-out-outline" size={18} color={Colors.textSecondary} />
      <Text style={styles.signOutLabel}>Salir</Text>
    </Pressable>
  );
}

export function ChildStatPill({
  icon,
  label,
  value,
  tone = 'primary',
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string | number;
  tone?: 'primary' | 'secondary' | 'accent' | 'success';
}) {
  const colors = Tones[tone];

  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]} accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={icon} size={16} color={colors.fg} />
      <Text style={[styles.pillValue, { color: colors.fg }]}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

export function ChildEmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
}) {
  return (
    <Card style={styles.empty}>
      <IconTile icon={icon} size={56} />
      <Text style={[Type.heading, styles.emptyText]}>{title}</Text>
      {subtitle ? <Text style={[Type.body, styles.emptyText]}>{subtitle}</Text> : null}
    </Card>
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
  headerExtra: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderDark,
    ...Elevation.low,
  },
  signOutLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  body: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg + 2,
  },
  fill: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg + 2,
  },
  pill: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm + 2,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pillValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    textAlign: 'center',
  },
});
