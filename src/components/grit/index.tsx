import React from 'react';
import { StyleSheet, Text, TextProps, View, ViewProps, TextStyle } from 'react-native';
import { colors, type as T, radii, spacing } from '../../theme/grit';
import PressableScale from '../motion/PressableScale';

type GritTextVariant = keyof typeof T;

/** Typed text with the grit type scale. Chalk by default. */
export function GritText({ variant = 'body', style, ...props }: TextProps & { variant?: GritTextVariant }) {
  return <Text {...props} style={[styles.textBase, T[variant] as TextStyle, style]} />;
}

/** Flat surface. Iron by default; acid/ember for focal/action surfaces. */
export function GritCard({ accent, style, children, ...props }: ViewProps & { accent?: 'acid' | 'ember' }) {
  return (
    <View {...props} style={[styles.card, accent === 'acid' && styles.cardAcid, accent === 'ember' && styles.cardEmber, style]}>
      {children}
    </View>
  );
}

/** Primary action. Acid fill, ink label, spring + haptic. */
export function GritButton({
  label, onPress, disabled, tone = 'acid', haptic = 'medium', style,
}: {
  label: string; onPress: () => void; disabled?: boolean;
  tone?: 'acid' | 'ember' | 'dark'; haptic?: 'light' | 'medium' | 'heavy';
  style?: any;
}) {
  const bg = tone === 'ember' ? colors.ember : tone === 'dark' ? colors.iron : colors.acid;
  const fg = tone === 'dark' ? colors.chalk : colors.asphalt;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic={haptic}
      scaleTo={0.98}
      accessibilityLabel={label}
      style={[styles.button, { backgroundColor: bg }, disabled && styles.buttonDisabled, style]}
    >
      <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
    </PressableScale>
  );
}

/** VIAXE wordmark — Barlow Condensed Black, uppercase, tightened. No slash. */
export function Wordmark({ size = 22, color = colors.chalk }: { size?: number; color?: string }) {
  return (
    <Text
      accessibilityRole="header"
      accessibilityLabel="VIAXE"
      style={{ fontFamily: 'BarlowCondensed-Black', fontSize: size, lineHeight: size, letterSpacing: size * 0.02, color, textTransform: 'uppercase' }}
    >
      VIAXE
    </Text>
  );
}

/** The // motif — utility only (dividers, loaders, campaign), not the logo. */
export function Slashes({ size = 14, color = colors.ember }: { size?: number; color?: string }) {
  return <Text style={{ fontFamily: 'BarlowCondensed-Black', fontSize: size, color, letterSpacing: -1 }}>//</Text>;
}

const styles = StyleSheet.create({
  textBase: { color: colors.chalk },
  card: { padding: 18, borderRadius: radii.card, backgroundColor: colors.iron },
  cardAcid: { backgroundColor: colors.acid },
  cardEmber: { backgroundColor: colors.ember },
  button: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radii.control, paddingHorizontal: spacing[5], flexDirection: 'row' },
  buttonDisabled: { opacity: 0.35 },
  buttonLabel: { fontFamily: 'IBMPlexSans-Bold', fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' },
});
