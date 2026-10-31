import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
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
import AppModal, { modalFieldStyles } from './AppModal';

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

  const closeCountryModal = () => {
    setCountryModalVisible(false);
    setCountrySearch('');
  };

  const pickCountry = (code: string) => {
    onCountryChange(code);
    onCurrencyChange(defaultCurrencyForCountry(code));
    closeCountryModal();
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

      <AppModal
        visible={countryModalVisible}
        onClose={closeCountryModal}
        title="País o región"
        icon="globe-outline"
        variant="card"
        size="lg"
      >
        <TextInput
          style={modalFieldStyles.input}
          placeholder="Buscar país…"
          placeholderTextColor={Colors.textLight}
          value={countrySearch}
          onChangeText={setCountrySearch}
          autoCorrect={false}
        />
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
      </AppModal>
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
});
