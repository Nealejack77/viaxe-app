import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp, AccessibilityInfo, Platform } from 'react-native';

/**
 * Staggered entrance: fades + lifts a block into place on mount. Sequencing the
 * screen in (hero, then session, then telemetry) gives it choreography instead
 * of everything appearing at once. Native-driven; respects reduce-motion.
 */
export default function Reveal({
  children,
  delay = 0,
  distance = 18,
  duration = 520,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useRef(new Animated.Value(0)).current;
  const reduced = useRef(false);

  useEffect(() => {
    let mounted = true;
    if (Platform.OS !== 'web' && AccessibilityInfo.isReduceMotionEnabled) {
      AccessibilityInfo.isReduceMotionEnabled().then((r) => { reduced.current = r; });
    }
    const run = () =>
      Animated.timing(p, {
        toValue: 1,
        duration: reduced.current ? 0 : duration,
        delay: reduced.current ? 0 : delay,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    const id = setTimeout(() => { if (mounted) run(); }, 0);
    return () => { mounted = false; clearTimeout(id); };
  }, []);

  return (
    <Animated.View
      style={[
        {
          opacity: p,
          transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
