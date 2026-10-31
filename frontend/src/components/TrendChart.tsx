import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
import { Colors } from '../constants/colors';

export type TrendSeries = {
  key: string;
  label: string;
  color: string;
  values: number[];
};

type Props = {
  labels: string[];
  series: TrendSeries[];
  height?: number;
};

export default function TrendChart({ labels, series, height = 180 }: Props) {
  const [mode, setMode] = useState<'line' | 'area'>('line');
  const [selected, setSelected] = useState<number | null>(null);
  const width = 320;
  const padL = 28;
  const padR = 8;
  const padT = 12;
  const padB = 22;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const maxY = useMemo(() => {
    const m = Math.max(1, ...series.flatMap((s) => s.values));
    return Math.ceil(m / 2) * 2;
  }, [series]);

  const pointsFor = (values: number[]) =>
    values.map((v, i) => {
      const x = padL + (values.length <= 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
      const y = padT + innerH - (v / maxY) * innerH;
      return { x, y, v };
    });

  const gridYs = [0, 0.5, 1];

  return (
    <View>
      <View style={styles.modeRow}>
        <Text style={styles.kicker}>Tendencia</Text>
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeChip, mode === 'line' && styles.modeChipOn]}
            onPress={() => setMode('line')}
          >
            <Text style={[styles.modeText, mode === 'line' && styles.modeTextOn]}>Líneas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeChip, mode === 'area' && styles.modeChipOn]}
            onPress={() => setMode('area')}
          >
            <Text style={[styles.modeText, mode === 'area' && styles.modeTextOn]}>Área</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {gridYs.map((t) => {
          const y = padT + innerH * (1 - t);
          return (
            <Line
              key={t}
              x1={padL}
              x2={width - padR}
              y1={y}
              y2={y}
              stroke={Colors.border}
              strokeDasharray="4 4"
            />
          );
        })}
        {series.map((s) => {
          const pts = pointsFor(s.values);
          const poly = pts.map((p) => `${p.x},${p.y}`).join(' ');
          const area =
            pts.length > 1
              ? `M ${pts[0].x} ${padT + innerH} ${pts.map((p) => `L ${p.x} ${p.y}`).join(' ')} L ${
                  pts[pts.length - 1].x
                } ${padT + innerH} Z`
              : '';
          return (
            <React.Fragment key={s.key}>
              {mode === 'area' && pts.length > 1 ? (
                <Path d={area} fill={s.color} opacity={0.16} />
              ) : null}
              {pts.length > 1 ? (
                <Polyline
                  points={poly}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.key === 'total' ? 2.5 : 2}
                  strokeDasharray={s.key === 'total' ? '6 4' : undefined}
                />
              ) : null}
              {pts.map((p, i) => (
                <Circle
                  key={`${s.key}-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={selected === i ? 5 : 3.5}
                  fill={s.color}
                  onPress={() => setSelected(i)}
                />
              ))}
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={styles.xLabels}>
        {labels.map((l, i) => (
          <TouchableOpacity key={`${l}-${i}`} onPress={() => setSelected(i)} style={styles.xLabelBtn}>
            <Text style={[styles.xLabel, selected === i && styles.xLabelOn]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {selected != null && labels[selected] ? (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>{labels[selected]}</Text>
          {series.map((s) => (
            <View key={s.key} style={styles.tooltipRow}>
              <View style={[styles.swatch, { backgroundColor: s.color }]} />
              <Text style={styles.tooltipLabel}>{s.label}</Text>
              <Text style={styles.tooltipVal}>{s.values[selected] ?? 0} tareas</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.hint}>Toca un punto o un día para ver el detalle</Text>
      )}

      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modeSwitch: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: 999, padding: 3 },
  modeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  modeChipOn: { backgroundColor: Colors.primary },
  modeText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  modeTextOn: { color: Colors.white },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  xLabelBtn: { flex: 1, alignItems: 'center' },
  xLabel: { fontSize: 10, fontWeight: '700', color: Colors.textLight },
  xLabelOn: { color: Colors.primary },
  hint: { marginTop: 8, fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  tooltip: {
    marginTop: 10,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tooltipTitle: { fontSize: 13, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tooltipLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.text },
  tooltipVal: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  swatch: { width: 8, height: 8, borderRadius: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
});
