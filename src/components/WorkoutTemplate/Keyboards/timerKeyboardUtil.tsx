import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Play } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { formatRestTime, parseRestTimeInput, updateExercisesDeep } from '@/utils/workoutHelpers';
import type { Workout, RestTimer, RestPeriodSetInfo, Set, ExerciseItem } from '@/types/workout';

export interface TimerKeyboardProps {
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
  onApplyToSelectedSets?: (setIds: string[], seconds: number) => void; // Callback when "Apply to" is clicked with selected sets
  onRemoveTimersFromSelectedSets?: (setIds: string[]) => void; // Callback when "Remove" is clicked to remove timers from selected sets
  showDisplayAtTop?: boolean; // If true, show formatted time display at top of keyboard
  displayValue?: string; // Formatted time string to display at top
  initialSelectionMode?: boolean; // If true, start in selection mode with keyboard open
}

export const TimerKeyboard: React.FC<TimerKeyboardProps> = ({
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
  onApplyToSelectedSets,
  onRemoveTimersFromSelectedSets,
  showDisplayAtTop = false,
  displayValue,
  initialSelectionMode = false,
}) => {
  const [isSelectionMode, setIsSelectionMode] = useState(initialSelectionMode);
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

  // Initialize selection mode when opening with initialSelectionMode
  useEffect(() => {
    if (visible && initialSelectionMode && onSetSelectionMode) {
      setIsSelectionMode(true);
      onSetSelectionMode(true);
    }
  }, [visible, initialSelectionMode, onSetSelectionMode]);

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

  const handleRemoveTimers = () => {
    if (!onRemoveTimersFromSelectedSets || !selectedSetIds || selectedSetIds.size === 0) return;
    
    const selectedIdsArray = Array.from(selectedSetIds);
    onRemoveTimersFromSelectedSets(selectedIdsArray);
    
    setIsSelectionMode(false);
    if (onSetSelectionMode) {
      onSetSelectionMode(false);
    }
    onClose();
    setRestTimerInput('');
  };

  const handleSave = () => {
    if (onAddRestPeriod) {
      onAddRestPeriod();
    }
    onClose();
    setRestTimerInput('');
  };

  const handleApplyTo = () => {
    if (isSelectionMode) {
      // Apply timer to selected sets and close
      const seconds = parseRestTimeInput(restTimerInput);
      if (seconds <= 0 || !selectedSetIds || selectedSetIds.size === 0) return;

      // Use the dedicated callback if provided, otherwise use handleWorkoutUpdate
      if (onApplyToSelectedSets) {
        const selectedIdsArray = Array.from(selectedSetIds);
        onApplyToSelectedSets(selectedIdsArray, seconds);
      } else {
        // Fallback to old behavior
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
      }
      
      setIsSelectionMode(false);
      if (onSetSelectionMode) {
        onSetSelectionMode(false);
      }
      onClose();
      setRestTimerInput('');
    } else {
      // Enter selection mode
      setIsSelectionMode(true);
      if (onSetSelectionMode) {
        onSetSelectionMode(true);
      }
      // Automatically select the set that was being edited if no sets are selected
      if (restPeriodSetInfo && onToggleSetSelection && (!selectedSetIds || selectedSetIds.size === 0)) {
        onToggleSetSelection(restPeriodSetInfo.exerciseId, restPeriodSetInfo.setId);
      }
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

  const convertSecondsToInputFormat = (seconds: number): string => {
    if (seconds <= 0) return '';
    if (seconds < 100) {
      return seconds.toString();
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return (mins * 100 + secs).toString();
  };

  const handleAdd10Seconds = () => {
    shouldClearOnNextInputRef.current = false;
    const currentSeconds = parseRestTimeInput(restTimerInput);
    const newSeconds = Math.max(0, currentSeconds + 10);
    setRestTimerInput(convertSecondsToInputFormat(newSeconds));
  };

  const handleSubtract10Seconds = () => {
    shouldClearOnNextInputRef.current = false;
    const currentSeconds = parseRestTimeInput(restTimerInput);
    const newSeconds = Math.max(0, currentSeconds - 10);
    setRestTimerInput(convertSecondsToInputFormat(newSeconds));
  };

  const parsedSeconds = parseRestTimeInput(restTimerInput);
  const isValid = parsedSeconds > 0;

  return (
    <View style={styles.container}>
      {/* Display at top (only shown when showDisplayAtTop is true) */}
      {showDisplayAtTop && (
        <View style={styles.displayContainer}>
          <Text style={styles.displayText}>
            {displayValue || '0:00'}
          </Text>
        </View>
      )}
      {/* Keyboard Layout - Columns */}
      <View style={styles.keyboardContainer}>
        {/* Columns 1-3 Wrapper */}
        <View style={styles.numberColumnsWrapper}>
          {/* Column 1: 1, 4, 7, C */}
          <View style={styles.column}>
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleInput('1')}
            >
              <Text style={styles.keyButtonText}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleInput('4')}
            >
              <Text style={styles.keyButtonText}>4</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleInput('7')}
            >
              <Text style={styles.keyButtonText}>7</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleClear}
            >
              <Text style={styles.secondaryButtonText}>C</Text>
            </TouchableOpacity>
          </View>

          {/* Column 2: 2, 5, 8, 0 */}
          <View style={styles.column}>
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleInput('2')}
            >
              <Text style={styles.keyButtonText}>2</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleInput('5')}
            >
              <Text style={styles.keyButtonText}>5</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleInput('8')}
            >
              <Text style={styles.keyButtonText}>8</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleInput('0')}
            >
              <Text style={styles.keyButtonText}>0</Text>
            </TouchableOpacity>
          </View>

          {/* Column 3: 3, 6, 9, ⌫ */}
          <View style={styles.column}>
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleInput('3')}
            >
              <Text style={styles.keyButtonText}>3</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleInput('6')}
            >
              <Text style={styles.keyButtonText}>6</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleInput('9')}
            >
              <Text style={styles.keyButtonText}>9</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBackspace}
            >
              <Text style={styles.secondaryButtonText}>⌫</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Column 4: Close, [+/-], Start, Apply */}
        <View style={styles.column}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
          <View style={styles.adjustButtonContainer}>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={handleSubtract10Seconds}
            >
              <Text style={styles.adjustButtonText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={handleAdd10Seconds}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          {onRemoveTimersFromSelectedSets ? (
            <TouchableOpacity
              style={[
                styles.removeButton,
                (selectedSetIds.size === 0) && styles.removeButton__disabled
              ]}
              onPress={handleRemoveTimers}
              disabled={selectedSetIds.size === 0}
            >
              <Text style={[
                styles.removeButtonText,
                (selectedSetIds.size === 0) && styles.removeButtonText__disabled
              ]}>Remove</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.startTimerButton,
                !isValid && styles.startTimerButton__disabled
              ]}
              onPress={handleStartTimer}
              disabled={!isValid}
            >
              <Play size={16} color={COLORS.white} />
              <Text style={styles.startTimerButtonText}>Start</Text>
            </TouchableOpacity>
          )}
          {isSelectionMode ? (
            <TouchableOpacity
              style={[
                styles.applyToButton,
                (selectedSetIds.size === 0 || !isValid) && styles.applyToButton__disabled
              ]}
              onPress={handleApplyTo}
              disabled={selectedSetIds.size === 0 || !isValid}
            >
              <Text style={styles.applyToButtonText}>
                Apply
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.applyToButton,
                !isValid && styles.applyToButton__disabled
              ]}
              onPress={handleApplyTo}
              disabled={!isValid}
            >
              <Text style={styles.applyToButtonText}>
                Apply to
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    zIndex: 1001,
    elevation: 11,
  },
  displayContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.blue[550],
  },
  keyboardContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  numberColumnsWrapper: {
    flexDirection: 'row',
    flex: 3,
    gap: 8,
  },
  column: {
    flexDirection: 'column',
    flex: 1,
    gap: 8,
  },
  keyButton: {
    width: '100%',
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
    width: '100%',
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
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.slate[200],
  },
  secondaryButton: {
    width: '100%',
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
    width: '100%',
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
    width: '100%',
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
  removeButton: {
    width: '100%',
    height: 52,
    backgroundColor: 'transparent',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.red[500],
  },
  removeButton__disabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.red[500],
  },
  removeButtonText__disabled: {
    opacity: 0.5,
  },
  adjustButtonContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  adjustButton: {
    flex: 1,
    flexBasis: 0,
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
  adjustButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.white,
  },
});
