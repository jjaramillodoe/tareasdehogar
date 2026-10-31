import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ParentScreenShell from '../../src/components/ParentScreenShell';
import { Colors } from '../../src/constants/colors';
import { notificationsAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { shadow } from '../../src/utils/shadow';

type MoreItem = {
  key: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accent?: string;
  badge?: number;
};

export default function ParentMoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, family } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadUnread = useCallback(async () => {
    try {
      const data = await notificationsAPI.getUnreadCount();
      setUnreadCount(data.unread_count || 0);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUnread();
    }, [loadUnread])
  );

  const firstName = (user?.name || '').trim().split(/\s+/)[0] || 'familia';

  const items: MoreItem[] = [
    {
      key: 'calendar',
      title: 'Calendario',
      subtitle: 'Vista semanal y programación',
      href: '/(parent)/calendar',
      icon: 'calendar',
      accent: Colors.primary,
    },
    {
      key: 'goals',
      title: 'Metas',
      subtitle: 'Retos y objetivos de la familia',
      href: '/(parent)/goals',
      icon: 'trophy',
      accent: Colors.secondaryInk,
    },
    {
      key: 'reports',
      title: 'Reportes',
      subtitle: 'Progreso y pagos',
      href: '/(parent)/reports',
      icon: 'stats-chart',
      accent: Colors.primary,
    },
    {
      key: 'notifications',
      title: 'Alertas',
      subtitle: 'Aprobaciones y avisos',
      href: '/(parent)/notifications',
      icon: 'notifications',
      accent: Colors.accent,
      badge: unreadCount,
    },
    {
      key: 'profile',
      title: 'Perfil y familia',
      subtitle: 'Cuenta, código de hijos y ajustes',
      href: '/(parent)/profile',
      icon: 'person-circle',
      accent: Colors.primary,
    },
  ];

  return (
    <ParentScreenShell
      title="Más"
      subtitle={`${firstName}${family?.name ? ` · ${family.name}` : ''}`}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadUnread();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.list}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => router.push(item.href as any)}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: (item.accent || Colors.primary) + '18' },
                ]}
              >
                <Ionicons name={item.icon} size={22} color={item.accent || Colors.primary} />
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
      </ScrollView>
    </ParentScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 3, blur: 10, opacity: 0.08, elevation: 3 }),
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: { flex: 1 },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 13,
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
    marginRight: 8,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
});
