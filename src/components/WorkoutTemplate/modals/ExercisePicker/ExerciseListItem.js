import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../../../constants/colors';

const ExerciseListItem = ({ 
  item, 
  isSelected, 
  isLastSelected, 
  selectionOrder, 
  onToggle,
  hideNumber = false,
  isReordering = false,
  isReordered = false,
  // New props for "add more" mode in unselected list
  showAddMore = false,
  onAddMore = null,
  selectedCount = 0,
  // Style override props for selected items in unselected list
  selectedInListStyle = null,
  selectedInListNameStyle = null,
}) => {
  const handlePress = () => {
    if (showAddMore && onAddMore) {
      onAddMore(item.id);
    } else {
      onToggle(item.id);
    }
  };

  // Determine if this is a selected item in the SelectedExercisesSection vs in the main list
  const isSelectedInMainList = isSelected && showAddMore;
  const isSelectedInSelectedSection = isSelected && !showAddMore;

  return (
    <TouchableOpacity 
      onPress={handlePress}
      style={[
        styles.exerciseItem, 
        isSelectedInSelectedSection && styles.exerciseItemSelected,
        isSelectedInMainList && styles.exerciseItemSelectedInList,
        isLastSelected && styles.exerciseItemLastSelected,
        isReordering && styles.exerciseItemReordering,
        isReordering && isReordered && styles.exerciseItemReordered,
        showAddMore && styles.exerciseItemAddMore,
        selectedInListStyle,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[
          styles.exerciseName, 
          isSelectedInSelectedSection && styles.exerciseNameSelected,
          isSelectedInMainList && styles.exerciseNameSelectedInList,
          isReordering && !isReordered && styles.exerciseNameReordering,
          showAddMore && styles.exerciseNameAddMore,
          selectedInListNameStyle,
        ]}>
          {item.name}
        </Text>
        <View style={styles.tagsRow}>
          <View style={[styles.tagContainer, showAddMore && styles.tagContainerAddMore]}>
            <Text style={[styles.tagText, showAddMore && styles.tagTextAddMore]}>{item.category}</Text>
          </View>
          {item.primaryMuscles.slice(0, 2).map(m => (
            <View key={m} style={[styles.muscleTagContainer, showAddMore && styles.muscleTagContainerAddMore]}>
              <Text style={[styles.muscleTagText, showAddMore && styles.muscleTagTextAddMore]}>{m}</Text>
            </View>
          ))}
        </View>
      </View>
      {showAddMore ? (
        <View style={styles.addMoreButton}>
          <Text style={styles.addMoreText}>{selectedCount}</Text>
        </View>
      ) : (
        <View style={[
          styles.checkbox, 
          isSelected ? styles.checkboxSelected : styles.checkboxUnselected,
          isReordering && !isReordered && styles.checkboxReordering,
          isReordering && isReordered && styles.checkboxReordered
        ]}>
          {isSelected && !hideNumber ? (
            <Text style={styles.checkboxNumber}>{selectionOrder}</Text>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  exerciseItem: {
    paddingLeft: 16,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  // Style for selected items in SelectedExercisesSection
  exerciseItemSelected: {
    backgroundColor: COLORS.blue[50],
    borderBottomColor: COLORS.white,
    paddingVertical: 10,
    paddingRight: 32,
  },
  // Style for selected items in the main list (UnselectedExercisesList)
  exerciseItemSelectedInList: {
    backgroundColor: COLORS.blue[50],
    borderBottomColor: COLORS.slate[100],
    paddingVertical: 10,
  },
  exerciseItemLastSelected: {
    borderBottomColor: COLORS.slate[100],
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  // Style for exercise name in SelectedExercisesSection
  exerciseNameSelected: {
    color: COLORS.blue[600],
  },
  // Style for exercise name in the main list (UnselectedExercisesList)
  exerciseNameSelectedInList: {
    color: COLORS.slate[900],
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
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
  muscleTagContainer: {
    backgroundColor: COLORS.indigo[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  muscleTagText: {
    fontSize: 10,
    color: COLORS.indigo[600],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnselected: {
    borderColor: COLORS.slate[300],
  },
  checkboxSelected: {
    backgroundColor: COLORS.blue[600],
    borderColor: COLORS.blue[600],
  },
  checkboxNumber: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Reordering mode styles
  exerciseItemReordering: {
    backgroundColor: COLORS.white,
    borderBottomColor: COLORS.blue[100],
  },
  exerciseItemReordered: {
    backgroundColor: COLORS.blue[50],
    borderBottomColor: COLORS.blue[100],
  },
  exerciseNameReordering: {
    color: COLORS.blue[700],
  },
  checkboxReordering: {
    backgroundColor: 'transparent',
    borderColor: COLORS.amber[400],
    borderStyle: 'dashed',
  },
  checkboxReordered: {
    backgroundColor: COLORS.blue[500],
    borderColor: COLORS.blue[500],
  },
  // "Add More" mode styles (for selected items shown in unselected list)
  exerciseItemAddMore: {
    // Style for selected exercise row in the main list
  },
  exerciseNameAddMore: {
    // Style for exercise name when in add more mode
  },
  tagContainerAddMore: {
    // Style for category tag when in add more mode
  },
  tagTextAddMore: {
    // Style for category tag text when in add more mode
  },
  muscleTagContainerAddMore: {
    // Style for muscle tag when in add more mode
  },
  muscleTagTextAddMore: {
    // Style for muscle tag text when in add more mode
  },
  addMoreButton: {
    width: 24,
    height: 24,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreText: {
    color: COLORS.blue[600],
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ExerciseListItem;

