import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
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
  { name: 'Home',      label: 'TODAY',    Icon: HomeIcon,     screen: HomeScreen },
  { name: 'Train',     label: 'TRAIN',    Icon: ZapIcon,      screen: TrainScreen },
  { name: 'Nutrition', label: 'FUEL',     Icon: PieChartIcon, screen: NutritionScreen },
  { name: 'Progress',  label: 'PROGRESS', Icon: BarChartIcon, screen: ProgressScreen },
  { name: 'Coach',     label: 'COACH',    Icon: UserIcon,     screen: CoachScreen },
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
            <View style={{ alignItems: 'center', justifyContent: 'center', gap: 3, width: '100%', paddingHorizontal: 2 }}>
              <tab.Icon size={19} color={color} strokeWidth={focused ? 2.5 : 1.8} />
              <Text
                numberOfLines={1}
                allowFontScaling={false}
                style={{ fontFamily: 'IBMPlexSans-Bold', fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase', color, includeFontPadding: false, textAlign: 'center' }}
              >
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
