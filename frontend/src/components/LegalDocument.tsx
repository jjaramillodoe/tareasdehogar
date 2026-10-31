import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { shadow } from '../utils/shadow';
import { PublicContentLayout } from './PublicContentLayout';

export type LegalSection = {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  body?: string;
  bullets?: string[];
  tone?: 'primary' | 'secondary' | 'accent' | 'success';
};

type RelatedLink = {
  label: string;
  href: '/(public)/privacy' | '/(public)/privacy-minors' | '/(public)/terms' | '/(public)/how-it-works';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
};

type Props = {
  title: string;
  eyebrow: string;
  subtitle: string;
  heroIcon: React.ComponentProps<typeof Ionicons>['name'];
  heroTone?: 'primary' | 'secondary' | 'accent' | 'success';
  intro: string;
  updatedAt?: string;
  sections: LegalSection[];
  related?: RelatedLink[];
  disclaimer: string;
};

const TONE = {
  primary: { bg: Colors.primary + '18', fg: Colors.primary },
  secondary: { bg: Colors.secondary + '44', fg: Colors.secondaryInk },
  accent: { bg: Colors.accent + '18', fg: Colors.accent },
  success: { bg: Colors.success + '18', fg: Colors.success },
};

const RELATED_ICONS: Record<RelatedLink['href'], React.ComponentProps<typeof Ionicons>['name']> = {
  '/(public)/privacy': 'shield-checkmark-outline',
  '/(public)/privacy-minors': 'heart-outline',
  '/(public)/terms': 'document-text-outline',
  '/(public)/how-it-works': 'sparkles-outline',
};

export default function LegalDocument({
  title,
  eyebrow,
  subtitle,
  heroIcon,
  heroTone = 'primary',
  intro,
  updatedAt,
  sections,
  related = [],
  disclaimer,
}: Props) {
  const router = useRouter();
  const tone = TONE[heroTone];
  const [open, setOpen] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(sections.map((_, i) => [i, i < 2]))
  );

  const allOpen = useMemo(
    () => sections.every((_, i) => open[i]),
    [open, sections]
  );

  const toggle = (index: number) => {
    setOpen((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleAll = () => {
    const next = !allOpen;
    setOpen(Object.fromEntries(sections.map((_, i) => [i, next])));
  };

  return (
    <PublicContentLayout title={title} subtitle={subtitle}>
      <View style={styles.introCard}>
        <View style={[styles.heroIconWrap, { backgroundColor: tone.bg }]}>
          <Ionicons name={heroIcon} size={22} color={tone.fg} />
        </View>
        <View style={styles.introBody}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.introText}>{intro}</Text>
          {updatedAt ? (
            <View style={styles.updatedPill}>
              <Ionicons name="calendar-outline" size={12} color={Colors.primary} />
              <Text style={styles.updatedText}>Actualizado {updatedAt}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.indexRow}>
        <Text style={styles.indexLabel}>Índice</Text>
        <TouchableOpacity onPress={toggleAll} hitSlop={8}>
          <Text style={styles.indexToggle}>{allOpen ? 'Cerrar todo' : 'Abrir todo'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {sections.map((section, index) => (
          <TouchableOpacity
            key={section.title}
            style={[styles.chip, open[index] && styles.chipOn]}
            onPress={() => setOpen((prev) => ({ ...prev, [index]: true }))}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, open[index] && styles.chipTextOn]}>
              {String(index + 1).padStart(2, '0')} · {section.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {sections.map((section, index) => {
        const sectionTone = TONE[section.tone || 'primary'];
        const isOpen = Boolean(open[index]);
        return (
          <View key={section.title} style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.sectionHead}
              onPress={() => toggle(index)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
            >
              <View style={[styles.sectionIcon, { backgroundColor: sectionTone.bg }]}>
                <Ionicons name={section.icon} size={18} color={sectionTone.fg} />
              </View>
              <View style={styles.sectionTitleWrap}>
                <Text style={styles.sectionIndex}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.textLight}
              />
            </TouchableOpacity>
            {isOpen ? (
              <View style={styles.sectionContent}>
                {section.body ? <Text style={styles.sectionBody}>{section.body}</Text> : null}
                {section.bullets?.length ? (
                  <View style={styles.bulletList}>
                    {section.bullets.map((item) => (
                      <View key={item} style={styles.bulletRow}>
                        <View style={[styles.bulletDot, { backgroundColor: sectionTone.fg }]} />
                        <Text style={styles.bulletText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      {related.length > 0 ? (
        <View style={styles.relatedBlock}>
          <Text style={styles.relatedTitle}>También te puede interesar</Text>
          {related.map((link) => (
            <TouchableOpacity
              key={link.href}
              style={styles.relatedRow}
              onPress={() => router.push(link.href)}
              activeOpacity={0.85}
            >
              <View style={styles.relatedIcon}>
                <Ionicons
                  name={link.icon || RELATED_ICONS[link.href]}
                  size={18}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.relatedLabel}>{link.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.disclaimerCard}>
        <Ionicons name="alert-circle-outline" size={18} color={Colors.secondaryInk} />
        <Text style={styles.disclaimerText}>{disclaimer}</Text>
      </View>
    </PublicContentLayout>
  );
}

const styles = StyleSheet.create({
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary + '22',
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 4, blur: 12, opacity: 0.08, elevation: 3 }),
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introBody: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: Colors.primary,
    marginBottom: 6,
  },
  introText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  updatedPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: Colors.primary + '12',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  updatedText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  indexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  indexLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  indexToggle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  chipRow: {
    gap: 8,
    paddingBottom: 14,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  chipTextOn: {
    color: Colors.primary,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  sectionIndex: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textLight,
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 1,
  },
  sectionContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  bulletList: {
    marginTop: 4,
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  relatedBlock: {
    marginTop: 8,
    marginBottom: 12,
  },
  relatedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 10,
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  relatedIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.secondary + '66',
    marginTop: 4,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.secondaryInk,
    fontWeight: '500',
  },
});
