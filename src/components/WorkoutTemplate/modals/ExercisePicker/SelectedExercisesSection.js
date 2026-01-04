import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react-native';
import { COLORS } from '../../../../constants/colors';
import { defaultSupersetColorScheme, defaultHiitColorScheme } from '../../../../constants/defaultStyles';
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
  const [groupReorderAssignments, setGroupReorderAssignments] = useState({}); // Macro-level reorder assignments for groups
  const [groupItemReorderAssignments, setGroupItemReorderAssignments] = useState({}); // Micro-level reorder assignments within a group
  const [editingGroupIdInReorder, setEditingGroupIdInReorder] = useState(null); // Which group is being edited at micro-level

  const assignedCount = Object.keys(reorderAssignments).length + Object.keys(groupReorderAssignments).length;

  const getLowestAvailableNumber = useCallback(() => {
    // For macro-level reordering, consider both group assignments and ungrouped item assignments
    const assignedGroupNumbers = Object.values(groupReorderAssignments);
    const assignedItemNumbers = Object.values(reorderAssignments);
    const allAssignedNumbers = [...assignedGroupNumbers, ...assignedItemNumbers];
    const totalMacroItems = getTotalMacroItems();
    for (let i = 1; i <= totalMacroItems; i++) {
      if (!allAssignedNumbers.includes(i)) {
        return i;
      }
    }
    return totalMacroItems + 1;
  }, [reorderAssignments, groupReorderAssignments, getTotalMacroItems]);

  // Helper to calculate total count of groups + ungrouped items for macro-level reordering
  const getTotalMacroItems = useCallback(() => {
    let count = 0;
    let lastGroupId = null;
    selectedExercises.forEach((item, index) => {
      const group = groupedExercises[index];
      const exerciseGroup = getExerciseGroup ? getExerciseGroup(group.startIndex) : null;
      if (exerciseGroup) {
        if (exerciseGroup.id !== lastGroupId) {
          count++; // New group
          lastGroupId = exerciseGroup.id;
        }
      } else {
        count++; // Ungrouped item
      }
    });
    return count;
  }, [selectedExercises, groupedExercises, getExerciseGroup]);


  const getLowestAvailableGroupItemNumber = useCallback((groupExercises) => {
    const assignedNumbers = Object.values(groupItemReorderAssignments);
    for (let i = 1; i <= groupExercises.length; i++) {
      if (!assignedNumbers.includes(i)) {
        return i;
      }
    }
    return groupExercises.length + 1;
  }, [groupItemReorderAssignments]);

  const handleReorderPress = useCallback(() => {
    if (isReordering) {
      setIsReordering(false);
      setReorderAssignments({});
      setGroupReorderAssignments({});
      setGroupItemReorderAssignments({});
      setEditingGroupIdInReorder(null);
    } else {
      if (isCollapsed) {
        setIsCollapsed(false);
      }
      setIsReordering(true);
      setReorderAssignments({});
      setGroupReorderAssignments({});
      setGroupItemReorderAssignments({});
      setEditingGroupIdInReorder(null);
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

  // Handle macro-level group reorder assignment
  const handleGroupReorderPress = useCallback((groupId) => {
    if (!isReordering) return;
    
    const groupKey = `group-${groupId}`;
    if (groupReorderAssignments[groupKey] !== undefined) {
      const newAssignments = { ...groupReorderAssignments };
      delete newAssignments[groupKey];
      setGroupReorderAssignments(newAssignments);
      return;
    }

    const nextNumber = getLowestAvailableNumber();
    const newAssignments = { ...groupReorderAssignments, [groupKey]: nextNumber };
    setGroupReorderAssignments(newAssignments);
  }, [isReordering, groupReorderAssignments, getLowestAvailableNumber]);

  // Handle micro-level item reorder within a group
  const handleGroupItemReorderPress = useCallback((uniqueKey, groupId, groupExercisesCount) => {
    if (!isReordering) return;
    
    // If clicking on a grouped item's reorder option, enter micro-level editing for that group
    if (editingGroupIdInReorder === null) {
      setEditingGroupIdInReorder(groupId);
      setGroupItemReorderAssignments({});
      return;
    }

    // Only allow reordering items within the currently editing group
    if (editingGroupIdInReorder !== groupId) return;

    if (groupItemReorderAssignments[uniqueKey] !== undefined) {
      const newAssignments = { ...groupItemReorderAssignments };
      delete newAssignments[uniqueKey];
      setGroupItemReorderAssignments(newAssignments);
      return;
    }

    const nextNumber = getLowestAvailableGroupItemNumber([]);
    const newAssignments = { ...groupItemReorderAssignments, [uniqueKey]: nextNumber };
    setGroupItemReorderAssignments(newAssignments);
  }, [isReordering, editingGroupIdInReorder, groupItemReorderAssignments, getLowestAvailableGroupItemNumber]);

  const handleSaveGroupItemReorder = useCallback(() => {
    // TODO: Implement saving group item reorder - this will require updating the group's internal order
    setEditingGroupIdInReorder(null);
    setGroupItemReorderAssignments({});
  }, []);

  const handleCancelGroupItemReorder = useCallback(() => {
    setEditingGroupIdInReorder(null);
    setGroupItemReorderAssignments({});
  }, []);

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

    // Extract index from uniqueKey format: "exerciseId-index"
    const parts = uniqueKey.split('-');
    const indexStr = parts[parts.length - 1];
    const index = parseInt(indexStr);
    
    // Check if this item belongs to a user-defined group (not just visual grouping)
    if (!isNaN(index)) {
      const exerciseGroup = getExerciseGroup ? getExerciseGroup(index) : null;
      // If this item is in a user-defined group, it should use group reordering, not individual reordering
      if (exerciseGroup) {
        return; // Grouped items use group reordering, not individual reordering
      }
    }
    
    // For ungrouped items, allow macro-level reordering

    if (reorderAssignments[uniqueKey] !== undefined) {
      const newAssignments = { ...reorderAssignments };
      delete newAssignments[uniqueKey];
      setReorderAssignments(newAssignments);
      return;
    }

    const nextNumber = getLowestAvailableNumber();
    const newAssignments = { ...reorderAssignments, [uniqueKey]: nextNumber };
    setReorderAssignments(newAssignments);
  }, [isReordering, reorderAssignments, onToggleSelect, getLowestAvailableNumber, isGroupMode, setGroupSelectionIndices, handleGroupItemToggle, isExerciseInGroup, handleEditGroup, getExerciseGroup, editingGroupId, editingGroupIdInReorder]);

  const handleSaveReorder = useCallback(() => {
    const totalMacroItemsCount = getTotalMacroItems();
    if (onReorder && assignedCount === totalMacroItemsCount) {
      // Combine all assignments (ungrouped items and groups) into one sorted list
      const allAssignments = [];
      
      // Add ungrouped item assignments
      Object.entries(reorderAssignments).forEach(([uniqueKey, position]) => {
        const exerciseId = uniqueKey.split('-').slice(0, -1).join('-');
        allAssignments.push({
          type: 'ungrouped',
          position,
          exerciseId,
          uniqueKey
        });
      });
      
      // Add group assignments
      Object.entries(groupReorderAssignments).forEach(([groupKey, position]) => {
        const groupId = groupKey.replace('group-', '');
        allAssignments.push({
          type: 'group',
          position,
          groupId
        });
      });
      
      // Sort by assigned position
      allAssignments.sort((a, b) => a.position - b.position);
      
      // Build the new order array
      const orderedIds = [];
      allAssignments.forEach(assignment => {
        if (assignment.type === 'ungrouped') {
          // Add single exercise ID
          orderedIds.push(assignment.exerciseId);
        } else {
          // Add all exercise IDs from the group in their current order
          const group = exerciseGroups.find(g => g.id === assignment.groupId);
          if (group) {
            // Sort indices to maintain order, then get exercise IDs from selectedOrder
            const sortedIndices = [...group.exerciseIndices].sort((a, b) => a - b);
            sortedIndices.forEach(index => {
              if (selectedOrder[index]) {
                orderedIds.push(selectedOrder[index]);
              }
            });
          }
        }
      });
      
      onReorder(orderedIds);
    }
    setIsReordering(false);
    setReorderAssignments({});
    setGroupReorderAssignments({});
  }, [reorderAssignments, groupReorderAssignments, assignedCount, getTotalMacroItems, onReorder, exerciseGroups, selectedOrder]);

  const totalMacroItemsCount = getTotalMacroItems();
  const allAssigned = assignedCount === totalMacroItemsCount;

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
                    disabled={groupSelectionMode === 'create' && groupSelectionIndices.length < 2}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 4,
                      backgroundColor: (groupSelectionMode === 'create' && groupSelectionIndices.length < 2) ? COLORS.slate[300] : COLORS.green[500],
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
            Assigning {assignedCount}/{totalMacroItemsCount} — tap to reassign
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
                  backgroundColor: selectedGroupType === 'Superset' ? defaultSupersetColorScheme[500] : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: selectedGroupType === 'Superset' ? COLORS.white : COLORS.white,
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
                  backgroundColor: selectedGroupType === 'HIIT' ? defaultHiitColorScheme[500] : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: selectedGroupType === 'HIIT' ? COLORS.white : COLORS.white,
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
          {isGroupMode && filtered ? (() => {
            // In group mode, show group containers with dynamic indexing
            const renderItems = [];
            let macroPosition = 0; // Track macro-level position for groups and ungrouped items
            
            // Build a map of indices to groups (excluding the group being edited)
            const indexToGroupMap = new Map();
            exerciseGroups.forEach(group => {
              if (group.id !== editingGroupId) {
                group.exerciseIndices.forEach(idx => {
                  indexToGroupMap.set(idx, group);
                });
              }
            });
            
            // Build a map of indices to groupedExercises entries for count information
            const indexToGroupedExerciseMap = new Map();
            groupedExercises.forEach(group => {
              group.orderIndices.forEach(idx => {
                indexToGroupedExerciseMap.set(idx, group);
              });
            });
            
            // Calculate temporary group info for the group being created/edited
            let tempGroupInfo = null;
            if (groupSelectionIndices.length > 0) {
              const sortedIndices = [...groupSelectionIndices].sort((a, b) => a - b);
              if (editingGroupId) {
                const editingGroup = exerciseGroups.find(g => g.id === editingGroupId);
                if (editingGroup) {
                  tempGroupInfo = {
                    id: editingGroupId,
                    type: selectedGroupType,
                    number: editingGroup.number,
                    indices: sortedIndices
                  };
                }
              } else {
                // Creating new group - calculate next number
                const groupsOfType = exerciseGroups.filter(g => g.type === selectedGroupType);
                const nextNumber = groupsOfType.length === 0 
                  ? 1 
                  : Math.max(...groupsOfType.map(g => g.number), 0) + 1;
                tempGroupInfo = {
                  id: 'temp-new-group',
                  type: selectedGroupType,
                  number: nextNumber,
                  indices: sortedIndices
                };
              }
            }
            
            // Process selectedOrder to build render structure
            const processedIndices = new Set();
            selectedOrder.forEach((exerciseId, orderIndex) => {
              if (processedIndices.has(orderIndex)) return;
              
              const exercise = filtered.find(ex => ex.id === exerciseId);
              if (!exercise) return;
              
              // Check if this index is part of the temporary group being created/edited
              const isInTempGroup = tempGroupInfo && tempGroupInfo.indices.includes(orderIndex);
              
              // Check if this index is part of an existing group
              const existingGroup = indexToGroupMap.get(orderIndex);
              
              if (isInTempGroup) {
                // Render temporary group container
                const firstIndex = tempGroupInfo.indices[0];
                if (orderIndex === firstIndex) {
                  macroPosition++;
                  const groupExercises = [];
                  tempGroupInfo.indices.forEach(idx => {
                    processedIndices.add(idx);
                    const exId = selectedOrder[idx];
                    const ex = filtered.find(e => e.id === exId);
                    if (ex) {
                      groupExercises.push({
                        item: ex,
                        index: idx,
                        isSelectedInGroup: true
                      });
                    }
                  });
                  
                  const tempGroupColorScheme = tempGroupInfo.type === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;
                  renderItems.push(
                    <View 
                      key={`temp-group-${tempGroupInfo.id}-${macroPosition}`}
                      style={{
                        marginBottom: 8,
                        borderWidth: 2,
                        borderColor: tempGroupColorScheme[300],
                        borderStyle: 'dashed',
                        borderRadius: 8,
                        backgroundColor: tempGroupColorScheme[50],
                        padding: 8,
                      }}
                    >
                      {groupExercises.map(({ item: exerciseItem, index: exerciseIndex, isSelectedInGroup }) => {
                        const uniqueKey = `${exerciseItem.id}-${exerciseIndex}`;
                        const groupedExercise = indexToGroupedExerciseMap.get(exerciseIndex);
                        const selectedCount = groupedExercise ? groupedExercise.count : 1;
                        return (
                          <ExerciseListItem
                            key={uniqueKey}
                            item={{ ...exerciseItem, id: uniqueKey }}
                            isSelected={true}
                            isLastSelected={false}
                            selectionOrder={null}
                            onToggle={handleReorderItemPress}
                            hideNumber={true}
                            isReordering={false}
                            isReordered={isSelectedInGroup}
                            showAddMore={false}
                            selectedCount={selectedCount}
                            renderingSection="selectedSection"
                            isGroupMode={true}
                            isSelectedInGroup={isSelectedInGroup}
                            exerciseGroup={null}
                          />
                        );
                      })}
                    </View>
                  );
                }
              } else if (existingGroup) {
                // Render existing group container
                const firstIndexInGroup = existingGroup.exerciseIndices[0];
                if (orderIndex === firstIndexInGroup) {
                  macroPosition++;
                  const groupExercises = [];
                  existingGroup.exerciseIndices.forEach(idx => {
                    processedIndices.add(idx);
                    const exId = selectedOrder[idx];
                    const ex = filtered.find(e => e.id === exId);
                    if (ex) {
                      groupExercises.push({
                        item: ex,
                        index: idx
                      });
                    }
                  });
                  
                  const isBeingEdited = editingGroupId === existingGroup.id;
                  renderItems.push(
                    <View 
                      key={`group-${existingGroup.id}-${macroPosition}`}
                      style={{
                        marginBottom: 8,
                        borderWidth: 2,
                        borderColor: COLORS.slate[200],
                        borderStyle: isBeingEdited ? 'dashed' : 'solid',
                        borderRadius: 8,
                        backgroundColor: COLORS.slate[50],
                        padding: 8,
                      }}
                    >
                      {groupExercises.map(({ item: exerciseItem, index: exerciseIndex }) => {
                        const uniqueKey = `${exerciseItem.id}-${exerciseIndex}`;
                        const isSelectedInGroup = editingGroupId === existingGroup.id && groupSelectionIndices.includes(exerciseIndex);
                        const groupedExercise = indexToGroupedExerciseMap.get(exerciseIndex);
                        const selectedCount = groupedExercise ? groupedExercise.count : 1;
                        return (
                          <ExerciseListItem
                            key={uniqueKey}
                            item={{ ...exerciseItem, id: uniqueKey }}
                            isSelected={true}
                            isLastSelected={false}
                            selectionOrder={null}
                            onToggle={handleReorderItemPress}
                            hideNumber={true}
                            isReordering={false}
                            isReordered={isSelectedInGroup}
                            showAddMore={false}
                            selectedCount={selectedCount}
                            renderingSection="selectedSection"
                            isGroupMode={true}
                            isSelectedInGroup={isSelectedInGroup}
                            exerciseGroup={null}
                          />
                        );
                      })}
                    </View>
                  );
                }
              } else {
                // Ungrouped item
                processedIndices.add(orderIndex);
                macroPosition++;
                const uniqueKey = `${exerciseId}-${orderIndex}`;
                const isSelectedInGroup = groupSelectionIndices.includes(orderIndex);
                
                renderItems.push(
                  <ExerciseListItem
                    key={uniqueKey}
                    item={{ ...exercise, id: uniqueKey }}
                    isSelected={true}
                    isLastSelected={orderIndex === selectedOrder.length - 1}
                    selectionOrder={macroPosition}
                    onToggle={handleReorderItemPress}
                    hideNumber={false}
                    isReordering={false}
                    isReordered={isSelectedInGroup}
                    showAddMore={false}
                    selectedCount={1}
                    renderingSection="selectedSection"
                    isGroupMode={true}
                    isSelectedInGroup={isSelectedInGroup}
                    exerciseGroup={null}
                  />
                );
              }
            });
            
            return renderItems;
          })() : (() => {
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
                  
                  const groupName = `${exerciseGroup.type} ${exerciseGroup.number}`;
                  const groupKey = `group-${exerciseGroup.id}`;
                  const groupIsReordered = groupReorderAssignments[groupKey] !== undefined;
                  const groupReorderPosition = groupReorderAssignments[groupKey] || 0;
                  const groupColorScheme = exerciseGroup.type === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;
                  
                  // Render group wrapper
                  renderItems.push(
                    <View 
                      key={`group-${exerciseGroup.id}-${groupPosition}`}
                      style={{
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: groupColorScheme[200],
                        borderRadius: 8,
                        backgroundColor: groupColorScheme[50],
                        padding: 8,
                      }}
                    >
                      {/* Group header with "Superset"/"HIIT" text + badge and reorder/Save-Cancel */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                        paddingBottom: 4,
                        borderBottomWidth: 1,
                        borderBottomColor: groupColorScheme[200],
                        paddingVertical: 12,
                        paddingLeft: 0,
                        paddingRight: 16,
                      }}>
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          flex: 1,
                        }}>
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: groupColorScheme[700],
                            marginRight: 8,
                          }}>{exerciseGroup.type}</Text>
                          <View style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 12,
                            backgroundColor: groupColorScheme[100],
                          }}>
                            <Text style={{
                              color: groupColorScheme[600],
                              fontSize: 12,
                              fontWeight: 'bold',
                            }}>{exerciseGroup.type === 'HIIT' ? 'H' : 'S'}{exerciseGroup.number}</Text>
                          </View>
                        </View>
                        {isReordering && (
                          // Show reorder checkbox for group (macro-level)
                          <TouchableOpacity
                            onPress={() => handleGroupReorderPress(exerciseGroup.id)}
                            style={[
                              {
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                borderWidth: 2,
                                alignItems: 'center',
                                justifyContent: 'center',
                              },
                              groupIsReordered ? {
                                backgroundColor: COLORS.green[100],
                                borderColor: COLORS.green[200],
                              } : {
                                backgroundColor: 'transparent',
                                borderColor: COLORS.amber[400],
                                borderStyle: 'dashed',
                              }
                            ]}
                          >
                            {groupIsReordered && (
                              <Text style={{
                                color: COLORS.green[500],
                                fontSize: 12,
                                fontWeight: 'bold',
                              }}>{groupReorderPosition}</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      {/* Expanded view: show all exercises */}
                      {groupExercises.map(({ item: exerciseItem, index: exerciseIndex, group: exerciseGroupData }) => {
                        const uniqueKey = `${exerciseItem.id}-${exerciseIndex}`;
                        const selectedCount = exerciseGroupData ? exerciseGroupData.count : 0;
                        const originalId = exerciseItem.id;
                        
                        return (
                          <ExerciseListItem
                            key={uniqueKey}
                            item={{ ...exerciseItem, id: uniqueKey }}
                            isSelected={true}
                            isLastSelected={false}
                            selectionOrder={exerciseIndex + 1}
                            onToggle={handleReorderItemPress}
                            hideNumber={true} // Hide individual numbers in groups
                            isReordering={false} // Disable reordering for grouped items - they move with their group
                            isReordered={false}
                            showAddMore={!isReordering}
                            onAddMore={onAddSet && !isReordering ? () => onAddSet(originalId, exerciseIndex) : null}
                            onRemoveSet={onRemoveSet && !isReordering ? () => onRemoveSet(originalId, exerciseIndex) : null}
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