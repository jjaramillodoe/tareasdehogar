import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import FlagStripe from '../src/components/FlagStripe';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import IconTile from '../src/components/ui/IconTile';
import { Colors, Elevation, Radius, Spacing, Tone, Type } from '../src/theme';
import { hapticTap } from '../src/utils/feedback';

const { width } = Dimensions.get('window');

const STEPS: { key: string; title: string; desc: string; icon: 'clipboard' | 'wallet' | 'checkmark-done'; tone: Tone }[] = [
  { key: 'tasks', title: 'Crea tareas', desc: 'Asigna lo de la casa a cada hijo', icon: 'clipboard', tone: 'primary' },
  { key: 'pay', title: 'Define recompensas', desc: 'Acuerda el monto de cada tarea', icon: 'wallet', tone: 'secondary' },
  { key: 'approve', title: 'Aprueba y paga', desc: 'Revisa, valida y registra el pago', icon: 'checkmark-done', tone: 'accent' },
];

type Href =
  | '/(auth)/register'
  | '/(auth)/login'
  | '/(auth)/child-login'
  | '/(public)/how-it-works'
  | '/(public)/privacy'
  | '/(public)/privacy-minors'
  | '/(public)/terms';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, isInitialized, isChildSession, selectedChild } = useAuthStore();

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (!isInitialized || !token) return;
    if (isChildSession && selectedChild) {
      router.replace('/(child)/home');
      return;
    }
    if (user) {
      router.replace('/(parent)/home');
    }
  }, [isInitialized, token, user, isChildSession, selectedChild, router]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp, logoScale]);

  const go = (href: Href) => router.push(href);

  const enter = { opacity: fadeIn, transform: [{ translateY: slideUp }] };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundDecoration} pointerEvents="none">
        <View style={styles.decorBlue} />
      </View>

      <View style={{ paddingTop: insets.top }}>
        <FlagStripe height={5} style={styles.flagFull} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, enter]}>
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
            <View style={styles.logoRing}>
              <View style={styles.logoCircle}>
                <Ionicons name="people" size={40} color={Colors.white} />
              </View>
            </View>
            <View style={styles.coinBadge}>
              <Ionicons name="wallet" size={15} color={Colors.onSecondary} />
            </View>
          </Animated.View>

          <Text style={Type.eyebrow}>Para familias</Text>
          <Text style={[Type.display, styles.title]}>HabitApp</Text>
          <Text style={[Type.body, styles.subtitle]}>
            Tareas del hogar, recompensas y ahorro. Los padres aprueban; los hijos ganan.
          </Text>
        </Animated.View>

        <Animated.View style={enter}>
          <Card style={styles.stepsCard}>
            <Text style={[Type.eyebrow, styles.stepsEyebrow]}>Así de simple</Text>
            {STEPS.map((step, index) => (
              <View key={step.key} style={[styles.stepRow, index > 0 && styles.stepRowDivided]}>
                <IconTile icon={step.icon} tone={step.tone} size={44} badge={String(index + 1)} />
                <View style={styles.stepText}>
                  <Text style={Type.heading}>{step.title}</Text>
                  <Text style={[Type.caption, styles.stepDesc]}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </Card>

          <Pressable
            onPress={() => {
              void hapticTap();
              go('/(public)/how-it-works');
            }}
            accessibilityRole="link"
            style={({ pressed }) => [styles.guideLink, pressed && styles.guideLinkPressed]}
          >
            <Ionicons name="book-outline" size={16} color={Colors.primary} />
            <Text style={styles.guideLinkText}>Ver cómo funciona en 5 pasos</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </Pressable>
        </Animated.View>
      </ScrollView>

      <View style={[styles.ctaDock, { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.xs }]}>
        <Button
          label="Crear cuenta gratis"
          icon="person-add"
          size="lg"
          onPress={() => go('/(auth)/register')}
        />
        <View style={styles.ctaRow}>
          <Button
            label="Iniciar sesión"
            icon="log-in-outline"
            variant="secondary"
            fullWidth={false}
            style={styles.ctaHalf}
            onPress={() => go('/(auth)/login')}
          />
          <Button
            label="Soy hijo/a"
            icon="happy"
            variant="kid"
            fullWidth={false}
            style={styles.ctaHalf}
            accessibilityHint="Entrar con la cuenta de hijo o hija"
            onPress={() => go('/(auth)/child-login')}
          />
        </View>

        <View style={styles.legalRow}>
          <Text style={styles.legalLink} onPress={() => go('/(public)/privacy')}>
            Privacidad
          </Text>
          <Text style={styles.legalSep}>·</Text>
          <Text style={styles.legalLink} onPress={() => go('/(public)/privacy-minors')}>
            Menores
          </Text>
          <Text style={styles.legalSep}>·</Text>
          <Text style={styles.legalLink} onPress={() => go('/(public)/terms')}>
            Términos
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flagFull: {
    width: '100%',
    borderRadius: 0,
  },
  backgroundDecoration: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorBlue: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
    top: -width * 0.3,
    right: -width * 0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoContainer: {
    width: 92,
    height: 92,
    marginBottom: Spacing.lg,
  },
  logoRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    padding: Spacing.xs,
    backgroundColor: Colors.white,
    ...Elevation.raised,
  },
  logoCircle: {
    flex: 1,
    borderRadius: 42,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  title: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 320,
  },
  stepsCard: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  stepsEyebrow: {
    marginBottom: Spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md + 2,
    paddingVertical: Spacing.md,
  },
  stepRowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  stepText: {
    flex: 1,
  },
  stepDesc: {
    marginTop: 1,
  },
  guideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
  },
  guideLinkPressed: {
    backgroundColor: Colors.primarySoft,
  },
  guideLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  ctaDock: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderDark,
    gap: Spacing.sm + 2,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
  },
  ctaHalf: {
    flex: 1,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    paddingVertical: Spacing.xs,
  },
  legalSep: {
    fontSize: 12,
    color: Colors.textLight,
  },
});
