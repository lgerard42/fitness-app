import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useWorkout } from '@/context/WorkoutContext';
import { formatDuration } from '@/constants/data';

const ActiveWorkoutBanner: React.FC = () => {
  const { activeWorkout } = useWorkout();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeWorkout) return;
    
    const updateElapsed = () => {
      setElapsed(Math.floor((Date.now() - activeWorkout.startedAt) / 1000));
    };
    
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [activeWorkout]);

  if (!activeWorkout) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.label}>Workout in Progress</Text>
          <View style={styles.timer}>
            <Clock size={12} color={COLORS.blue[100]} />
            <Text style={styles.timerText}>{formatDuration(elapsed)}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('LiveWorkout' as never)}
        >
          <Text style={styles.buttonText}>Resume</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.blue[600],
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    gap: 4,
  },
  label: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    color: COLORS.blue[100],
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: {
    color: COLORS.blue[600],
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default ActiveWorkoutBanner;
