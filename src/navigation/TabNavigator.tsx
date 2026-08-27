import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { HomeIcon, ZapIcon, PieChartIcon, BarChartIcon, UserIcon } from '../components/Icons';
import HomeScreen from '../screens/HomeScreen';
import TrainScreen from '../screens/TrainScreen';
import NutritionScreen from '../screens/NutritionScreen';
import ProgressScreen from '../screens/ProgressScreen';
import CoachScreen from '../screens/CoachScreen';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home',      label: 'Today',    Icon: HomeIcon,     screen: HomeScreen },
  { name: 'Train',     label: 'Train',    Icon: ZapIcon,      screen: TrainScreen },
  { name: 'Nutrition', label: 'Fuel',     Icon: PieChartIcon, screen: NutritionScreen },
  { name: 'Progress',  label: 'Progress', Icon: BarChartIcon, screen: ProgressScreen },
  { name: 'Coach',     label: 'Coach',    Icon: UserIcon,     screen: CoachScreen },
] as const;

interface Props {
  onLogout: () => void;
}

export default function TabNavigator({ onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find(tb => tb.name === route.name)!;
        return {
          headerShown: false,
          // Native icon + label layout so labels never get clipped by a custom
          // icon slot. react-navigation tints both from these colours.
          tabBarActiveTintColor: t.red,
          tabBarInactiveTintColor: t.tabIconInactive,
          tabBarStyle: {
            backgroundColor: t.tabBar,
            borderTopColor: t.tabBorder,
            borderTopWidth: 1,
            // Taller bar + generous padding = bigger, easier tap targets, and
            // room for the label above the home indicator.
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 9,
            elevation: 0,
          },
          tabBarItemStyle: { paddingTop: 0 },
          tabBarLabel: tab.label,
          tabBarLabelStyle: {
            fontFamily: 'IBMPlexSans-Bold',
            fontSize: 11,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            marginTop: 3,
          },
          tabBarIcon: ({ color, focused }) => (
            <tab.Icon size={23} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        };
      }}
    >
      {TABS.map(tab => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.screen} />
      ))}
    </Tab.Navigator>
  );
}
