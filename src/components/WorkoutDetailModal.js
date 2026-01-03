import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, TextInput, Platform } from 'react-native';
import { X, Calendar, Clock, Dumbbell, Save, FileText } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import WorkoutSetRow from './WorkoutSetRow';
import SavedNoteItem from './SavedNoteItem';

const WorkoutDetailModal = ({ visible, onClose, workout, onSave }) => {
  const [editedWorkout, setEditedWorkout] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (workout) {
      setEditedWorkout(JSON.parse(JSON.stringify(workout))); // Deep copy
      setIsEditing(false);
    }
  }, [workout]);

  if (!editedWorkout) return null;

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setEditedWorkout({ ...editedWorkout, date: dateString });
    }
  };

  const handleUpdateSet = (exInstanceId, updatedSet) => {
    if (!isEditing) return;
    
    const updateExercisesDeep = (list) => {
      return list.map(item => {
        if (item.instanceId === exInstanceId) {
          return {
            ...item,
            sets: item.sets.map(s => s.id === updatedSet.id ? updatedSet : s)
          };
        }
        if (item.type === 'group' && item.children) {
          return { ...item, children: updateExercisesDeep(item.children) };
        }
        return item;
      });
    };

    setEditedWorkout({
      ...editedWorkout,
      exercises: updateExercisesDeep(editedWorkout.exercises)
    });
  };

  const handlePinNote = (noteId) => {
    if (!isEditing) return;
    const updatedNotes = editedWorkout.sessionNotes.map(n => 
      n.id === noteId ? { ...n, pinned: !n.pinned } : n
    ).sort((a, b) => {
      if (a.pinned === b.pinned) return 0;
      return a.pinned ? -1 : 1;
    });
    
    setEditedWorkout({ ...editedWorkout, sessionNotes: updatedNotes });
  };

  const handleRemoveNote = (noteId) => {
    if (!isEditing) return;
    setEditedWorkout({
      ...editedWorkout,
      sessionNotes: editedWorkout.sessionNotes.filter(n => n.id !== noteId)
    });
  };

  const handleUpdateNote = (updatedNote) => {
    if (!isEditing) return;
    setEditedWorkout({
      ...editedWorkout,
      sessionNotes: editedWorkout.sessionNotes.map(n => 
        n.id === updatedNote.id ? updatedNote : n
      )
    });
  };

  const handleSave = () => {
    onSave(editedWorkout);
    setIsEditing(false);
  };

  const renderExercise = (ex) => {
    // Calculate proper set numbers and group info
    let overallSetNumber = 0;
    const setsWithNumbers = ex.sets.map((set, idx) => {
      const dropSetId = set.dropSetId;
      let indexInGroup = null;
      let groupSetNumber = null;
      let isDropSetStart = false;
      let isDropSetEnd = false;
      
      if (dropSetId) {
        // Find all sets in this group
        const groupSets = ex.sets.filter(s => s.dropSetId === dropSetId);
        indexInGroup = groupSets.findIndex(s => s.id === set.id);
        
        // Check if this is the first or last set in the group
        isDropSetStart = indexInGroup === 0;
        isDropSetEnd = indexInGroup === groupSets.length - 1;
        
        // Only increment overall number for the first set in a group
        if (indexInGroup === 0) {
          overallSetNumber++;
        }
        groupSetNumber = overallSetNumber;
      } else {
        overallSetNumber++;
      }
      
      return {
        ...set,
        overallSetNumber,
        groupSetNumber,
        indexInGroup: indexInGroup !== null ? indexInGroup + 1 : null,
        totalInGroup: dropSetId ? ex.sets.filter(s => s.dropSetId === dropSetId).length : null,
        isDropSetStart,
        isDropSetEnd
      };
    });
    
    // Determine group set type for the visual indicator
    const getGroupSetType = (set) => {
      if (!set.dropSetId) return null;
      
      const groupSets = ex.sets.filter(s => s.dropSetId === set.dropSetId);
      const allWarmup = groupSets.length > 0 && groupSets.every(s => s.isWarmup);
      const allFailure = groupSets.length > 0 && groupSets.every(s => s.isFailure);
      
      if (allWarmup) return 'warmup';
      if (allFailure) return 'failure';
      return null;
    };
    
    return (
      <View key={ex.instanceId} style={styles.exerciseCard}>
        <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseName}>{ex.name}</Text>
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
            {setsWithNumbers.map((set, idx) => (
              <WorkoutSetRow 
                key={set.id} 
                index={idx} 
                set={set} 
                category={ex.category}
                onUpdate={(s) => handleUpdateSet(ex.instanceId, s)}
                readOnly={!isEditing}
                dropSetId={set.dropSetId}
                indexInGroup={set.indexInGroup}
                totalInGroup={set.totalInGroup}
                groupSetNumber={set.groupSetNumber}
                overallSetNumber={set.overallSetNumber}
                isDropSetStart={set.isDropSetStart}
                isDropSetEnd={set.isDropSetEnd}
                groupSetType={getGroupSetType(set)}
              />
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { marginTop: insets.top + 16 }]}>
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={COLORS.slate[900]} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              {isEditing ? (
                <TextInput
                  value={editedWorkout.name}
                  onChangeText={(text) => setEditedWorkout({...editedWorkout, name: text})}
                  style={styles.titleInput}
                />
              ) : (
                <Text style={styles.title}>{editedWorkout.name}</Text>
              )}
              
              {isEditing ? (
                Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={new Date(editedWorkout.date)}
                    mode="date"
                    display="compact"
                    onChange={onDateChange}
                    style={{ transform: [{ scale: 0.8 }], alignSelf: 'flex-start' }}
                  />
                ) : (
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.date}>{editedWorkout.date}</Text>
                  </TouchableOpacity>
                )
              ) : (
                <Text style={styles.date}>{editedWorkout.date}</Text>
              )}
              
              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                  value={new Date(editedWorkout.date)}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}
            </View>
            <TouchableOpacity 
              onPress={isEditing ? handleSave : () => setIsEditing(true)} 
              style={styles.editButton}
            >
              {isEditing ? (
                <Save size={24} color={COLORS.blue[600]} />
              ) : (
                <Text style={styles.editText}>Edit</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Clock size={16} color={COLORS.slate[500]} />
              <Text style={styles.statText}>{editedWorkout.duration}</Text>
            </View>
            <View style={styles.statItem}>
              <Dumbbell size={16} color={COLORS.slate[500]} />
              <Text style={styles.statText}>{editedWorkout.exercises?.length || 0} Exercises</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {editedWorkout.sessionNotes && editedWorkout.sessionNotes.length > 0 && (
              <View style={styles.notesSection}>
                <View style={styles.notesHeader}>
                  <FileText size={16} color={COLORS.slate[500]} />
                  <Text style={styles.notesTitle}>Workout Notes</Text>
                </View>
                {editedWorkout.sessionNotes.map((note) => (
                  <SavedNoteItem 
                    key={note.id} 
                    note={note} 
                    readOnly={!isEditing}
                    onPin={handlePinNote}
                    onRemove={handleRemoveNote}
                    onUpdate={handleUpdateNote}
                  />
                ))}
              </View>
            )}

            {editedWorkout.exercises?.map((item) => {
              if (item.type === 'group') {
                return (
                  <View key={item.instanceId} style={styles.groupContainer}>
                    <Text style={styles.groupTitle}>{item.groupType}</Text>
                    {item.children.map(child => renderExercise(child))}
                  </View>
                );
              }
              return renderExercise(item);
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.slate[50],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.slate[300],
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
  },
  headerCenter: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  titleInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.blue[500],
    minWidth: 150,
    textAlign: 'center',
  },
  date: {
    fontSize: 12,
    color: COLORS.slate[500],
    marginTop: 2,
  },
  editText: {
    color: COLORS.blue[600],
    fontWeight: 'bold',
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: COLORS.slate[600],
    fontWeight: '500',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  exerciseCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.slate[200],
  },
  exerciseHeader: {
    padding: 12,
    backgroundColor: COLORS.slate[50],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  exerciseName: {
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  exerciseContent: {
    padding: 12,
  },
  columnHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  colIndex: { width: 30 },
  colInputs: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  colCheck: { width: 30, alignItems: 'center' },
  colHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.slate[400],
    textTransform: 'uppercase',
  },
  setsContainer: {
    gap: 8,
  },
  groupContainer:{
    marginBottom: 16,
    padding: 8,
    backgroundColor: COLORS.indigo[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.indigo[100],
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.indigo[600],
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  notesSection: {
    marginBottom: 24,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate[500],
  },
});

export default WorkoutDetailModal;
