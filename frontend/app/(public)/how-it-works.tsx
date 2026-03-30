import React, { useRef, useState } from 'react';
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { PublicContentLayout } from '../../src/components/PublicContentLayout';
import { legalStyles as s } from '../../src/constants/legalStyles';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

type Step = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  hint: string;
};

const STEPS: Step[] = [
  {
    id: 'step-1',
    icon: 'person-add-outline',
    title: '1. Crear familia y perfiles',
    body: 'Regístrate, crea tu familia y añade a cada hijo o hija con edad, alias y PIN opcional.',
    hint: 'Sugerencia: inicia con un hijo para probar el flujo en minutos.',
  },
  {
    id: 'step-2',
    icon: 'clipboard-outline',
    title: '2. Asignar tareas',
    body: 'Crea tareas con monto, fecha y responsables. Los hijos las completan y envían evidencia si quieres.',
    hint: 'Tip: usa el calendario para planificar semanalmente.',
  },
  {
    id: 'step-3',
    icon: 'checkmark-done-outline',
    title: '3. Aprobar y pagar',
    body: 'Revisa tareas, aprueba y decide cuánto va a saldo y cuánto a ahorro/meta.',
    hint: 'Incluye una nota corta de por qué ahorrar para reforzar hábitos.',
  },
  {
    id: 'step-4',
    icon: 'cash-outline',
    title: '4. Retiros y control',
    body: 'Gestiona solicitudes de retiro, marca pagos y consulta cuánto dinero debes tener listo.',
    hint: 'En Home y Perfil verás el total pendiente por entregar.',
  },
];

export default function HowItWorksScreen() {
  const { width } = useWindowDimensions();
  const cardW = Math.max(280, width - 64);
  const scrollerRef = useRef<ScrollView | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, idx));
    scrollerRef.current?.scrollTo({ x: clamped * cardW, animated: true });
    setActiveIdx(clamped);
  };

  return (
    <PublicContentLayout title="Cómo funciona la app">
      <Text style={s.p}>
        HabitApp conecta a padres y niños para organizar tareas, ahorro y recompensas en familia.
        Sigue estos pasos y agrega tus capturas para explicar la app de forma visual.
      </Text>

      <Text style={s.h2}>Guía paso a paso</Text>
      <View style={styles.carouselWrap}>
        <ScrollView
          ref={scrollerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={cardW}
          onMomentumScrollEnd={(evt) => {
            const x = evt.nativeEvent.contentOffset.x;
            const idx = Math.round(x / cardW);
            setActiveIdx(Math.max(0, Math.min(STEPS.length - 1, idx)));
          }}
        >
          {STEPS.map((step) => (
            <View key={step.id} style={[styles.card, { width: cardW }]}>
              <View style={styles.preview}>
                <Ionicons name="image-outline" size={22} color={Colors.primary} />
                <Text style={styles.previewText}>Aquí puedes poner tu captura</Text>
              </View>
              <View style={styles.stepHeader}>
                <Ionicons name={step.icon} size={20} color={Colors.primary} />
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>
              <Text style={styles.stepBody}>{step.body}</Text>
              <Text style={styles.stepHint}>{step.hint}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={() => goTo(activeIdx - 1)}
            disabled={activeIdx === 0}
            style={[styles.arrowBtn, activeIdx === 0 && styles.arrowBtnOff]}
          >
            <Ionicons name="arrow-back" size={16} color={activeIdx === 0 ? Colors.textLight : Colors.primary} />
          </TouchableOpacity>
          <View style={styles.dotsRow}>
            {STEPS.map((step, i) => (
              <View key={step.id} style={[styles.dot, i === activeIdx && styles.dotOn]} />
            ))}
          </View>
          <TouchableOpacity
            onPress={() => goTo(activeIdx + 1)}
            disabled={activeIdx === STEPS.length - 1}
            style={[styles.arrowBtn, activeIdx === STEPS.length - 1 && styles.arrowBtnOff]}
          >
            <Ionicons
              name="arrow-forward"
              size={16}
              color={activeIdx === STEPS.length - 1 ? Colors.textLight : Colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </PublicContentLayout>
  );
}

const styles = StyleSheet.create({
  carouselWrap: {
    marginTop: 4,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    marginRight: 12,
  },
  preview: {
    height: 300,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary + '55',
    backgroundColor: Colors.primary + '0d',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  stepBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  stepHint: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  controls: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '12',
  },
  arrowBtnOff: {
    backgroundColor: Colors.surfaceAlt,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.border,
  },
  dotOn: {
    width: 18,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
});
