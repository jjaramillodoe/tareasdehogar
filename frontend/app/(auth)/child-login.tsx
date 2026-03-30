import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { familyAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import FlagStripe from '../../src/components/FlagStripe';

export default function ChildLoginScreen() {
  const router = useRouter();
  const { childLogin, isLoading } = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [familyCode, setFamilyCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [currency, setCurrency] = useState('');
  const [childrenList, setChildrenList] = useState<{ name: string; alias?: string | null }[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [pin, setPin] = useState('');
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const handleLookup = async () => {
    const code = familyCode.trim().toUpperCase();
    if (code.length < 4) {
      Alert.alert('Código', 'Ingresa el código de familia que te dio tu padre o madre.');
      return;
    }
    setLookupLoading(true);
    try {
      const data = await familyAPI.getPublicByChildCode(code);
      setFamilyName(data.family_name);
      setCurrency(data.currency);
      setChildrenList(data.children || []);
      setLockoutMessage(null);
      if (!data.children?.length) {
        Alert.alert('Sin hijos', 'Esta familia aún no tiene perfiles de hijos.');
        setLookupLoading(false);
        return;
      }
      setStep(2);
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Código no encontrado';
      Alert.alert('Error', msg);
    } finally {
      setLookupLoading(false);
    }
  };

  const submitLogin = async () => {
    if (!selectedName.trim()) {
      Alert.alert('Nombre', 'Elige tu nombre en la lista.');
      return;
    }
    try {
      await childLogin(familyCode, selectedName, pin.trim() || undefined);
      setLockoutMessage(null);
      router.replace('/(child)/tasks');
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
        Alert.alert('Error', msg);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FlagStripe height={4} style={styles.flagStripe} />
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Entrar como hijo o hija</Text>
        <Text style={styles.subtitle}>
          Tu padre o madre te comparte el código de familia. Si pusieron un PIN en tu perfil,
          también lo necesitas.
        </Text>

        {step === 1 && (
          <>
            <Text style={styles.label}>Código de familia</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: A1B2C3"
              placeholderTextColor={Colors.textLight}
              value={familyCode}
              onChangeText={(t) => setFamilyCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, (lookupLoading || isLoading) && styles.btnDisabled]}
              onPress={handleLookup}
              disabled={lookupLoading || isLoading}
            >
              {lookupLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Continuar</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.familyBanner}>
              <Text style={styles.familyBannerName}>{familyName}</Text>
              <Text style={styles.familyBannerCur}>{currency}</Text>
            </View>
            <Text style={styles.label}>¿Cuál eres tú?</Text>
            {childrenList.map((c, idx) => (
              <TouchableOpacity
                key={`${c.name}-${idx}`}
                style={[
                  styles.nameChip,
                  selectedName === c.name && styles.nameChipActive,
                ]}
                onPress={() => {
                  setSelectedName(c.name);
                  setLockoutMessage(null);
                }}
              >
                <Text
                  style={[
                    styles.nameChipText,
                    selectedName === c.name && styles.nameChipTextActive,
                  ]}
                >
                  {c.name}
                  {c.alias && c.alias !== c.name ? ` (${c.alias})` : ''}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.label}>PIN (si tu familia lo configuró)</Text>
            <TextInput
              style={styles.input}
              placeholder="Opcional"
              placeholderTextColor={Colors.textLight}
              value={pin}
              onChangeText={(value) => {
                setPin(value);
                if (lockoutMessage) setLockoutMessage(null);
              }}
              keyboardType="number-pad"
              maxLength={8}
              secureTextEntry
            />
            {lockoutMessage ? (
              <View style={styles.lockoutBox}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.warning} />
                <Text style={styles.lockoutText}>{lockoutMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
              onPress={submitLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Entrar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBack} onPress={() => setStep(1)}>
              <Text style={styles.linkBackText}>Cambiar código</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.legalNote}>
          <Text style={styles.legalNoteText}>
            Si eres menor, usa esta entrada solo con permiso de tu tutor. Información:{' '}
            <Text style={styles.legalLinkInline} onPress={() => router.push('/(public)/privacy-minors')}>
              Privacidad y menores
            </Text>
            .
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 24, paddingTop: 56, paddingBottom: 40 },
  flagStripe: { marginHorizontal: -24, marginBottom: 16 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 24, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
  familyBanner: {
    backgroundColor: Colors.primary + '18',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  familyBannerName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  familyBannerCur: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  nameChip: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    backgroundColor: Colors.surface,
  },
  nameChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  nameChipText: { fontSize: 16, color: Colors.text },
  nameChipTextActive: { fontWeight: '600', color: Colors.primary },
  linkBack: { marginTop: 16, alignItems: 'center' },
  linkBackText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  lockoutBox: {
    marginTop: -8,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.warningLight,
    backgroundColor: `${Colors.warning}14`,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  lockoutText: {
    flex: 1,
    fontSize: 12,
    color: Colors.warning,
    lineHeight: 17,
    fontWeight: '600',
  },
  legalNote: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  legalNoteText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  legalLinkInline: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
