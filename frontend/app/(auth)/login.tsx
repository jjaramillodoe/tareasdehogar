import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useGoBack } from '../../src/utils/navigation';
import AuthShell from '../../src/components/ui/AuthShell';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Chip from '../../src/components/ui/Chip';
import TextField from '../../src/components/ui/TextField';
import { Colors, Spacing, Type } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const { login, isLoading } = useAuthStore();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = 'El correo es requerido';
    else if (!/\S+@\S+\.\S+/.test(email.trim())) next.email = 'Ingresa un correo válido';
    if (!password) next.password = 'La contraseña es requerida';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    try {
      await login(email.trim(), password);
      router.replace('/(parent)/home');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al iniciar sesión';
      Alert.alert('Error', message);
    }
  };

  return (
    <AuthShell title="Iniciar sesión" subtitle="Entra a tu cuenta familiar" onBack={goBack}>
      <Card style={styles.card}>
        <Chip label="Padre o tutor" icon="shield-checkmark" />

        <TextField
          label="Correo electrónico"
          icon="mail-outline"
          placeholder="tu@correo.com"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
          }}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <TextField
          ref={passwordRef}
          label="Contraseña"
          icon="lock-closed-outline"
          placeholder="Tu contraseña"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
          }}
          error={errors.password}
          secureToggle
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
        />

        <Text
          style={styles.forgotLink}
          onPress={() => router.push('/(auth)/forgot-password')}
          accessibilityRole="link"
        >
          ¿Olvidaste tu contraseña?
        </Text>
      </Card>

      <Button
        label="Iniciar sesión"
        iconRight="arrow-forward"
        size="lg"
        loading={isLoading}
        onPress={handleLogin}
      />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>o</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.childBlock}>
        <Button
          label="Soy hijo o hija"
          icon="happy"
          variant="kid"
          onPress={() => router.push('/(auth)/child-login')}
        />
        <Text style={[Type.caption, styles.center]}>
          Usa el código de familia que te dieron. No necesitas correo.
        </Text>
      </View>

      <Text style={[Type.body, styles.center]}>
        ¿No tienes cuenta?{' '}
        <Text style={styles.inlineLink} onPress={() => router.push('/(auth)/register')}>
          Regístrate
        </Text>
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.lg,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    paddingVertical: Spacing.xs,
    marginTop: -Spacing.xs,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderDark,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textLight,
  },
  childBlock: {
    gap: Spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
  inlineLink: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
