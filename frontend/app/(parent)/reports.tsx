import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { statsAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 48;

interface DailyStat {
  tasks_completed: number;
  amount_paid: number;
}

interface ChildStat {
  child_id: string;
  name: string;
  tasks_completed: number;
  amount_earned: number;
  balance: number;
  current_streak: number;
}

interface Report {
  period_days: number;
  total_tasks_completed: number;
  total_amount_paid: number;
  daily_stats: Record<string, DailyStat>;
  children_stats: ChildStat[];
}

export default function ReportsScreen() {
  const { family } = useAuthStore();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  const loadReport = async () => {
    try {
      const data = await statsAPI.getFamilyReport(selectedPeriod);
      setReport(data);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [selectedPeriod])
  );

  const getBarHeight = (value: number, maxValue: number) => {
    if (maxValue === 0) return 10;
    return Math.max(10, (value / maxValue) * 100);
  };

  const getDailyData = () => {
    if (!report) return [];
    const entries = Object.entries(report.daily_stats).sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([date, stat]) => ({
      date,
      day: new Date(date).toLocaleDateString('es-ES', { weekday: 'short' }),
      ...stat,
    }));
  };

  const maxTasks = report ? Math.max(...Object.values(report.daily_stats).map(s => s.tasks_completed), 1) : 1;

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
        <Text style={styles.headerTitle}>Reportes</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadReport();
            }}
          />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {[7, 14, 30].map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.periodButton,
                selectedPeriod === days && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(days)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === days && styles.periodButtonTextActive,
                ]}
              >
                {days} días
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: Colors.primary }]}>
            <Ionicons name="checkmark-done" size={28} color={Colors.white} />
            <Text style={styles.summaryValue}>{report?.total_tasks_completed || 0}</Text>
            <Text style={styles.summaryLabel}>Tareas Completadas</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: Colors.secondary }]}>
            <Ionicons name="cash" size={28} color={Colors.white} />
            <Text style={styles.summaryValue}>
              {family?.currency} {(report?.total_amount_paid || 0).toFixed(0)}
            </Text>
            <Text style={styles.summaryLabel}>Total Pagado</Text>
          </View>
        </View>

        {/* Daily Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Tareas por Día</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chart}>
              {getDailyData().map((item, index) => (
                <View key={index} style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: getBarHeight(item.tasks_completed, maxTasks),
                        backgroundColor: index % 2 === 0 ? Colors.primary : Colors.primaryLight,
                      },
                    ]}
                  >
                    {item.tasks_completed > 0 && (
                      <Text style={styles.barValue}>{item.tasks_completed}</Text>
                    )}
                  </View>
                  <Text style={styles.barLabel}>{item.day}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Children Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rendimiento por Hijo</Text>
          {report?.children_stats.map((child) => (
            <View key={child.child_id} style={styles.childStatCard}>
              <View style={styles.childStatHeader}>
                <View style={styles.childAvatar}>
                  <Text style={styles.childInitial}>{child.name.charAt(0)}</Text>
                </View>
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <View style={styles.streakBadge}>
                    <Ionicons name="flame" size={14} color={Colors.accent} />
                    <Text style={styles.streakText}>{child.current_streak} días</Text>
                  </View>
                </View>
              </View>
              <View style={styles.childStats}>
                <View style={styles.childStatItem}>
                  <Text style={styles.childStatValue}>{child.tasks_completed}</Text>
                  <Text style={styles.childStatLabel}>Tareas</Text>
                </View>
                <View style={styles.childStatItem}>
                  <Text style={[styles.childStatValue, { color: Colors.secondary }]}>
                    {family?.currency} {child.amount_earned.toFixed(0)}
                  </Text>
                  <Text style={styles.childStatLabel}>Ganado</Text>
                </View>
                <View style={styles.childStatItem}>
                  <Text style={[styles.childStatValue, { color: Colors.primary }]}>
                    {family?.currency} {child.balance.toFixed(0)}
                  </Text>
                  <Text style={styles.childStatLabel}>Saldo</Text>
                </View>
              </View>
            </View>
          ))}
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  periodButtonTextActive: {
    color: Colors.white,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
  chartSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  chartContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 24,
    borderRadius: 4,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 4,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
  },
  barLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 6,
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 24,
  },
  childStatCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  childStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  childInfo: {
    marginLeft: 12,
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  streakText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500',
  },
  childStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  childStatItem: {
    alignItems: 'center',
  },
  childStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  childStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
