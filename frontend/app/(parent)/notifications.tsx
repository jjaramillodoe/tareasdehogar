import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { notificationsAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import ParentScreenShell from '../../src/components/ParentScreenShell';
import { shadow } from '../../src/utils/shadow';


interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'task_approved':
      return { name: 'checkmark-circle' as const, color: Colors.success };
    case 'task_completed':
      return { name: 'clipboard' as const, color: Colors.primary };
    case 'goal_achieved':
      return { name: 'flag' as const, color: Colors.secondaryInk };
    case 'goal_created':
      return { name: 'flag' as const, color: Colors.primary };
    case 'achievement':
      return { name: 'trophy' as const, color: Colors.secondaryInk };
    case 'bonus_paid':
      return { name: 'gift' as const, color: Colors.success };
    case 'streak':
      return { name: 'flame' as const, color: Colors.accent };
    default:
      return { name: 'notifications' as const, color: Colors.primary };
  }
};

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

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadNotifications = async () => {
    try {
      const data = await notificationsAPI.getAll();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
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

  const handleMarkRead = async (notificationId: string) => {
    try {
      await notificationsAPI.markRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const toggleSelected = (notificationId: string) => {
    setSelectedIds((prev) =>
      prev.includes(notificationId)
        ? prev.filter((x) => x !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all read:', error);
    }
  };

  const handleDeleteAll = async () => {
    Alert.alert('Eliminar todas', '¿Seguro que quieres eliminar todas las notificaciones?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await notificationsAPI.deleteAll();
            setNotifications([]);
            setSelectionMode(false);
            setSelectedIds([]);
          } catch (error) {
            console.error('Error deleting all notifications:', error);
          }
        },
      },
    ]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      'Eliminar seleccionadas',
      `¿Seguro que quieres eliminar ${selectedIds.length} notificación(es)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationsAPI.deleteMany(selectedIds);
              setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n.id)));
              setSelectedIds([]);
              setSelectionMode(false);
            } catch (error) {
              console.error('Error deleting selected notifications:', error);
            }
          },
        },
      ]
    );
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const subtitle =
    unreadCount > 0
      ? `${unreadCount} sin leer · ${notifications.length} total`
      : notifications.length === 0
        ? 'Todo al día'
        : `${notifications.length} notificación${notifications.length === 1 ? '' : 'es'}`;

  return (
    <ParentScreenShell
      title="Alertas"
      subtitle={subtitle}
      loading={isLoading}
      showBack
      headerRight={
        unreadCount > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        ) : undefined
      }
    >
      <View style={styles.actionsRow}>
        {!selectionMode ? (
          <TouchableOpacity style={styles.ghostButton} onPress={() => setSelectionMode(true)}>
            <Ionicons name="checkbox-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.ghostButtonText}>Seleccionar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.ghostButton}
            onPress={() => {
              setSelectionMode(false);
              setSelectedIds([]);
            }}
          >
            <Text style={styles.ghostButtonText}>Cancelar</Text>
          </TouchableOpacity>
        )}
        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
            <Ionicons name="checkmark-done" size={15} color={Colors.primary} />
            <Text style={styles.markAllButtonText}>Marcar leídas</Text>
          </TouchableOpacity>
        ) : null}
        {selectionMode ? (
          <TouchableOpacity
            style={[styles.deleteButton, selectedIds.length === 0 && styles.buttonDisabled]}
            onPress={handleDeleteSelected}
            disabled={selectedIds.length === 0}
          >
            <Ionicons name="trash" size={14} color={Colors.accentDark} />
            <Text style={styles.deleteButtonText}>Eliminar ({selectedIds.length})</Text>
          </TouchableOpacity>
        ) : (
          notifications.length > 0 && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAll}>
              <Ionicons name="trash" size={14} color={Colors.accentDark} />
              <Text style={styles.deleteButtonText}>Eliminar todas</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="notifications-off" size={34} color={Colors.primary} />
            </View>
            <Text style={styles.emptyText}>No hay notificaciones</Text>
            <Text style={styles.emptySubtext}>Las alertas de la familia aparecerán aquí</Text>
          </View>
        ) : (
          notifications.map((notification) => {
            const icon = getNotificationIcon(notification.type);
            const selected = selectionMode && selectedIds.includes(notification.id);
            return (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.is_read && styles.unreadCard,
                  selected && styles.selectedCard,
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
                activeOpacity={0.88}
              >
                <View style={[styles.notificationIcon, { backgroundColor: icon.color + '20' }]}>
                  <Ionicons name={icon.name} size={22} color={icon.color} />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                  <Text style={styles.notificationTime}>
                    {formatDate(notification.created_at)}
                  </Text>
                </View>
                {selectionMode ? (
                  <Ionicons
                    name={selected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={selected ? Colors.primary : Colors.textLight}
                  />
                ) : (
                  !notification.is_read && <View style={styles.unreadDot} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </ParentScreenShell>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  unreadBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.primary + '16',
  },
  markAllButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  ghostButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.accent + '18',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.accentDark,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 28,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
  notificationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 2, blur: 6, opacity: 0.05, elevation: 1 }),

  },
  unreadCard: {
    backgroundColor: Colors.primary + '0c',
    borderColor: Colors.primary + '40',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  notificationIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 6,
    fontWeight: '600',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginLeft: 8,
    marginTop: 4,
  },
});
