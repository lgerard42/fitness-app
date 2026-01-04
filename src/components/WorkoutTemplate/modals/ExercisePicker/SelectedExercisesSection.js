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

  // Get the appropriate styles based on collapsed state
  const headerStyle = isCollapsed 
    ? [styles.header, styles.headerCollapsed] 
    : [styles.header, styles.headerExpanded];
  
  const headerTextStyle = isCollapsed 
    ? [styles.headerText, styles.headerTextCollapsed] 
    : [styles.headerText, styles.headerTextExpanded];
  
  const listStyle = isCollapsed 
    ? [styles.list, styles.listCollapsed] 
    : [styles.list, styles.listExpanded];

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={() => setIsCollapsed(!isCollapsed)}
        style={headerStyle}
      >
        <Text style={headerTextStyle}>Selected ({selectedExercises.length})</Text>
        {isCollapsed ? (
          <ChevronDown size={16} color={COLORS.slate[600]} />
        ) : (
          <ChevronUp size={16} color={COLORS.slate[600]} />
        )}
      </TouchableOpacity>
      
      {!isCollapsed && (
        <View style={listStyle}>
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
  // Base header styles (shared)
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
  // Header styles when expanded (override base)
  headerExpanded: {
    // Add expanded-specific styles here
  },
  // Header styles when collapsed (override base)
  headerCollapsed: {
    // Add collapsed-specific styles here
  },
  // Base headerText styles (shared)
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[600],
    textTransform: 'uppercase',
  },
  // HeaderText styles when expanded (override base)
  headerTextExpanded: {
    // Add expanded-specific styles here
  },
  // HeaderText styles when collapsed (override base)
  headerTextCollapsed: {
    // Add collapsed-specific styles here
  },
  // Base list styles (shared)
  list: {},
  // List styles when expanded (override base)
  listExpanded: {
    // Add expanded-specific styles here
  },
  // List styles when collapsed (override base)
  listCollapsed: {
    // Add collapsed-specific styles here
  },
});

export default SelectedExercisesSection;

