import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { formatRestTime, updateExercisesDeep } from '@/utils/workoutHelpers';
import type { Workout, RestTimer } from '@/types/workout';

interface ActiveRestTimerPopupProps {
  visible: boolean;
  activeRestTimer: RestTimer | null;
  onClose: () => void;
  setActiveRestTimer: React.Dispatch<React.SetStateAction<RestTimer | null>>;
  currentWorkout: Workout;
  handleWorkoutUpdate: (workout: Workout) => void;
  styles: any;
}

const ActiveRestTimerPopup: React.FC<ActiveRestTimerPopupProps> = ({
  visible,
  activeRestTimer,
  onClose,
  setActiveRestTimer,
  currentWorkout,
  handleWorkoutUpdate,
  styles,
}) => {
  const handleTogglePause = () => {
    setActiveRestTimer(prev => prev ? { ...prev, isPaused: !prev.isPaused } : null);
  };

  const handleAdjustTime = (seconds: number, isAdd: boolean) => {
    if (!activeRestTimer) return;
    
    if (isAdd) {
      setActiveRestTimer({
        ...activeRestTimer,
        remainingSeconds: activeRestTimer.remainingSeconds + seconds,
        totalSeconds: activeRestTimer.totalSeconds + seconds
      });
    } else {
      const newRemaining = Math.max(1, activeRestTimer.remainingSeconds - seconds);
      setActiveRestTimer({
        ...activeRestTimer,
        remainingSeconds: newRemaining
      });
    }
  };

  const handleComplete = () => {
    if (activeRestTimer) {
      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, activeRestTimer.exerciseId, (ex) => ({
          ...ex,
          sets: ex.sets.map(s => s.id === activeRestTimer.setId ? { ...s, restTimerCompleted: true } : s)
        }))
      });
    }
    setActiveRestTimer(null);
    onClose();
  };

  return (
    <Modal 
      visible={visible && activeRestTimer !== null} 
      transparent 
      animationType="fade" 
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.timerPopupOverlay} 
        onPress={onClose}
      >
        <Pressable style={styles.timerPopupContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.timerCircleContainer}>
            <View style={styles.timerCircleBg} />
            <View style={[
              styles.timerCircleProgress,
              {
                opacity: activeRestTimer ? (activeRestTimer.remainingSeconds / activeRestTimer.totalSeconds) : 0
              }
            ]} />
            <View style={styles.timerCircleTextContainer}>
              <Text style={styles.timerCircleText}>
                {activeRestTimer ? formatRestTime(activeRestTimer.remainingSeconds) : '0:00'}
              </Text>
              <Text style={styles.timerCircleSubtext}>
                {activeRestTimer?.isPaused ? 'PAUSED' : 'remaining'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.timerPopupMainButton,
              activeRestTimer?.isPaused && styles.timerPopupMainButton__paused
            ]}
            onPress={handleTogglePause}
          >
            {activeRestTimer?.isPaused ? (
              <>
                <Play size={20} color={COLORS.white} />
                <Text style={styles.timerPopupMainButtonText}>Resume</Text>
              </>
            ) : (
              <>
                <Pause size={20} color={COLORS.white} />
                <Text style={styles.timerPopupMainButtonText}>Pause</Text>
              </>
            )}
          </TouchableOpacity>
          
          <View style={styles.timerAdjustContainer}>
            {[5, 10, 15, 30].map(seconds => (
              <View key={seconds} style={styles.timerAdjustColumn}>
                <TouchableOpacity 
                  style={styles.timerAdjustButton}
                  onPress={() => handleAdjustTime(seconds, true)}
                >
                  <Text style={styles.timerAdjustButtonText}>+{seconds}s</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.timerAdjustButton}
                  onPress={() => handleAdjustTime(seconds, false)}
                >
                  <Text style={styles.timerAdjustButtonText}>-{seconds}s</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          
          <View style={styles.timerPopupBottomButtons}>
            <TouchableOpacity 
              style={styles.timerPopupCloseButton}
              onPress={onClose}
            >
              <Text style={styles.timerPopupCloseButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.timerPopupCompleteButton}
              onPress={handleComplete}
            >
              <Text style={styles.timerPopupCompleteButtonText}>Completed</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ActiveRestTimerPopup;
