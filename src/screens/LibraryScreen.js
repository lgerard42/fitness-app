import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { Plus, Search } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { CATEGORIES } from '../constants/data';
import { useWorkout } from '../context/WorkoutContext';
import NewExerciseModal from '../components/NewExerciseModal';
import ExerciseHistoryModal from '../components/ExerciseHistoryModal';

const LibraryScreen = () => {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const { exercisesLibrary, addExerciseToLibrary, exerciseStats } = useWorkout();

  const filteredExercises = exercisesLibrary.filter(ex => ex.name.toLowerCase().includes(search.toLowerCase()));

  const handleSaveExercise = (newEx) => {
    addExerciseToLibrary(newEx);
    setIsModalOpen(false);
  };

  const handleExerciseClick = (exercise) => {
    setSelectedExercise(exercise);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Exercise Library</Text>
          <TouchableOpacity onPress={() => setIsModalOpen(true)} style={styles.addButton}>
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

      <NewExerciseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveExercise} 
        categories={CATEGORIES} 
      />

      <ExerciseHistoryModal
        visible={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
        exercise={selectedExercise}
        stats={selectedExercise ? (exerciseStats[selectedExercise.id] || {}) : {}}
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
