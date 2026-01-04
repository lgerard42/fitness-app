import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
  const [reorderAssignments, setReorderAssignments] = useState({});

  const assignedCount = Object.keys(reorderAssignments).length;

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
      setIsReordering(false);
      setReorderAssignments({});
    } else {
      if (isCollapsed) {
        setIsCollapsed(false);
      }
      setIsReordering(true);
      setReorderAssignments({});
    }
  }, [isReordering, isCollapsed, setIsCollapsed]);

  const handleReorderItemPress = useCallback((uniqueKey) => {
    if (!isReordering) {
      const originalId = uniqueKey.split('-').slice(0, -1).join('-');
      onToggleSelect(originalId);
      return;
    }

    if (reorderAssignments[uniqueKey] !== undefined) {
      const newAssignments = { ...reorderAssignments };
      delete newAssignments[uniqueKey];
      setReorderAssignments(newAssignments);
      return;
    }

    const nextNumber = getLowestAvailableNumber();
    const newAssignments = { ...reorderAssignments, [uniqueKey]: nextNumber };
    setReorderAssignments(newAssignments);
  }, [isReordering, reorderAssignments, onToggleSelect, getLowestAvailableNumber]);

  const handleSaveReorder = useCallback(() => {
    if (onReorder && Object.keys(reorderAssignments).length === selectedExercises.length) {
      const orderedIds = Object.entries(reorderAssignments)
        .sort((a, b) => a[1] - b[1])
        .map(entry => {
          const uniqueKey = entry[0];
          return uniqueKey.split('-').slice(0, -1).join('-');
        });
      onReorder(orderedIds);
    }
    setIsReordering(false);
    setReorderAssignments({});
  }, [reorderAssignments, selectedExercises.length, onReorder]);

  const allAssigned = assignedCount === selectedExercises.length;

  // Define styling condition variables
  const header_expanded = !isCollapsed;
  const header_collapsed = isCollapsed;
  
  const headerText_expanded = !isCollapsed;
  const headerText_collapsed = isCollapsed;
  
  const saveButton_disabled = !allAssigned;
  const saveButtonText_disabled = !allAssigned;
  
  const listContainer_expanded = !isCollapsed;
  const listContainer_collapsed = isCollapsed;

  if (selectedExercises.length === 0) {
    return null;
  }

  return (
    <View style={{
      borderBottomWidth: 1,
      borderBottomColor: COLORS.slate[200],
    }}>
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => setIsCollapsed(!isCollapsed)}
        style={[
          {
            backgroundColor: COLORS.blue[400],
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.slate[200],
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
          header_expanded && {
            
          },
          header_collapsed && {
            marginBottom: -1,
            
          }
        ]}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}>
          <Text style={[
            {
              fontSize: 12,
              fontWeight: 'bold',
              color: COLORS.white,
              textTransform: 'uppercase',
            },
            headerText_expanded && {
              
            },
            headerText_collapsed && {
              
            }
          ]}>Selected ({selectedExercises.length})</Text>
          <View style={{
            
          }}>
            {isCollapsed ? (
              <ChevronDown size={16} color={COLORS.white} />
            ) : (
              <ChevronUp size={16} color={COLORS.white} />
            )}
          </View>
        </View>
        {selectedExercises.length > 1 && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            {isReordering ? (
              <>
                <TouchableOpacity 
                  onPress={handleReorderPress}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: COLORS.white,
                    textTransform: 'uppercase',
                  }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleSaveReorder}
                  style={[
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 4,
                      backgroundColor: COLORS.green[500],
                    },
                    saveButton_disabled && {
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    }
                  ]}
                  disabled={!allAssigned}
                >
                  <Text style={[
                    {
                      fontSize: 11,
                      fontWeight: '600',
                      color: COLORS.white,
                      textTransform: 'uppercase',
                    },
                    saveButtonText_disabled && {
                      opacity: 0.5,
                    }
                  ]}>
                    Save
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                onPress={handleReorderPress}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <Text style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: COLORS.white,
                  textTransform: 'uppercase',
                }}>Reorder</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>

      {isReordering && (
        <View style={{
          backgroundColor: COLORS.amber[100],
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.amber[200],
        }}>
          <Text style={{
            fontSize: 12,
            color: COLORS.amber[800],
            textAlign: 'center',
            fontWeight: '500',
          }}>
            Assigning {assignedCount}/{selectedExercises.length} — tap to reassign
          </Text>
        </View>
      )}
      
      {!isCollapsed && (
        <View style={[
          {
            
          },
          listContainer_expanded && {
            
          },
          listContainer_collapsed && {
            
          }
        ]}>
          {selectedExercises.map((item, index) => {
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

export default SelectedExercisesSection;