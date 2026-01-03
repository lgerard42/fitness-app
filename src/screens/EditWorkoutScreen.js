import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Platform, Modal } from 'react-native';
import { ChevronDown, Calendar, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { formatDuration } from '../constants/data';
import { useWorkout } from '../context/WorkoutContext';
import LiveWorkoutScreen from './LiveWorkoutScreen';

const EditWorkoutScreen = ({ navigation, route }) => {
  const { workout } = route.params;
  const { updateHistory } = useWorkout();
  const [editedWorkout, setEditedWorkout] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationInput, setDurationInput] = useState('');

  useEffect(() => {
    if (workout) {
      // Create a deep copy and ensure it has the required structure
      const workoutCopy = JSON.parse(JSON.stringify(workout));
      // If the workout doesn't have startedAt, calculate it from date and duration
      if (!workoutCopy.startedAt) {
        const workoutDate = new Date(workoutCopy.date || new Date());
        workoutCopy.startedAt = workoutDate.getTime();
      }
      setEditedWorkout(workoutCopy);
    }
  }, [workout]);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate && isEditing && editedWorkout) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setEditedWorkout({ 
        ...editedWorkout, 
        date: dateString,
        startedAt: selectedDate.getTime()
      });
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime && isEditing && editedWorkout) {
      // Combine the current date with the new time
      const currentDate = new Date(editedWorkout.startedAt || Date.now());
      const newDateTime = new Date(currentDate);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      
      setEditedWorkout({ 
        ...editedWorkout, 
        startedAt: newDateTime.getTime()
      });
    }
  };

  const handleDurationSave = () => {
    if (durationInput.trim() && editedWorkout) {
      setEditedWorkout({ 
        ...editedWorkout, 
        duration: durationInput
      });
    }
    setShowDurationModal(false);
    setDurationInput('');
  };

  const handleUpdate = () => {
    if (!editedWorkout) return;
    
    if (!isEditing) {
      // Enter edit mode
      setIsEditing(true);
      return;
    }

    // Save changes
    // Calculate endedAt based on startedAt and duration
    if (editedWorkout.duration) {
      // Parse duration string (e.g., "1h 23m" or "45m")
      const durationMatch = editedWorkout.duration.match(/(?:(\d+)h\s*)?(?:(\d+)m)?/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1] || '0');
        const minutes = parseInt(durationMatch[2] || '0');
        const durationMs = (hours * 60 + minutes) * 60 * 1000;
        editedWorkout.endedAt = editedWorkout.startedAt + durationMs;
      }
    }
    
    updateHistory(editedWorkout);
    setIsEditing(false);
    navigation.goBack();
  };

  const startDate = editedWorkout ? new Date(editedWorkout.startedAt || Date.now()) : new Date();

  // Custom header component - memoized to prevent recreation on every state change
  const CustomHeader = useMemo(() => {
    if (!editedWorkout) return null;
    return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
        <ChevronDown size={24} color={COLORS.slate[400]} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <TextInput 
          value={editedWorkout.name} 
          onChangeText={(text) => isEditing && setEditedWorkout({...editedWorkout, name: text})} 
          style={styles.workoutNameInput}
          editable={isEditing}
        />
        <View style={styles.headerMeta}>
          <TouchableOpacity 
            style={styles.metaItem}
            onPress={() => isEditing && setShowDatePicker(true)}
            disabled={!isEditing}
          >
            <Calendar size={12} color={COLORS.slate[400]} />
            <Text style={styles.metaText}>
              {startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.metaItem}
            onPress={() => isEditing && setShowTimePicker(true)}
            disabled={!isEditing}
          >
            <Clock size={12} color={COLORS.slate[400]} />
            <Text style={[styles.metaText, styles.monoText]}>
              {startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.metaItem}
            onPress={() => {
              if (isEditing) {
                setDurationInput(editedWorkout.duration || '');
                setShowDurationModal(true);
              }
            }}
            disabled={!isEditing}
          >
            <Clock size={12} color={COLORS.slate[400]} />
            <Text style={[styles.metaText, styles.monoText]}>
              {editedWorkout.duration || '0m'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity 
        onPress={handleUpdate} 
        style={styles.updateButton}
      >
        <Text style={styles.updateButtonText}>{isEditing ? 'UPDATE' : 'EDIT'}</Text>
      </TouchableOpacity>

      {/* Date Picker */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        ) : (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={startDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </View>
    );
  }, [editedWorkout, isEditing, showDatePicker, showTimePicker, navigation, startDate]);

  // Custom finish button text - memoized to prevent recreation
  const CustomFinishButton = useMemo(() => {
    if (!isEditing || !editedWorkout) return null;
    return (
      <TouchableOpacity
        onPress={handleUpdate}
        style={styles.bottomUpdateButton}
      >
        <Text style={styles.bottomUpdateButtonText}>UPDATE WORKOUT</Text>
      </TouchableOpacity>
    );
  }, [isEditing, editedWorkout]);

  // Early return after all hooks have been called
  if (!editedWorkout) return null;

  return (
    <>
      <LiveWorkoutScreen 
        navigation={navigation}
        isEditMode={true}
        editModeWorkout={editedWorkout}
        onWorkoutUpdate={isEditing ? setEditedWorkout : () => {}}
        customHeader={CustomHeader}
        customFinishButton={CustomFinishButton}
        hideTimer={true}
        readOnly={!isEditing}
      />

      {/* Duration Edit Modal */}
      <Modal visible={showDurationModal} transparent animationType="fade" onRequestClose={() => setShowDurationModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Duration</Text>
            <Text style={styles.modalSubtitle}>Enter duration (e.g., "1h 30m" or "45m")</Text>
            <TextInput 
              style={styles.durationInput}
              placeholder="1h 30m"
              placeholderTextColor={COLORS.slate[400]}
              value={durationInput}
              onChangeText={setDurationInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowDurationModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleDurationSave} 
                style={styles.modalSave}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
    zIndex: 1,
  },
  headerButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
  },
  workoutNameInput: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[300],
    minWidth: 120,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.slate[400],
  },
  monoText: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  updateButton: {
    backgroundColor: COLORS.blue[600],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  updateButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  bottomUpdateButton: {
    backgroundColor: COLORS.blue[600],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  bottomUpdateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.slate[500],
    marginBottom: 16,
  },
  durationInput: {
    backgroundColor: COLORS.slate[50],
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: COLORS.slate[900],
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.transparent,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[500],
  },
  modalSave: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.blue[600],
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default EditWorkoutScreen;

