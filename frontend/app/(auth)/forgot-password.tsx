import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { authAPI } from '../../src/services/api';
import { useGoBack } from '../../src/utils/navigation';
import AuthShell from '../../src/components/ui/AuthShell';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Chip from '../../src/components/ui/Chip';
import IconTile from '../../src/components/ui/IconTile';
import TextField from '../../src/components/ui/TextField';
import { Spacing, Type } from '../../src/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});

  const validate = () => {
    const next: { email?: string } = {};
    if (!email.trim()) next.email = 'El correo es requerido';
    else if (!/\S+@\S+\.\S+/.test(email.trim())) next.email = 'Ingresa un correo válido';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
      setSent(true);
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'No se pudo enviar la solicitud. Intenta de nuevo.';
      Alert.alert('Error', String(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Recuperar acceso"
      subtitle={sent ? 'Revisa tu correo' : 'Te enviamos un enlace si el correo existe'}
      onBack={goBack}
    >
      {sent ? (
        <Card style={styles.successCard}>
          <IconTile icon="mail-open" size={60} />
          <Text style={[Type.heading, styles.center]}>Instrucciones enviadas</Text>
          <Text style={[Type.body, styles.center]}>
            Si {email.trim()} está registrado, recibirás un enlace para crear una nueva contraseña.
            Revisa también spam o promociones.
          </Text>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Chip label="Padre o tutor" icon="lock-open-outline" />
          <Text style={Type.body}>
            Escribe el correo de tu cuenta. Si está registrado, te mandamos un enlace para
            restablecer la contraseña.
          </Text>
          <TextField
            label="Correo electrónico"
            icon="mail-outline"
            placeholder="tu@correo.com"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errors.email) setErrors({});
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
          />
        </Card>
      )}

      {sent ? (
        <View style={styles.actions}>
          <Button
            label="Volver a iniciar sesión"
            iconRight="arrow-forward"
            size="lg"
            onPress={() => router.replace('/(auth)/login')}
          />
          <Button
            label="Usar otro correo"
            variant="ghost"
            onPress={() => {
              setSent(false);
              setEmail('');
            }}
          />
        </View>
      ) : (
        <View style={styles.actions}>
          <Button
            label="Enviar instrucciones"
            iconRight="send"
            size="lg"
            loading={loading}
            onPress={handleSubmit}
          />
          <Button
            label="Recordé mi contraseña"
            variant="ghost"
            onPress={() => router.replace('/(auth)/login')}
          />
        </View>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.lg,
  },
  successCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.xs,
  },
});
