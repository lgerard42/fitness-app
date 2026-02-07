import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Target, TrendingUp } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useUserSettings } from '@/context/UserSettingsContext';
import { useWorkout } from '@/context/WorkoutContext';
import type { GoalType, UserGoal } from '@/types/workout';

interface AddGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (goal: Omit<UserGoal, 'id' | 'createdAt' | 'completed'>) => void;
}

const AddGoalModal: React.FC<AddGoalModalProps> = ({ visible, onClose, onSave }) => {
  const { settings } = useUserSettings();
  const { exercisesLibrary } = useWorkout();

  const [goalType, setGoalType] = useState<GoalType>('strength');
  // Strength fields
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showExerciseList, setShowExerciseList] = useState(false);
  // Consistency fields
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState('');

  const liftExercises = exercisesLibrary.filter(e => e.category === 'Lifts');
  const filteredExercises = exerciseSearch
    ? liftExercises.filter(e => e.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
    : liftExercises.slice(0, 20);

  const selectedExercise = liftExercises.find(e => e.id === selectedExerciseId);

  const resetForm = () => {
    setGoalType('strength');
    setSelectedExerciseId('');
    setTargetWeight('');
    setExerciseSearch('');
    setShowExerciseList(false);
    setWorkoutsPerWeek('');
  };

  const handleSave = () => {
    if (goalType === 'strength') {
      if (!selectedExerciseId || !targetWeight) return;
      onSave({
        type: 'strength',
        exerciseId: selectedExerciseId,
        exerciseName: selectedExercise?.name ?? '',
        targetWeight: parseFloat(targetWeight),
        targetWeightUnit: settings.weightUnit,
      });
    } else {
      if (!workoutsPerWeek) return;
      onSave({
        type: 'consistency',
        targetWorkoutsPerWeek: parseInt(workoutsPerWeek, 10),
      });
    }
    resetForm();
    onClose();
  };

  const isValid =
    goalType === 'strength'
      ? !!selectedExerciseId && !!targetWeight
      : !!workoutsPerWeek;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Set a Goal</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={COLORS.slate[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Goal Type Picker */}
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                onPress={() => setGoalType('strength')}
                style={[styles.segmentButton, goalType === 'strength' && styles.segmentActive]}
              >
                <TrendingUp size={14} color={goalType === 'strength' ? COLORS.blue[600] : COLORS.slate[400]} />
                <Text style={[styles.segmentText, goalType === 'strength' && styles.segmentTextActive]}>
                  Strength
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setGoalType('consistency')}
                style={[styles.segmentButton, goalType === 'consistency' && styles.segmentActive]}
              >
                <Target size={14} color={goalType === 'consistency' ? COLORS.blue[600] : COLORS.slate[400]} />
                <Text style={[styles.segmentText, goalType === 'consistency' && styles.segmentTextActive]}>
                  Consistency
                </Text>
              </TouchableOpacity>
            </View>

            {goalType === 'strength' ? (
              <View>
                {/* Exercise Picker */}
                <Text style={styles.fieldLabel}>Exercise</Text>
                <TouchableOpacity
                  style={styles.exerciseSelector}
                  onPress={() => setShowExerciseList(!showExerciseList)}
                >
                  <Text style={selectedExercise ? styles.exerciseSelected : styles.exercisePlaceholder}>
                    {selectedExercise ? selectedExercise.name : 'Select an exercise...'}
                  </Text>
                </TouchableOpacity>

                {showExerciseList && (
                  <View style={styles.exerciseListContainer}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search exercises..."
                      placeholderTextColor={COLORS.slate[400]}
                      value={exerciseSearch}
                      onChangeText={setExerciseSearch}
                    />
                    <ScrollView style={styles.exerciseList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {filteredExercises.map(ex => (
                        <TouchableOpacity
                          key={ex.id}
                          style={[
                            styles.exerciseItem,
                            ex.id === selectedExerciseId && styles.exerciseItemSelected,
                          ]}
                          onPress={() => {
                            setSelectedExerciseId(ex.id);
                            setShowExerciseList(false);
                            setExerciseSearch('');
                          }}
                        >
                          <Text
                            style={[
                              styles.exerciseItemText,
                              ex.id === selectedExerciseId && styles.exerciseItemTextSelected,
                            ]}
                          >
                            {ex.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Target Weight */}
                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Target Weight</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    placeholder="0"
                    placeholderTextColor={COLORS.slate[300]}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.inputUnit}>{settings.weightUnit}</Text>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.fieldLabel}>Workouts per Week</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={workoutsPerWeek}
                    onChangeText={setWorkoutsPerWeek}
                    placeholder="4"
                    placeholderTextColor={COLORS.slate[300]}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.inputUnit}>/ week</Text>
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!isValid}
            >
              <Text style={[styles.saveButtonText, !isValid && styles.saveButtonTextDisabled]}>
                Save Goal
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate[900],
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.slate[100],
    borderRadius: 10,
    padding: 3,
    marginBottom: 24,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate[500],
  },
  segmentTextActive: {
    color: COLORS.blue[600],
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  exerciseSelector: {
    backgroundColor: COLORS.slate[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  exercisePlaceholder: {
    fontSize: 15,
    color: COLORS.slate[400],
  },
  exerciseSelected: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.slate[900],
  },
  exerciseListContainer: {
    backgroundColor: COLORS.slate[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    marginTop: 8,
    maxHeight: 220,
    overflow: 'hidden',
  },
  searchInput: {
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
    color: COLORS.slate[900],
  },
  exerciseList: {
    maxHeight: 170,
  },
  exerciseItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  exerciseItemSelected: {
    backgroundColor: COLORS.blue[50],
  },
  exerciseItemText: {
    fontSize: 14,
    color: COLORS.slate[700],
  },
  exerciseItemTextSelected: {
    color: COLORS.blue[600],
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.slate[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.slate[900],
    paddingVertical: 14,
  },
  inputUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate[400],
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate[100],
  },
  saveButton: {
    backgroundColor: COLORS.blue[600],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.slate[200],
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  saveButtonTextDisabled: {
    color: COLORS.slate[400],
  },
});

export default AddGoalModal;
