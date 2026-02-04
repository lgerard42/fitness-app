import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, X } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { formatRestTime, parseRestTimeInput, updateExercisesDeep, findExerciseDeep } from '@/utils/workoutHelpers';
import type { Workout, RestTimer, RestPeriodSetInfo, Set, ExerciseItem } from '@/types/workout';

interface RestTimerInputModalProps {
  visible: boolean;
  onClose: () => void;
  restTimerInput: string;
  setRestTimerInput: React.Dispatch<React.SetStateAction<string>>;
  restPeriodSetInfo: RestPeriodSetInfo | null;
  currentWorkout: Workout;
  handleWorkoutUpdate: (workout: Workout) => void;
  setActiveRestTimer: React.Dispatch<React.SetStateAction<RestTimer | null>>;
  setRestTimerPopupOpen: (open: boolean) => void;
  onAddRestPeriod?: () => void;
  onSetSelectionMode?: (enabled: boolean) => void;
  selectedSetIds?: globalThis.Set<string>;
  onToggleSetSelection?: (exerciseId: string, setId: string) => void;
}

const RestTimerInputModal: React.FC<RestTimerInputModalProps> = ({
  visible,
  onClose,
  restTimerInput,
  setRestTimerInput,
  restPeriodSetInfo,
  currentWorkout,
  handleWorkoutUpdate,
  setActiveRestTimer,
  setRestTimerPopupOpen,
  onAddRestPeriod,
  onSetSelectionMode,
  selectedSetIds = new Set(),
  onToggleSetSelection,
}) => {
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const lastInputRef = useRef<string>('');
  const shouldClearOnNextInputRef = useRef<boolean>(false);
  const previousSetIdRef = useRef<string | null>(null);

  // Track when modal opens with existing text - should clear on first input
  useEffect(() => {
    if (visible && restPeriodSetInfo) {
      const currentSetId = `${restPeriodSetInfo.exerciseId}-${restPeriodSetInfo.setId}`;
      // If this is a new set (different from previous) and there's existing text, set flag
      if (previousSetIdRef.current !== currentSetId && restTimerInput) {
        shouldClearOnNextInputRef.current = true;
      }
      previousSetIdRef.current = currentSetId;
    } else if (!visible) {
      shouldClearOnNextInputRef.current = false;
      previousSetIdRef.current = null;
    }
  }, [visible, restPeriodSetInfo, restTimerInput]);

  // Reset ref when set info changes (new set selected)
  useEffect(() => {
    lastInputRef.current = '';
  }, [restPeriodSetInfo]);

  // Reset selection mode when modal closes
  useEffect(() => {
    if (!visible && isSelectionMode) {
      setIsSelectionMode(false);
      if (onSetSelectionMode) {
        onSetSelectionMode(false);
      }
    }
  }, [visible, isSelectionMode, onSetSelectionMode]);

  // Automatically update the rest timer in the workout as user types
  useEffect(() => {
    if (!restPeriodSetInfo || restTimerInput === lastInputRef.current) return;

    lastInputRef.current = restTimerInput;
    const { exerciseId, setId } = restPeriodSetInfo;
    const seconds = parseRestTimeInput(restTimerInput);

    // Only update if we have a valid input (even if it's 0, we want to update to clear it)
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
        if (ex.type === 'group') return ex;
        return {
          ...ex,
          sets: ex.sets.map((s: Set) =>
            s.id === setId
              ? { ...s, restPeriodSeconds: seconds > 0 ? seconds : undefined, restTimerCompleted: false }
              : s
          )
        };
      })
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restTimerInput, restPeriodSetInfo]);

  if (!visible) return null;

  const handleStartTimer = () => {
    const seconds = parseRestTimeInput(restTimerInput);
    if (seconds <= 0 || !restPeriodSetInfo) return;

    const { exerciseId, setId } = restPeriodSetInfo;

    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
        if (ex.type === 'group') return ex;
        return {
          ...ex,
          sets: ex.sets.map((s: Set) => s.id === setId ? { ...s, restPeriodSeconds: seconds, restTimerCompleted: false } : s)
        };
      })
    });

    setActiveRestTimer({
      exerciseId,
      setId,
      remainingSeconds: seconds,
      totalSeconds: seconds,
      isPaused: false
    });

    onClose();
    setRestTimerInput('');
    setRestTimerPopupOpen(true);
  };

  const handleSave = () => {
    if (onAddRestPeriod) {
      onAddRestPeriod();
    }
    onClose();
    setRestTimerInput('');
  };

  const handleApplyTo = () => {
    setIsSelectionMode(true);
    if (onSetSelectionMode) {
      onSetSelectionMode(true);
    }
    // Automatically select the set that was being edited
    if (restPeriodSetInfo && onToggleSetSelection) {
      onToggleSetSelection(restPeriodSetInfo.exerciseId, restPeriodSetInfo.setId);
    }
  };

  const handleSaveSelected = () => {
    const seconds = parseRestTimeInput(restTimerInput);
    if (seconds <= 0 || !selectedSetIds || selectedSetIds.size === 0) return;

    // Update all selected sets with the rest timer
    // Group sets by exerciseId to update efficiently
    const setsByExercise = new Map<string, string[]>();
    selectedSetIds.forEach((setId: string) => {
      // Find which exercise contains this set by searching all exercises
      const findExerciseWithSet = (items: ExerciseItem[]): string | null => {
        for (const item of items) {
          if (item.type === 'exercise' && item.sets.some((s: Set) => s.id === setId)) {
            return item.instanceId;
          }
          if (item.type === 'group' && item.children) {
            const found = findExerciseWithSet(item.children);
            if (found) return found;
          }
        }
        return null;
      };

      const exerciseId = findExerciseWithSet(currentWorkout.exercises);
      if (exerciseId) {
        if (!setsByExercise.has(exerciseId)) {
          setsByExercise.set(exerciseId, []);
        }
        setsByExercise.get(exerciseId)!.push(setId);
      }
    });

    // Update each exercise with its selected sets
    let updatedWorkout = currentWorkout;
    setsByExercise.forEach((setIds, exerciseId) => {
      updatedWorkout = {
        ...updatedWorkout,
        exercises: updateExercisesDeep(updatedWorkout.exercises, exerciseId, (ex: ExerciseItem) => {
          if (ex.type === 'group') return ex;
          return {
            ...ex,
            sets: ex.sets.map((s: Set) =>
              setIds.includes(s.id)
                ? { ...s, restPeriodSeconds: seconds, restTimerCompleted: false }
                : s
            )
          };
        })
      };
    });

    handleWorkoutUpdate(updatedWorkout);
    setIsSelectionMode(false);
    if (onSetSelectionMode) {
      onSetSelectionMode(false);
    }
    onClose();
    setRestTimerInput('');
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    if (onSetSelectionMode) {
      onSetSelectionMode(false);
    }
  };

  const handleClose = () => {
    if (isSelectionMode) {
      handleCancelSelection();
    }
    onClose();
    setRestTimerInput('');
  };

  const handleInput = (key: string) => {
    setRestTimerInput(prev => {
      // If we should clear on next input (modal opened with existing text), clear first
      if (shouldClearOnNextInputRef.current) {
        shouldClearOnNextInputRef.current = false;
        return key;
      }
      return prev + key;
    });
  };

  const handleBackspace = () => {
    shouldClearOnNextInputRef.current = false;
    setRestTimerInput(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    shouldClearOnNextInputRef.current = false;
    setRestTimerInput('');
  };

  const parsedSeconds = parseRestTimeInput(restTimerInput);
  const isValid = parsedSeconds > 0;

  return (
    <View style={localStyles.container}>
      {/* Number Pad - Row 1 */}
      <View style={localStyles.row}>
        {['1', '2', '3'].map(key => (
          <TouchableOpacity
            key={key}
            style={localStyles.keyButton}
            onPress={() => handleInput(key)}
          >
            <Text style={localStyles.keyButtonText}>{key}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={localStyles.closeButton}
          onPress={handleClose}
        >
          <X size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Number Pad - Row 2 */}
      <View style={localStyles.row}>
        {['4', '5', '6'].map(key => (
          <TouchableOpacity
            key={key}
            style={localStyles.keyButton}
            onPress={() => handleInput(key)}
          >
            <Text style={localStyles.keyButtonText}>{key}</Text>
          </TouchableOpacity>
        ))}
        {isSelectionMode ? (
          <TouchableOpacity
            style={[
              localStyles.saveButton,
              (selectedSetIds.size === 0 || !isValid) && localStyles.saveButton__disabled
            ]}
            onPress={handleSaveSelected}
            disabled={selectedSetIds.size === 0 || !isValid}
          >
            <Text style={localStyles.saveButtonText}>
              Save ({selectedSetIds.size})
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              localStyles.applyToButton,
              !isValid && localStyles.applyToButton__disabled
            ]}
            onPress={handleApplyTo}
            disabled={!isValid}
          >
            <Text style={localStyles.applyToButtonText}>
              Apply to
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Number Pad - Row 3 */}
      <View style={localStyles.row}>
        {['7', '8', '9'].map(key => (
          <TouchableOpacity
            key={key}
            style={localStyles.keyButton}
            onPress={() => handleInput(key)}
          >
            <Text style={localStyles.keyButtonText}>{key}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            localStyles.startTimerButton,
            !isValid && localStyles.startTimerButton__disabled
          ]}
          onPress={handleStartTimer}
          disabled={!isValid}
        >
          <Play size={16} color={COLORS.white} />
          <Text style={localStyles.startTimerButtonText}>Start</Text>
        </TouchableOpacity>
      </View>

      {/* Number Pad - Row 4 */}
      <View style={localStyles.row}>
        <TouchableOpacity
          style={localStyles.secondaryButton}
          onPress={handleClear}
        >
          <Text style={localStyles.secondaryButtonText}>C</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={localStyles.keyButton}
          onPress={() => handleInput('0')}
        >
          <Text style={localStyles.keyButtonText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={localStyles.secondaryButton}
          onPress={handleBackspace}
        >
          <Text style={localStyles.secondaryButtonText}>⌫</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.slate[800],
    borderTopWidth: 1,
    borderTopColor: COLORS.slate[800],
    paddingBottom: 30,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  keyButton: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    height: 52,
    backgroundColor: COLORS.slate[600],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  keyButtonText: {
    fontSize: 24,
    fontWeight: '500',
    color: COLORS.white,
  },
  closeButton: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    height: 52,
    backgroundColor: COLORS.slate[800],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  secondaryButton: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    height: 52,
    backgroundColor: COLORS.slate[700],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.white,
  },
  saveButton: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    height: 52,
    backgroundColor: COLORS.blue[600],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  saveButton__disabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  applyToButton: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    height: 52,
    backgroundColor: COLORS.blue[600],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  applyToButton__disabled: {
    opacity: 0.5,
  },
  applyToButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  startTimerButton: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    height: 52,
    backgroundColor: COLORS.blue[600],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  startTimerButton__disabled: {
    opacity: 0.5,
  },
  startTimerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default RestTimerInputModal;
