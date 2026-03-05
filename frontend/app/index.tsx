import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from '../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, family, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && user) {
      router.replace('/(parent)/home');
    }
  }, [isInitialized, user]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="home" size={60} color={Colors.white} />
        </View>
        <Text style={styles.title}>Tareas del Hogar</Text>
        <Text style={styles.subtitle}>
          Gestiona las tareas de tus hijos y recompénsalos por su esfuerzo
        </Text>
      </View>

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <Ionicons name="list-outline" size={28} color={Colors.primary} />
          <Text style={styles.featureText}>Crea tareas para tus hijos</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="cash-outline" size={28} color={Colors.secondary} />
          <Text style={styles.featureText}>Asigna pagos por cada tarea</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle-outline" size={28} color={Colors.success} />
          <Text style={styles.featureText}>Aprueba y gestiona los pagos</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.primaryButtonText}>Crear Cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.secondaryButtonText}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 16,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
});
