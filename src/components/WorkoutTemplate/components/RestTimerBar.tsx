import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Timer } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { formatRestTime, updateExercisesDeep } from '@/utils/workoutHelpers';
import SwipeToDelete from '@/components/common/SwipeToDelete';
import type { Set, Workout, RestTimer, GroupSetType } from '@/types/workout';

interface RestTimerBarProps {
  set: Set;
  exerciseId: string;
  currentWorkout: Workout;
  handleWorkoutUpdate: (workout: Workout) => void;
  activeRestTimer: RestTimer | null;
  setActiveRestTimer: React.Dispatch<React.SetStateAction<RestTimer | null>>;
  setRestPeriodSetInfo: (info: { exerciseId: string; setId: string }) => void;
  setRestTimerInput: (input: string) => void;
  setRestPeriodModalOpen: (open: boolean) => void;
  setRestTimerPopupOpen: (open: boolean) => void;
  isRestTimerDropSetEnd: boolean;
  displayGroupSetType: GroupSetType;
  isBeingEdited: boolean;
  styles: any;
}

const RestTimerBar: React.FC<RestTimerBarProps> = ({
  set,
  exerciseId,
  currentWorkout,
  handleWorkoutUpdate,
  activeRestTimer,
  setActiveRestTimer,
  setRestPeriodSetInfo,
  setRestTimerInput,
  setRestPeriodModalOpen,
  setRestTimerPopupOpen,
  isRestTimerDropSetEnd,
  displayGroupSetType,
  isBeingEdited,
  styles
}) => {
  const isRestTimerActive = activeRestTimer?.setId === set.id;

  const handleDeleteRestTimer = useCallback(() => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (exercise) => {
        if (exercise.type === 'group') return exercise;
        return {
          ...exercise,
          sets: exercise.sets.map(s => {
            if (s.id === set.id) {
              const { restPeriodSeconds, restTimerCompleted, ...rest } = s;
              return rest;
            }
            return s;
          })
        };
      })
    });
    if (activeRestTimer?.setId === set.id) {
      setActiveRestTimer(null);
    }
  }, [handleWorkoutUpdate, currentWorkout, exerciseId, set.id, activeRestTimer, setActiveRestTimer]);

  return (
    <SwipeToDelete onDelete={handleDeleteRestTimer}>
      <View style={[
        styles.restTimerBar,
        set.completed && set.restTimerCompleted && styles.restTimerBar__completed,
        isBeingEdited && styles.restTimerBar__editing
      ]}>
        {set.dropSetId && (
          <View style={[
            styles.restTimerDropSetIndicator,
            isRestTimerDropSetEnd && styles.restTimerDropSetIndicator__end,
            displayGroupSetType === 'warmup' && styles.restTimerDropSetIndicator__warmup,
            displayGroupSetType === 'failure' && styles.restTimerDropSetIndicator__failure
          ]} />
        )}
        <View style={[
          styles.restTimerLine,
          set.restTimerCompleted && styles.restTimerLine__completed
        ]} />
        <TouchableOpacity
          style={[
            styles.restTimerBadge,
            isRestTimerActive && styles.restTimerBadge__active,
            set.restTimerCompleted && !isRestTimerActive && styles.restTimerBadge__completed,
            isBeingEdited && styles.restTimerBadge__editing
          ]}
          onPress={() => {
            if (isRestTimerActive) {
              setRestTimerPopupOpen(true);
            } else {
              setRestPeriodSetInfo({ exerciseId, setId: set.id });
              setRestTimerInput(String(set.restPeriodSeconds || ''));
              setRestPeriodModalOpen(true);
            }
          }}
        >
          {isRestTimerActive && activeRestTimer ? (
            <Text style={styles.restTimerText__activeLarge}>
              {formatRestTime(activeRestTimer.remainingSeconds)}
            </Text>
          ) : (
            <>
              <Timer size={12} color={
                isBeingEdited ? COLORS.white :
                  set.restTimerCompleted ? COLORS.green[600] : COLORS.slate[500]
              } />
              <Text style={[
                styles.restTimerText,
                set.restTimerCompleted && styles.restTimerText__completed,
                isBeingEdited && styles.restTimerText__editing
              ]}>
                {formatRestTime(set.restPeriodSeconds || 0)}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <View style={[
          styles.restTimerLine,
          set.restTimerCompleted && styles.restTimerLine__completed
        ]} />
      </View>
    </SwipeToDelete>
  );
};

export default RestTimerBar;
