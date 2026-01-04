import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { COLORS } from '../../../../constants/colors';
import ExerciseListItem from './ExerciseListItem';

const SelectedExercisesSection = ({
  selectedExercises,
  selectedOrder,
  isCollapsed,
  setIsCollapsed,
  onToggleSelect,
  onReorder
}) => {
  const [isReordering, setIsReordering] = useState(false);
  // Map of exerciseId -> assigned number (numbers are fixed once assigned)
  const [reorderAssignments, setReorderAssignments] = useState({});

  // Get the count of assigned exercises
  const assignedCount = Object.keys(reorderAssignments).length;

  // Find the lowest available number (1 to N)
  const getLowestAvailableNumber = useCallback(() => {
    const assignedNumbers = Object.values(reorderAssignments);
    for (let i = 1; i <= selectedExercises.length; i++) {
      if (!assignedNumbers.includes(i)) {
        return i;
      }
    }
    return selectedExercises.length + 1;
  }, [reorderAssignments, selectedExercises.length]);

  const handleReorderPress = useCallback(() => {
    if (isReordering) {
      // Cancel reordering
      setIsReordering(false);
      setReorderAssignments({});
    } else {
      // Start reordering - expand if collapsed
      if (isCollapsed) {
        setIsCollapsed(false);
      }
      setIsReordering(true);
      setReorderAssignments({});
    }
  }, [isReordering, isCollapsed, setIsCollapsed]);

  const handleReorderItemPress = useCallback((itemId) => {
    if (!isReordering) {
      onToggleSelect(itemId);
      return;
    }

    // If already assigned, remove assignment (allow undo)
    if (reorderAssignments[itemId] !== undefined) {
      const newAssignments = { ...reorderAssignments };
      delete newAssignments[itemId];
      setReorderAssignments(newAssignments);
      return;
    }

    // Assign the lowest available number
    const nextNumber = getLowestAvailableNumber();
    const newAssignments = { ...reorderAssignments, [itemId]: nextNumber };
    setReorderAssignments(newAssignments);

    // If all items have been reordered, apply the new order
    if (Object.keys(newAssignments).length === selectedExercises.length) {
      if (onReorder) {
        // Convert assignments to ordered array of IDs
        const orderedIds = Object.entries(newAssignments)
          .sort((a, b) => a[1] - b[1])
          .map(entry => entry[0]);
        onReorder(orderedIds);
      }
      setIsReordering(false);
      setReorderAssignments({});
    }
  }, [isReordering, reorderAssignments, selectedExercises.length, onReorder, onToggleSelect, getLowestAvailableNumber]);

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
      <View style={headerStyle}>
        <Text style={headerTextStyle}>Selected ({selectedExercises.length})</Text>
        <View style={styles.headerButtons}>
          {selectedExercises.length > 1 && (
            <TouchableOpacity 
              onPress={handleReorderPress}
              style={[styles.reorderButton, isReordering && styles.reorderButtonActive]}
            >
              <Text style={[styles.reorderButtonText, isReordering && styles.reorderButtonTextActive]}>
                {isReordering ? 'Cancel' : 'Reorder'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={() => setIsCollapsed(!isCollapsed)}
            style={styles.collapseButton}
          >
            {isCollapsed ? (
              <ChevronDown size={16} color={COLORS.white} />
            ) : (
              <ChevronUp size={16} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {isReordering && (
        <View style={styles.reorderInstructions}>
          <Text style={styles.reorderInstructionsText}>
            Assigning {assignedCount}/{selectedExercises.length} — tap to reassign
          </Text>
        </View>
      )}
      
      {!isCollapsed && (
        <View style={listStyle}>
          {selectedExercises.map((item, index) => {
            const isReordered = reorderAssignments[item.id] !== undefined;
            const reorderPosition = reorderAssignments[item.id] || 0;
            const originalOrder = selectedOrder.indexOf(item.id) + 1;
            const isLastSelected = index === selectedExercises.length - 1;
            
            return (
              <ExerciseListItem
                key={item.id}
                item={item}
                isSelected={true}
                isLastSelected={isLastSelected}
                selectionOrder={isReordering ? reorderPosition : originalOrder}
                onToggle={handleReorderItemPress}
                hideNumber={isReordering && !isReordered}
                isReordering={isReordering}
                isReordered={isReordered}
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
    backgroundColor: COLORS.blue[400],
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
    marginBottom: -1,
    // Add collapsed-specific styles here
  },
  // Base headerText styles (shared)
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
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
  // Header buttons container
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Collapse/expand button
  collapseButton: {
    padding: 4,
  },
  // Reorder button base styles
  reorderButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Reorder button when active
  reorderButtonActive: {
    backgroundColor: COLORS.amber[500],
  },
  // Reorder button text base styles
  reorderButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  // Reorder button text when active
  reorderButtonTextActive: {
    color: COLORS.white,
  },
  // Reorder instructions bar
  reorderInstructions: {
    backgroundColor: COLORS.amber[100],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.amber[200],
  },
  reorderInstructionsText: {
    fontSize: 12,
    color: COLORS.amber[800],
    textAlign: 'center',
    fontWeight: '500',
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

