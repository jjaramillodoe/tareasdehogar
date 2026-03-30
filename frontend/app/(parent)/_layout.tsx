import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { notificationsAPI } from '../../src/services/api';

function tabIcon(
  focused: boolean,
  outline: React.ComponentProps<typeof Ionicons>['name'],
  solid: React.ComponentProps<typeof Ionicons>['name']
) {
  return (
    <Ionicons
      name={focused ? solid : outline}
      size={focused ? 26 : 24}
      color={focused ? Colors.primary : Colors.textSecondary}
    />
  );
}

export default function ParentLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const data = await notificationsAPI.getUnreadCount();
        setUnreadCount(data.unread_count);
      } catch {
        // Silently fail
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 10,
          shadowColor: Colors.primaryDark,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'home-outline', 'home'),
        }}
      />
      <Tabs.Screen
        name="children"
        options={{
          title: 'Hijos',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'people-outline', 'people'),
        }}
      />
      <Tabs.Screen
        name="chores"
        options={{
          title: 'Tareas',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'clipboard-outline', 'clipboard'),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendario',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'calendar-outline', 'calendar'),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Metas',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'trophy-outline', 'trophy'),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'stats-chart-outline', 'stats-chart'),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ focused }) => (
            <View>
              <Ionicons
                name={focused ? 'notifications' : 'notifications-outline'}
                size={focused ? 26 : 24}
                color={focused ? Colors.primary : Colors.textSecondary}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'person-circle-outline', 'person-circle'),
        }}
      />
      <Tabs.Screen
        name="family-badges"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
