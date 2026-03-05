import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { paymentsAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface Payment {
  id: string;
  child_id: string;
  chore_id: string;
  chore_title: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function ChildPaymentsScreen() {
  const router = useRouter();
  const { selectedChild, family } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = async () => {
    if (!selectedChild) return;

    try {
      const data = await paymentsAPI.getForChild(selectedChild.id);
      setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (selectedChild) {
        loadPayments();
      }
    }, [selectedChild?.id])
  );

  const totalEarned = payments.reduce((sum, p) => sum + p.amount, 0);

  if (!selectedChild) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historial de Pagos</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No hay hijo seleccionado</Text>
        </View>
      </View>
    );
  }

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Pagos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPayments();
            }}
          />
        }
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Ganado</Text>
          <Text style={styles.summaryAmount}>
            {family?.currency} {totalEarned.toFixed(2)}
          </Text>
          <Text style={styles.summaryCount}>{payments.length} pagos recibidos</Text>
        </View>

        {/* Payments List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pagos Recibidos</Text>
          {payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyStateText}>Aún no tienes pagos</Text>
              <Text style={styles.emptyStateSubtext}>
                Completa tareas para recibir pagos
              </Text>
            </View>
          ) : (
            payments.map((payment) => (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentIcon}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>{payment.chore_title}</Text>
                  <Text style={styles.paymentDate}>
                    {new Date(payment.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.paymentAmountContainer}>
                  <Text style={styles.paymentAmount}>
                    +{family?.currency} {payment.amount.toFixed(2)}
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                      {payment.status === 'aprobado' ? 'Aprobado' : 'Pagado'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: Colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 8,
  },
  summaryCount: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  paymentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  paymentDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  paymentAmountContainer: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
  },
  statusBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.success,
  },
});
