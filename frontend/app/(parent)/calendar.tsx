import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { choresAPI } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { getChildAvatarColors } from '../../src/utils/childGender';

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

interface CalendarAssignee {
  id: string;
  name: string;
  gender?: 'mujer' | 'hombre' | null;
}

interface CalendarChore {
  id: string;
  title: string;
  status: string;
  scheduled_date?: string | null;
  assigned_to?: string[];
  assigned_children?: CalendarAssignee[];
}

interface CalendarDay {
  date: string;
  chores: CalendarChore[];
}

export default function CalendarScreen() {
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

  const byDate = React.useMemo(() => {
    const m: Record<string, CalendarChore[]> = {};
    for (const d of days) {
      m[d.date] = d.chores as CalendarChore[];
    }
    return m;
  }, [days]);

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

  if (loading && days.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendario</Text>
        <Text style={styles.headerSubtitle}>Tareas con fecha planificada</Text>
      </View>

      <View style={styles.monthRow}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNav}>
          <Ionicons name="chevron-back" size={28} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNav}>
          <Ionicons name="chevron-forward" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.quickActionsRow}>
        <TouchableOpacity style={styles.todayChip} onPress={goToToday}>
          <Ionicons name="today-outline" size={14} color={Colors.primary} />
          <Text style={styles.todayChipText}>Hoy</Text>
        </TouchableOpacity>
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

      <View style={styles.gridCard}>
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
            >
              <Text
                style={[
                  styles.cellText,
                  has && styles.cellTextHas,
                  isToday && styles.cellTextToday,
                  isSel && styles.cellTextSel,
                ]}
              >
                {cell.day}
              </Text>
              {has ? (
                <View style={styles.dotRow}>
                  {list!.slice(0, 3).map((c) => (
                    <View key={c.id} style={[styles.dot, { backgroundColor: dotColorForChore(c) }]} />
                  ))}
                </View>
              ) : null}
            </TouchableOpacity>
          );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.detail}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        <Text style={styles.detailTitle}>
          {selectedDate
            ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
            : 'Selecciona un día'}
        </Text>
        {selectedDate && selectedChores.length === 0 && (
          <Text style={styles.emptyDetail}>No hay tareas planificadas este día.</Text>
        )}
        {selectedChores.map((c) => {
          const label = assigneeLabel(c);
          const iconTint = dotColorForChore(c);
          return (
            <View key={c.id} style={styles.choreRow}>
              <View style={styles.choreIcon}>
                <Ionicons name="clipboard-outline" size={22} color={iconTint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.choreTitle}>{c.title}</Text>
                {label ? (
                  <Text style={styles.choreAssignees} numberOfLines={2}>
                    Para: {label}
                  </Text>
                ) : null}
                <Text style={styles.choreStatus}>{c.status}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
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
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  monthNav: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: Colors.primary + '12',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: Colors.surface,
  },
  quickActionsRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: Colors.surface,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: Colors.surface,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  legendToday: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    backgroundColor: 'transparent',
  },
  legendSelected: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  legendHasTasks: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: Colors.secondary + '80',
  },
  todayChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.primary + '14',
  },
  todayChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  gridCard: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  cell: {
    width: '14.2857%',
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 3,
  },
  cellHas: {
    backgroundColor: Colors.secondary + '30',
    borderRadius: 10,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: 10,
  },
  cellSelected: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  cellText: {
    fontSize: 14,
    color: Colors.text,
  },
  cellTextHas: {
    fontWeight: '600',
  },
  cellTextToday: {
    color: Colors.accentDark,
    fontWeight: '700',
  },
  cellTextSel: {
    color: Colors.white,
    fontWeight: '700',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  detail: {
    flex: 1,
    padding: 16,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  emptyDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  choreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  choreIcon: {
    marginRight: 12,
  },
  choreTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  choreAssignees: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  choreStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
});
