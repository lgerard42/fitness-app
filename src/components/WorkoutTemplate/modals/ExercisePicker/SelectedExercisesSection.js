import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react-native';
import { COLORS } from '../../../../constants/colors';
import ExerciseListItem from './ExerciseListItem';

const SelectedExercisesSection = ({
  selectedExercises,
  selectedOrder,
  groupedExercises = [],
  exerciseGroups = [],
  isCollapsed,
  setIsCollapsed,
  onToggleSelect,
  onReorder,
  onAddSet = null,
  onRemoveSet = null,
  isGroupMode = false,
  groupSelectionMode = null,
  selectedGroupType = null,
  groupSelectionIndices = [],
  setGroupSelectionIndices = null,
  setSelectedGroupType = null,
  setIsGroupMode = null,
  setGroupSelectionMode = null,
  handleStartGroupingMode = null,
  handleToggleGroupType = null,
  handleEditGroup = null,
  handleSaveGroup = null,
  handleCancelGroup = null,
  getExerciseGroup = null,
  isExerciseInGroup = null,
  editingGroupId = null,
  filtered = [],
}) => {
  const [isReordering, setIsReordering] = useState(false);
  const [reorderAssignments, setReorderAssignments] = useState({});
  const hasAutoExpandedRef = useRef(false);

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

  const handleGroupItemToggle = useCallback((exerciseIndex) => {
    if (!setGroupSelectionIndices) return;
    
    setGroupSelectionIndices(prev => {
      if (prev.includes(exerciseIndex)) {
        // Remove from selection
        return prev.filter(idx => idx !== exerciseIndex);
      } else {
        // Add to selection (maintain order by index)
        const newSelection = [...prev, exerciseIndex].sort((a, b) => a - b);
        return newSelection;
      }
    });
  }, [setGroupSelectionIndices]);

  const handleReorderItemPress = useCallback((uniqueKey) => {
    if (isGroupMode && setGroupSelectionIndices && isExerciseInGroup && handleEditGroup) {
      // In group mode, extract index from uniqueKey
      const index = parseInt(uniqueKey.split('-').pop());
      if (isNaN(index)) return;
      
      // Check if this exercise is already in a group
      const exerciseGroup = getExerciseGroup ? getExerciseGroup(index) : null;
      
      if (exerciseGroup && exerciseGroup.id !== editingGroupId) {
        // Clicking on a different group - enter edit mode for that group
        handleEditGroup(exerciseGroup.id);
        return;
      }
      
      // Otherwise, toggle it in/out of the current group selection
      handleGroupItemToggle(index);
      return;
    }

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
  }, [isReordering, reorderAssignments, onToggleSelect, getLowestAvailableNumber, isGroupMode, setGroupSelectionIndices, handleGroupItemToggle, isExerciseInGroup, handleEditGroup, getExerciseGroup, editingGroupId]);

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

  // Auto-expand when first exercise is added (only once)
  useEffect(() => {
    if (selectedExercises.length > 0 && !hasAutoExpandedRef.current) {
      setIsCollapsed(false);
      hasAutoExpandedRef.current = true;
    } else if (selectedExercises.length === 0) {
      hasAutoExpandedRef.current = false;
    }
  }, [selectedExercises.length, setIsCollapsed]);

  const hasExercises = selectedExercises.length > 0;
  const canToggle = hasExercises && !isReordering && !isGroupMode;

  // Define styling condition variables
  const header_expanded = !isCollapsed && hasExercises;
  const header_collapsed = isCollapsed && hasExercises;
  
  const headerText_expanded = !isCollapsed;
  const headerText_collapsed = isCollapsed;
  
  const saveButton_disabled = !allAssigned;
  const saveButtonText_disabled = !allAssigned;
  
  const listContainer_expanded = !isCollapsed;
  const listContainer_collapsed = isCollapsed;

  return (
    <View style={{
      borderBottomWidth: (isCollapsed && hasExercises) ? 0 : 2,
      borderBottomColor: COLORS.slate[200],
    }}>
      <TouchableOpacity 
        activeOpacity={canToggle ? 0.7 : 1}
        onPress={canToggle ? () => setIsCollapsed(!isCollapsed) : undefined}
        disabled={!canToggle}
        style={[
          hasExercises ? {
            // active: enabled state styling
            backgroundColor: COLORS.blue[400],
            paddingHorizontal: 16,
            paddingVertical: 8,
            minHeight: 40,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.slate[200],
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          } : {
            // disabled: no exercises state styling
            backgroundColor: COLORS.slate[300],
            paddingHorizontal: 16,
            paddingVertical: 8,
            minHeight: 40,
            borderBottomWidth: 0,
            borderBottomColor: COLORS.slate[200],
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            opacity: 0.6,
          },
          header_expanded && {
            
          },
          header_collapsed && {
          }
        ]}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}>
          <Text style={hasExercises ? {
            // active: enabled state text styling
            fontSize: 12,
            fontWeight: 'bold',
            color: COLORS.white,
            textTransform: 'uppercase',
          } : {
            // disabled: no exercises state text styling
            fontSize: 12,
            fontWeight: 'bold',
            color: COLORS.slate[600],
            textTransform: 'uppercase',
          }}>
            Selected ({selectedExercises.length})
          </Text>
          {hasExercises && (
            <View style={{
              
            }}>
              {isCollapsed ? (
                <ChevronDown size={16} color={COLORS.white} />
              ) : (
                <ChevronUp size={16} color={COLORS.white} />
              )}
            </View>
          )}
        </View>
        {selectedExercises.length >= 2 && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            {isGroupMode ? (
              // Grouping mode: Show Cancel and Save
              <>
                <TouchableOpacity 
                  onPress={handleCancelGroup}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 4,
                    backgroundColor: COLORS.slate[100],
                  }}
                >
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: COLORS.slate[400],
                    textTransform: 'uppercase',
                  }}>Cancel</Text>
                </TouchableOpacity>
                {handleSaveGroup && (
                  <TouchableOpacity
                    onPress={handleSaveGroup}
                    disabled={groupSelectionIndices.length < 2}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 4,
                      backgroundColor: groupSelectionIndices.length >= 2 ? COLORS.green[500] : COLORS.slate[300],
                    }}
                  >
                    <Text style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: COLORS.white,
                      textTransform: 'uppercase',
                    }}>Save</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : isReordering ? (
              // Reordering mode: Show Cancel and Save
              <>
                <TouchableOpacity 
                  onPress={handleReorderPress}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 4,
                    backgroundColor: COLORS.slate[100],
                  }}
                >
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: COLORS.slate[400],
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
                  ]}>Save
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              // Normal mode: Show Reorder and Group buttons
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
                  }}>Reorder</Text>
                </TouchableOpacity>
                {handleStartGroupingMode && (
                  <TouchableOpacity 
                    onPress={() => {
                      if (isCollapsed) {
                        setIsCollapsed(false);
                      }
                      if (handleStartGroupingMode) {
                        handleStartGroupingMode();
                      }
                    }}
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
                    }}>Group</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </TouchableOpacity>

      {hasExercises && isReordering && (
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

      {hasExercises && isGroupMode && (
        <View style={{
          backgroundColor: COLORS.blue[100],
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.blue[200],
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: 12,
            color: COLORS.blue[800],
            fontWeight: '500',
          }}>
            {groupSelectionMode === 'create' ? `Creating ${selectedGroupType}` : `Editing ${selectedGroupType} group`} — ({groupSelectionIndices.length} selected)
          </Text>
          {handleToggleGroupType && selectedGroupType && (
            <View style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 4,
              padding: 2,
            }}>
              <TouchableOpacity 
                onPress={() => {
                  if (selectedGroupType !== 'Superset' && handleToggleGroupType) {
                    handleToggleGroupType();
                  }
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 3,
                  backgroundColor: selectedGroupType === 'Superset' ? COLORS.white : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: selectedGroupType === 'Superset' ? COLORS.slate[700] : COLORS.white,
                  textTransform: 'uppercase',
                }}>Superset</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  if (selectedGroupType !== 'HIIT' && handleToggleGroupType) {
                    handleToggleGroupType();
                  }
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 3,
                  backgroundColor: selectedGroupType === 'HIIT' ? COLORS.white : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: selectedGroupType === 'HIIT' ? COLORS.slate[700] : COLORS.white,
                  textTransform: 'uppercase',
                }}>HIIT</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {hasExercises && !isCollapsed && (
        <View style={[
          {
            
          },
          listContainer_expanded && {
            
          },
          listContainer_collapsed && {
            
          }
        ]}>
          {isGroupMode && filtered ? (
            // In group mode, show individual items from selectedOrder
            selectedOrder.map((exerciseId, orderIndex) => {
              const exercise = filtered.find(ex => ex.id === exerciseId);
              if (!exercise) return null;
              
              const uniqueKey = `${exerciseId}-${orderIndex}`;
              const isSelectedInGroup = groupSelectionIndices.includes(orderIndex);
              const groupSelectionIndex = isSelectedInGroup 
                ? groupSelectionIndices.indexOf(orderIndex) + 1 
                : null;
              const existingGroup = getExerciseGroup ? getExerciseGroup(orderIndex) : null;
              
              // If exercise is selected for grouping, show a temporary group badge
              // Otherwise, show existing group if it exists
              let exerciseGroup = existingGroup;
              if (isSelectedInGroup && selectedGroupType && !existingGroup) {
                // Create temporary group object for display during group creation/editing
                if (editingGroupId) {
                  // Editing existing group - use its number
                  const editingGroup = exerciseGroups.find(g => g.id === editingGroupId);
                  exerciseGroup = editingGroup ? {
                    type: selectedGroupType,
                    number: editingGroup.number
                  } : null;
                } else {
                  // Creating new group - calculate next number
                  const groupsOfType = exerciseGroups.filter(g => g.type === selectedGroupType);
                  const nextNumber = groupsOfType.length === 0 
                    ? 1 
                    : Math.max(...groupsOfType.map(g => g.number)) + 1;
                  exerciseGroup = {
                    type: selectedGroupType,
                    number: nextNumber
                  };
                }
              }
              
              return (
                <ExerciseListItem
                  key={uniqueKey}
                  item={{ ...exercise, id: uniqueKey }}
                  isSelected={true}
                  isLastSelected={orderIndex === selectedOrder.length - 1}
                  selectionOrder={groupSelectionIndex || (orderIndex + 1)}
                  onToggle={handleReorderItemPress}
                  hideNumber={false}
                  isReordering={false}
                  isReordered={isSelectedInGroup}
                  showAddMore={false}
                  selectedCount={1}
                  renderingSection="selectedSection"
                  isGroupMode={true}
                  isSelectedInGroup={isSelectedInGroup}
                  exerciseGroup={exerciseGroup}
                />
              );
            })
          ) : (() => {
            // Organize exercises by groups for visual wrapping
            const renderItems = [];
            let groupPosition = 0; // Track position for groups and ungrouped items
            
            selectedExercises.forEach((item, index) => {
              const group = groupedExercises[index];
              const exerciseGroup = getExerciseGroup ? getExerciseGroup(group.startIndex) : null;
              
              if (exerciseGroup) {
                // Check if this is the first exercise in this group
                const isFirstInGroup = index === 0 || 
                  !getExerciseGroup || 
                  getExerciseGroup(groupedExercises[index - 1]?.startIndex)?.id !== exerciseGroup.id;
                
                if (isFirstInGroup) {
                  groupPosition++;
                  // Find all exercises in this group (consecutive)
                  const groupExercises = [];
                  let currentIndex = index;
                  while (currentIndex < selectedExercises.length) {
                    const currentGroup = groupedExercises[currentIndex];
                    if (!currentGroup) break;
                    const currentExerciseGroup = getExerciseGroup ? getExerciseGroup(currentGroup.startIndex) : null;
                    if (currentExerciseGroup?.id === exerciseGroup.id) {
                      groupExercises.push({
                        item: selectedExercises[currentIndex],
                        index: currentIndex,
                        group: currentGroup,
                        exerciseGroup: currentExerciseGroup
                      });
                      currentIndex++;
                    } else {
                      break;
                    }
                  }
                  
                  // Render group wrapper
                  renderItems.push(
                    <View 
                      key={`group-${exerciseGroup.id}-${groupPosition}`}
                      style={{
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: COLORS.slate[200],
                        borderRadius: 8,
                        backgroundColor: COLORS.slate[50],
                        padding: 8,
                      }}
                    >
                      {/* Group header with index number */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 4,
                        paddingBottom: 4,
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.slate[200],
                      }}>
                        <View style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: COLORS.indigo[600],
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 8,
                        }}>
                          <Text style={{
                            color: COLORS.white,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}>{groupPosition}</Text>
                        </View>
                        <View style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 12,
                          backgroundColor: COLORS.indigo[50],
                        }}>
                          <Text style={{
                            color: COLORS.indigo[600],
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}>{exerciseGroup.type === 'HIIT' ? 'H' : 'S'}{exerciseGroup.number}</Text>
                        </View>
                      </View>
                      
                      {/* Group exercises */}
                      {groupExercises.map(({ item: exerciseItem, index: exerciseIndex, group: exerciseGroupData }) => {
                        const uniqueKey = `${exerciseItem.id}-${exerciseIndex}`;
                        const isReordered = reorderAssignments[uniqueKey] !== undefined;
                        const reorderPosition = reorderAssignments[uniqueKey] || 0;
                        const originalOrder = exerciseIndex + 1;
                        const isLastInGroup = exerciseIndex === groupExercises[groupExercises.length - 1].index;
                        const selectedCount = exerciseGroupData ? exerciseGroupData.count : 0;
                        const originalId = exerciseItem.id;
                        
                        return (
                          <ExerciseListItem
                            key={uniqueKey}
                            item={{ ...exerciseItem, id: uniqueKey }}
                            isSelected={true}
                            isLastSelected={false}
                            selectionOrder={isReordering ? reorderPosition : originalOrder}
                            onToggle={handleReorderItemPress}
                            hideNumber={true} // Hide individual numbers in groups
                            isReordering={isReordering}
                            isReordered={isReordered}
                            showAddMore={!isReordering}
                            onAddMore={onAddSet ? () => onAddSet(originalId, exerciseIndex) : null}
                            onRemoveSet={onRemoveSet ? () => onRemoveSet(originalId, exerciseIndex) : null}
                            selectedCount={selectedCount}
                            renderingSection="selectedSection"
                            exerciseGroup={null} // Don't show badge inside wrapper (it's in header)
                          />
                        );
                      })}
                    </View>
                  );
                }
                // Skip rendering if not first in group (already rendered in wrapper)
              } else {
                // Ungrouped exercise - render normally
                groupPosition++;
                const uniqueKey = `${item.id}-${index}`;
                const isReordered = reorderAssignments[uniqueKey] !== undefined;
                const reorderPosition = reorderAssignments[uniqueKey] || 0;
                const originalOrder = index + 1;
                const isLastSelected = index === selectedExercises.length - 1;
                const selectedCount = group ? group.count : 0;
                const originalId = item.id;
                
                renderItems.push(
                  <ExerciseListItem
                    key={uniqueKey}
                    item={{ ...item, id: uniqueKey }}
                    isSelected={true}
                    isLastSelected={isLastSelected}
                    selectionOrder={isReordering ? reorderPosition : groupPosition}
                    onToggle={handleReorderItemPress}
                    hideNumber={isReordering && !isReordered}
                    isReordering={isReordering}
                    isReordered={isReordered}
                    showAddMore={!isReordering}
                    onAddMore={onAddSet ? () => onAddSet(originalId, index) : null}
                    onRemoveSet={onRemoveSet ? () => onRemoveSet(originalId, index) : null}
                    selectedCount={selectedCount}
                    renderingSection="selectedSection"
                    exerciseGroup={null}
                  />
                );
              }
            });
            
            return renderItems;
          })()}
        </View>
      )}
    </View>
  );
};

export default SelectedExercisesSection;