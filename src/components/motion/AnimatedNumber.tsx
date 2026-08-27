import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

/**
 * Count-up numerals. Data that animates into place reads as "live telemetry"
 * rather than a static field — a core part of the instrument feel. JS-tweened
 * (text can't use the native driver) with an ease-out-expo curve; cheap because
 * it only setStates a single number.
 */
export default function AnimatedNumber({
  value,
  duration = 900,
  decimals = 0,
  style,
  prefix = '',
  suffix = '',
  from = 0,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  style?: StyleProp<TextStyle>;
  prefix?: string;
  suffix?: string;
  from?: number;
}) {
  const [display, setDisplay] = useState(from);
  const startRef = useRef(from);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    const start = startRef.current;
    const t0 = Date.now();
    const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      const eased = easeOutExpo(p);
      setDisplay(start + (target - start) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else startRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return <Text style={style} allowFontScaling>{prefix}{display.toFixed(decimals)}{suffix}</Text>;
}
