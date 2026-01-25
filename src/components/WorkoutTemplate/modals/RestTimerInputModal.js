import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Timer, Play } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { formatRestTime, parseRestTimeInput, updateExercisesDeep } from '@/utils/workoutHelpers';

const RestTimerInputModal = ({
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
  styles,
}) => {
  const handleStartTimer = () => {
    const seconds = parseRestTimeInput(restTimerInput);
    if (seconds <= 0 || !restPeriodSetInfo) return;
    
    const { exerciseId, setId } = restPeriodSetInfo;
    
    // Update the set's rest period
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => ({
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, restPeriodSeconds: seconds, restTimerCompleted: false } : s)
      }))
    });
    
    // Start the timer
    setActiveRestTimer({
      exerciseId,
      setId,
      remainingSeconds: seconds,
      totalSeconds: seconds,
      isPaused: false
    });
    
    onClose();
    setRestTimerPopupOpen(true);
  };

  const handleSave = () => {
    if (onAddRestPeriod) {
      onAddRestPeriod();
    }
  };

  const handleClose = () => {
    onClose();
    setRestTimerInput('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Set Rest Timer</Text>
          
          {/* Live Preview */}
          <View style={styles.restTimerPreview}>
            <Timer size={28} color={parseRestTimeInput(restTimerInput) > 0 ? COLORS.blue[500] : COLORS.slate[300]} />
            <Text style={[
              styles.restTimerPreviewText,
              parseRestTimeInput(restTimerInput) > 0 && styles.restTimerPreviewText__active
            ]}>
              {parseRestTimeInput(restTimerInput) > 0 
                ? formatRestTime(parseRestTimeInput(restTimerInput))
                : '0:00'}
            </Text>
          </View>
          
          {/* Quick Select Buttons - Row 1: 0:30 -> 1:30 */}
          <View style={styles.restPeriodQuickOptions}>
            {[30, 45, 60, 75, 90].map(seconds => (
              <TouchableOpacity
                key={seconds}
                style={[
                  styles.restPeriodQuickOption,
                  parseRestTimeInput(restTimerInput) === seconds && styles.restPeriodQuickOption__selected
                ]}
                onPress={() => setRestTimerInput(String(seconds))}
              >
                <Text style={[
                  styles.restPeriodQuickOptionText,
                  parseRestTimeInput(restTimerInput) === seconds && styles.restPeriodQuickOptionText__selected
                ]}>{formatRestTime(seconds)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Quick Select Buttons - Row 2: 1:45 -> 3:30 */}
          <View style={[styles.restPeriodQuickOptions, { marginBottom: 16 }]}>
            {[105, 120, 150, 180, 210].map(seconds => (
              <TouchableOpacity
                key={seconds}
                style={[
                  styles.restPeriodQuickOption,
                  parseRestTimeInput(restTimerInput) === seconds && styles.restPeriodQuickOption__selected
                ]}
                onPress={() => setRestTimerInput(String(seconds))}
              >
                <Text style={[
                  styles.restPeriodQuickOptionText,
                  parseRestTimeInput(restTimerInput) === seconds && styles.restPeriodQuickOptionText__selected
                ]}>{formatRestTime(seconds)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Phone Dialpad */}
          <View style={styles.dialpad}>
            <View style={styles.dialpadRow}>
              {[1, 2, 3].map(num => (
                <TouchableOpacity
                  key={num}
                  style={styles.dialpadButton}
                  onPress={() => setRestTimerInput(prev => prev + String(num))}
                >
                  <Text style={styles.dialpadButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dialpadRow}>
              {[4, 5, 6].map(num => (
                <TouchableOpacity
                  key={num}
                  style={styles.dialpadButton}
                  onPress={() => setRestTimerInput(prev => prev + String(num))}
                >
                  <Text style={styles.dialpadButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dialpadRow}>
              {[7, 8, 9].map(num => (
                <TouchableOpacity
                  key={num}
                  style={styles.dialpadButton}
                  onPress={() => setRestTimerInput(prev => prev + String(num))}
                >
                  <Text style={styles.dialpadButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dialpadRow}>
              <TouchableOpacity
                style={styles.dialpadButtonSecondary}
                onPress={() => setRestTimerInput('')}
              >
                <Text style={styles.dialpadButtonTextSecondary}>C</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialpadButton}
                onPress={() => setRestTimerInput(prev => prev + '0')}
              >
                <Text style={styles.dialpadButtonText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialpadButtonSecondary}
                onPress={() => setRestTimerInput(prev => prev.slice(0, -1))}
              >
                <Text style={styles.dialpadButtonTextSecondary}>⌫</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              onPress={handleClose} 
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSave}
              style={[
                styles.modalFinish,
                parseRestTimeInput(restTimerInput) <= 0 && { opacity: 0.5 }
              ]}
              disabled={parseRestTimeInput(restTimerInput) <= 0}
            >
              <Text style={styles.modalFinishText}>Save</Text>
            </TouchableOpacity>
          </View>
          
          {/* Start Timer Button - always visible, disabled when no valid input */}
          <TouchableOpacity 
            onPress={handleStartTimer}
            style={[
              styles.startTimerButton,
              parseRestTimeInput(restTimerInput) <= 0 && styles.startTimerButton__disabled
            ]}
            disabled={parseRestTimeInput(restTimerInput) <= 0}
          >
            <Play size={16} color={COLORS.white} />
            <Text style={styles.startTimerButtonText}>Start Timer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default RestTimerInputModal;
