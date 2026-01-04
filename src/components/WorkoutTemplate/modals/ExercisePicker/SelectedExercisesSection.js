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
  // Map of uniqueKey (id-index) -> assigned number (numbers are fixed once assigned)
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

  const handleReorderItemPress = useCallback((uniqueKey) => {
    if (!isReordering) {
      // Extract the original ID from the unique key (format: "id-index")
      const originalId = uniqueKey.split('-').slice(0, -1).join('-');
      onToggleSelect(originalId);
      return;
    }

    // If already assigned, remove assignment (allow undo)
    if (reorderAssignments[uniqueKey] !== undefined) {
      const newAssignments = { ...reorderAssignments };
      delete newAssignments[uniqueKey];
      setReorderAssignments(newAssignments);
      return;
    }

    // Assign the lowest available number
    const nextNumber = getLowestAvailableNumber();
    const newAssignments = { ...reorderAssignments, [uniqueKey]: nextNumber };
    setReorderAssignments(newAssignments);
  }, [isReordering, reorderAssignments, onToggleSelect, getLowestAvailableNumber]);

  const handleSaveReorder = useCallback(() => {
    if (onReorder && Object.keys(reorderAssignments).length === selectedExercises.length) {
      // Convert assignments to ordered array of IDs (extract original ID from unique key)
      const orderedIds = Object.entries(reorderAssignments)
        .sort((a, b) => a[1] - b[1])
        .map(entry => {
          const uniqueKey = entry[0];
          // Extract original ID (everything except the last "-index" part)
          return uniqueKey.split('-').slice(0, -1).join('-');
        });
      onReorder(orderedIds);
    }
    setIsReordering(false);
    setReorderAssignments({});
  }, [reorderAssignments, selectedExercises.length, onReorder]);

  // Check if all items have been assigned
  const allAssigned = assignedCount === selectedExercises.length;

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
        activeOpacity={0.7}
        onPress={() => setIsCollapsed(!isCollapsed)}
        style={headerStyle}
      >
        <View style={styles.headerLeft}>
          <Text style={headerTextStyle}>Selected ({selectedExercises.length})</Text>
          <View style={styles.collapseIcon}>
            {isCollapsed ? (
              <ChevronDown size={16} color={COLORS.white} />
            ) : (
              <ChevronUp size={16} color={COLORS.white} />
            )}
          </View>
        </View>
        {selectedExercises.length > 1 && (
          <View style={styles.headerButtons}>
            {isReordering ? (
              <>
                <TouchableOpacity 
                  onPress={handleReorderPress}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleSaveReorder}
                  style={[styles.saveButton, !allAssigned && styles.saveButtonDisabled]}
                  disabled={!allAssigned}
                >
                  <Text style={[styles.saveButtonText, !allAssigned && styles.saveButtonTextDisabled]}>
                    Save
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                onPress={handleReorderPress}
                style={styles.reorderButton}
              >
                <Text style={styles.reorderButtonText}>Reorder</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>

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
            // Create a unique key for this specific instance (handles duplicates)
            const uniqueKey = `${item.id}-${index}`;
            const isReordered = reorderAssignments[uniqueKey] !== undefined;
            const reorderPosition = reorderAssignments[uniqueKey] || 0;
            const originalOrder = index + 1;
            const isLastSelected = index === selectedExercises.length - 1;
            
            return (
              <ExerciseListItem
                key={uniqueKey}
                item={{ ...item, id: uniqueKey }}
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
  // Header left side container (text + chevron)
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Collapse/expand icon
  collapseIcon: {
    // Icon styling if needed
  },
  // Header buttons container (for reorder/cancel/save)
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Reorder button base styles
  reorderButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Reorder button text base styles
  reorderButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  // Cancel button styles
  cancelButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  // Save button styles
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: COLORS.green[500],
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  saveButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  saveButtonTextDisabled: {
    opacity: 0.5,
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

