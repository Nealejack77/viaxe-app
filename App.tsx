import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fontAssets } from './src/theme/grit';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppStoreProvider, useAppStore } from './src/store/useAppStore';
import { setSessionExpiredHandler } from './src/lib/session';
import { adoptSessionFromUrl } from './src/lib/handoff';
import TabNavigator from './src/navigation/TabNavigator';
import LoginScreen from './src/screens/LoginScreen';
import ProfileSettingsScreen from './src/screens/ProfileSettingsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import CheckInScreen from './src/screens/CheckInScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

export type RootStackParamList = {
  Tabs: undefined;
  Profile: undefined;
  Notifications: undefined;
  CheckIn: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

type AuthState = 'loading' | 'out' | 'in';

function AuthedApp({ onLogout }: { onLogout: () => void }) {
  const store = useAppStore();
  // Locally dismissed flag so finishing onboarding doesn't wait on a refetch
  const [onboardingDone, setOnboardingDone] = useState(false);

  // First login: walk through onboarding before anything else.
  // Demo mode and returning users (profile.onboarded) skip it.
  const needsOnboarding = !onboardingDone
    && store.clientId !== null            // real authenticated client
    && store.profile.onboarded !== true;

  if (needsOnboarding) {
    return <OnboardingScreen onDone={() => setOnboardingDone(true)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs">
          {() => <TabNavigator onLogout={onLogout} />}
        </Stack.Screen>
        <Stack.Screen name="Profile" options={{ presentation: 'modal' }}>
          {(props) => <ProfileSettingsScreen {...props} onLogout={onLogout} />}
        </Stack.Screen>
        <Stack.Screen name="Notifications" options={{ presentation: 'modal' }} component={NotificationsScreen} />
        <Stack.Screen name="CheckIn" options={{ presentation: 'modal' }} component={CheckInScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppInner() {
  const { t } = useTheme();
  const [auth, setAuth] = useState<AuthState>('loading');
  // Bundled brand fonts (Barlow Condensed + IBM Plex Sans). Gate render until
  // loaded so the grit type never flashes a system fallback.
  const [fontsLoaded] = useFonts(fontAssets);

  useEffect(() => {
    // Adopt a cross-origin `#session=` handoff (from the onboarding page on
    // www.viaxe.co.uk) before deciding auth, so a freshly-onboarded client
    // lands logged IN rather than back on Login. No-op on native / when absent.
    (async () => {
      await adoptSessionFromUrl();
      const tok = await AsyncStorage.getItem('@viaxe_token');
      setAuth(tok ? 'in' : 'out');
    })();
  }, []);

  // A rejected (expired/invalidated) session must not keep the app "logged in"
  // silently 401-ing every request. notifySessionExpired() clears the dead token
  // and this drops the user back to Login to re-authenticate.
  useEffect(() => {
    setSessionExpiredHandler(() => setAuth('out'));
    return () => setSessionExpiredHandler(null);
  }, []);

  const handleLogin = () => setAuth('in');

  const handleLogout = async () => {
    // Clear EVERY app-owned key, not just the token. Leaving @viaxe_v2 behind
    // kept the previous user's cached program/macros/profile in storage, which
    // the next mount of useAppStore would rehydrate. Theme pref is preserved.
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toClear = keys.filter(k => k.startsWith('@viaxe') && k !== '@viaxe_theme');
      const known = ['@viaxe_token', '@viaxe_username', '@viaxe_v2'];
      await AsyncStorage.multiRemove([...new Set([...toClear, ...known])]);
    } catch {
      await AsyncStorage.multiRemove(['@viaxe_token', '@viaxe_username', '@viaxe_v2']);
    }
    setAuth('out');
  };

  if (auth === 'loading' || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.red} size="large" />
      </View>
    );
  }

  if (auth === 'out') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <AppStoreProvider>
      <AuthedApp onLogout={handleLogout} />
    </AppStoreProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="auto" />
        <AppInner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
