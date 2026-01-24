import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Plus, Play } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useWorkout } from '../context/WorkoutContext';

const LogScreen = ({ navigation }) => {
  const { activeWorkout, startEmptyWorkout } = useWorkout();

  const handleStart = () => {
    startEmptyWorkout();
    navigation.navigate('LiveWorkout');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Workout Log</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Settings size={20} color={COLORS.red[600]} />
          </TouchableOpacity>
        </View>

        {activeWorkout ? (
          <View style={styles.activeWorkoutCard}>
            <View style={styles.activeHeader}>
              <Text style={styles.activeTitle}>Workout in Progress</Text>
              <View style={styles.liveBadge}>
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.activeSubtitle}>
              {activeWorkout.name} • {activeWorkout.exercises.length} Exercises
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('LiveWorkout')} style={styles.resumeButton}>
              <Text style={styles.resumeButtonText}>Resume Workout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.quickStartCard}>
            <View style={styles.quickStartHeader}>
              <View>
                <Text style={styles.quickStartTitle}>Quick Start</Text>
                <Text style={styles.quickStartSubtitle}>Start an empty workout without a template.</Text>
              </View>
              <View style={styles.plusIconContainer}>
                <Plus size={24} color={COLORS.white} />
              </View>
            </View>
            <TouchableOpacity onPress={handleStart} style={styles.startButton}>
              <Text style={styles.startButtonText}>Start Empty Workout</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.routinesSection}>
          <View style={styles.routinesHeader}>
            <Text style={styles.routinesTitle}>My Routines</Text>
            <TouchableOpacity>
              <Text style={styles.newRoutineText}>New +</Text>
            </TouchableOpacity>
          </View>

          {['Upper Power', 'Lower Hypertrophy', 'Full Body A'].map((routine, i) => (
            <TouchableOpacity key={i} style={styles.routineCard}>
              <View style={styles.routineInfo}>
                <View style={styles.routineIcon}>
                  <Text style={styles.routineInitial}>{routine.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.routineName}>{routine}</Text>
                  <Text style={styles.routineLast}>Last: 3 days ago</Text>
                </View>
              </View>
              <Play size={20} color={COLORS.slate[300]} fill={COLORS.slate[300]} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate[50],
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  settingsButton: {
    padding: 8,
    backgroundColor: COLORS.red[50],
    borderRadius: 999,
  },
  activeWorkoutCard: {
    backgroundColor: COLORS.blue[600],
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: COLORS.blue[200],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  liveBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  activeSubtitle: {
    fontSize: 14,
    color: COLORS.blue[100],
    marginBottom: 16,
  },
  resumeButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resumeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.blue[600],
  },
  quickStartCard: {
    backgroundColor: COLORS.red[600], // Gradient not supported natively without library, using solid color or I could use a View with overflow hidden and absolute positioned elements to simulate gradient if needed, but solid is fine for parity logic.
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  quickStartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  quickStartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  quickStartSubtitle: {
    fontSize: 14,
    color: COLORS.red[100],
  },
  plusIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 8,
  },
  startButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.red[600],
  },
  routinesSection: {
    marginTop: 8,
  },
  routinesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  routinesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[700],
  },
  newRoutineText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.red[500],
  },
  routineCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
  },
  routineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  routineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[500],
  },
  routineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  routineLast: {
    fontSize: 12,
    color: COLORS.slate[500],
  },
});

export default LogScreen;
