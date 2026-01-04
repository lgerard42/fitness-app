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
  isReordered = false
}) => {
  return (
    <TouchableOpacity 
      onPress={() => onToggle(item.id)}
      style={[
        styles.exerciseItem, 
        isSelected && styles.exerciseItemSelected,
        isLastSelected && styles.exerciseItemLastSelected,
        isReordering && styles.exerciseItemReordering,
        isReordering && isReordered && styles.exerciseItemReordered
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[
          styles.exerciseName, 
          isSelected && styles.exerciseNameSelected,
          isReordering && !isReordered && styles.exerciseNameReordering
        ]}>
          {item.name}
        </Text>
        <View style={styles.tagsRow}>
          <View style={styles.tagContainer}>
            <Text style={styles.tagText}>{item.category}</Text>
          </View>
          {item.primaryMuscles.slice(0, 2).map(m => (
            <View key={m} style={styles.muscleTagContainer}>
              <Text style={styles.muscleTagText}>{m}</Text>
            </View>
          ))}
        </View>
      </View>
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  exerciseItem: {
    paddingLeft: 16,
    paddingRight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  exerciseItemSelected: {
    backgroundColor: COLORS.blue[50],
    borderBottomColor: COLORS.blue[100],
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
  exerciseNameSelected: {
    color: COLORS.blue[600],
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
});

export default ExerciseListItem;

