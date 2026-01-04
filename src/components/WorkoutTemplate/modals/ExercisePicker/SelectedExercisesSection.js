import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { COLORS } from '../../../../constants/colors';
import ExerciseListItem from './ExerciseListItem';

const SelectedExercisesSection = ({
  selectedExercises,
  selectedOrder,
  isCollapsed,
  setIsCollapsed,
  onToggleSelect
}) => {
  if (selectedExercises.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={() => setIsCollapsed(!isCollapsed)}
        style={styles.header}
      >
        <Text style={styles.headerText}>Selected ({selectedExercises.length})</Text>
        {isCollapsed ? (
          <ChevronDown size={16} color={COLORS.slate[600]} />
        ) : (
          <ChevronUp size={16} color={COLORS.slate[600]} />
        )}
      </TouchableOpacity>
      
      {!isCollapsed && (
        <View style={styles.list}>
          {selectedExercises.map((item, index) => {
            const selectionOrder = selectedOrder.indexOf(item.id) + 1;
            const isLastSelected = index === selectedExercises.length - 1;
            
            return (
              <ExerciseListItem
                key={item.id}
                item={item}
                isSelected={true}
                isLastSelected={isLastSelected}
                selectionOrder={selectionOrder}
                onToggle={onToggleSelect}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
  },
  header: {
    backgroundColor: COLORS.slate[50],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[600],
    textTransform: 'uppercase',
  },
  list: {},
});

export default SelectedExercisesSection;

