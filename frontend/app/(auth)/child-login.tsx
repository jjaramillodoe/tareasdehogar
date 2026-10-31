import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { familyAPI } from '../../src/services/api';
import { getChildAvatarSource } from '../../src/utils/avatars';
import { useGoBack } from '../../src/utils/navigation';
import AuthShell from '../../src/components/ui/AuthShell';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Chip from '../../src/components/ui/Chip';
import ChoiceRow from '../../src/components/ui/ChoiceRow';
import IconTile from '../../src/components/ui/IconTile';
import Notice from '../../src/components/ui/Notice';
import TextField from '../../src/components/ui/TextField';
import { Colors, Radius, Spacing, Type } from '../../src/theme';

type ChildOption = { name: string; alias?: string | null; gender?: 'mujer' | 'hombre' | null };

export default function ChildLoginScreen() {
  const router = useRouter();
  const exit = useGoBack();
  const { childLogin, isLoading } = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [familyCode, setFamilyCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [currency, setCurrency] = useState('');
  const [childrenList, setChildrenList] = useState<ChildOption[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [pin, setPin] = useState('');
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  const goBack = () => {
    if (step === 2) {
      setStep(1);
      setPin('');
      setSelectedName('');
      setLockoutMessage(null);
      setPinError(null);
      return;
    }
    exit();
  };

  const handleLookup = async () => {
    const code = familyCode.trim().toUpperCase();
    if (code.length < 4) {
      setCodeError('Ingresa el código que te dio tu familia.');
      return;
    }
    setCodeError(null);
    setLookupLoading(true);
    try {
      const data = await familyAPI.getPublicByChildCode(code);
      setFamilyName(data.family_name);
      setCurrency(data.currency);
      setChildrenList(data.children || []);
      setLockoutMessage(null);
      if (!data.children?.length) {
        Alert.alert('Sin perfiles', 'Esta familia aún no tiene hijos para entrar.');
        return;
      }
      setStep(2);
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Código no encontrado';
      setCodeError(msg);
    } finally {
      setLookupLoading(false);
    }
  };

  const submitLogin = async () => {
    if (!selectedName.trim()) {
      setPinError('Elige tu nombre en la lista.');
      return;
    }
    if (pin.trim().length < 4) {
      setPinError('Ingresa tu PIN de al menos 4 dígitos.');
      return;
    }
    setPinError(null);
    try {
      await childLogin(familyCode, selectedName, pin.trim());
      setLockoutMessage(null);
      router.replace('/(child)/home');
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'No se pudo entrar';
      const status = Number(e?.response?.status || 0);
      if (status === 429) {
        setLockoutMessage(msg);
        Alert.alert(
          'PIN bloqueado temporalmente',
          `${msg}\n\nPor seguridad, espera el tiempo indicado y vuelve a intentar.`
        );
      } else {
        setLockoutMessage(null);
        setPinError(msg);
      }
    }
  };

  return (
    <AuthShell
      title={step === 1 ? 'Entrar como hijo' : 'Elige tu perfil'}
      subtitle={step === 1 ? 'Usa el código de tu familia' : 'Toca tu nombre y escribe tu PIN'}
      onBack={goBack}
      step={{ current: step, total: 2 }}
    >
      {step === 1 ? (
        <Card style={styles.card}>
          <Chip label="Hijo o hija" icon="happy" tone="secondary" />
          <Text style={Type.body}>
            Tu padre o madre te comparte el código. Luego eliges tu nombre e ingresas tu PIN.
          </Text>
          <TextField
            label="Código de familia"
            icon="key-outline"
            placeholder="Ej. A1B2C3"
            value={familyCode}
            onChangeText={(t) => {
              setFamilyCode(t.toUpperCase());
              if (codeError) setCodeError(null);
            }}
            error={codeError}
            code
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="go"
            onSubmitEditing={handleLookup}
          />
        </Card>
      ) : (
        <>
          <View style={styles.familyBanner}>
            <IconTile icon="home" tone="secondary" size={44} />
            <View style={styles.familyBannerBody}>
              <Text style={Type.heading} numberOfLines={1}>
                {familyName}
              </Text>
              <Text style={Type.caption}>{currency}</Text>
            </View>
          </View>

          <Card style={styles.card}>
            <View style={styles.choices} accessibilityRole="radiogroup">
              <Text style={styles.label}>¿Cuál eres tú?</Text>
              {childrenList.map((c, idx) => (
                <ChoiceRow
                  key={`${c.name}-${idx}`}
                  title={c.name}
                  description={c.alias && c.alias !== c.name ? c.alias : undefined}
                  selected={selectedName === c.name}
                  leading={<Image source={getChildAvatarSource(c.gender)} style={styles.avatar} />}
                  onPress={() => {
                    setSelectedName(c.name);
                    setLockoutMessage(null);
                    setPinError(null);
                  }}
                />
              ))}
            </View>

            <TextField
              label="Tu PIN"
              icon="lock-closed-outline"
              placeholder="Al menos 4 dígitos"
              value={pin}
              onChangeText={(value) => {
                setPin(value.replace(/[^\d]/g, ''));
                if (lockoutMessage) setLockoutMessage(null);
                if (pinError) setPinError(null);
              }}
              error={pinError}
              code
              secureToggle
              keyboardType="number-pad"
              maxLength={12}
              returnKeyType="go"
              onSubmitEditing={submitLogin}
            />
            {lockoutMessage ? (
              <Notice tone="warning" icon="lock-closed">
                {lockoutMessage}
              </Notice>
            ) : null}
          </Card>
        </>
      )}

      <View style={styles.actions}>
        <Button
          label={step === 1 ? 'Continuar' : 'Entrar'}
          iconRight={step === 1 ? 'arrow-forward' : 'log-in-outline'}
          variant="kid"
          size="lg"
          loading={lookupLoading || isLoading}
          onPress={step === 1 ? handleLookup : submitLogin}
        />
        {step === 2 ? (
          <Button label="Cambiar código" icon="key-outline" variant="ghost" onPress={goBack} />
        ) : (
          <Button label="Soy padre o tutor" variant="ghost" onPress={() => router.push('/(auth)/login')} />
        )}
      </View>

      <View style={styles.legalNote}>
        <Text style={[Type.caption, styles.center]}>
          Si eres menor, usa esta entrada solo con permiso de tu tutor.{' '}
          <Text style={styles.inlineLink} onPress={() => router.push('/(public)/privacy-minors')}>
            Privacidad y menores
          </Text>
        </Text>
      </View>
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
    marginBottom: Spacing.xs,
  },
  choices: {
    gap: Spacing.sm + 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  familyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md + 2,
    borderRadius: Radius.xl,
    backgroundColor: Colors.secondarySoft,
  },
  familyBannerBody: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    gap: Spacing.xs,
  },
  legalNote: {
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderDark,
  },
  center: {
    textAlign: 'center',
  },
  inlineLink: {
    color: Colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
