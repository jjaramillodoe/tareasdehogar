import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from '../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import FlagStripe from '../src/components/FlagStripe';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isInitialized, isChildSession, selectedChild } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;
    if (isChildSession && selectedChild) {
      router.replace('/(child)/tasks');
      return;
    }
    if (user) {
      router.replace('/(parent)/home');
    }
  }, [isInitialized, user, isChildSession, selectedChild]);

  return (
    <View style={styles.container}>
      {/* Background Decoration */}
      <View style={styles.backgroundDecoration}>
        <View style={[styles.decorCircle, styles.decorBlue]} />
        <View style={[styles.decorCircle, styles.decorYellow]} />
        <View style={[styles.decorCircle, styles.decorRed]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <FlagStripe height={5} style={styles.flagStripe} />
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="people" size={48} color={Colors.white} />
            </View>
            <View style={styles.coinBadge}>
              <Ionicons name="wallet" size={17} color={Colors.onSecondary} />
            </View>
          </View>
          <Text style={styles.title}>HabitApp</Text>
          <Text style={styles.subtitle}>
            Gestiona las tareas de tus hijos y recompénsalos por su esfuerzo
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.primary + '22' }]}>
              <Ionicons name="clipboard-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Crea tareas</Text>
              <Text style={styles.featureDesc}>Asigna tareas a tus hijos</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.secondary + '33' }]}>
              <Ionicons name="wallet-outline" size={24} color={Colors.onSecondary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Define pagos</Text>
              <Text style={styles.featureDesc}>Establece recompensas</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.accent + '22' }]}>
              <Ionicons name="checkmark-done-circle" size={24} color={Colors.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Aprueba</Text>
              <Text style={styles.featureDesc}>Valida y paga las tareas</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.guideButton}
          onPress={() => router.push('/(public)/how-it-works')}
          activeOpacity={0.85}
        >
          <Ionicons name="book-outline" size={22} color={Colors.primary} />
          <Text style={styles.guideButtonText}>Cómo funciona la app</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Ionicons name="person-add-outline" size={22} color={Colors.white} />
            <Text style={styles.primaryButtonText}>Crear Cuenta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Ionicons name="log-in-outline" size={22} color={Colors.primary} />
            <Text style={styles.secondaryButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.childEntryButton}
            onPress={() => router.push('/(auth)/child-login')}
          >
            <Ionicons name="happy-outline" size={22} color={Colors.black} />
            <Text style={[styles.childEntryButtonText, { color: Colors.black }]}>Soy hijo/a</Text>
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => router.push('/(public)/privacy')}>
            <Text style={styles.legalLink}>Privacidad</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}>·</Text>
          <TouchableOpacity onPress={() => router.push('/(public)/privacy-minors')}>
            <Text style={styles.legalLink}>Menores</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}>·</Text>
          <TouchableOpacity onPress={() => router.push('/(public)/terms')}>
            <Text style={styles.legalLink}>Términos</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDots}>
            <View style={[styles.footerDot, { backgroundColor: Colors.flagYellow }]} />
            <View style={[styles.footerDot, { backgroundColor: Colors.flagBlue }]} />
            <View style={[styles.footerDot, { backgroundColor: Colors.flagRed }]} />
          </View>
        </View>
      </ScrollView>
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
    backgroundColor: Colors.flagBlue,
    top: -width * 0.2,
    right: -width * 0.2,
  },
  decorYellow: {
    width: width * 0.5,
    height: width * 0.5,
    backgroundColor: Colors.flagYellow,
    top: '40%',
    left: -width * 0.2,
  },
  decorRed: {
    width: width * 0.4,
    height: width * 0.4,
    backgroundColor: Colors.flagRed,
    bottom: -width * 0.1,
    right: -width * 0.1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  guideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary + '44',
  },
  guideButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  flagStripe: {
    width: '72%',
    maxWidth: 280,
    marginBottom: 16,
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
  childEntryButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: Colors.secondaryDark,
  },
  childEntryButtonText: {
    color: Colors.secondary,
    fontSize: 17,
    fontWeight: '600',
  },
  legalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    gap: 4,
  },
  legalLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  legalSep: {
    fontSize: 13,
    color: Colors.textLight,
    marginHorizontal: 2,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 12,
    paddingTop: 8,
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
