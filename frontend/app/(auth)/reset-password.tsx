import React, { useRef, useState } from 'react';
import { View, StyleSheet, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { authAPI } from '../../src/services/api';
import { MIN_PASSWORD_LENGTH } from '../../src/constants/auth';
import AuthShell from '../../src/components/ui/AuthShell';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Notice from '../../src/components/ui/Notice';
import PasswordStrength from '../../src/components/ui/PasswordStrength';
import TextField from '../../src/components/ui/TextField';
import { Spacing } from '../../src/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const tokenFromLink =
    typeof params.token === 'string' ? params.token : Array.isArray(params.token) ? params.token[0] : '';
  const confirmRef = useRef<TextInput>(null);

  const [token, setToken] = useState(tokenFromLink);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ token?: string; password?: string; confirm?: string }>({});
  const hasTokenFromLink = Boolean(tokenFromLink);

  const validate = () => {
    const next: typeof errors = {};
    if (!token.trim()) next.token = 'Pega el enlace completo o el token del correo';
    if (!password) next.password = 'La contraseña es requerida';
    else if (password.length < MIN_PASSWORD_LENGTH)
      next.password = `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`;
    if (!confirm) next.confirm = 'Confirma tu contraseña';
    else if (password !== confirm) next.confirm = 'Las contraseñas no coinciden';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authAPI.resetPassword(token.trim(), password);
      Alert.alert('Listo', res.message, [
        { text: 'Iniciar sesión', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'No se pudo restablecer la contraseña.';
      Alert.alert('Error', String(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Nueva contraseña"
      subtitle="Elige una clave que recuerdes"
      onBack={() => router.replace('/(auth)/login')}
      backLabel="Volver a iniciar sesión"
    >
      <Card style={styles.card}>
        {hasTokenFromLink ? (
          <Notice tone="success" icon="checkmark-circle">
            Enlace del correo detectado
          </Notice>
        ) : (
          <TextField
            label="Token del correo"
            icon="key-outline"
            placeholder="Pega el token aquí"
            value={token}
            onChangeText={(t) => {
              setToken(t);
              if (errors.token) setErrors((e) => ({ ...e, token: undefined }));
            }}
            error={errors.token}
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}

        <View>
          <TextField
            label="Nueva contraseña"
            icon="lock-closed-outline"
            placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
            }}
            error={errors.password}
            secureToggle
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          <PasswordStrength password={password} />
        </View>

        <TextField
          ref={confirmRef}
          label="Confirmar contraseña"
          icon="shield-checkmark-outline"
          placeholder="Repite la contraseña"
          value={confirm}
          onChangeText={(t) => {
            setConfirm(t);
            if (errors.confirm) setErrors((e) => ({ ...e, confirm: undefined }));
          }}
          error={errors.confirm}
          secureToggle
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />
      </Card>

      <View style={styles.actions}>
        <Button
          label="Guardar contraseña"
          iconRight="checkmark"
          size="lg"
          loading={loading}
          onPress={handleSubmit}
        />
        <Button
          label="Volver a iniciar sesión"
          variant="ghost"
          onPress={() => router.replace('/(auth)/login')}
        />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.lg,
  },
  actions: {
    gap: Spacing.xs,
  },
});
