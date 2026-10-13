import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { formatDayMonth } from '@/domain/dates';
import type { RatePoint } from '@/services/fxService';
import { colors, spacing } from '@/theme/tokens';

const HEIGHT = 168;
const PAD = { top: 14, right: 14, bottom: 14, left: 14 };

export interface RateChartProps {
  points: RatePoint[];
  /** Formats a rate for display, e.g. "RM 2.58". */
  formatValue: (rate: number) => string;
  /** One-sentence description for screen readers. */
  summary: string;
}

/**
 * A single line showing one currency's rate over time. Touch or drag across it to read any day.
 * The vertical scale is fitted to the data (not started at zero), because day-to-day rate moves
 * are small and would otherwise look like a flat line.
 */
export function RateChart({ points, formatValue, summary }: RateChartProps) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <View style={styles.empty}>
        <AppText color="muted" align="center">
          Not enough history to draw yet. Connect to the internet to load it.
        </AppText>
      </View>
    );
  }

  const values = points.map((point) => point.rate);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || high * 0.01 || 1;
  const innerWidth = Math.max(1, width - PAD.left - PAD.right);
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (index: number) => PAD.left + (index / (points.length - 1)) * innerWidth;
  const y = (rate: number) => PAD.top + (1 - (rate - low) / span) * innerHeight;
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(point.rate).toFixed(1)}`).join(' ');

  const lastIndex = points.length - 1;
  const activeIndex = selected ?? lastIndex;
  const active = points[activeIndex] as RatePoint;

  const selectAt = (locationX: number) => {
    const ratio = (locationX - PAD.left) / innerWidth;
    setSelected(Math.min(lastIndex, Math.max(0, Math.round(ratio * lastIndex))));
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.readout} aria-live="polite">
        <AppText variant="number">{formatValue(active.rate)}</AppText>
        <AppText color="muted">{selected === null ? `Latest, ${formatDayMonth(active.date)}` : formatDayMonth(active.date)}</AppText>
      </View>
      <View
        style={styles.plot}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        accessible
        role="img"
        aria-label={summary}
        // The whole plot is the touch target, so a thin line is still easy to explore with a finger.
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => selectAt(event.nativeEvent.locationX)}
        onResponderMove={(event) => selectAt(event.nativeEvent.locationX)}
        onResponderRelease={() => setSelected(null)}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {[0, 0.5, 1].map((step) => (
              <Line key={step} x1={PAD.left} x2={width - PAD.right} y1={PAD.top + step * innerHeight} y2={PAD.top + step * innerHeight} stroke={colors.surfaceSunken} strokeWidth={1} />
            ))}
            {selected !== null ? <Line x1={x(activeIndex)} x2={x(activeIndex)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke={colors.border} strokeWidth={1} /> : null}
            <Path d={path} stroke={colors.teal} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {/* A white ring keeps the marker distinct where it sits on the line. */}
            <Circle cx={x(activeIndex)} cy={y(active.rate)} r={5} fill={colors.teal} stroke={colors.card} strokeWidth={2} />
          </Svg>
        ) : null}
      </View>
      <View style={styles.axis}>
        <AppText variant="caption" color="muted">
          {formatDayMonth((points[0] as RatePoint).date)}
        </AppText>
        <AppText variant="caption" color="muted">
          {`Low ${formatValue(low)}  ·  High ${formatValue(high)}`}
        </AppText>
        <AppText variant="caption" color="muted">
          {formatDayMonth((points[lastIndex] as RatePoint).date)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  readout: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  plot: { height: HEIGHT },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  empty: { height: HEIGHT, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
});
