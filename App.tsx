import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { useAppStore } from './src/store/useAppStore';
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

  useEffect(() => {
    AsyncStorage.getItem('@viaxe_token').then(tok => setAuth(tok ? 'in' : 'out'));
  }, []);

  const handleLogin = () => setAuth('in');

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['@viaxe_token', '@viaxe_username']);
    setAuth('out');
  };

  if (auth === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.red} size="large" />
      </View>
    );
  }

  if (auth === 'out') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AuthedApp onLogout={handleLogout} />;
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
