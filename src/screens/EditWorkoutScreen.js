import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { useWorkout } from '../context/WorkoutContext';
import WorkoutTemplate from '../components/WorkoutTemplate';
import WorkoutHeader from '../components/WorkoutTemplate/WorkoutHeader';

const EditWorkoutScreen = ({ navigation, route }) => {
  const { workout } = route.params;
  const { updateHistory, exercisesLibrary, addExerciseToLibrary, updateExerciseInLibrary, exerciseStats } = useWorkout();
  const [editedWorkout, setEditedWorkout] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (workout) {
      // Create a deep copy and ensure it has the required structure
      const workoutCopy = JSON.parse(JSON.stringify(workout));
      // If the workout doesn't have startedAt, calculate it from date and duration
      if (!workoutCopy.startedAt) {
        const workoutDate = new Date(workoutCopy.date || new Date());
        workoutCopy.startedAt = workoutDate.getTime();
      }
      setEditedWorkout(workoutCopy);
    }
  }, [workout]);

  const handleUpdate = () => {
    if (!editedWorkout) return;
    
    if (!isEditing) {
      // Enter edit mode
      setIsEditing(true);
      return;
    }

    // Save changes
    // Calculate endedAt based on startedAt and duration
    if (editedWorkout.duration) {
      // Parse duration string (e.g., "1h 23m" or "45m")
      const durationMatch = editedWorkout.duration.match(/(?:(\d+)h\s*)?(?:(\d+)m)?/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1] || '0');
        const minutes = parseInt(durationMatch[2] || '0');
        const durationMs = (hours * 60 + minutes) * 60 * 1000;
        editedWorkout.endedAt = editedWorkout.startedAt + durationMs;
      }
    }
    
    updateHistory(editedWorkout);
    setIsEditing(false);
    navigation.goBack();
  };

  // Custom header component
  const CustomHeader = editedWorkout ? (
    <WorkoutHeader
      workout={editedWorkout}
      mode="edit"
      elapsed={0}
      onUpdate={isEditing ? setEditedWorkout : () => {}}
      onBack={() => navigation.goBack()}
      onFinish={handleUpdate}
      onCancel={() => {
        if (isEditing) {
          setIsEditing(false);
        } else {
          navigation.goBack();
        }
      }}
    />
  ) : null;

  // Custom finish button
  const CustomFinishButton = isEditing && editedWorkout ? (
    <TouchableOpacity
      onPress={handleUpdate}
      style={styles.bottomUpdateButton}
    >
      <Text style={styles.bottomUpdateButtonText}>UPDATE WORKOUT</Text>
    </TouchableOpacity>
  ) : null;

  if (!editedWorkout) return null;

  return (
    <WorkoutTemplate
      navigation={navigation}
      workout={editedWorkout}
      mode={isEditing ? 'edit' : 'readonly'}
      onUpdate={isEditing ? setEditedWorkout : () => {}}
      onFinish={null}
      onCancel={null}
      exercisesLibrary={exercisesLibrary}
      addExerciseToLibrary={addExerciseToLibrary}
      updateExerciseInLibrary={updateExerciseInLibrary}
      exerciseStats={exerciseStats}
      customHeader={CustomHeader}
      customFinishButton={CustomFinishButton}
      hideTimer={true}
    />
  );
};

const styles = StyleSheet.create({
  bottomUpdateButton: {
    backgroundColor: COLORS.blue[600],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  bottomUpdateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default EditWorkoutScreen;
