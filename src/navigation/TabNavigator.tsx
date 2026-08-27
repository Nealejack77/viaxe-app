import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { HomeIcon, ZapIcon, PieChartIcon, BarChartIcon, UserIcon, CpuIcon } from '../components/Icons';
import HomeScreen from '../screens/HomeScreen';
import TrainScreen from '../screens/TrainScreen';
import NutritionScreen from '../screens/NutritionScreen';
import ProgressScreen from '../screens/ProgressScreen';
import CoachScreen from '../screens/CoachScreen';
import ARIAScreen from '../screens/ARIAScreen';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home',      label: 'TODAY', Icon: HomeIcon,     screen: HomeScreen },
  { name: 'Train',     label: 'TRAIN', Icon: ZapIcon,      screen: TrainScreen },
  { name: 'Nutrition', label: 'FUEL',  Icon: PieChartIcon, screen: NutritionScreen },
  { name: 'Progress',  label: 'PROGRESS', Icon: BarChartIcon, screen: ProgressScreen },
  { name: 'Coach',     label: 'COACH', Icon: UserIcon,     screen: CoachScreen },
  { name: 'ARIA',      label: 'ARIA',  Icon: CpuIcon,      screen: ARIAScreen },
] as const;

interface Props {
  onLogout: () => void;
}

export default function TabNavigator({ onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: t.tabBar,
          borderTopColor: t.tabBorder,
          borderTopWidth: 1,
          height: 52 + insets.bottom,
          paddingBottom: insets.bottom,
          elevation: 0,
        },
        tabBarIcon: ({ focused }) => {
          const tab = TABS.find(tb => tb.name === route.name)!;
          const color = focused ? t.red : t.tabIconInactive;
          return (
            <View style={{ alignItems: 'center', gap: 2 }}>
              <tab.Icon size={19} color={color} strokeWidth={focused ? 2.5 : 1.8} />
              <Text style={{ fontFamily: 'IBMPlexSans-Bold', fontSize: 9, letterSpacing: 0.7, textTransform: 'uppercase', color }}>
                {tab.label}
              </Text>
            </View>
          );
        },
      })}
    >
      {TABS.map(tab => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.screen} />
      ))}
    </Tab.Navigator>
  );
}
