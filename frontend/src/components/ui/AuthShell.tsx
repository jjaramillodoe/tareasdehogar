import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FlagStripe from '../FlagStripe';
import { Colors, Elevation, Radius, Spacing, Type } from '../../theme';
import { hapticTap } from '../../utils/feedback';

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel?: string;
  /** Shows "Paso x de y" and a segmented progress bar. */
  step?: { current: number; total: number };
  children: React.ReactNode;
};

/** Shared layout for sign-in / sign-up flows: light header, progress, keyboard-safe scroll. */
export default function AuthShell({ title, subtitle, onBack, backLabel = 'Volver', step, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top }}>
        <FlagStripe height={5} style={styles.flag} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Spacing.xxl + Math.max(insets.bottom, Spacing.md) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <Pressable
              onPress={() => {
                void hapticTap();
                onBack();
              }}
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              hitSlop={6}
              style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            >
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </Pressable>
            {step ? (
              <Text style={styles.stepText}>
                Paso {step.current} de {step.total}
              </Text>
            ) : null}
          </View>

          {step ? (
            <View style={styles.progressRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {Array.from({ length: step.total }, (_, i) => (
                <View key={i} style={[styles.progressSeg, i < step.current && styles.progressSegOn]} />
              ))}
            </View>
          ) : null}

          <View style={styles.titleBlock}>
            <Text style={[Type.title, styles.title]} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={Type.body}>{subtitle}</Text> : null}
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  flag: {
    borderRadius: 0,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  stepText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  progressRow: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
    marginTop: -Spacing.xs,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
  },
  progressSegOn: {
    backgroundColor: Colors.primary,
  },
  titleBlock: {
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
});
