import React from 'react';
import type { NavigationProp } from '@react-navigation/native';
import WorkoutTemplate from '@/components/WorkoutTemplate/indexWorkoutTemplate';
import { useWorkout } from '@/context/WorkoutContext';
import { useBodyStats } from '@/screens/ProfileTab/hooks/useBodyStats';

interface LiveWorkoutScreenProps {
  navigation: NavigationProp<any>;
}

const LiveWorkoutScreen: React.FC<LiveWorkoutScreenProps> = ({ navigation }) => {
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
  const { latestMeasurement } = useBodyStats();
  const bodyWeight = latestMeasurement?.weight;

  const handleFinish = () => {
    finishWorkout(bodyWeight);
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
