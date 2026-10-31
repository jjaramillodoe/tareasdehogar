import React, { useRef, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PublicContentLayout } from '../../src/components/PublicContentLayout';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { shadow } from '../../src/utils/shadow';


type Step = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  hint: string;
  accent: string;
  accentSoft: string;
  previewIcon: React.ComponentProps<typeof Ionicons>['name'];
};

const STEPS: Step[] = [
  {
    id: 'step-1',
    icon: 'people',
    previewIcon: 'home',
    title: 'Crear familia y perfiles',
    body: 'Regístrate, crea tu familia y añade a cada hijo o hija con edad, alias y PIN opcional.',
    hint: 'Inicia con un hijo para probar el flujo en minutos.',
    accent: Colors.primary,
    accentSoft: Colors.primary + '22',
  },
  {
    id: 'step-2',
    icon: 'clipboard',
    previewIcon: 'list',
    title: 'Asignar tareas',
    body: 'Crea tareas con monto, fecha y responsables. Los hijos las completan y envían evidencia si quieres.',
    hint: 'Usa el calendario para planificar semanalmente.',
    accent: Colors.secondaryInk,
    accentSoft: Colors.secondary + '55',
  },
  {
    id: 'step-3',
    icon: 'checkmark-done',
    previewIcon: 'thumbs-up',
    title: 'Aprobar y pagar',
    body: 'Revisa tareas, aprueba y decide cuánto va a saldo y cuánto a ahorro o meta.',
    hint: 'Incluye una nota corta de por qué ahorrar para reforzar hábitos.',
    accent: Colors.success,
    accentSoft: Colors.success + '22',
  },
  {
    id: 'step-4',
    icon: 'wallet',
    previewIcon: 'cash',
    title: 'Retiros y control',
    body: 'Gestiona solicitudes de retiro, marca pagos y consulta cuánto dinero debes tener listo.',
    hint: 'En Inicio y Perfil verás el total pendiente por entregar.',
    accent: Colors.accent,
    accentSoft: Colors.accent + '22',
  },
];

