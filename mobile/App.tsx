import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

enableScreens();
import { SettingsProvider } from './src/context/SettingsContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { SubscriptionsScreen } from './src/screens/SubscriptionsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme/colors';
import {
  HelpCircle,
  CheckSquare,
  Repeat,
  History,
  Settings,
} from 'lucide-react-native';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <NavigationContainer>
          <StatusBar style="dark" backgroundColor="#f8fafc" />
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: colors.primary,
              tabBarInactiveTintColor: colors.textSecondary,
              tabBarStyle: {
                backgroundColor: '#ffffff',
                borderTopColor: colors.cardBorder,
                borderTopWidth: 1,
                height: 60,
                paddingBottom: 8,
                paddingTop: 6,
              },
              tabBarLabelStyle: {
                fontSize: 10,
                fontWeight: '600',
              },
            }}
          >
            <Tab.Screen
              name="Home"
              component={HomeScreen}
              options={{
                tabBarLabel: 'Solve',
                tabBarIcon: ({ color, size }) => <HelpCircle color={color} size={size} />,
              }}
            />
            <Tab.Screen
              name="Tasks"
              component={TasksScreen}
              options={{
                tabBarLabel: 'Tasks',
                tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} />,
              }}
            />
            <Tab.Screen
              name="Subscriptions"
              component={SubscriptionsScreen}
              options={{
                tabBarLabel: 'Subs',
                tabBarIcon: ({ color, size }) => <Repeat color={color} size={size} />,
              }}
            />
            <Tab.Screen
              name="History"
              component={HistoryScreen}
              options={{
                tabBarLabel: 'History',
                tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
              }}
            />
            <Tab.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                tabBarLabel: 'Settings',
                tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
