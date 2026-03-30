import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import {
  SPANISH_SPEAKING_COUNTRIES,
  SPANISH_LOCALE_CURRENCIES,
  countryLabel,
  defaultCurrencyForCountry,
} from '../constants/spanishLocales';

export type FamilyLocaleSectionProps = {
  countryCode: string;
  currency: string;
  onCountryChange: (code: string) => void;
  onCurrencyChange: (currency: string) => void;
};

export function FamilyLocaleSection({
  countryCode,
  currency,
  onCountryChange,
  onCurrencyChange,
}: FamilyLocaleSectionProps) {
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim();
    if (!q) return SPANISH_SPEAKING_COUNTRIES;
    const fold = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const fq = fold(q);
    return SPANISH_SPEAKING_COUNTRIES.filter(
      (c) => fold(c.name).includes(fq) || c.code.toLowerCase().includes(q.toLowerCase())
    );
  }, [countrySearch]);

  const pickCountry = (code: string) => {
    onCountryChange(code);
    onCurrencyChange(defaultCurrencyForCountry(code));
    setCountryModalVisible(false);
    setCountrySearch('');
  };

  return (
    <>
      <View style={s.block}>
        <Text style={s.label}>País o región</Text>
        <TouchableOpacity
          style={s.countryButton}
          onPress={() => setCountryModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar país o región"
        >
          <Text style={s.countryButtonText} numberOfLines={1}>
            {countryLabel(countryCode) || 'Seleccionar'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={s.block}>
        <Text style={s.label}>Moneda</Text>
        <Text style={s.hint}>Se sugiere según el país; puedes cambiarla si lo necesitas.</Text>
        <View style={s.currencyWrap}>
          {SPANISH_LOCALE_CURRENCIES.map((cur) => (
            <TouchableOpacity
              key={cur}
              style={[s.currencyChip, currency === cur && s.currencyChipActive]}
              onPress={() => onCurrencyChange(cur)}
            >
              <Text style={[s.currencyChipText, currency === cur && s.currencyChipTextActive]}>
                {cur}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Modal
        visible={countryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setCountryModalVisible(false);
          setCountrySearch('');
        }}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>País o región</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Buscar país…"
              placeholderTextColor={Colors.textLight}
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoCorrect={false}
            />
            <ScrollView style={s.countryList} keyboardShouldPersistTaps="handled">
              {filteredCountries.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={[s.countryRow, countryCode === c.code && s.countryRowActive]}
                  onPress={() => pickCountry(c.code)}
                >
                  <Text style={s.countryRowText}>{c.name}</Text>
                  <Text style={s.countryRowMeta}>{c.currency}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={s.modalClose}
              onPress={() => {
                setCountryModalVisible(false);
                setCountrySearch('');
              }}
            >
              <Text style={s.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  block: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  countryButtonText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginRight: 8,
  },
  currencyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currencyChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  currencyChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  currencyChipTextActive: {
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  searchInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  countryList: {
    maxHeight: 320,
  },
  countryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  countryRowActive: {
    backgroundColor: Colors.background,
  },
  countryRowText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingRight: 8,
  },
  countryRowMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalClose: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
});
