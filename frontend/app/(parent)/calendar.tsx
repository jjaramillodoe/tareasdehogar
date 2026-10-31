import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { choresAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { getChildAvatarColors } from '../../src/utils/childGender';
import ParentScreenShell from '../../src/components/ParentScreenShell';
import { shadow } from '../../src/utils/shadow';
import { useAuthStore } from '../../src/store/authStore';


const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  completada: 'Completada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

const statusColors: Record<string, string> = {
  pendiente: Colors.warning,
  completada: Colors.primary,
  aprobada: Colors.success,
  rechazada: Colors.error,
};

interface CalendarAssignee {
  id: string;
  name: string;
  gender?: 'mujer' | 'hombre' | null;
}

interface CalendarChore {
  id: string;
  title: string;
  status: string;
  amount?: number;
  scheduled_date?: string | null;
  assigned_to?: string[];
  assigned_children?: CalendarAssignee[];
}

interface CalendarDay {
  date: string;
  chores: CalendarChore[];
}

export default function CalendarScreen() {
  const family = useAuthStore((s) => s.family);
  const currency = family?.currency || 'USD';
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  const load = useCallback(async () => {
    try {
      const data = await choresAPI.getCalendar(year, month);
      setDays(data as CalendarDay[]);
      setSelectedDate((prev) => {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const monthFirstDate = `${monthKey}-01`;
        const hasToday = year === now.getFullYear() && month === now.getMonth() + 1;
        if (hasToday) return todayKey;
        if (prev && prev.startsWith(monthKey)) return prev;
        return monthFirstDate;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year, month]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const byDate = useMemo(() => {
    const m: Record<string, CalendarChore[]> = {};
    for (const d of days) {
      m[d.date] = d.chores as CalendarChore[];
    }
    return m;
  }, [days]);

  const monthTaskCount = useMemo(
    () => days.reduce((sum, d) => sum + (d.chores?.length || 0), 0),
    [days]
  );

  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const mondayOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: ({ day: number } | null)[] = [];
  for (let i = 0; i < mondayOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push(null);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateKey = (day: number) => `${year}-${pad(month)}-${pad(day)}`;

  const dotColorForChore = (c: CalendarChore) => {
    const first = c.assigned_children?.[0];
    return getChildAvatarColors(first?.gender).backgroundColor;
  };

  const assigneeLabel = (c: CalendarChore) => {
    const names = c.assigned_children?.map((ch) => ch.name).filter(Boolean);
    if (names && names.length > 0) return names.join(', ');
    return null;
  };

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m > 12) {
      m = 1;
      y += 1;
    } else if (m < 1) {
      m = 12;
      y -= 1;
    }
    setMonth(m);
    setYear(y);
  };

  const goToToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setSelectedDate(todayKey);
  };

  const monthLabel = new Date(year, month - 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const selectedChores = selectedDate ? byDate[selectedDate] ?? [] : [];

  return (
    <ParentScreenShell
      title="Calendario"
      subtitle={
        monthTaskCount === 0
          ? 'Tareas con fecha planificada'
          : `${monthTaskCount} tarea${monthTaskCount === 1 ? '' : 's'} este mes`
      }
      loading={loading && days.length === 0}
      showBack
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.monthCard}>
          <View style={styles.monthRow}>
            <TouchableOpacity
              onPress={() => changeMonth(-1)}
              style={styles.monthNav}
              accessibilityLabel="Mes anterior"
            >
              <Ionicons name="chevron-back" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <TouchableOpacity
              onPress={() => changeMonth(1)}
              style={styles.monthNav}
              accessibilityLabel="Mes siguiente"
            >
              <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.todayChip} onPress={goToToday} activeOpacity={0.85}>
              <Ionicons name="today" size={14} color={Colors.white} />
              <Text style={styles.todayChipText}>Hoy</Text>
            </TouchableOpacity>
            {monthTaskCount > 0 ? (
              <View style={styles.monthCountChip}>
                <Ionicons name="clipboard" size={13} color={Colors.secondaryInk} />
                <Text style={styles.monthCountText}>{monthTaskCount} planificadas</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={styles.legendToday} />
              <Text style={styles.legendText}>Hoy</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendSelected} />
              <Text style={styles.legendText}>Seleccionado</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendHasTasks} />
              <Text style={styles.legendText}>Con tareas</Text>
            </View>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell, idx) => {
              if (!cell) {
                return <View key={`e-${idx}`} style={styles.cell} />;
              }
              const key = dateKey(cell.day);
              const list = byDate[key];
              const has = list && list.length > 0;
              const isSel = selectedDate === key;
              const isToday = key === todayKey;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.cell,
                    has && styles.cellHas,
                    isToday && styles.cellToday,
                    isSel && styles.cellSelected,
                  ]}
                  onPress={() => setSelectedDate(key)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.cellText,
                      has && styles.cellTextHas,
                      isToday && !isSel && styles.cellTextToday,
                      isSel && styles.cellTextSel,
                    ]}
                  >
                    {cell.day}
                  </Text>
                  {has ? (
                    <Text style={[styles.cellCount, isSel && styles.cellCountSel]}>
                      {list!.length}
                    </Text>
                  ) : (
                    <View style={styles.dotSpacer} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailHead}>
            <View style={styles.detailIconWrap}>
              <Ionicons name="calendar" size={18} color={Colors.primary} />
            </View>
            <View style={styles.detailTitleWrap}>
              <Text style={styles.detailTitle}>
                {selectedDate
                  ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                  : 'Selecciona un día'}
              </Text>
              {selectedChores.length > 0 ? (
                <Text style={styles.detailCount}>
                  {selectedChores.length} tarea{selectedChores.length === 1 ? '' : 's'}
                </Text>
              ) : null}
            </View>
          </View>

          {selectedDate && selectedChores.length === 0 ? (
            <View style={styles.emptyDetailBox}>
              <Ionicons name="sunny-outline" size={28} color={Colors.textLight} />
              <Text style={styles.emptyDetail}>No hay tareas planificadas este día.</Text>
            </View>
          ) : null}

          {selectedChores.map((c) => {
            const label = assigneeLabel(c);
            const iconTint = dotColorForChore(c);
            const statusColor = statusColors[c.status] || Colors.textSecondary;
            return (
              <View key={c.id} style={styles.choreRow}>
                <View style={[styles.choreIcon, { backgroundColor: iconTint + '22' }]}>
                  <Ionicons name="clipboard" size={20} color={iconTint} />
                </View>
                <View style={styles.choreBody}>
                  <Text style={styles.choreTitle}>{c.title}</Text>
                  {label ? (
                    <Text style={styles.choreAssignees} numberOfLines={2}>
                      Para: {label}
                    </Text>
                  ) : null}
                  {typeof c.amount === 'number' ? (
                    <Text style={styles.choreAmount}>
                      {currency} {c.amount.toFixed(2)}
                    </Text>
                  ) : null}
                  <View style={[styles.statusChip, { backgroundColor: statusColor + '18' }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.choreStatus, { color: statusColor }]}>
                      {statusLabels[c.status] || c.status}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ParentScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 28,
  },
  monthCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.primary + '22',
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: 14,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 6, blur: 14, opacity: 0.1, elevation: 4 }),

  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  monthNav: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '28',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    textTransform: 'capitalize',
    letterSpacing: -0.2,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  legendToday: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.accent,
    backgroundColor: 'transparent',
  },
  legendSelected: {
    width: 12,
    height: 12,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  legendHasTasks: {
    width: 12,
    height: 12,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  todayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 3, blur: 6, opacity: 0.28, elevation: 3 }),

  },
  todayChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },
  monthCountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.secondary + '55',
    borderWidth: 1,
    borderColor: Colors.secondaryDark,
  },
  monthCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.secondaryInk,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 6,
    paddingTop: 4,
  },
  cell: {
    width: '14.2857%',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 12,
  },
  cellHas: {
    backgroundColor: Colors.secondary + '44',
  },
  cellToday: {
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  cellSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 3, blur: 6, opacity: 0.3, elevation: 3 }),

  },
  cellText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  cellTextHas: {
    fontWeight: '800',
  },
  cellTextToday: {
    color: Colors.accentDark,
    fontWeight: '800',
  },
  cellTextSel: {
    color: Colors.white,
    fontWeight: '800',
  },
  cellCount: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
  },
  cellCountSel: {
    color: Colors.white,
  },
  dotSpacer: {
    minHeight: 14,
    marginTop: 2,
  },
  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
    ...shadow({ color: Colors.primary, offsetX: 0, offsetY: 4, blur: 10, opacity: 0.07, elevation: 2 }),

  },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary + '16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    textTransform: 'capitalize',
    letterSpacing: -0.2,
  },
  detailCount: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  emptyDetailBox: {
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  choreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  choreIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  choreBody: {
    flex: 1,
    minWidth: 0,
  },
  choreTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  choreAssignees: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  choreAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  choreStatus: {
    fontSize: 11,
    fontWeight: '800',
  },
});
