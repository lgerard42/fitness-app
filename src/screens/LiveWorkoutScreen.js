import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Modal, Alert } from 'react-native';
import { ChevronDown, Calendar, Clock, FileText, Plus, Dumbbell, Layers, MoreVertical, CalendarDays } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { formatDuration } from '../constants/data';
import { useWorkout } from '../context/WorkoutContext';
import WorkoutSetRow from '../components/WorkoutSetRow';
import SavedNoteItem from '../components/SavedNoteItem';
import ExercisePickerModal from '../components/ExercisePickerModal';
import NewExerciseModal from '../components/NewExerciseModal';
import { CATEGORIES } from '../constants/data';

const updateExercisesDeep = (list, instanceId, updateFn) => {
  return list.map(item => {
    if (item.instanceId === instanceId) return updateFn(item);
    if (item.type === 'group' && item.children) {
      return { ...item, children: updateExercisesDeep(item.children, instanceId, updateFn) };
    }
    return item;
  });
};

const LiveWorkoutScreen = ({ navigation }) => {
  const { activeWorkout, updateWorkout, finishWorkout, cancelWorkout, exercisesLibrary, addExerciseToLibrary } = useWorkout();
  const [elapsed, setElapsed] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Notes State
  const [showNotes, setShowNotes] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!activeWorkout) {
      navigation.goBack();
      return;
    }
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeWorkout.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeWorkout]);

  if (!activeWorkout) return null;

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const noteToAdd = { id: `note-${Date.now()}`, text: newNote, date: newNoteDate, pinned: false };
    updateWorkout({ ...activeWorkout, sessionNotes: [noteToAdd, ...(activeWorkout.sessionNotes || [])] });
    setNewNote(""); 
    setNewNoteDate(new Date().toISOString().split('T')[0]); 
    setIsNoteModalOpen(false); 
    setShowNotes(true);
  };

  const handleRemoveNote = (noteId) => { 
    updateWorkout({ ...activeWorkout, sessionNotes: (activeWorkout.sessionNotes || []).filter(n => n.id !== noteId) }); 
  };

  const handlePinNote = (noteId) => { 
    updateWorkout({ ...activeWorkout, sessionNotes: (activeWorkout.sessionNotes || []).map(n => n.id === noteId ? { ...n, pinned: !n.pinned } : n) }); 
  };

  const sortedNotes = useMemo(() => { 
    return [...(activeWorkout.sessionNotes || [])].sort((a, b) => { 
      if (a.pinned && !b.pinned) return -1; 
      if (!a.pinned && b.pinned) return 1; 
      return 0; 
    }); 
  }, [activeWorkout.sessionNotes]);

  const createExerciseInstance = (ex) => ({
    instanceId: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    exerciseId: ex.id,
    name: ex.name,
    category: ex.category,
    type: 'exercise',
    sets: [{ id: `s-${Date.now()}-${Math.random()}`, type: "Working", weight: "", reps: "", duration: "", distance: "", completed: false }],
    collapsed: false
  });

  const handleAddExercisesFromPicker = (selectedExercises, groupType) => {
    const newInstances = selectedExercises.map(createExerciseInstance);
    
    let itemsToAdd = [];
    if (groupType && newInstances.length > 1) {
      itemsToAdd = [{
        instanceId: `group-${Date.now()}`,
        type: 'group',
        groupType: groupType, 
        children: newInstances
      }];
    } else {
      itemsToAdd = newInstances;
    }

    updateWorkout({
      ...activeWorkout,
      exercises: [...activeWorkout.exercises, ...itemsToAdd]
    });
    setShowPicker(false);
  };

  const handleCreateExerciseSave = (newExData) => {
    const tempEx = { ...newExData, id: `new-${Date.now()}` };
    // Also add to library globally
    addExerciseToLibrary(tempEx);
    handleAddExercisesFromPicker([tempEx], null);
    setIsCreateModalOpen(false);
  };

  const handleUpdateSet = (exInstanceId, updatedSet) => {
    updateWorkout({
      ...activeWorkout,
      exercises: updateExercisesDeep(activeWorkout.exercises, exInstanceId, (ex) => ({
        ...ex, sets: ex.sets.map(s => s.id === updatedSet.id ? updatedSet : s)
      }))
    });
  };

  const handleAddSet = (exInstanceId) => {
    updateWorkout({
      ...activeWorkout,
      exercises: updateExercisesDeep(activeWorkout.exercises, exInstanceId, (ex) => {
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet = {
          id: `s-${Date.now()}-${Math.random()}`, type: "Working",
          weight: lastSet ? lastSet.weight : "", reps: lastSet ? lastSet.reps : "", duration: lastSet ? lastSet.duration : "", distance: lastSet ? lastSet.distance : "",
          completed: false
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    });
  };

  const handleToggleComplete = (exInstanceId, set) => {
    handleUpdateSet(exInstanceId, { ...set, completed: !set.completed });
  };

  const handleFinish = () => {
    finishWorkout();
    navigation.goBack();
  };

  const handleCancel = () => {
    if (activeWorkout.exercises.length > 0) {
      setCancelModalOpen(true);
    } else {
      cancelWorkout();
      navigation.goBack();
    }
  };

  const confirmCancel = () => {
    cancelWorkout();
    setCancelModalOpen(false);
    navigation.goBack();
  };

  const hasExercises = activeWorkout.exercises.length > 0;

  const renderExerciseCard = (ex) => (
    <View key={ex.instanceId} style={styles.exerciseCard}>
       <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseName}>{ex.name}</Text>
          <TouchableOpacity>
            <MoreVertical size={18} color={COLORS.slate[400]} />
          </TouchableOpacity>
       </View>
       <View style={styles.exerciseContent}>
          <View style={styles.columnHeaders}>
             <View style={styles.colIndex}><Text style={styles.colHeaderText}>Set</Text></View>
             <View style={styles.colInputs}>
                <Text style={styles.colHeaderText}>{ex.category === "Lifts" ? "Weight" : "Time"}</Text>
                <Text style={styles.colHeaderText}>{ex.category === "Lifts" ? "Reps" : "Dist/Reps"}</Text>
             </View>
             <View style={styles.colCheck}><Text style={styles.colHeaderText}>✓</Text></View>
          </View>
          <View style={styles.setsContainer}>
            {ex.sets.map((set, idx) => (
              <WorkoutSetRow key={set.id} index={idx} set={set} category={ex.category}
                onUpdate={(s) => handleUpdateSet(ex.instanceId, s)}
                onToggle={() => handleToggleComplete(ex.instanceId, set)}
              />
            ))}
          </View>
          <TouchableOpacity onPress={() => handleAddSet(ex.instanceId)} style={styles.addSetButton}>
            <Text style={styles.addSetButtonText}>+ Add Set</Text>
          </TouchableOpacity>
       </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ChevronDown size={24} color={COLORS.slate[400]} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <TextInput 
            value={activeWorkout.name} 
            onChangeText={(text) => updateWorkout({...activeWorkout, name: text})} 
            style={styles.workoutNameInput}
          />
          <View style={styles.headerMeta}>
            <View style={styles.metaItem}>
              <Calendar size={12} color={COLORS.slate[400]} />
              <Text style={styles.metaText}>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={12} color={COLORS.slate[400]} />
              <Text style={[styles.metaText, styles.monoText]}>{formatDuration(elapsed)}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity 
          onPress={handleCancel} 
          style={[styles.finishButton, { backgroundColor: COLORS.red[500] }]}
        >
          <Text style={styles.finishButtonText}>CANCEL</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <TouchableOpacity onPress={() => setShowNotes(!showNotes)} style={styles.notesToggle}>
              <FileText size={16} color={COLORS.slate[500]} />
              <Text style={styles.notesTitle}>Workout Notes</Text>
              {(activeWorkout.sessionNotes && activeWorkout.sessionNotes.length > 0) && (
                <View style={styles.notesBadge}>
                  <Text style={styles.notesBadgeText}>{activeWorkout.sessionNotes.length}</Text>
                </View>
              )}
              <ChevronDown size={14} color={COLORS.slate[500]} style={{ transform: [{ rotate: showNotes ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsNoteModalOpen(true)} style={styles.addNoteButton}>
              <Plus size={14} color={COLORS.blue[600]} strokeWidth={3} />
              <Text style={styles.addNoteText}>Add Note</Text>
            </TouchableOpacity>
          </View>
          {showNotes && (
            <View style={styles.notesList}>
              {sortedNotes.length > 0 ? (
                sortedNotes.map((note) => <SavedNoteItem key={note.id} note={note} onPin={handlePinNote} onRemove={handleRemoveNote} />)
              ) : (
                <Text style={styles.emptyNotesText}>No notes added yet.</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.exercisesContainer}>
          {activeWorkout.exercises.length === 0 && (
             <View style={styles.emptyState}>
                <Dumbbell size={48} color={COLORS.slate[300]} style={{ marginBottom: 16 }} />
                <Text style={styles.emptyStateText}>No exercises added yet</Text>
                <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.emptyStateButton}>
                  <Text style={styles.emptyStateButtonText}>Add an Exercise</Text>
                </TouchableOpacity>
             </View>
          )}

          {activeWorkout.exercises.map((item) => {
            if (item.type === 'group') {
              return (
                <View key={item.instanceId} style={styles.groupContainer}>
                  <View style={styles.groupHeader}>
                    <Layers size={14} color={COLORS.indigo[600]} />
                    <Text style={styles.groupTitle}>{item.groupType}</Text>
                  </View>
                  <View style={styles.groupContent}>
                    {item.children.map(childEx => renderExerciseCard(childEx))}
                  </View>
                </View>
              );
            }
            return renderExerciseCard(item);
          })}
          
          <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.addExerciseButton}>
            <Plus size={20} color={COLORS.slate[500]} />
            <Text style={styles.addExerciseButtonText}>ADD EXERCISE</Text>
          </TouchableOpacity>

          {hasExercises && (
            <TouchableOpacity 
              onPress={() => setFinishModalOpen(true)} 
              style={styles.bottomFinishButton}
            >
              <Text style={styles.bottomFinishButtonText}>FINISH WORKOUT</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <ExercisePickerModal 
        isOpen={showPicker} 
        onClose={() => setShowPicker(false)} 
        onAdd={handleAddExercisesFromPicker}
        onCreate={() => setIsCreateModalOpen(true)}
        exercises={exercisesLibrary}
      />

      <NewExerciseModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateExerciseSave}
        categories={CATEGORIES}
      />

      <Modal visible={isNoteModalOpen} transparent animationType="fade" onRequestClose={() => setIsNoteModalOpen(false)}>
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
               {/* Native Date Picker would be better, but for parity with web code using text input type='date' logic or similar */}
               <TextInput 
                 style={styles.dateInput}
                 value={newNoteDate}
                 onChangeText={setNewNoteDate}
                 placeholder="YYYY-MM-DD"
               />
               <CalendarDays size={18} color={COLORS.slate[400]} style={styles.dateIcon} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsNoteModalOpen(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleAddNote} 
                disabled={!newNote.trim()} 
                style={[styles.modalAdd, !newNote.trim() && styles.modalAddDisabled]}
              >
                <Text style={styles.modalAddText}>Add Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={finishModalOpen} transparent animationType="fade" onRequestClose={() => setFinishModalOpen(false)}>
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <Text style={styles.modalTitle}>Finish Workout?</Text>
               <Text style={styles.modalSubtitle}>All sets will be saved to your history.</Text>
               <View style={styles.modalActions}>
                 <TouchableOpacity onPress={() => setFinishModalOpen(false)} style={styles.modalCancel}>
                   <Text style={styles.modalCancelText}>Cancel</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={handleFinish} style={styles.modalFinish}>
                   <Text style={styles.modalFinishText}>Finish</Text>
                 </TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>

      <Modal visible={cancelModalOpen} transparent animationType="fade" onRequestClose={() => setCancelModalOpen(false)}>
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <Text style={styles.modalTitle}>Cancel Workout?</Text>
               <Text style={styles.modalSubtitle}>Are you sure you want to cancel? All progress will be lost.</Text>
               <View style={styles.modalActions}>
                 <TouchableOpacity onPress={() => setCancelModalOpen(false)} style={styles.modalCancel}>
                   <Text style={styles.modalCancelText}>No, Keep Going</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={confirmCancel} style={[styles.modalFinish, { backgroundColor: COLORS.red[600] }]}>
                   <Text style={styles.modalFinishText}>Yes, Cancel</Text>
                 </TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
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
    fontFamily: 'monospace', // Or Platform.OS === 'ios' ? 'Courier' : 'monospace'
    fontWeight: 'bold',
  },
  finishButton: {
    backgroundColor: COLORS.blue[600],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  finishButtonDisabled: {
    opacity: 0.5,
  },
  finishButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  notesSection: {
    backgroundColor: COLORS.slate[100],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
  },
  notesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate[500],
  },
  notesBadge: {
    backgroundColor: COLORS.blue[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  notesBadgeText: {
    fontSize: 10,
    color: COLORS.blue[600],
    fontWeight: 'bold',
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.blue[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addNoteText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.blue[600],
  },
  notesList: {
    padding: 16,
  },
  emptyNotesText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.slate[400],
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  exercisesContainer: {
    padding: 16,
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    borderWidth: 2,
    borderColor: COLORS.slate[200],
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  emptyStateText: {
    color: COLORS.slate[400],
    marginBottom: 16,
  },
  emptyStateButton: {
    
  },
  emptyStateButtonText: {
    color: COLORS.blue[600],
    fontWeight: 'bold',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: COLORS.slate[300],
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  addExerciseButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate[500],
  },
  bottomFinishButton: {
    backgroundColor: COLORS.blue[600],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  bottomFinishButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  exerciseCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
    overflow: 'hidden',
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.slate[50],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  exerciseContent: {
    padding: 8,
  },
  columnHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  colIndex: {
    width: 32,
    alignItems: 'center',
  },
  colInputs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 12,
  },
  colCheck: {
    width: 32,
    alignItems: 'center',
  },
  colHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.slate[400],
    textTransform: 'uppercase',
  },
  setsContainer: {
    gap: 4,
  },
  addSetButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: COLORS.transparent,
  },
  addSetButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.blue[600],
  },
  groupContainer: {
    borderWidth: 2,
    borderColor: COLORS.indigo[100],
    borderRadius: 16,
    padding: 8,
    backgroundColor: 'rgba(224, 231, 255, 0.3)', // indigo-50/30
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.indigo[600],
    textTransform: 'uppercase',
  },
  groupContent: {
    gap: 12,
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
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.slate[500],
    marginBottom: 24,
  },
  noteInput: {
    backgroundColor: COLORS.slate[50],
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: COLORS.slate[900],
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.slate[50],
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    borderRadius: 12,
    marginBottom: 16,
  },
  dateInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: COLORS.slate[600],
  },
  dateIcon: {
    marginRight: 12,
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
  modalAdd: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
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
  modalFinish: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.blue[600],
  },
  modalFinishText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default LiveWorkoutScreen;
