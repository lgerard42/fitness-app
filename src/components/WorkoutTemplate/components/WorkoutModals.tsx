import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { CalendarDays, FileText } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { PADDING, BORDER_RADIUS, Z_INDEX } from '@/constants/layout';
import FinishWorkoutModal from '../modals/FinishWorkoutModal';
import CancelWorkoutModal from '../modals/CancelWorkoutModal';
import type { Workout, Note } from '@/types/workout';

interface WorkoutModalsProps {
  // Workout Notes Modal
  isNoteModalOpen: boolean;
  setIsNoteModalOpen: (open: boolean) => void;
  newNote: string;
  setNewNote: (note: string) => void;
  newNoteDate: string;
  setNewNoteDate: (date: string) => void;
  onAddNote: () => void;

  // Exercise Note Modal
  exerciseNoteModalOpen: boolean;
  setExerciseNoteModalOpen: (open: boolean) => void;
  currentExerciseNote: string;
  setCurrentExerciseNote: (note: string) => void;
  onSaveExerciseNote: () => void;

  // Finish/Cancel Modals
  finishModalOpen: boolean;
  setFinishModalOpen: (open: boolean) => void;
  cancelModalOpen: boolean;
  setCancelModalOpen: (open: boolean) => void;
  onFinish: () => void;
  onConfirmCancel: () => void;
}

const WorkoutModals: React.FC<WorkoutModalsProps> = ({
  isNoteModalOpen,
  setIsNoteModalOpen,
  newNote,
  setNewNote,
  newNoteDate,
  setNewNoteDate,
  onAddNote,
  exerciseNoteModalOpen,
  setExerciseNoteModalOpen,
  currentExerciseNote,
  setCurrentExerciseNote,
  onSaveExerciseNote,
  finishModalOpen,
  setFinishModalOpen,
  cancelModalOpen,
  setCancelModalOpen,
  onFinish,
  onConfirmCancel,
}) => {
  return (
    <>
      {/* Workout Notes Modal */}
      <Modal 
        visible={isNoteModalOpen} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setIsNoteModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Note</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Write your note here..."
              placeholderTextColor={COLORS.slate[400]}
              multiline
              numberOfLines={3}
              value={newNote}
              onChangeText={setNewNote}
              autoFocus
            />
            <View style={styles.dateInputContainer}>
              <TextInput
                style={styles.dateInput}
                value={newNoteDate}
                onChangeText={setNewNoteDate}
                placeholder="YYYY-MM-DD"
              />
              <CalendarDays size={18} color={COLORS.slate[400]} style={styles.dateIcon} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => setIsNoteModalOpen(false)} 
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onAddNote}
                disabled={!newNote.trim()}
                style={[styles.modalAdd, !newNote.trim() && styles.modalAddDisabled]}
              >
                <Text style={styles.modalAddText}>Add Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exercise Note Modal */}
      <Modal 
        visible={exerciseNoteModalOpen} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setExerciseNoteModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Exercise Note</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note for this exercise..."
              placeholderTextColor={COLORS.slate[400]}
              multiline
              numberOfLines={3}
              value={currentExerciseNote}
              onChangeText={setCurrentExerciseNote}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => setExerciseNoteModalOpen(false)} 
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSaveExerciseNote}
                style={styles.modalAdd}
              >
                <Text style={styles.modalAddText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Finish Workout Modal */}
      <FinishWorkoutModal
        visible={finishModalOpen}
        onClose={() => setFinishModalOpen(false)}
        onFinish={onFinish}
      />

      {/* Cancel Workout Modal */}
      <CancelWorkoutModal
        visible={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={onConfirmCancel}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: PADDING.xxl,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: PADDING.xxl,
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
    marginBottom: PADDING.lg,
  },
  noteInput: {
    backgroundColor: COLORS.slate[50],
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    borderRadius: BORDER_RADIUS.lg,
    padding: PADDING.lg,
    fontSize: 14,
    color: COLORS.slate[900],
    textAlignVertical: 'top',
    marginBottom: PADDING.lg,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.slate[50],
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: PADDING.lg,
  },
  dateInput: {
    flex: 1,
    padding: PADDING.base,
    fontSize: 14,
    color: COLORS.slate[600],
  },
  dateIcon: {
    marginRight: PADDING.base,
  },
  modalActions: {
    flexDirection: 'row',
    gap: PADDING.base,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: PADDING.base,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.transparent,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[500],
  },
  modalAdd: {
    flex: 1,
    paddingVertical: PADDING.base,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.blue[600],
  },
  modalAddDisabled: {
    opacity: 0.5,
  },
  modalAddText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default WorkoutModals;