export default function HowItWorksScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const gap = 14;
  const cardW = Math.max(280, width - 56);
  const scrollerRef = useRef<ScrollView | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeStep = STEPS[activeIdx];

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, idx));
    scrollerRef.current?.scrollTo({ x: clamped * (cardW + gap), animated: true });
    setActiveIdx(clamped);
  };

  return (
    <PublicContentLayout title="Cómo funciona la app">
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Ionicons name="sparkles" size={14} color={Colors.primary} />
          <Text style={styles.heroBadgeText}>Guía rápida</Text>
        </View>
        <Text style={styles.heroTitle}>De la tarea al ahorro, en familia</Text>
        <Text style={styles.heroBody}>
          HabitApp conecta a padres y niños para organizar tareas, recompensas y metas de ahorro.
        </Text>
        <View style={styles.heroPills}>
          <View style={[styles.pill, { backgroundColor: Colors.primary + '18' }]}>
            <Text style={[styles.pillText, { color: Colors.primary }]}>Tareas</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: Colors.secondary + '55' }]}>
            <Text style={[styles.pillText, { color: Colors.secondaryInk }]}>Pagos</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: Colors.accent + '18' }]}>
            <Text style={[styles.pillText, { color: Colors.accent }]}>Ahorro</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Guía paso a paso</Text>
        <View style={[styles.stepCountBadge, { backgroundColor: activeStep.accent + '22' }]}>
          <Text style={[styles.stepCountText, { color: activeStep.accent }]}>
            {activeIdx + 1}/{STEPS.length}
          </Text>
        </View>
      </View>

      <View style={styles.carouselWrap}>
        <ScrollView
          ref={scrollerRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={cardW + gap}
          snapToAlignment="start"
          disableIntervalMomentum
          contentContainerStyle={{ paddingRight: 8 }}
          onMomentumScrollEnd={(evt) => {
            const x = evt.nativeEvent.contentOffset.x;
            const idx = Math.round(x / (cardW + gap));
            setActiveIdx(Math.max(0, Math.min(STEPS.length - 1, idx)));
          }}
        >
          {STEPS.map((step, index) => (
            <View
              key={step.id}
              style={[
                styles.card,
                {
                  width: cardW,
                  marginRight: gap,
                  borderColor: step.accent + '40',
                },
              ]}
            >
              <View style={[styles.preview, { backgroundColor: step.accentSoft }]}>
                <View style={[styles.previewOrb, { backgroundColor: step.accent + '33' }]} />
                <View style={[styles.previewIconWrap, { backgroundColor: step.accent }]}>
                  <Ionicons name={step.previewIcon} size={34} color={Colors.white} />
                </View>
                <Text style={[styles.previewLabel, { color: step.accent }]}>Paso {index + 1}</Text>
                <Text style={styles.previewText}>Ilustración del flujo</Text>
              </View>

              <View style={[styles.stepChip, { backgroundColor: step.accentSoft }]}>
                <Ionicons name={step.icon} size={16} color={step.accent} />
                <Text style={[styles.stepChipText, { color: step.accent }]}>
                  Paso {index + 1}
                </Text>
              </View>

              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>

              <View style={[styles.hintBox, { backgroundColor: step.accentSoft, borderColor: step.accent + '33' }]}>
                <Ionicons name="bulb" size={15} color={step.accent} />
                <Text style={[styles.stepHint, { color: step.accent }]}>{step.hint}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={() => goTo(activeIdx - 1)}
            disabled={activeIdx === 0}
            style={[styles.arrowBtn, activeIdx === 0 && styles.arrowBtnOff]}
            accessibilityLabel="Paso anterior"
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color={activeIdx === 0 ? Colors.textLight : Colors.primary}
            />
          </TouchableOpacity>

          <View style={styles.dotsRow}>
            {STEPS.map((step, i) => (
              <TouchableOpacity
                key={step.id}
                onPress={() => goTo(i)}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                accessibilityLabel={`Ir al paso ${i + 1}`}
              >
                <View
                  style={[
                    styles.dot,
                    i === activeIdx && [styles.dotOn, { backgroundColor: step.accent }],
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => goTo(activeIdx + 1)}
            disabled={activeIdx === STEPS.length - 1}
            style={[styles.arrowBtn, activeIdx === STEPS.length - 1 && styles.arrowBtnOff]}
            accessibilityLabel="Siguiente paso"
          >
            <Ionicons
              name="arrow-forward"
              size={18}
              color={activeIdx === STEPS.length - 1 ? Colors.textLight : Colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>¿Listo para empezar?</Text>
        <Text style={styles.ctaBody}>Crea tu cuenta familiar o entra si ya tienes una.</Text>
        <TouchableOpacity
          style={styles.ctaPrimary}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.9}
        >
          <Ionicons name="person-add" size={18} color={Colors.white} />
          <Text style={styles.ctaPrimaryText}>Crear cuenta</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ctaSecondary}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.88}
        >
          <Ionicons name="log-in" size={18} color={Colors.primary} />
          <Text style={styles.ctaSecondaryText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    </PublicContentLayout>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1.5,
    borderColor: Colors.primary + '28',
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 6, blur: 14, opacity: 0.1, elevation: 4 }),

  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '14',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  heroBody: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 14,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  stepCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  stepCountText: {
    fontSize: 12,
    fontWeight: '800',
  },
  carouselWrap: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 12,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 8, blur: 16, opacity: 0.12, elevation: 5 }),

  },
  preview: {
    height: 210,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  previewOrb: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -30,
    right: -40,
  },
  previewIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...shadow({ color: Colors.black, offsetX: 0, offsetY: 4, blur: 8, opacity: 0.18, elevation: 4 }),

  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  previewText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  stepChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
  },
  stepChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  stepBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    fontWeight: '500',
  },
  hintBox: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepHint: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  controls: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '16',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  arrowBtnOff: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.border,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderDark,
  },
  dotOn: {
    width: 22,
    borderRadius: 999,
  },
  ctaCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.secondary + '66',
    ...shadow({ color: Colors.secondary, offsetX: 0, offsetY: 6, blur: 12, opacity: 0.15, elevation: 4 }),

  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  ctaBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 14,
    fontWeight: '500',
  },
  ctaPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 5, blur: 10, opacity: 0.35, elevation: 5 }),

  },
  ctaPrimaryText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  ctaSecondary: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  ctaSecondaryText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
});
