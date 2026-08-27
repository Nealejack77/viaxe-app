import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, ViewStyle, StyleProp, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Every tap should feel physical. Springs the child down on press-in and back on
 * release, with a light haptic tick. This is the single biggest "feel" lever —
 * static touchables are what make an app read as generic. Native-driven (scale),
 * so it stays 60fps.
 */
export default function PressableScale({
  children,
  onPress,
  style,
  scaleTo = 0.98,
  haptic = 'light',
  disabled,
  accessibilityLabel,
  accessibilityRole = 'button',
  ...rest
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: PressableProps['accessibilityRole'];
} & Omit<PressableProps, 'onPress' | 'style' | 'children'>) {
  const scale = useRef(new Animated.Value(1)).current;

  const spring = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: Platform.OS !== 'web',
      speed: 50,
      bounciness: 2,
    }).start();

  const tick = () => {
    if (haptic === 'none' || Platform.OS === 'web') return;
    const map = { light: Haptics.ImpactFeedbackStyle.Light, medium: Haptics.ImpactFeedbackStyle.Medium, heavy: Haptics.ImpactFeedbackStyle.Heavy };
    Haptics.impactAsync(map[haptic]).catch(() => {});
  };

  return (
    <Pressable
      onPressIn={() => { if (!disabled) { spring(scaleTo); tick(); } }}
      onPressOut={() => spring(1)}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      {...rest}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}
