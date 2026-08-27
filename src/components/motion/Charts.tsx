import React from 'react';
import Svg, { Polyline, Rect, Line } from 'react-native-svg';

/** Tiny trend line for telemetry readouts. Normalises data to the box. */
export function Sparkline({
  data,
  width = 56,
  height = 20,
  color = '#8C8579',
  strokeWidth = 1.5,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}) {
  if (!data || data.length < 2) return <Svg width={width} height={height} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const pad = strokeWidth;
  const pts = data
    .map((v, i) => {
      const x = i * stepX;
      const y = pad + (height - pad * 2) * (1 - (v - min) / span);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <Svg width={width} height={height}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Discrete bars, values 0..1. Used for weekly cadence + adherence readouts. */
export function Bars({
  values,
  width = 56,
  height = 22,
  gap = 3,
  color = '#F55139',
  dimColor = 'rgba(235,231,217,0.10)',
  activeIndex,
}: {
  values: number[]; // 0..1
  width?: number;
  height?: number;
  gap?: number;
  color?: string;
  dimColor?: string;
  activeIndex?: number;
}) {
  const n = values.length || 1;
  const barW = Math.max(2, (width - gap * (n - 1)) / n);
  return (
    <Svg width={width} height={height}>
      {values.map((v, i) => {
        const h = Math.max(2, height * Math.max(0, Math.min(1, v)));
        const x = i * (barW + gap);
        const on = v > 0.02;
        return (
          <Rect
            key={i}
            x={x}
            y={height - h}
            width={barW}
            height={h}
            rx={Math.min(2, barW / 2)}
            fill={i === activeIndex ? color : on ? color : dimColor}
            opacity={i === activeIndex ? 1 : on ? 0.55 : 1}
          />
        );
      })}
    </Svg>
  );
}
