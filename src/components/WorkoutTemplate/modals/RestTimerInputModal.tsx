import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Timer, Play, X } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { formatRestTime, parseRestTimeInput, updateExercisesDeep } from '@/utils/workoutHelpers';
import type { Workout, RestTimer, RestPeriodSetInfo } from '@/types/workout';

interface RestTimerInputModalProps {
  visible: boolean;
  onClose: () => void;
  restTimerInput: string;
  setRestTimerInput: (input: string) => void;
  restPeriodSetInfo: RestPeriodSetInfo | null;
  currentWorkout: Workout;
  handleWorkoutUpdate: (workout: Workout) => void;
  setActiveRestTimer: React.Dispatch<React.SetStateAction<RestTimer | null>>;
  setRestTimerPopupOpen: (open: boolean) => void;
  onAddRestPeriod?: () => void;
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
}) => {
  if (!visible) return null;

  const handleStartTimer = () => {
    const seconds = parseRestTimeInput(restTimerInput);
    if (seconds <= 0 || !restPeriodSetInfo) return;
    
    const { exerciseId, setId } = restPeriodSetInfo;
    
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => ({
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, restPeriodSeconds: seconds, restTimerCompleted: false } : s)
      }))
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

  const handleClose = () => {
    onClose();
    setRestTimerInput('');
  };

  const handleInput = (key: string) => {
    setRestTimerInput(prev => prev + key);
  };

  const handleBackspace = () => {
    setRestTimerInput(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setRestTimerInput('');
  };

  const parsedSeconds = parseRestTimeInput(restTimerInput);
  const isValid = parsedSeconds > 0;

  return (
    <View style={localStyles.container}>
      {/* Preview Section */}
      <View style={localStyles.previewSection}>
        <Timer size={24} color={isValid ? COLORS.blue[500] : COLORS.slate[300]} />
        <Text style={[localStyles.previewText, isValid && localStyles.previewText__active]}>
          {isValid ? formatRestTime(parsedSeconds) : '0:00'}
        </Text>
      </View>

      {/* Quick Options - Row 1 */}
      <View style={localStyles.row}>
        {[30, 45, 60, 75, 90].map(seconds => {
          const isSelected = parsedSeconds === seconds;
          return (
            <TouchableOpacity
              key={seconds}
              style={[
                localStyles.quickOptionButton,
                isSelected && localStyles.quickOptionButton__selected
              ]}
              onPress={() => setRestTimerInput(String(seconds))}
            >
              <Text style={[
                localStyles.quickOptionText,
                isSelected && localStyles.quickOptionText__selected
              ]}>
                {formatRestTime(seconds)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Options - Row 2 */}
      <View style={localStyles.row}>
        {[105, 120, 150, 180, 210].map(seconds => {
          const isSelected = parsedSeconds === seconds;
          return (
            <TouchableOpacity
              key={seconds}
              style={[
                localStyles.quickOptionButton,
                isSelected && localStyles.quickOptionButton__selected
              ]}
              onPress={() => setRestTimerInput(String(seconds))}
            >
              <Text style={[
                localStyles.quickOptionText,
                isSelected && localStyles.quickOptionText__selected
              ]}>
                {formatRestTime(seconds)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
        <TouchableOpacity
          style={[
            localStyles.saveButton,
            !isValid && localStyles.saveButton__disabled
          ]}
          onPress={handleSave}
          disabled={!isValid}
        >
          <Text style={localStyles.saveButtonText}>
            Save
          </Text>
        </TouchableOpacity>
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
        <TouchableOpacity
          style={localStyles.cancelButton}
          onPress={handleClose}
        >
          <Text style={localStyles.cancelButtonText}>Cancel</Text>
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
  previewSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 12,
  },
  previewText: {
    fontSize: 32,
    fontWeight: '600',
    color: COLORS.slate[300],
  },
  previewText__active: {
    color: COLORS.blue[500],
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickOptionButton: {
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
  quickOptionButton__selected: {
    backgroundColor: COLORS.blue[600],
  },
  quickOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.white,
  },
  quickOptionText__selected: {
    color: COLORS.white,
    fontWeight: '600',
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
  cancelButton: {
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
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.white,
  },
});

export default RestTimerInputModal;
