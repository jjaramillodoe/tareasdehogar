import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { shadow } from '../utils/shadow';

type Props = {
  hasFamily: boolean;
  childrenCount: number;
  choresCount: number;
  hasChildLoginCode: boolean;
};

type Step = {
  key: string;
  title: string;
  done: boolean;
  href: string;
};

const DISMISS_KEY = 'habitapp_first_run_dismissed';

export default function FirstRunChecklist({
  hasFamily,
  childrenCount,
  choresCount,
  hasChildLoginCode,
}: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY).then((v) => setDismissed(v === '1'));
  }, []);

  const steps: Step[] = useMemo(
    () => [
      {
        key: 'family',
        title: 'Crear tu familia',
        done: hasFamily,
        href: '/(parent)/home',
      },
      {
        key: 'child',
        title: 'Agregar al menos un hijo',
        done: childrenCount > 0,
        href: '/(parent)/children',
      },
      {
        key: 'chore',
        title: 'Crear la primera tarea',
        done: choresCount > 0,
        href: '/(parent)/chores',
      },
      {
        key: 'code',
        title: 'Compartir código de acceso a hijos',
        done: hasChildLoginCode && childrenCount > 0,
        href: '/(parent)/profile',
      },
    ],
    [hasFamily, childrenCount, choresCount, hasChildLoginCode]
  );

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  const dismiss = useCallback(async () => {
    await AsyncStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  if (dismissed || allDone) return null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View>
          <Text style={styles.eyebrow}>Primeros pasos</Text>
          <Text style={styles.title}>
            {doneCount}/{steps.length} listos
          </Text>
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={12}>
          <Ionicons name="close" size={20} color={Colors.textLight} />
        </TouchableOpacity>
      </View>
      {steps.map((step) => (
        <TouchableOpacity
          key={step.key}
          style={styles.row}
          disabled={step.done}
          onPress={() => router.push(step.href as any)}
        >
          <Ionicons
            name={step.done ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={step.done ? Colors.success : Colors.primary}
          />
          <Text style={[styles.rowText, step.done && styles.rowDone]}>{step.title}</Text>
          {!step.done ? (
            <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 4, blur: 12, opacity: 0.1, elevation: 3 }),
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  rowDone: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
});
