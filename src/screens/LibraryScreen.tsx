import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { CATEGORIES } from '@/constants/data';
import { useWorkout } from '@/context/WorkoutContext';
import EditExercise from '@/components/WorkoutTemplate/modals/EditExercise';
import ExerciseHistoryModal from '@/components/ExerciseHistoryModal';
import type { ExerciseLibraryItem } from '@/types/workout';

const LibraryScreen: React.FC = () => {
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseLibraryItem | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseLibraryItem | null>(null);
  const { exercisesLibrary, addExerciseToLibrary, updateExerciseInLibrary, exerciseStats, activeWorkout } = useWorkout();

  const filteredExercises = exercisesLibrary.filter(ex => ex.name.toLowerCase().includes(search.toLowerCase()));

  const handleSaveNewExercise = (newEx: ExerciseLibraryItem) => {
    addExerciseToLibrary(newEx);
    setIsCreateModalOpen(false);
  };

  const handleUpdateExercise = (updatedEx: ExerciseLibraryItem) => {
    updateExerciseInLibrary(updatedEx.id, updatedEx);
    setEditingExercise(null);
    // Also update the selectedExercise so the history modal reflects changes
    setSelectedExercise(updatedEx);
  };

  const handleExerciseClick = (exercise: ExerciseLibraryItem) => {
    setSelectedExercise(exercise);
  };

  const handleEditFromHistory = (exercise: ExerciseLibraryItem) => {
    // Close the history modal first, then open EditExercise
    setSelectedExercise(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setEditingExercise(exercise);
      });
    });
  };

  return (
    <SafeAreaView 
      style={styles.container}
      edges={activeWorkout ? ['bottom', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Exercise Library</Text>
          <TouchableOpacity onPress={() => setIsCreateModalOpen(true)} style={styles.addButton}>
            <Plus size={14} color={COLORS.white} strokeWidth={3} />
            <Text style={styles.addButtonText}>ADD NEW</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <TextInput 
            style={styles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor={COLORS.slate[400]}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={filteredExercises}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleExerciseClick(item)} style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <View style={styles.tagsRow}>
              <View style={styles.tagContainer}>
                <Text style={styles.tagText}>{item.category}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Create new exercise modal */}
      <EditExercise 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSave={handleSaveNewExercise} 
        categories={CATEGORIES} 
      />

      {/* Edit existing exercise modal */}
      <EditExercise
        isOpen={!!editingExercise}
        onClose={() => {
          setEditingExercise(null);
          // Reopen history modal with the exercise that was being edited
          if (editingExercise) {
            const currentExercise = exercisesLibrary.find(ex => ex.id === editingExercise.id) || editingExercise;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setSelectedExercise(currentExercise);
              });
            });
          }
        }}
        onSave={handleUpdateExercise}
        categories={CATEGORIES}
        exercise={editingExercise}
      />

      <ExerciseHistoryModal
        visible={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
        exercise={selectedExercise}
        stats={selectedExercise ? (exerciseStats[selectedExercise.id] || {}) : {}}
        onEdit={handleEditFromHistory}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate[50],
  },
  header: {
    padding: 16,
    backgroundColor: COLORS.slate[50],
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.blue[600],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  searchContainer: {
    width: '100%',
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.slate[900],
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  tagsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  tagContainer: {
    backgroundColor: COLORS.slate[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: COLORS.slate[500],
  },
});

export default LibraryScreen;
