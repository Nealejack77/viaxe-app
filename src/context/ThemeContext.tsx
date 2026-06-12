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
  // Scheme name
  scheme: 'dark' | 'light';
};

export const darkTokens: Tokens = {
  bg:              '#080808',
  bg2:             '#0D0D0D',
  bg3:             '#121212',
  surface:         '#0D0D0D',
  elevated:        '#141414',
  text:            '#FFFFFF',
  textSec:         'rgba(255,255,255,0.5)',
  textMuted:       'rgba(255,255,255,0.3)',
  border:          'rgba(255,255,255,0.08)',
  glass:           'rgba(255,255,255,0.05)',
  glassEl:         'rgba(255,255,255,0.08)',
  glassBorder:     'rgba(255,255,255,0.09)',
  inputBg:         'rgba(255,255,255,0.07)',
  red:             '#E8432D',
  redDim:          'rgba(232,67,45,0.12)',
  redBorder:       'rgba(232,67,45,0.28)',
  green:           '#34C759',
  gold:            '#FFD60A',
  purple:          '#667EEA',
  statusBar:       'light',
  tabBar:          'rgba(10,10,10,0.97)',
  tabBorder:       'rgba(255,255,255,0.06)',
  tabIconInactive: 'rgba(255,255,255,0.3)',
  scheme:          'dark',
};

export const lightTokens: Tokens = {
  bg:              '#F7F7F8',
  bg2:             '#FFFFFF',
  bg3:             '#F1F1F3',
  surface:         '#FFFFFF',
  elevated:        '#F1F1F3',
  text:            '#111111',
  textSec:         '#5F6368',
  textMuted:       'rgba(0,0,0,0.35)',
  border:          'rgba(0,0,0,0.08)',
  glass:           'rgba(0,0,0,0.03)',
  glassEl:         'rgba(0,0,0,0.05)',
  glassBorder:     'rgba(0,0,0,0.09)',
  inputBg:         'rgba(0,0,0,0.05)',
  red:             '#E8432D',
  redDim:          'rgba(232,67,45,0.08)',
  redBorder:       'rgba(232,67,45,0.22)',
  green:           '#22A84A',
  gold:            '#C07A00',
  purple:          '#5B5FD9',
  statusBar:       'dark',
  tabBar:          'rgba(252,252,253,0.97)',
  tabBorder:       'rgba(0,0,0,0.09)',
  tabIconInactive: 'rgba(0,0,0,0.28)',
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
