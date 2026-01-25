import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Timer, Trash2 } from 'lucide-react-native';
import { COLORS } from '../../../constants/colors';
import { formatRestTime, updateExercisesDeep } from '../../../utils/workoutHelpers';

// Swipe-to-delete action component for rest timers
const RestTimerDeleteAction = ({ progress, dragX, onDelete, onSwipeComplete }) => {
  const hasDeleted = React.useRef(false);
  const onDeleteRef = React.useRef(onDelete);
  
  React.useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  React.useEffect(() => {
    // Reset hasDeleted when component mounts (new swipe gesture)
    hasDeleted.current = false;
    
    const id = dragX.addListener(({ value }) => {
      // Trigger delete when swiped past ~120px (value is negative when swiping left)
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

const RestTimerBar = ({
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
  styles,
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
    // Also cancel any active timer for this set
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
        // If fully opened to the right (swiped left), trigger delete
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
        set.completed && set.restTimerCompleted && styles.restTimerBar__completed
      ]}>
        {/* Dropset indicator for rest timer */}
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
            set.restTimerCompleted && !isRestTimerActive && styles.restTimerBadge__completed
          ]}
          onPress={() => {
            if (isRestTimerActive) {
              // Open the timer control popup
              setRestTimerPopupOpen(true);
            } else {
              // Open the duration picker to edit the timer
              setRestPeriodSetInfo({ exerciseId, setId: set.id });
              setRestTimerInput(String(set.restPeriodSeconds));
              setRestPeriodModalOpen(true);
            }
          }}
        >
          {isRestTimerActive ? (
            <Text style={styles.restTimerText__activeLarge}>
              {formatRestTime(activeRestTimer.remainingSeconds)}
            </Text>
          ) : (
            <>
              <Timer size={12} color={set.restTimerCompleted ? COLORS.green[600] : COLORS.slate[500]} />
              <Text style={[
                styles.restTimerText,
                set.restTimerCompleted && styles.restTimerText__completed
              ]}>
                {formatRestTime(set.restPeriodSeconds)}
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
