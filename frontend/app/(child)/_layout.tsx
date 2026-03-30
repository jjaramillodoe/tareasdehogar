import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';

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

export default function ChildLayout() {
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
        name="tasks"
        options={{
          title: 'Tareas',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'clipboard-outline', 'clipboard'),
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
        name="logros"
        options={{
          title: 'Logros',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'ribbon-outline', 'ribbon'),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Pagos',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'wallet-outline', 'wallet'),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'notifications-outline', 'notifications'),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Reporte',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'stats-chart-outline', 'stats-chart'),
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
