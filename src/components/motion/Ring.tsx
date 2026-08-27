import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * A circular gauge — the hero instrument. Renders an animated ember arc on an
 * onyx track and centres arbitrary content (the momentum score). The arc sweeps
 * in from zero on mount so the number and ring fill together. This single
 * element is what makes the screen read as a performance instrument rather than
 * a card of stats.
 */
export default function Ring({
  size = 200,
  strokeWidth = 14,
  progress,
  color = '#FF4B22',
  colorEnd,
  trackColor = 'rgba(235,231,217,0.08)',
  duration = 1100,
  rounded = true,
  children,
  style,
}: {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  color?: string;
  colorEnd?: string;
  trackColor?: string;
  duration?: number;
  rounded?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const anim = useRef(new Animated.Value(0)).current;
  const target = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));

  useEffect(() => {
    Animated.timing(anim, { toValue: target, duration, useNativeDriver: false }).start();
  }, [target, duration]);

  const strokeDashoffset = anim.interpolate({ inputRange: [0, 1], outputRange: [c, 0] });

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} />
            <Stop offset="1" stopColor={colorEnd || color} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap={rounded ? 'round' : 'butt'}
          strokeDasharray={c}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      {children}
    </View>
  );
}
