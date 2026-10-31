import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

type Props = {
  title: string;
  /** Optional count shown in a pill */
  count?: number;
  defaultOpen?: boolean;
  /** Extra control on the header (edit, refresh, etc.) */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  style?: object;
};

export default function AccordionSection({
  title,
  count,
  defaultOpen = false,
  headerRight,
  children,
  style,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerMain}
          onPress={() => setOpen((v) => !v)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${title}${count != null ? `, ${count}` : ''}`}
        >
          <Ionicons
            name={open ? 'chevron-down' : 'chevron-forward'}
            size={18}
            color={Colors.primary}
          />
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {count != null ? (
            <View style={[styles.count, !open && styles.countMuted]}>
              <Text style={[styles.countText, !open && styles.countTextMuted]}>{count}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
      </View>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  headerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
  },
  body: {
    marginTop: 4,
  },
  title: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  count: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  countMuted: {
    backgroundColor: Colors.textLight + '26',
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  countTextMuted: {
    color: Colors.textSecondary,
  },
  headerRight: {
    flexShrink: 0,
  },
});
