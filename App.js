import React from 'react';
import { View } from 'react-native';
// #region agent log
import { NavigationContainer } from '@react-navigation/native';
fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.js:3',message:'App.js imports starting',data:{step:'navigation'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.js:7',message:'GestureHandlerRootView import complete',data:{step:'gesture-handler'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion
import { Play, Calendar, Book, User, CircleDashed } from 'lucide-react-native';
import { COLORS } from './src/constants/colors';
import { WorkoutProvider } from './src/context/WorkoutContext';
import ActiveWorkoutBanner from './src/components/ActiveWorkoutBanner';

import LogScreen from './src/screens/LogScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import LiveWorkoutScreen from './src/screens/LiveWorkoutScreen';
import EditWorkoutScreen from './src/screens/EditWorkoutScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ProfileScreen = () => (
  <SafeAreaProvider style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.slate[50] }}>
    <User size={48} color={COLORS.slate[300]} />
  </SafeAreaProvider>
);

const ComingSoonScreen = () => (
  <SafeAreaProvider style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.slate[50] }}>
    <CircleDashed size={48} color={COLORS.slate[300]} />
  </SafeAreaProvider>
);

const MainTabs = () => {
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

export default function App() {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.js:102',message:'App component rendering',data:{step:'app-render'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
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
}
