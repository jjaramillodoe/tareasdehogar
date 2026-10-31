import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ChildScreenShell from '../../src/components/ChildScreenShell';
import { Colors } from '../../src/constants/colors';
import { notificationsAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { shadow } from '../../src/utils/shadow';

type Item = {
  key: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone: string;
  badge?: number;
};

export default function ChildMoreScreen() {
  const router = useRouter();
  const { selectedChild } = useAuthStore();
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const name = selectedChild?.alias || selectedChild?.name || 'campeón';

  const load = useCallback(async () => {
    try {
      const data = await notificationsAPI.getUnreadCount();
      setUnread(data.unread_count || 0);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const items: Item[] = [
    {
      key: 'logros',
      title: 'Logros',
      subtitle: 'Insignias y desafíos desbloqueados',
      href: '/(child)/logros',
      icon: 'ribbon',
      tone: Colors.accent,
    },
    {
      key: 'payments',
      title: 'Pagos',
      subtitle: 'Ingresos, retiros y solicitudes',
      href: '/(child)/payments',
      icon: 'wallet',
      tone: Colors.primary,
    },
    {
      key: 'notifications',
      title: 'Alertas',
      subtitle: 'Avisos de tu familia',
      href: '/(child)/notifications',
      icon: 'notifications',
      tone: Colors.accent,
      badge: unread,
    },
    {
      key: 'report',
      title: 'Reporte',
      subtitle: 'Tu progreso de ahorro y gasto',
      href: '/(child)/report',
      icon: 'stats-chart',
      tone: Colors.secondaryInk,
    },
    {
      key: 'profile',
      title: 'Perfil',
      subtitle: 'PIN, racha y cerrar sesión',
      href: '/(child)/profile',
      icon: 'person-circle',
      tone: Colors.primary,
    },
  ];

  return (
    <ChildScreenShell
      title="Más"
      subtitle={`Para ti, ${name}`}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
    >
      <View style={styles.list}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.row}
            activeOpacity={0.85}
            onPress={() => router.push(item.href as any)}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.tone + '18' }]}>
              <Ionicons name={item.icon} size={22} color={item.tone} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
            </View>
            {item.badge && item.badge > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>
    </ChildScreenShell>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 3, blur: 8, opacity: 0.06, elevation: 2 }),
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
});
