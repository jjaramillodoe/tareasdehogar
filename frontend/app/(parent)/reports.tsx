import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { statsAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import ParentScreenShell from '../../src/components/ParentScreenShell';
import DonutChart, { colorForIndex } from '../../src/components/DonutChart';
import TrendChart, { TrendSeries } from '../../src/components/TrendChart';
import { getChildAvatarSource } from '../../src/utils/avatars';
import { shadow } from '../../src/utils/shadow';

interface DailyStat {
  tasks_completed: number;
  amount_paid: number;
}

interface ChildStat {
  child_id: string;
  name: string;
  gender?: 'mujer' | 'hombre' | null;
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
  children_daily?: Record<string, Record<string, number>>;
  children_stats: ChildStat[];
}

type ChartMode = 'earned' | 'tasks';

export default function ReportsScreen() {
  const { family } = useAuthStore();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [chartMode, setChartMode] = useState<ChartMode>('earned');

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
      setIsLoading(true);
      loadReport();
    }, [selectedPeriod])
  );

  const currency = family?.currency || 'USD';

  const donutSlices = useMemo(() => {
    const kids = report?.children_stats ?? [];
    return kids.map((child, i) => ({
      key: child.child_id,
      label: child.name,
      value: chartMode === 'earned' ? Number(child.amount_earned || 0) : Number(child.tasks_completed || 0),
      color: colorForIndex(i),
      child,
    }));
  }, [report?.children_stats, chartMode]);

  const donutTotal = donutSlices.reduce((s, x) => s + x.value, 0);
  const topSlice = useMemo(() => {
    if (donutSlices.length === 0) return null;
    return [...donutSlices].sort((a, b) => b.value - a.value)[0];
  }, [donutSlices]);

  const dailyData = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.daily_stats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, stat]) => ({
        date,
        tasks: Number(stat.tasks_completed || 0),
        paid: Number(stat.amount_paid || 0),
        weekday: new Date(`${date}T12:00:00`).getDay(), // 0=Sun
      }));
  }, [report]);

  const activityMax = useMemo(
    () => Math.max(1, ...dailyData.map((d) => d.tasks)),
    [dailyData]
  );

  const trendSeries = useMemo((): TrendSeries[] => {
    const dates = dailyData.map((d) => d.date);
    const kids = report?.children_stats ?? [];
    const perChild = report?.children_daily ?? {};
    const childSeries: TrendSeries[] = kids.map((child, i) => ({
      key: child.child_id,
      label: child.name.split(' ')[0],
      color: colorForIndex(i),
      values: dates.map((d) => Number(perChild[child.child_id]?.[d] || 0)),
    }));
    const total: TrendSeries = {
      key: 'total',
      label: 'Familia',
      color: Colors.secondaryDark,
      values: dailyData.map((d) => d.tasks),
    };
    return [...childSeries, total];
  }, [dailyData, report?.children_stats, report?.children_daily]);

  const trendLabels = useMemo(
    () =>
      dailyData.map((d) =>
        new Date(`${d.date}T12:00:00`).toLocaleDateString('es-ES', {
          weekday: selectedPeriod <= 7 ? 'short' : undefined,
          day: 'numeric',
        })
      ),
    [dailyData, selectedPeriod]
  );

  const activityInsights = useMemo(() => {
    const activeDays = dailyData.filter((d) => d.tasks > 0);
    const best = [...dailyData].sort((a, b) => b.tasks - a.tasks)[0];
    const avg =
      dailyData.length > 0
        ? dailyData.reduce((s, d) => s + d.tasks, 0) / dailyData.length
        : 0;
    return {
      activeDays: activeDays.length,
      bestLabel: best && best.tasks > 0
        ? new Date(`${best.date}T12:00:00`).toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })
        : null,
      bestTasks: best?.tasks ?? 0,
      avg: avg,
    };
  }, [dailyData]);

  const toLocalDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  /** Weeks Mon→Sun for heatmap rows */
  const heatRows = useMemo(() => {
    type Cell = { date: string; tasks: number; inRange: boolean };
    if (dailyData.length === 0) return [] as Cell[][];
    const byDate = new Map(dailyData.map((d) => [d.date, d.tasks]));
    const start = new Date(`${dailyData[0].date}T12:00:00`);
    const end = new Date(`${dailyData[dailyData.length - 1].date}T12:00:00`);
    const endKey = dailyData[dailyData.length - 1].date;
    const cursor = new Date(start);
    cursor.setDate(cursor.getDate() - ((start.getDay() + 6) % 7)); // align to Monday
    const rows: Cell[][] = [];
    while (rows.length < 8) {
      const row: Cell[] = [];
      for (let i = 0; i < 7; i++) {
        const key = toLocalDateKey(cursor);
        const inRange = cursor >= start && cursor <= end;
        row.push({
          date: key,
          tasks: inRange ? byDate.get(key) ?? 0 : 0,
          inRange,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      rows.push(row);
      if (row.some((c) => c.date === endKey)) break;
    }
    return rows;
  }, [dailyData]);

  const weekSummaries = useMemo(() => {
    return heatRows
      .map((row, i) => {
        const inRange = row.filter((c) => c.inRange);
        if (inRange.length === 0) return null;
        const tasks = inRange.reduce((s, c) => s + c.tasks, 0);
        const first = inRange[0].date;
        const last = inRange[inRange.length - 1].date;
        return {
          label: `${new Date(`${first}T12:00:00`).getDate()}–${new Date(`${last}T12:00:00`).getDate()}`,
          tasks,
          week: i + 1,
        };
      })
      .filter((w): w is { label: string; tasks: number; week: number } => w != null);
  }, [heatRows]);

  const heatColor = (tasks: number, inRange: boolean) => {
    if (!inRange) return 'transparent';
    if (tasks <= 0) return Colors.border;
    const t = tasks / activityMax;
    if (t > 0.75) return Colors.primaryDark;
    if (t > 0.45) return Colors.primary;
    if (t > 0.2) return Colors.primaryLight;
    return Colors.primary + '55';
  };

  const centerTitle =
    chartMode === 'earned'
      ? `${currency} ${donutTotal.toFixed(0)}`
      : String(donutTotal);
  const centerSubtitle =
    chartMode === 'earned' ? 'Pagado en el período' : 'Tareas aprobadas';

  return (
    <ParentScreenShell
      title="Reportes"
      subtitle={`Últimos ${selectedPeriod} días · actividad familiar`}
      loading={isLoading}
      showBack
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadReport();
            }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.periodSelector}>
          {[7, 14, 30].map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.periodButton,
                selectedPeriod === days && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(days)}
              activeOpacity={0.88}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === days && styles.periodButtonTextActive,
                ]}
              >
                {days}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Journey-style summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryBlue]}>
            <Ionicons name="checkmark-done" size={18} color={Colors.white} />
            <Text style={styles.summaryValueOnColor}>{report?.total_tasks_completed || 0}</Text>
            <Text style={styles.summaryLabelOnColor}>Aprobadas</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryYellow]}>
            <Ionicons name="wallet" size={18} color={Colors.onSecondary} />
            <Text style={styles.summaryValueOnYellow}>
              {currency} {(report?.total_amount_paid || 0).toFixed(0)}
            </Text>
            <Text style={styles.summaryLabelOnYellow}>Pagado</Text>
          </View>
        </View>

        <View style={styles.donutCard}>
          <Text style={styles.sectionTitle}>Tendencia de tareas</Text>
          <Text style={styles.sectionHint}>Comparativa por hijo · toca un día para el detalle</Text>
          <TrendChart labels={trendLabels} series={trendSeries} />
        </View>

        {/* Donut card */}
        <View style={styles.donutCard}>
          <View style={styles.donutHeader}>
            <Text style={styles.sectionTitle}>Reparto familiar</Text>
            <View style={styles.modeSwitch}>
              <TouchableOpacity
                style={[styles.modeChip, chartMode === 'earned' && styles.modeChipActive]}
                onPress={() => setChartMode('earned')}
              >
                <Text
                  style={[styles.modeChipText, chartMode === 'earned' && styles.modeChipTextActive]}
                >
                  Dinero
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeChip, chartMode === 'tasks' && styles.modeChipActive]}
                onPress={() => setChartMode('tasks')}
              >
                <Text
                  style={[styles.modeChipText, chartMode === 'tasks' && styles.modeChipTextActive]}
                >
                  Tareas
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.donutBody}>
            <DonutChart
              slices={donutSlices}
              centerTitle={donutTotal > 0 ? centerTitle : '0'}
              centerSubtitle={donutTotal > 0 ? centerSubtitle : 'Sin datos aún'}
            />
          </View>

          {topSlice && donutTotal > 0 ? (
            <View style={styles.insightBanner}>
              <Ionicons name="star" size={16} color={Colors.secondaryInk} />
              <Text style={styles.insightText}>
                {topSlice.label} lidera con{' '}
                {chartMode === 'earned'
                  ? `${currency} ${topSlice.value.toFixed(0)}`
                  : `${topSlice.value} tarea${topSlice.value === 1 ? '' : 's'}`}{' '}
                ({Math.round((topSlice.value / donutTotal) * 100)}%)
              </Text>
            </View>
          ) : null}

          <View style={styles.legend}>
            {donutSlices.map((slice) => {
              const pct = donutTotal > 0 ? Math.round((slice.value / donutTotal) * 100) : 0;
              return (
                <View key={slice.key} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                  <Image
                    source={getChildAvatarSource(slice.child.gender)}
                    style={styles.legendAvatar}
                  />
                  <Text style={styles.legendLabel} numberOfLines={1}>
                    {slice.label}
                  </Text>
                  <Text style={styles.legendValue}>
                    {chartMode === 'earned'
                      ? `${currency} ${slice.value.toFixed(0)}`
                      : slice.value}
                  </Text>
                  <Text style={styles.legendPct}>{pct}%</Text>
                </View>
              );
            })}
            {donutSlices.length === 0 ? (
              <Text style={styles.emptyLegend}>Agrega hijos para ver el reparto.</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Actividad del período</Text>
          <Text style={styles.sectionHint}>
            Cada cuadro es un día · más azul = más tareas aprobadas
          </Text>

          <View style={styles.chartContainer}>
            <View style={styles.insightRow}>
              <View style={styles.insightChip}>
                <Text style={styles.insightChipValue}>{activityInsights.activeDays}</Text>
                <Text style={styles.insightChipLabel}>días activos</Text>
              </View>
              <View style={styles.insightChip}>
                <Text style={styles.insightChipValue}>{activityInsights.avg.toFixed(1)}</Text>
                <Text style={styles.insightChipLabel}>prom./día</Text>
              </View>
              <View style={[styles.insightChip, styles.insightChipYellow]}>
                <Text style={styles.insightChipValueYellow}>
                  {activityInsights.bestTasks > 0 ? activityInsights.bestTasks : '—'}
                </Text>
                <Text style={styles.insightChipLabelYellow}>
                  {activityInsights.bestLabel || 'mejor día'}
                </Text>
              </View>
            </View>

            <View style={styles.weekdayHeader}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                <Text key={d} style={styles.weekdayLabel}>
                  {d}
                </Text>
              ))}
            </View>

            <View style={styles.heatGrid}>
              {heatRows.map((row, ri) => (
                <View key={`r-${ri}`} style={styles.heatRow}>
                  {row.map((cell) => (
                    <View
                      key={cell.date + String(cell.inRange)}
                      style={[
                        styles.heatCell,
                        { backgroundColor: heatColor(cell.tasks, cell.inRange) },
                        cell.inRange && cell.tasks > 0 && styles.heatCellActive,
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>

            <View style={styles.heatLegend}>
              <Text style={styles.heatLegendText}>Menos</Text>
              <View style={[styles.heatLegendSwatch, { backgroundColor: Colors.border }]} />
              <View style={[styles.heatLegendSwatch, { backgroundColor: Colors.primary + '55' }]} />
              <View style={[styles.heatLegendSwatch, { backgroundColor: Colors.primaryLight }]} />
              <View style={[styles.heatLegendSwatch, { backgroundColor: Colors.primary }]} />
              <View style={[styles.heatLegendSwatch, { backgroundColor: Colors.primaryDark }]} />
              <Text style={styles.heatLegendText}>Más</Text>
            </View>

            {weekSummaries.length > 1 ? (
              <View style={styles.weekList}>
                <Text style={styles.weekListTitle}>Por semana</Text>
                {weekSummaries.map((w, i) => {
                  const maxW = Math.max(1, ...weekSummaries.map((x) => x.tasks));
                  return (
                    <View key={`${w.label}-${i}`} style={styles.weekRow}>
                      <Text style={styles.weekLabel}>{w.label}</Text>
                      <View style={styles.weekTrack}>
                        <View
                          style={[
                            styles.weekFill,
                            { width: `${Math.max(w.tasks > 0 ? 8 : 0, (w.tasks / maxW) * 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.weekValue}>{w.tasks}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rendimiento por hijo</Text>
          {(report?.children_stats?.length ?? 0) === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="stats-chart-outline" size={28} color={Colors.textLight} />
              <Text style={styles.emptyText}>Sin datos en este período</Text>
            </View>
          ) : (
            report?.children_stats.map((child) => (
              <View key={child.child_id} style={styles.childStatCard}>
                <View style={styles.childStatHeader}>
                  <Image
                    source={getChildAvatarSource(child.gender)}
                    style={styles.childAvatarImg}
                  />
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>{child.name}</Text>
                    <View style={styles.streakBadge}>
                      <Ionicons name="flame" size={14} color={Colors.accent} />
                      <Text style={styles.streakText}>{child.current_streak} días</Text>
                    </View>
                  </View>
                  <View style={styles.payPill}>
                    <Text style={styles.payPillLabel}>Ganado</Text>
                    <Text style={styles.payPillValue}>
                      {currency} {child.amount_earned.toFixed(0)}
                    </Text>
                  </View>
                </View>
                <View style={styles.childStats}>
                  <View style={styles.childStatItem}>
                    <Text style={styles.childStatValue}>{child.tasks_completed}</Text>
                    <Text style={styles.childStatLabel}>Tareas</Text>
                  </View>
                  <View style={[styles.childStatItem, styles.balanceStatItem]}>
                    <Text style={[styles.childStatValue, { color: Colors.onSecondary }]}>
                      {currency} {child.balance.toFixed(0)}
                    </Text>
                    <Text style={[styles.childStatLabel, { color: Colors.onSecondaryMuted }]}>
                      Saldo
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ParentScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 28 },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 5,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 12,
  },
  periodButtonActive: { backgroundColor: Colors.primary },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  periodButtonTextActive: { color: Colors.white, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  summaryBlue: {
    backgroundColor: Colors.primary,
    ...shadow({ color: Colors.primary, offsetY: 5, blur: 12, opacity: 0.25, elevation: 4 }),
  },
  summaryYellow: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.secondaryDark,
  },
  summaryValueOnColor: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
  },
  summaryLabelOnColor: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  summaryValueOnYellow: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.onSecondary,
  },
  summaryLabelOnYellow: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSecondaryMuted,
  },
  donutCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 4, blur: 12, opacity: 0.08, elevation: 3 }),
  },
  donutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modeChipActive: { backgroundColor: Colors.primary },
  modeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modeChipTextActive: { color: Colors.white },
  donutBody: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  insightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.secondary + '55',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSecondary,
    lineHeight: 18,
  },
  legend: { gap: 8 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendAvatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  legendPct: {
    minWidth: 36,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  emptyLegend: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontWeight: '600',
    paddingVertical: 8,
  },
  chartSection: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  sectionHint: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chartContainer: {
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  insightRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  insightChip: {
    flex: 1,
    backgroundColor: Colors.primary + '12',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  insightChipYellow: {
    backgroundColor: Colors.secondary + '55',
  },
  insightChipValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  insightChipValueYellow: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.onSecondary,
  },
  insightChipLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  insightChipLabelYellow: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSecondaryMuted,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  heatGrid: {
    gap: 5,
  },
  heatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
  },
  heatCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    maxHeight: 36,
  },
  heatCellActive: {
    borderWidth: 0,
  },
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
  },
  heatLegendText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  heatLegendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  weekList: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  weekListTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 10,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  weekLabel: {
    width: 44,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  weekTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  weekFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  weekValue: {
    width: 28,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  section: { marginBottom: 24 },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: 12,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  childStatCard: {
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 3, blur: 8, opacity: 0.06, elevation: 2 }),
  },
  childStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  childAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  childInfo: { marginLeft: 12, flex: 1 },
  childName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent + '14',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  streakText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '800',
  },
  payPill: {
    backgroundColor: Colors.secondary + '66',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  payPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onSecondaryMuted,
  },
  payPillValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.onSecondary,
  },
  childStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    gap: 8,
  },
  childStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  balanceStatItem: {
    backgroundColor: Colors.secondary + '44',
    borderRadius: 12,
    paddingVertical: 6,
  },
  childStatValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  childStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
});
