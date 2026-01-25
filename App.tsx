import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Play, Calendar, Book, User, CircleDashed } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { WorkoutProvider } from '@/context/WorkoutContext';
import ActiveWorkoutBanner from '@/components/ActiveWorkoutBanner';

import LogScreen from '@/screens/LogScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import LibraryScreen from '@/screens/LibraryScreen';
import LiveWorkoutScreen from '@/screens/LiveWorkoutScreen';
import EditWorkoutScreen from '@/screens/EditWorkoutScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ProfileScreen: React.FC = () => (
  <SafeAreaProvider style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.slate[50] }}>
    <User size={48} color={COLORS.slate[300]} />
  </SafeAreaProvider>
);

const ComingSoonScreen: React.FC = () => (
  <SafeAreaProvider style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.slate[50] }}>
    <CircleDashed size={48} color={COLORS.slate[300]} />
  </SafeAreaProvider>
);

const MainTabs: React.FC = () => {
  return (
    <View style={{ flex: 1 }}>
      <ActiveWorkoutBanner />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.white,
            borderTopColor: COLORS.slate[200],
            paddingTop: 8,
            paddingBottom: 30,
            height: 85,
          },
          tabBarActiveTintColor: COLORS.blue[600],
          tabBarInactiveTintColor: COLORS.slate[400],
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: 'bold',
            marginTop: 4,
          },
        }}
      >
        <Tab.Screen 
          name="History" 
          component={HistoryScreen} 
          options={{
            tabBarLabel: 'Dash',
            tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
          }}
        />
        <Tab.Screen 
          name="Library" 
          component={LibraryScreen} 
          options={{
            tabBarLabel: 'Library',
            tabBarIcon: ({ color, size }) => <Book size={size} color={color} />,
          }}
        />
        <Tab.Screen 
          name="Log" 
          component={LogScreen} 
          options={{
            tabBarLabel: 'Workout',
            tabBarIcon: ({ color, size }) => <Play size={size} color={color} fill={color === COLORS.blue[600] ? color : 'transparent'} />,
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
        <Tab.Screen 
          name="More" 
          component={ComingSoonScreen} 
          options={{
            tabBarLabel: 'More',
            tabBarIcon: ({ color, size }) => <CircleDashed size={size} color={color} />,
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <WorkoutProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen 
                name="LiveWorkout" 
                component={LiveWorkoutScreen} 
                options={{ 
                  presentation: 'fullScreenModal',
                  gestureEnabled: false,
                }} 
              />
              <Stack.Screen 
                name="EditWorkout" 
                component={EditWorkoutScreen} 
                options={{ 
                  presentation: 'fullScreenModal',
                  gestureEnabled: false,
                }} 
              />
            </Stack.Navigator>
          </NavigationContainer>
        </WorkoutProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
