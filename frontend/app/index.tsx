import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from '../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && user) {
      router.replace('/(parent)/home');
    }
  }, [isInitialized, user]);

  return (
    <View style={styles.container}>
      {/* Background Decoration */}
      <View style={styles.backgroundDecoration}>
        <View style={[styles.decorCircle, styles.decorBlue]} />
        <View style={[styles.decorCircle, styles.decorYellow]} />
        <View style={[styles.decorCircle, styles.decorRed]} />
      </View>

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="home" size={50} color={Colors.white} />
            </View>
            <View style={styles.coinBadge}>
              <Ionicons name="cash" size={18} color={Colors.white} />
            </View>
          </View>
          <Text style={styles.title}>Tareas del Hogar</Text>
          <Text style={styles.subtitle}>
            Gestiona las tareas de tus hijos y recompénsalos por su esfuerzo
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="list" size={24} color={Colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Crea tareas</Text>
              <Text style={styles.featureDesc}>Asigna tareas a tus hijos</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.secondary + '20' }]}>
              <Ionicons name="cash" size={24} color={Colors.secondary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Define pagos</Text>
              <Text style={styles.featureDesc}>Establece recompensas</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.accent + '20' }]}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Aprueba</Text>
              <Text style={styles.featureDesc}>Valida y paga las tareas</Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Ionicons name="person-add" size={20} color={Colors.white} />
            <Text style={styles.primaryButtonText}>Crear Cuenta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Ionicons name="log-in" size={20} color={Colors.primary} />
            <Text style={styles.secondaryButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDots}>
            <View style={[styles.footerDot, { backgroundColor: Colors.primary }]} />
            <View style={[styles.footerDot, { backgroundColor: Colors.secondary }]} />
            <View style={[styles.footerDot, { backgroundColor: Colors.accent }]} />
          </View>
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
  backgroundDecoration: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.1,
  },
  decorBlue: {
    width: width * 0.7,
    height: width * 0.7,
    backgroundColor: Colors.primary,
    top: -width * 0.2,
    right: -width * 0.2,
  },
  decorYellow: {
    width: width * 0.5,
    height: width * 0.5,
    backgroundColor: Colors.secondary,
    top: '40%',
    left: -width * 0.2,
  },
  decorRed: {
    width: width * 0.4,
    height: width * 0.4,
    backgroundColor: Colors.accent,
    bottom: -width * 0.1,
    right: -width * 0.1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  coinBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  features: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    marginLeft: 16,
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  featureDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.white,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerDots: {
    flexDirection: 'row',
    gap: 8,
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
