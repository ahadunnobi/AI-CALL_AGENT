/**
 * App.tsx — Root of the PAICA mobile app with tab navigation.
 */
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

import Dashboard from './src/screens/Dashboard';
import ModelManager from './src/screens/ModelManager';
import Settings from './src/screens/Settings';
import { THEME } from './src/constants/theme';

const Tab = createBottomTabNavigator();

const AppTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: THEME.colors.primary,
    background: THEME.colors.bg,
    card: THEME.colors.bgCard,
    text: THEME.colors.text,
    border: THEME.colors.border,
    notification: THEME.colors.accent,
  },
};

// Simple text-based tab icons (no external icon lib needed)
const TabIcon: React.FC<{ label: string; focused: boolean }> = ({ label, focused }) => (
  <Text
    style={{
      fontSize: 20,
      color: focused ? THEME.colors.primary : THEME.colors.textMuted,
    }}
  >
    {label}
  </Text>
);

export default function App() {
  return (
    <NavigationContainer theme={AppTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: THEME.colors.primary,
          tabBarInactiveTintColor: THEME.colors.textMuted,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={Dashboard}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon label="🏠" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Models"
          component={ModelManager}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon label="🧠" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={Settings}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon label="⚙️" focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: THEME.colors.bgCard,
    borderTopColor: THEME.colors.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
