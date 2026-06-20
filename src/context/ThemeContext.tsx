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

// VIAXE "Performance OS" palette — warm charcoal stage, bone ink, ember heartbeat.
// Charcoal #1E1F22 is sampled from the real //VIAXE logo; ink is the logo bone.
export const darkTokens: Tokens = {
  bg:              '#161719',
  bg2:             '#1A1B1E',
  bg3:             '#1E1F22',
  surface:         '#1E1F22',
  elevated:        '#26282B',
  text:            '#ECE8DD',
  textSec:         '#9B968C',
  textMuted:       '#6A665E',
  border:          '#2C2E31',
  glass:           'rgba(236,232,221,0.035)',
  glassEl:         'rgba(236,232,221,0.06)',
  glassBorder:     'rgba(236,232,221,0.10)',
  inputBg:         '#303236',
  red:             '#E8432D',
  redDim:          'rgba(232,67,45,0.12)',
  redBorder:       'rgba(232,67,45,0.30)',
  green:           '#54C99A',
  gold:            '#F2A33C',
  purple:          '#8B7CF6',
  statusBar:       'light',
  tabBar:          'rgba(22,23,25,0.97)',
  tabBorder:       '#2C2E31',
  tabIconInactive: '#6A665E',
  mono:            MONO,
  scheme:          'dark',
};

export const lightTokens: Tokens = {
  bg:              '#F4F3F0',
  bg2:             '#FFFFFF',
  bg3:             '#ECEAE4',
  surface:         '#FFFFFF',
  elevated:        '#ECEAE4',
  text:            '#1A1A1A',
  textSec:         '#5C574E',
  textMuted:       'rgba(0,0,0,0.40)',
  border:          'rgba(0,0,0,0.10)',
  glass:           'rgba(0,0,0,0.025)',
  glassEl:         'rgba(0,0,0,0.05)',
  glassBorder:     'rgba(0,0,0,0.10)',
  inputBg:         'rgba(0,0,0,0.05)',
  red:             '#C7381F',
  redDim:          'rgba(199,56,31,0.08)',
  redBorder:       'rgba(199,56,31,0.22)',
  green:           '#2E9E72',
  gold:            '#B5751F',
  purple:          '#5B4FD0',
  statusBar:       'dark',
  tabBar:          'rgba(244,243,240,0.97)',
  tabBorder:       'rgba(0,0,0,0.10)',
  tabIconInactive: 'rgba(0,0,0,0.30)',
  mono:            MONO,
  scheme:          'light',
};

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
