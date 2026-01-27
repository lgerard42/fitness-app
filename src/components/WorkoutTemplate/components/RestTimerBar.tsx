import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Timer, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { formatRestTime, updateExercisesDeep } from '@/utils/workoutHelpers';
import type { Set, Workout, RestTimer, GroupSetType } from '@/types/workout';
import type { Animated } from 'react-native';

interface RestTimerDeleteActionProps {
  progress: Animated.AnimatedInterpolation<number>;
  dragX: Animated.AnimatedInterpolation<number>;
  onDelete: () => void;
}

const RestTimerDeleteAction: React.FC<RestTimerDeleteActionProps> = ({ progress, dragX, onDelete }) => {
  const hasDeleted = React.useRef(false);
  const onDeleteRef = React.useRef(onDelete);
  
  React.useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  React.useEffect(() => {
    hasDeleted.current = false;
    
    const id = dragX.addListener(({ value }) => {
      if (value < -120 && !hasDeleted.current) {
        hasDeleted.current = true;
        if (onDeleteRef.current) {
          onDeleteRef.current();
        }
      }
    });
    return () => dragX.removeListener(id);
  }, [dragX]);

  return (
    <TouchableOpacity
      style={{
        backgroundColor: COLORS.red[500],
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        height: '100%',
      }}
      onPress={onDelete}
    >
      <Trash2 size={20} color={COLORS.white} />
    </TouchableOpacity>
  );
};

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

  const handleDeleteRestTimer = () => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map(s => {
          if (s.id === set.id) {
            const { restPeriodSeconds, restTimerCompleted, ...rest } = s;
            return rest;
          }
          return s;
        })
      }))
    });
    if (activeRestTimer?.setId === set.id) {
      setActiveRestTimer(null);
    }
  };

  return (
    <Swipeable
      renderRightActions={(progress, dragX) => (
        <RestTimerDeleteAction 
          progress={progress} 
          dragX={dragX} 
          onDelete={handleDeleteRestTimer} 
        />
      )}
      onSwipeableWillOpen={(direction) => {
        if (direction === 'right') {
          handleDeleteRestTimer();
        }
      }}
      overshootRight={false}
      friction={2}
      rightThreshold={120}
    >
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
    </Swipeable>
  );
};

export default RestTimerBar;
