import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { getParentAvatarSource } from '../../src/utils/avatars';
import { hapticTap } from '../../src/utils/feedback';
import { MIN_PASSWORD_LENGTH } from '../../src/constants/auth';
import { useGoBack } from '../../src/utils/navigation';
import AuthShell from '../../src/components/ui/AuthShell';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import ChoiceRow from '../../src/components/ui/ChoiceRow';
import IconTile from '../../src/components/ui/IconTile';
import PasswordStrength from '../../src/components/ui/PasswordStrength';
import TextField from '../../src/components/ui/TextField';
import { Colors, Radius, Spacing, Type } from '../../src/theme';

type Step = 1 | 2 | 3;
type FamilyPath = 'create' | 'join';
type Gender = 'mujer' | 'hombre';

const STEP_COPY: Record<Step, { title: string; subtitle: string }> = {
  1: { title: 'Crear cuenta', subtitle: 'Tu perfil de padre o tutor' },
  2: { title: 'Tu acceso', subtitle: 'Correo y contraseña para entrar' },
  3: { title: 'Tu familia', subtitle: 'Crea una nueva o únete con un código' },
};

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'hombre', label: 'Papá' },
  { value: 'mujer', label: 'Mamá' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const exit = useGoBack();
  const { register, isLoading } = useAuthStore();
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [familyPath, setFamilyPath] = useState<FamilyPath>('create');
  const [gender, setGender] = useState<Gender>('hombre');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    inviteCode?: string;
    legal?: string;
  }>({});

  const clearError = (key: keyof typeof errors) => {
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validateStep = (target: Step) => {
    const next: typeof errors = {};
    if (target >= 1) {
      if (!name.trim()) next.name = 'El nombre es requerido';
      else if (name.trim().length < 2) next.name = 'Usa al menos 2 caracteres';
    }
    if (target >= 2) {
      if (!email.trim()) next.email = 'El correo es requerido';
      else if (!/\S+@\S+\.\S+/.test(email.trim())) next.email = 'Ingresa un correo válido';
      if (!password) next.password = 'La contraseña es requerida';
      else if (password.length < MIN_PASSWORD_LENGTH)
        next.password = `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`;
      if (!confirmPassword) next.confirmPassword = 'Confirma tu contraseña';
      else if (password !== confirmPassword) next.confirmPassword = 'Las contraseñas no coinciden';
    }
    if (target >= 3) {
      if (familyPath === 'join' && inviteCode.trim().length < 4) {
        next.inviteCode = 'Ingresa el código que te compartieron';
      }
      if (!acceptedLegal) next.legal = 'Debes aceptar los términos para continuar';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  };

  const goBack = () => {
    if (step === 1) {
      exit();
      return;
    }
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  };

  const handleRegister = async () => {
    if (!validateStep(3)) return;
    try {
      await register(
        email.trim(),
        password,
        name.trim(),
        familyPath === 'join' ? inviteCode.trim() || undefined : undefined,
        gender
      );
      router.replace('/(parent)/home');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al crear la cuenta';
      Alert.alert('Error', message);
    }
  };

  const copy = STEP_COPY[step];

  return (
    <AuthShell
      title={copy.title}
      subtitle={copy.subtitle}
      onBack={goBack}
      backLabel={step === 1 ? 'Volver' : 'Paso anterior'}
      step={{ current: step, total: 3 }}
    >
      {step === 1 ? (
        <Card style={styles.card}>
          <TextField
            label="Nombre completo"
            icon="person-outline"
            placeholder="Cómo te dicen en casa"
            value={name}
            onChangeText={(t) => {
              setName(t);
              clearError('name');
            }}
            error={errors.name}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={goNext}
          />

          <View>
            <Text style={styles.label}>Tu perfil</Text>
            <View style={styles.genderRow} accessibilityRole="radiogroup">
              {GENDERS.map((g) => {
                const active = gender === g.value;
                return (
                  <Pressable
                    key={g.value}
                    style={[styles.genderCard, active && styles.genderCardActive]}
                    onPress={() => {
                      setGender(g.value);
                      void hapticTap();
                    }}
                    accessibilityRole="radio"
                    accessibilityLabel={g.label}
                    accessibilityState={{ selected: active }}
                  >
                    <Image source={getParentAvatarSource(g.value)} style={styles.genderAvatar} />
                    <Text style={[styles.genderLabel, active && styles.genderLabelActive]}>{g.label}</Text>
                    {active ? (
                      <View style={styles.checkDot}>
                        <Ionicons name="checkmark" size={12} color={Colors.white} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <Text style={[Type.caption, styles.hint]}>También si eres tutor o tutora de la familia.</Text>
          </View>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card style={styles.card}>
          <TextField
            label="Correo electrónico"
            icon="mail-outline"
            placeholder="tu@correo.com"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              clearError('email');
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

          <View>
            <TextField
              ref={passwordRef}
              label="Contraseña"
              icon="lock-closed-outline"
              placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                clearError('password');
              }}
              error={errors.password}
              hint={password ? undefined : `Mínimo ${MIN_PASSWORD_LENGTH} caracteres. Mejor si mezclas letras y números.`}
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
            placeholder="Repite tu contraseña"
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              clearError('confirmPassword');
            }}
            error={errors.confirmPassword}
            secureToggle
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={goNext}
          />
        </Card>
      ) : null}

      {step === 3 ? (
        <Card style={styles.card}>
          <View style={styles.choices} accessibilityRole="radiogroup">
            <Text style={styles.label}>¿Cómo empiezas?</Text>
            <ChoiceRow
              title="Crear mi familia"
              description="Luego agregas hijos y tareas desde Inicio."
              selected={familyPath === 'create'}
              leading={<IconTile icon="home" tone="primary" size={44} />}
              onPress={() => {
                setFamilyPath('create');
                clearError('inviteCode');
              }}
            />
            <ChoiceRow
              title="Me invitaron"
              description="Únete con el código de otro padre o tutor."
              selected={familyPath === 'join'}
              leading={<IconTile icon="people" tone="secondary" size={44} />}
              onPress={() => setFamilyPath('join')}
            />
          </View>

          {familyPath === 'join' ? (
            <TextField
              label="Código de invitación"
              icon="key-outline"
              placeholder="Ej. FAMILIA12"
              value={inviteCode}
              onChangeText={(t) => {
                setInviteCode(t.toUpperCase());
                clearError('inviteCode');
              }}
              error={errors.inviteCode}
              code
              autoCapitalize="characters"
              autoCorrect={false}
            />
          ) : null}

          <View style={styles.divider} />

          <View>
            <Pressable
              style={styles.legalRow}
              onPress={() => {
                setAcceptedLegal((v) => !v);
                clearError('legal');
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedLegal }}
            >
              <View style={[styles.checkbox, acceptedLegal && styles.checkboxOn, !!errors.legal && styles.checkboxError]}>
                {acceptedLegal ? <Ionicons name="checkmark" size={14} color={Colors.white} /> : null}
              </View>
              <Text style={[Type.caption, styles.legalAccept]}>
                Soy mayor de edad o actúo con autoridad parental, y acepto los{' '}
                <Text style={styles.inlineLink} onPress={() => router.push('/(public)/terms')}>
                  Términos de uso
                </Text>
                {' '}y la{' '}
                <Text style={styles.inlineLink} onPress={() => router.push('/(public)/privacy')}>
                  Política de privacidad
                </Text>
                .
              </Text>
            </Pressable>
            {errors.legal ? (
              <View style={styles.errorRow} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.errorText}>{errors.legal}</Text>
              </View>
            ) : null}
          </View>
        </Card>
      ) : null}

      <Button
        label={step < 3 ? 'Continuar' : 'Crear cuenta'}
        iconRight={step < 3 ? 'arrow-forward' : 'sparkles'}
        size="lg"
        loading={isLoading}
        onPress={step < 3 ? goNext : handleRegister}
      />

      {step === 1 ? (
        <View style={styles.childBlock}>
          <Button
            label="Soy hijo o hija"
            icon="happy"
            variant="kid"
            onPress={() => router.push('/(auth)/child-login')}
          />
          <Text style={[Type.caption, styles.center]}>Entras con el código de familia, sin correo.</Text>
        </View>
      ) : null}

      <Text style={[Type.body, styles.center]}>
        ¿Ya tienes cuenta?{' '}
        <Text style={styles.inlineLink} onPress={() => router.push('/(auth)/login')}>
          Inicia sesión
        </Text>
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  hint: {
    marginTop: Spacing.sm,
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  genderCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  genderCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F2F7FF',
  },
  genderAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  genderLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  genderLabelActive: {
    color: Colors.primaryDark,
  },
  checkDot: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choices: {
    gap: Spacing.sm + 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxError: {
    borderColor: Colors.error,
  },
  legalAccept: {
    flex: 1,
    lineHeight: 20,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  errorText: {
    ...Type.caption,
    color: Colors.error,
    fontWeight: '600',
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
