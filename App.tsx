import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Play, Calendar, Book, User, CircleDashed } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { WorkoutProvider } from '@/context/WorkoutContext';
import { UserSettingsProvider } from '@/context/UserSettingsContext';
import ActiveWorkoutBanner from '@/components/ActiveWorkoutBanner';
import type { Workout } from '@/types/workout';

import LogScreen from '@/screens/LogScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import LibraryScreen from '@/screens/LibraryScreen';
import LiveWorkoutScreen from '@/screens/LiveWorkoutScreen';
import EditWorkoutScreen from '@/screens/EditWorkoutScreen';
import ProfileIndex from '@/screens/ProfileTab/ProfileIndex';

export type RootStackParamList = {
  Main: undefined;
  LiveWorkout: undefined;
  EditWorkout: { workout: Workout };
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

// ProfileScreen placeholder removed — now using ProfileIndex

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
          component={ProfileIndex} 
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

const AppContent: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UserSettingsProvider>
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
        </UserSettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const App: React.FC = () => {
  // On web, wrap the app in a container that mimics iPhone 16 Pro Max dimensions
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.phoneFrame}>
          <AppContent />
        </View>
      </View>
    );
  }

  // On native (iPhone), render normally
  return <AppContent />;
};

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#1a1a1a', // Dark background to frame the phone
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  phoneFrame: {
    width: 430, // iPhone 16 Pro Max width
    height: 932, // iPhone 16 Pro Max height
    maxWidth: '100%',
    maxHeight: '100%',
    backgroundColor: '#000',
    borderRadius: 50,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
    overflow: 'hidden',
  },
});

export default App;
