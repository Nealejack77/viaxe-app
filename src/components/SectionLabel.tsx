import React from 'react';
import { Text, View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * The golf-brand section marker: a wide-tracked mono label prefixed with an
 * ember `//` slash. Presentational only — replaces the plain uppercase labels
 * so every screen shares one editorial voice (`// TRAJECTORY`, `// SIGNAL`, …).
 */
export default function SectionLabel({
  children,
  color,
  style,
}: {
  children: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <Text
        style={{
          fontFamily: t.mono,
          fontSize: 9.5,
          fontWeight: '700',
          letterSpacing: 2,
          color: t.red,
          marginRight: 5,
        }}
      >
        //
      </Text>
      <Text
        allowFontScaling
        style={{
          fontFamily: t.mono,
          fontSize: 9.5,
          fontWeight: '700',
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: color ?? t.textMuted,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
