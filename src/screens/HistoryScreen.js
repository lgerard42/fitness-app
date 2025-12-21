import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Trophy, Clock, Dumbbell } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { HISTORY_DATA } from '../constants/data';
import { useWorkout } from '../context/WorkoutContext';
import WorkoutDetailModal from '../components/WorkoutDetailModal';

const HistoryScreen = () => {
  const [view, setView] = useState('workouts');
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const { workoutHistory, updateHistory } = useWorkout();
  const displayHistory = [...(workoutHistory || []), ...HISTORY_DATA];

  const handleSaveWorkout = (updatedWorkout) => {
    updateHistory(updatedWorkout);
    setSelectedWorkout(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            onPress={() => setView('workouts')}
            style={[styles.segmentButton, view === 'workouts' ? styles.segmentActive : styles.segmentInactive]}
          >
            <Text style={[styles.segmentText, view === 'workouts' ? styles.segmentTextActive : styles.segmentTextInactive]}>
              Workouts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setView('stats')}
            style={[styles.segmentButton, view === 'stats' ? styles.segmentActive : styles.segmentInactive]}
          >
            <Text style={[styles.segmentText, view === 'stats' ? styles.segmentTextActive : styles.segmentTextInactive]}>
              Statistics
            </Text>
          </TouchableOpacity>
        </View>

        {view === 'workouts' ? (
          <ScrollView contentContainerStyle={styles.listContent}>
            {displayHistory.map((workout, idx) => (
              <TouchableOpacity 
                key={workout.id || idx} 
                style={styles.card}
                onPress={() => setSelectedWorkout(workout)}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{workout.name}</Text>
                    <Text style={styles.cardDate}>{workout.date || new Date().toLocaleDateString()}</Text>
                  </View>
                  {workout.best && (
                    <View style={styles.prBadge}>
                      <Trophy size={12} color={COLORS.amber[700]} />
                      <Text style={styles.prText}>PR</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardFooter}>
                  <View style={styles.statItem}>
                    <Clock size={14} color={COLORS.slate[600]} />
                    <Text style={styles.statText}>{workout.duration}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Dumbbell size={14} color={COLORS.slate[600]} />
                    <Text style={styles.statText}>
                      {workout.vol || (workout.exercises ? `${workout.exercises.length} Exercises` : "0kg")}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>Stats View (Placeholder)</Text>
          </View>
        )}
      </View>

      <WorkoutDetailModal
        visible={!!selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
        workout={selectedWorkout}
        onSave={handleSaveWorkout}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate[50],
  },
  content: {
    flex: 1,
    padding: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.slate[100],
    padding: 4,
    borderRadius: 12,
    marginBottom: 24,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentInactive: {
    backgroundColor: 'transparent',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  segmentTextActive: {
    color: COLORS.slate[900],
  },
  segmentTextInactive: {
    color: COLORS.slate[500],
  },
  listContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  cardDate: {
    fontSize: 14,
    color: COLORS.slate[500],
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.amber[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  prText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.amber[700],
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate[100],
    paddingTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: COLORS.slate[600],
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: COLORS.slate[400],
    fontSize: 14,
  },
});

export default HistoryScreen;
