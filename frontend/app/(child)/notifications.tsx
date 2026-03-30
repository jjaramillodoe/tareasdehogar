import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { notificationsAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

export default function ChildNotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadNotifications = async () => {
    try {
      const data = await notificationsAPI.getAll();
      setNotifications(data);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const toggleSelected = (notificationId: string) => {
    setSelectedIds((prev) =>
      prev.includes(notificationId) ? prev.filter((x) => x !== notificationId) : [...prev, notificationId]
    );
  };

  const handleMarkRead = async (notificationId: string) => {
    await notificationsAPI.markRead(notificationId);
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
  };

  const handleMarkAllRead = async () => {
    await notificationsAPI.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleDeleteAll = async () => {
    Alert.alert('Eliminar todas', '¿Seguro que quieres eliminar todas las alertas?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await notificationsAPI.deleteAll();
          setNotifications([]);
          setSelectionMode(false);
          setSelectedIds([]);
        },
      },
    ]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    Alert.alert('Eliminar seleccionadas', `Eliminar ${selectedIds.length} alerta(s)?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await notificationsAPI.deleteMany(selectedIds);
          setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n.id)));
          setSelectionMode(false);
          setSelectedIds([]);
        },
      },
    ]);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alertas</Text>
        {unreadCount > 0 ? <Text style={styles.unreadCount}>{unreadCount} sin leer</Text> : null}
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.ghostButton}
          onPress={() => {
            setSelectionMode((v) => !v);
            setSelectedIds([]);
          }}
        >
          <Text style={styles.ghostButtonText}>{selectionMode ? 'Cancelar' : 'Seleccionar'}</Text>
        </TouchableOpacity>
        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
            <Text style={styles.markAllButtonText}>Marcar leídas</Text>
          </TouchableOpacity>
        ) : null}
        {selectionMode ? (
          <TouchableOpacity
            style={[styles.deleteButton, selectedIds.length === 0 && styles.buttonDisabled]}
            disabled={selectedIds.length === 0}
            onPress={handleDeleteSelected}
          >
            <Text style={styles.deleteButtonText}>Eliminar ({selectedIds.length})</Text>
          </TouchableOpacity>
        ) : notifications.length > 0 ? (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAll}>
            <Text style={styles.deleteButtonText}>Eliminar todas</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={56} color={Colors.textLight} />
            <Text style={styles.emptyText}>No hay alertas</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.is_read && styles.unreadCard,
                selectionMode && selectedIds.includes(notification.id) && styles.selectedCard,
              ]}
              onPress={() => {
                if (selectionMode) {
                  toggleSelected(notification.id);
                  return;
                }
                if (!notification.is_read) handleMarkRead(notification.id);
              }}
              onLongPress={() => {
                if (!selectionMode) {
                  setSelectionMode(true);
                  setSelectedIds([notification.id]);
                }
              }}
            >
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <Text style={styles.notificationTime}>{formatDate(notification.created_at)}</Text>
              </View>
              {selectionMode ? (
                <Ionicons
                  name={selectedIds.includes(notification.id) ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={selectedIds.includes(notification.id) ? Colors.primary : Colors.textLight}
                />
              ) : (
                !notification.is_read && <View style={styles.unreadDot} />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 56, backgroundColor: Colors.surface },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  unreadCount: { fontSize: 13, color: Colors.primary, marginTop: 2 },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ghostButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghostButtonText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  markAllButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.primary + '20' },
  markAllButtonText: { fontSize: 13, fontWeight: '500', color: Colors.primary },
  deleteButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.accent + '1f' },
  deleteButtonText: { fontSize: 13, fontWeight: '600', color: Colors.accentDark },
  buttonDisabled: { opacity: 0.5 },
  content: { flex: 1, padding: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginTop: 10 },
  notificationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unreadCard: { backgroundColor: Colors.primary + '08', borderWidth: 1, borderColor: Colors.primary + '20' },
  selectedCard: { borderWidth: 1.5, borderColor: Colors.primary },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  notificationMessage: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 },
  notificationTime: { fontSize: 12, color: Colors.textLight, marginTop: 6 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginLeft: 8, marginTop: 4 },
});
