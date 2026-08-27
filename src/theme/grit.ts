// VIAXE — "grit" design system (approved rebrand: gritty, motivational, action-first).
// Single source of truth for the new identity. Fonts are bundled + self-hosted
// (no runtime Google). Barlow Condensed = display/numbers/wordmark; IBM Plex Sans
// = interface/body. Acid = action & completion; Ember = intensity & focal action.

import { TextStyle } from 'react-native';

export const colors = {
  black: '#090908',
  asphalt: '#171714',
  iron: '#24231F',
  raised: '#2D2C27',
  concrete: '#77736A',
  muted: '#AAA69D',
  chalk: '#E9E5DA',
  white: '#F6F3EA',

  acid: '#D7FF45',
  ember: '#FF4B22',

  success: '#D7FF45',
  warning: '#FFB547',
  danger: '#FF4B22',

  line: 'rgba(233, 229, 218, 0.16)',
  lineStrong: 'rgba(233, 229, 218, 0.34)',
  overlay: 'rgba(9, 9, 8, 0.82)',
} as const;

// Font family names must match the keys loaded by useFonts() in App.tsx.
export const fonts = {
  condBold: 'BarlowCondensed-Bold',
  condExtra: 'BarlowCondensed-ExtraBold',
  condBlack: 'BarlowCondensed-Black',
  sans: 'IBMPlexSans-Regular',
  sansMed: 'IBMPlexSans-Medium',
  sansSemi: 'IBMPlexSans-SemiBold',
  sansBold: 'IBMPlexSans-Bold',
} as const;

// require() map consumed by useFonts. Paths relative to this file.
export const fontAssets = {
  'BarlowCondensed-Bold': require('../../assets/fonts/BarlowCondensed-Bold.ttf'),
  'BarlowCondensed-ExtraBold': require('../../assets/fonts/BarlowCondensed-ExtraBold.ttf'),
  'BarlowCondensed-Black': require('../../assets/fonts/BarlowCondensed-Black.ttf'),
  'IBMPlexSans-Regular': require('../../assets/fonts/IBMPlexSans-Regular.ttf'),
  'IBMPlexSans-Medium': require('../../assets/fonts/IBMPlexSans-Medium.ttf'),
  'IBMPlexSans-SemiBold': require('../../assets/fonts/IBMPlexSans-SemiBold.ttf'),
  'IBMPlexSans-Bold': require('../../assets/fonts/IBMPlexSans-Bold.ttf'),
};

export const type = {
  displayXL:   { fontFamily: fonts.condBlack, fontSize: 64, lineHeight: 54, letterSpacing: -1 },
  display:     { fontFamily: fonts.condBlack, fontSize: 50, lineHeight: 43, letterSpacing: -0.6 },
  displaySmall:{ fontFamily: fonts.condExtra, fontSize: 36, lineHeight: 34, letterSpacing: -0.3 },
  metric:      { fontFamily: fonts.condBlack, fontSize: 40, lineHeight: 40 },
  title:       { fontFamily: fonts.sansBold,  fontSize: 20, lineHeight: 25, letterSpacing: -0.3 },
  body:        { fontFamily: fonts.sans,      fontSize: 14, lineHeight: 21 },
  bodyStrong:  { fontFamily: fonts.sansSemi,  fontSize: 14, lineHeight: 21 },
  label:       { fontFamily: fonts.sansBold,  fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' },
  navigation:  { fontFamily: fonts.sansBold,  fontSize: 10, lineHeight: 12, letterSpacing: 0.7, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;

export const radii = { sharp: 2, control: 3, card: 4, surface: 6, sheet: 12, round: 999 } as const;

export const borders = {
  hairline: { borderWidth: 1, borderColor: colors.line },
  strong: { borderWidth: 1, borderColor: colors.lineStrong },
} as const;

export const sheetShadow = {
  shadowColor: '#000000', shadowOpacity: 0.32, shadowRadius: 24,
  shadowOffset: { width: 0, height: 12 }, elevation: 12,
} as const;

// Motion durations (mechanical, decisive — press, impact, result).
export const motion = {
  pressScale: 0.98,
  entrance: 220,
  stagger: 50,
  countUp: 600,
  flash: 150,
} as const;
