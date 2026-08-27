import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@viaxe_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export type Tokens = {
  // Backgrounds
  bg: string;
  bg2: string;
  bg3: string;
  // Surfaces
  surface: string;
  elevated: string;
  // Text
  text: string;
  textSec: string;
  textMuted: string;
  // Borders / glass
  border: string;
  glass: string;
  glassEl: string;
  glassBorder: string;
  // Inputs
  inputBg: string;
  // Accent
  red: string;
  redDim: string;
  redBorder: string;
  // Semantic
  green: string;
  gold: string;
  purple: string;
  // Nav
  statusBar: 'light' | 'dark';
  tabBar: string;
  tabBorder: string;
  tabIconInactive: string;
  // Typography
  mono: string;
  // Scheme name
  scheme: 'dark' | 'light';
};

// Monospace stack for all data numerals (telemetry feel). On the web build this
// resolves to SF Mono / JetBrains Mono; native falls back to its system mono.
const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace';

// VIAXE "grit" palette — asphalt ground, chalk ink, ember intensity, acid action.
// Source of truth is src/theme/grit.ts; these map the legacy token names onto it
// so every screen adopts the gritty base while screens are migrated one by one.
export const darkTokens: Tokens = {
  bg:              '#171714', // asphalt
  bg2:             '#131311',
  bg3:             '#0F0F0D',
  surface:         '#24231F', // iron
  elevated:        '#2E2C27',
  text:            '#E9E5DA', // chalk
  textSec:         '#AAA69D', // muted
  textMuted:       '#77736A', // concrete
  border:          'rgba(233,229,218,0.16)', // line
  glass:           'rgba(233,229,218,0.035)',
  glassEl:         'rgba(233,229,218,0.06)',
  glassBorder:     'rgba(233,229,218,0.14)',
  inputBg:         '#2A2925',
  red:             '#FF4B22', // ember (intensity / focal action)
  redDim:          'rgba(255,75,34,0.12)',
  redBorder:       'rgba(255,75,34,0.30)',
  green:           '#D7FF45', // acid (action / completion)
  gold:            '#FFB547', // warning
  purple:          '#8B7CF6',
  statusBar:       'light',
  tabBar:          'rgba(9,9,8,0.97)', // black
  tabBorder:       'rgba(233,229,218,0.18)',
  tabIconInactive: '#77736A',
  mono:            MONO,
  scheme:          'dark',
};

// The grit identity is a committed DARK brand — there is no light variant. The
// "light" token set therefore mirrors the grit dark palette, so every screen is
// black like Home regardless of the resolved OS/theme mode. (The Home screen
// hardcodes grit colours; keeping both token sets grit-dark prevents any screen
// from diverging into a pale ground.)
export const lightTokens: Tokens = { ...darkTokens };

type ThemeContextType = {
  t: Tokens;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  t: darkTokens,
  mode: 'dark',
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(stored => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    });
  }, []);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    await AsyncStorage.setItem(THEME_KEY, m);
  };

  const t = useMemo<Tokens>(() => {
    const resolved = mode === 'system' ? (systemScheme ?? 'dark') : mode;
    return resolved === 'light' ? lightTokens : darkTokens;
  }, [mode, systemScheme]);

  return (
    <ThemeContext.Provider value={{ t, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
