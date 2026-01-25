import React from 'react';
import WorkoutTemplate from '@/components/WorkoutTemplate';
import { useWorkout } from '@/context/WorkoutContext';

const LiveWorkoutScreen = ({ navigation }) => {
  const { 
    activeWorkout, 
    updateWorkout, 
    finishWorkout, 
    cancelWorkout, 
    exercisesLibrary, 
    addExerciseToLibrary, 
    updateExerciseInLibrary, 
    exerciseStats 
  } = useWorkout();

  const handleFinish = () => {
    finishWorkout();
    navigation.goBack();
  };

  const handleCancel = () => {
    cancelWorkout();
    navigation.goBack();
  };

  return (
    <WorkoutTemplate
      navigation={navigation}
      workout={activeWorkout}
      mode="live"
      onUpdate={updateWorkout}
      onFinish={handleFinish}
      onCancel={handleCancel}
      exercisesLibrary={exercisesLibrary}
      addExerciseToLibrary={addExerciseToLibrary}
      updateExerciseInLibrary={updateExerciseInLibrary}
      exerciseStats={exerciseStats}
      hideTimer={false}
    />
  );
};

export default LiveWorkoutScreen;
