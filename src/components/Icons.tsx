import React from 'react';
import Svg, { Path, Line, Polyline, Circle, Rect, Polygon } from 'react-native-svg';

interface P { size?: number; color?: string; strokeWidth?: number; }

const s = (c: string, w: number) => ({
  stroke: c, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const BellIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...s(color, strokeWidth)} />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" {...s(color, strokeWidth)} />
  </Svg>
);

export const CameraIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" {...s(color, strokeWidth)} />
    <Circle cx="12" cy="13" r="4" {...s(color, strokeWidth)} />
  </Svg>
);

export const MessageIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...s(color, strokeWidth)} />
  </Svg>
);

export const FlameIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3 1.072-2.143 2.5-4 4.5-5.5-.5 2.5 0 4.5 2 6.5 1.5 1.5 2.5 3.5 2.5 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2z" {...s(color, strokeWidth)} />
  </Svg>
);

export const HomeIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...s(color, strokeWidth)} />
    <Polyline points="9 22 9 12 15 12 15 22" {...s(color, strokeWidth)} />
  </Svg>
);

export const ZapIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" {...s(color, strokeWidth)} />
  </Svg>
);

export const BarChartIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="18" y1="20" x2="18" y2="10" {...s(color, strokeWidth)} />
    <Line x1="12" y1="20" x2="12" y2="4" {...s(color, strokeWidth)} />
    <Line x1="6" y1="20" x2="6" y2="14" {...s(color, strokeWidth)} />
  </Svg>
);

export const UserIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...s(color, strokeWidth)} />
    <Circle cx="12" cy="7" r="4" {...s(color, strokeWidth)} />
  </Svg>
);

export const CpuIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="4" width="16" height="16" rx="2" {...s(color, strokeWidth)} />
    <Rect x="9" y="9" width="6" height="6" {...s(color, strokeWidth)} />
    <Line x1="9" y1="1" x2="9" y2="4" {...s(color, strokeWidth)} />
    <Line x1="15" y1="1" x2="15" y2="4" {...s(color, strokeWidth)} />
    <Line x1="9" y1="20" x2="9" y2="23" {...s(color, strokeWidth)} />
    <Line x1="15" y1="20" x2="15" y2="23" {...s(color, strokeWidth)} />
    <Line x1="20" y1="9" x2="23" y2="9" {...s(color, strokeWidth)} />
    <Line x1="20" y1="14" x2="23" y2="14" {...s(color, strokeWidth)} />
    <Line x1="1" y1="9" x2="4" y2="9" {...s(color, strokeWidth)} />
    <Line x1="1" y1="14" x2="4" y2="14" {...s(color, strokeWidth)} />
  </Svg>
);

export const PlayIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polygon points="5 3 19 12 5 21 5 3" {...s(color, strokeWidth)} />
  </Svg>
);

export const CheckIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="20 6 9 17 4 12" {...s(color, strokeWidth)} />
  </Svg>
);

export const XIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="18" y1="6" x2="6" y2="18" {...s(color, strokeWidth)} />
    <Line x1="6" y1="6" x2="18" y2="18" {...s(color, strokeWidth)} />
  </Svg>
);

export const PlusIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="12" y1="5" x2="12" y2="19" {...s(color, strokeWidth)} />
    <Line x1="5" y1="12" x2="19" y2="12" {...s(color, strokeWidth)} />
  </Svg>
);

export const MinusIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="5" y1="12" x2="19" y2="12" {...s(color, strokeWidth)} />
  </Svg>
);

export const ArrowUpIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="12" y1="19" x2="12" y2="5" {...s(color, strokeWidth)} />
    <Polyline points="5 12 12 5 19 12" {...s(color, strokeWidth)} />
  </Svg>
);

export const ActivityIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" {...s(color, strokeWidth)} />
  </Svg>
);

export const VideoIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polygon points="23 7 16 12 23 17 23 7" {...s(color, strokeWidth)} />
    <Rect x="1" y="5" width="15" height="14" rx="2" {...s(color, strokeWidth)} />
  </Svg>
);

export const TrendingUpIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" {...s(color, strokeWidth)} />
    <Polyline points="17 6 23 6 23 12" {...s(color, strokeWidth)} />
  </Svg>
);

export const AwardIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="7" {...s(color, strokeWidth)} />
    <Polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" {...s(color, strokeWidth)} />
  </Svg>
);

export const ClipboardIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" {...s(color, strokeWidth)} />
    <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" {...s(color, strokeWidth)} />
  </Svg>
);

export const PieChartIcon = ({ size = 24, color = '#fff', strokeWidth = 2 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21.21 15.89A10 10 0 1 1 8 2.83" {...s(color, strokeWidth)} />
    <Path d="M22 12A10 10 0 0 0 12 2v10z" {...s(color, strokeWidth)} />
  </Svg>
);
