import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { ChevronDown, Calendar, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '@/constants/colors';
import { formatDuration } from '@/constants/data';
import type { Workout, WorkoutMode } from '@/types/workout';

interface WorkoutHeaderProps {
  workout: Workout | null;
  mode?: WorkoutMode;
  elapsed?: number;
  onUpdate?: (workout: Workout) => void;
  onBack?: () => void;
  onFinish?: () => void;
  onCancel?: () => void;
}

const WorkoutHeader: React.FC<WorkoutHeaderProps> = ({ 
  workout,
  mode = 'live',
  elapsed = 0,
  onUpdate,
  onBack,
  onFinish,
  onCancel
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationInput, setDurationInput] = useState('');

  const isEditMode = mode === 'edit';
  const isLiveMode = mode === 'live';
  const isReadOnly = mode === 'readonly';
  
  const startDate = workout ? new Date(workout.startedAt || Date.now()) : new Date();

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && isEditMode && workout && onUpdate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      onUpdate({ 
        ...workout, 
        date: dateString,
        startedAt: selectedDate.getTime()
      });
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime && isEditMode && workout && onUpdate) {
      const currentDate = new Date(workout.startedAt || Date.now());
      const newDateTime = new Date(currentDate);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      
      onUpdate({ 
        ...workout, 
        startedAt: newDateTime.getTime()
      });
    }
  };

  const handleDurationSave = () => {
    if (durationInput.trim() && workout && onUpdate) {
      onUpdate({ 
        ...workout, 
        duration: durationInput
      });
    }
    setShowDurationModal(false);
    setDurationInput('');
  };

  if (!workout) return null;

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.headerButton}>
        <ChevronDown size={24} color={COLORS.slate[400]} />
      </TouchableOpacity>
      
      <View style={styles.headerCenter}>
        <TextInput 
          value={workout.name} 
          onChangeText={(text) => onUpdate && onUpdate({...workout, name: text})} 
          style={styles.workoutNameInput}
          editable={!isReadOnly}
        />
        
        <View style={styles.headerMeta}>
          {isEditMode ? (
            <>
              <TouchableOpacity 
                style={styles.metaItem}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={12} color={COLORS.slate[400]} />
                <Text style={styles.metaText}>
                  {startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.metaItem}
                onPress={() => setShowTimePicker(true)}
              >
                <Clock size={12} color={COLORS.slate[400]} />
                <Text style={[styles.metaText, styles.monoText]}>
                  {startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.metaItem}
                onPress={() => {
                  setDurationInput(workout.duration || '');
                  setShowDurationModal(true);
                }}
              >
                <Clock size={12} color={COLORS.slate[400]} />
                <Text style={[styles.metaText, styles.monoText]}>
                  {workout.duration || '0m'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.metaItem}>
                <Calendar size={12} color={COLORS.slate[400]} />
                <Text style={styles.metaText}>
                  {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}
                </Text>
              </View>
              {isLiveMode && (
                <View style={styles.metaItem}>
                  <Clock size={12} color={COLORS.slate[400]} />
                  <Text style={[styles.metaText, styles.monoText]}>{formatDuration(elapsed)}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
      
      {onCancel && (
        <TouchableOpacity 
          onPress={onCancel} 
          style={[styles.actionButton, styles.cancelButton]}
        >
          <Text style={styles.actionButtonText}>{isEditMode ? 'CANCEL' : 'CANCEL'}</Text>
        </TouchableOpacity>
      )}
      
      {onFinish && !isEditMode && (
        <TouchableOpacity 
          onPress={onFinish} 
          style={[styles.actionButton, styles.finishButton]}
        >
          <Text style={styles.actionButtonText}>UPDATE</Text>
        </TouchableOpacity>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={startDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

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
    </View>
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  finishButton: {
    backgroundColor: COLORS.blue[600],
  },
  cancelButton: {
    backgroundColor: COLORS.red[500],
  },
  actionButtonText: {
    fontSize: 12,
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

export default WorkoutHeader;
