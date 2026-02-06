import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { PADDING, BORDER_RADIUS, SPACING } from '@/constants/layout';
import { formatRestTime, updateExercisesDeep } from '@/utils/workoutHelpers';
import type { Workout, RestTimer, Set } from '@/types/workout';

interface ActiveRestTimerPopupProps {
  visible: boolean;
  activeRestTimer: RestTimer | null;
  onClose: () => void;
  setActiveRestTimer: React.Dispatch<React.SetStateAction<RestTimer | null>>;
  currentWorkout: Workout;
  handleWorkoutUpdate: (workout: Workout) => void;
}

const ActiveRestTimerPopup: React.FC<ActiveRestTimerPopupProps> = ({
  visible,
  activeRestTimer,
  onClose,
  setActiveRestTimer,
  currentWorkout,
  handleWorkoutUpdate,
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
        exercises: updateExercisesDeep(currentWorkout.exercises, activeRestTimer.exerciseId, (ex) => {
          if (ex.type === 'group') return ex;
          return {
            ...ex,
            sets: ex.sets.map((s: Set) => s.id === activeRestTimer.setId ? { ...s, restTimerCompleted: true } : s)
          };
        })
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

const styles = StyleSheet.create({
  timerPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerPopupContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: PADDING.xxl,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
  },
  timerCircleContainer: {
    width: 180,
    height: 180,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: PADDING.xxl,
  },
  timerCircleBg: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: COLORS.slate[200],
  },
  timerCircleProgress: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: COLORS.blue[500],
  },
  timerCircleTextContainer: {
    alignItems: 'center',
  },
  timerCircleText: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.slate[800],
  },
  timerCircleSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.slate[400],
    marginTop: PADDING.xs,
  },
  timerPopupMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.blue[500],
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
    marginBottom: PADDING.xl,
  },
  timerPopupMainButton__paused: {
    backgroundColor: COLORS.green[500],
  },
  timerPopupMainButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  timerAdjustContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: PADDING.lg,
  },
  timerAdjustColumn: {
    gap: SPACING.xs,
  },
  timerAdjustButton: {
    backgroundColor: COLORS.slate[100],
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    alignItems: 'center',
    minWidth: 60,
  },
  timerAdjustButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate[600],
  },
  timerPopupBottomButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: PADDING.lg,
    marginTop: PADDING.sm,
  },
  timerPopupCloseButton: {
    paddingVertical: PADDING.base,
    paddingHorizontal: PADDING.xxl,
    backgroundColor: COLORS.slate[100],
    borderRadius: BORDER_RADIUS.lg,
  },
  timerPopupCloseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate[600],
  },
  timerPopupCompleteButton: {
    paddingVertical: PADDING.base,
    paddingHorizontal: PADDING.xxl,
    backgroundColor: COLORS.green[500],
    borderRadius: BORDER_RADIUS.lg,
  },
  timerPopupCompleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default ActiveRestTimerPopup;
