import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { COLORS } from '../../../../constants/colors';
import { PRIMARY_TO_SECONDARY_MAP } from '../../../../constants/data';
import HeaderTopRow from './HeaderTopRow';
import SearchBar from './SearchBar';
import Filters from './Filters';
import SelectedReview from './SelectedReview';
import SelectedInGlossary from './SelectedInGlossary';

const ExercisePicker = ({ isOpen, onClose, onAdd, onCreate, exercises, newlyCreatedId = null }) => {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [groupType, setGroupType] = useState(""); // "" | "Superset" | "HIIT"
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);

  // Filter States (now arrays for multi-select)
  const [filterCategory, setFilterCategory] = useState([]);
  const [filterMuscle, setFilterMuscle] = useState([]);
  const [filterEquip, setFilterEquip] = useState([]);
  const [filterSecondaryMuscle, setFilterSecondaryMuscle] = useState([]);

  // Filter Dropdown UI States
  const [openFilter, setOpenFilter] = useState(null); // 'category' | 'muscle' | 'equip' | 'secondary' | null
  const [selectedOrder, setSelectedOrder] = useState([]); // Track order of selection
  const [isSelectedSectionCollapsed, setIsSelectedSectionCollapsed] = useState(false);
  const [highlightedLetter, setHighlightedLetter] = useState(null);

  // Group States
  const [exerciseGroups, setExerciseGroups] = useState([]); // Array of group objects
  const [isGroupMode, setIsGroupMode] = useState(false); // Group creation/editing mode
  const [groupSelectionMode, setGroupSelectionMode] = useState(null); // 'create' | 'edit' | null
  const [selectedGroupType, setSelectedGroupType] = useState('Superset'); // 'HIIT' | 'Superset' - current group type for creation/edit
  const [groupSelectionIndices, setGroupSelectionIndices] = useState([]); // Selected indices for group creation/edit
  const [editingGroupId, setEditingGroupId] = useState(null); // ID of group being edited

  // Auto-select newly created exercise
  useEffect(() => {
    if (newlyCreatedId && !selectedIds.includes(newlyCreatedId)) {
      const exerciseExists = exercises.some(ex => ex.id === newlyCreatedId);
      if (exerciseExists) {
        setSelectedIds(prev => [...prev, newlyCreatedId]);
        setSearch("");
        setFilterCategory([]);
        setFilterMuscle([]);
        setFilterEquip([]);
        setFilterSecondaryMuscle([]);
      }
    }
  }, [newlyCreatedId, selectedIds, exercises]);

  useEffect(() => {
    if (selectedIds.length < 2 && groupType !== "") {
      setGroupType("");
    }
  }, [selectedIds, groupType]);

  // Reset selected section to collapsed when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSelectedSectionCollapsed(true);
    }
  }, [isOpen]);

  // Get available secondary muscles based on selected primary muscles
  const getAvailableSecondaryMuscles = () => {
    if (filterMuscle.length === 0) return [];
    const secondarySet = new Set();
    filterMuscle.forEach(primary => {
      const secondaries = PRIMARY_TO_SECONDARY_MAP[primary] || [];
      secondaries.forEach(sec => secondarySet.add(sec));
    });
    return Array.from(secondarySet).sort();
  };

  const filtered = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = filterCategory.length === 0 || filterCategory.includes(ex.category);
    
    const matchesPrimaryMuscle = filterMuscle.length === 0 || 
      filterMuscle.some(muscle => ex.primaryMuscles.includes(muscle));
    
    const matchesSecondaryMuscle = filterSecondaryMuscle.length === 0 || 
      (ex.secondaryMuscles && filterSecondaryMuscle.some(muscle => ex.secondaryMuscles.includes(muscle)));
    
    const matchesEquip = filterEquip.length === 0 || 
      (ex.weightEquipTags && filterEquip.some(equip => ex.weightEquipTags.includes(equip)));

    return matchesSearch && matchesCategory && matchesPrimaryMuscle && matchesSecondaryMuscle && matchesEquip;
  });

  // Group consecutive IDs in selectedOrder into groups with counts
  const getGroupedExercises = useMemo(() => {
    const groups = [];
    let currentGroup = null;
    
    selectedOrder.forEach((id, index) => {
      if (currentGroup === null || currentGroup.id !== id) {
        // Start a new group
        const exercise = filtered.find(ex => ex.id === id);
        if (exercise) {
          currentGroup = {
            id,
            exercise,
            count: 1,
            startIndex: index,
            orderIndices: [index]
          };
          groups.push(currentGroup);
        }
      } else {
        // Add to current group
        currentGroup.count++;
        currentGroup.orderIndices.push(index);
      }
    });
    
    return groups;
  }, [selectedOrder, filtered]);

  // Separate selected and unselected exercises (now grouped)
  const selectedExercises = getGroupedExercises.map(group => group.exercise);
  
  // All filtered exercises sorted alphabetically (includes selected ones for +1 feature)
  const allFilteredExercises = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        // Remove: remove the last occurrence
        setSelectedOrder(prevOrder => {
          const lastIndex = prevOrder.lastIndexOf(id);
          if (lastIndex !== -1) {
            const newOrder = [...prevOrder];
            newOrder.splice(lastIndex, 1);
            const remainingCount = newOrder.filter(i => i === id).length;
            
            // Remove this exercise index from any groups
            setExerciseGroups(prevGroups => {
              let updatedGroups = prevGroups.map(group => ({
                ...group,
                exerciseIndices: group.exerciseIndices
                  .filter(idx => idx !== lastIndex)
                  .map(idx => idx > lastIndex ? idx - 1 : idx) // Adjust indices after removal
                  .sort((a, b) => a - b)
              })).filter(group => group.exerciseIndices.length >= 2); // Remove groups with < 2 exercises
              
              // Renumber groups of each type after cleanup
              const types = ['Superset', 'HIIT'];
              types.forEach(type => {
                const groupsOfType = updatedGroups.filter(g => g.type === type).sort((a, b) => a.number - b.number);
                updatedGroups = updatedGroups.map(group => {
                  const typeIndex = groupsOfType.findIndex(g => g.id === group.id);
                  if (typeIndex !== -1) {
                    return { ...group, number: typeIndex + 1 };
                  }
                  return group;
                });
              });
              
              return updatedGroups;
            });
            
            // Update selectedIds if no occurrences remain
            if (remainingCount === 0) {
              setSelectedIds(prevIds => prevIds.filter(i => i !== id));
            }
            return newOrder;
          }
          return prevOrder;
        });
        // For now, keep in selectedIds - will be removed in setSelectedOrder callback if count reaches 0
        return prev;
      } else {
        // Add: append to selectedOrder and check if should auto-add to group
        setSelectedOrder(prevOrder => {
          const newIndex = prevOrder.length;
          const newOrder = [...prevOrder, id];
          
          // Check if last exercise (before adding) is the same and in a group
          if (prevOrder.length > 0 && prevOrder[prevOrder.length - 1] === id) {
            const lastIndex = prevOrder.length - 1;
            
            // Use state updater to access current groups
            setExerciseGroups(prevGroups => {
              const lastExerciseGroup = prevGroups.find(group => 
                group.exerciseIndices.includes(lastIndex)
              );
              
              if (lastExerciseGroup) {
                // Automatically add new exercise to the same group
                return prevGroups.map(group => 
                  group.id === lastExerciseGroup.id
                    ? { ...group, exerciseIndices: [...group.exerciseIndices, newIndex].sort((a, b) => a - b) }
                    : group
                );
              }
              
              return prevGroups;
            });
          }
          
          return newOrder;
        });
        return [...prev, id];
      }
    });
  };

  // Group helper functions
  const getGroupedByType = useCallback((type) => {
    return exerciseGroups
      .filter(group => group.type === type)
      .sort((a, b) => a.number - b.number);
  }, [exerciseGroups]);

  const getNextGroupNumber = useCallback((type) => {
    const groupsOfType = getGroupedByType(type);
    if (groupsOfType.length === 0) return 1;
    const maxNumber = Math.max(...groupsOfType.map(g => g.number));
    return maxNumber + 1;
  }, [getGroupedByType]);

  const renumberGroups = useCallback((type) => {
    setExerciseGroups(prev => {
      const groupsOfType = prev.filter(g => g.type === type).sort((a, b) => a.number - b.number);
      const otherGroups = prev.filter(g => g.type !== type);
      const renumbered = groupsOfType.map((group, index) => ({
        ...group,
        number: index + 1
      }));
      return [...otherGroups, ...renumbered];
    });
  }, []);

  const getExerciseGroup = useCallback((exerciseIndex) => {
    return exerciseGroups.find(group => group.exerciseIndices.includes(exerciseIndex));
  }, [exerciseGroups]);

  const isExerciseInGroup = useCallback((exerciseIndex) => {
    return exerciseGroups.some(group => group.exerciseIndices.includes(exerciseIndex));
  }, [exerciseGroups]);

  const handleReorder = (newOrder) => {
    // When reordering, we need to update group indices to match new positions
    setSelectedOrder(newOrder);
    // Update group indices based on new order
    setExerciseGroups(prev => {
      return prev.map(group => {
        // Map old indices to new positions by tracking exercise IDs
        const newIndices = group.exerciseIndices
          .map(oldIndex => {
            const exerciseId = selectedOrder[oldIndex];
            const newIndex = newOrder.indexOf(exerciseId);
            return newIndex;
          })
          .filter(idx => idx !== -1)
          .sort((a, b) => a - b);
        return {
          ...group,
          exerciseIndices: newIndices
        };
      });
    });
  };

  const handleAddSet = (id, groupIndex = null) => {
    // Add another instance of this exercise to the selection order
    if (groupIndex !== null) {
      // Add to a specific group: find the last index of that group and insert after it
      if (groupIndex >= 0 && groupIndex < getGroupedExercises.length) {
        const targetGroup = getGroupedExercises[groupIndex];
        const lastGroupIndex = targetGroup.orderIndices[targetGroup.orderIndices.length - 1];
        setSelectedOrder(prevOrder => {
          const newOrder = [...prevOrder];
          newOrder.splice(lastGroupIndex + 1, 0, id);
          return newOrder;
        });
        // Add to selectedIds if not already there
        setSelectedIds(prevIds => prevIds.includes(id) ? prevIds : [...prevIds, id]);
      }
    } else {
      // Default behavior: append to end and check if should auto-add to group
      setSelectedOrder(prevOrder => {
        const newIndex = prevOrder.length;
        const newOrder = [...prevOrder, id];
        
        // Check if last exercise (before adding) is the same and in a group
        if (prevOrder.length > 0 && prevOrder[prevOrder.length - 1] === id) {
          const lastIndex = prevOrder.length - 1;
          
          // Use state updater to access current groups
          setExerciseGroups(prevGroups => {
            const lastExerciseGroup = prevGroups.find(group => 
              group.exerciseIndices.includes(lastIndex)
            );
            
            if (lastExerciseGroup) {
              // Automatically add new exercise to the same group
              return prevGroups.map(group => 
                group.id === lastExerciseGroup.id
                  ? { ...group, exerciseIndices: [...group.exerciseIndices, newIndex].sort((a, b) => a - b) }
                  : group
              );
            }
            
            return prevGroups;
          });
        }
        
        return newOrder;
      });
      setSelectedIds(prevIds => prevIds.includes(id) ? prevIds : [...prevIds, id]);
    }
  };

  const handleRemoveSet = (id, groupIndex = null) => {
    // Remove from a specific group if groupIndex is provided, otherwise remove last occurrence
    if (groupIndex !== null) {
      // Remove from a specific group
      if (groupIndex >= 0 && groupIndex < getGroupedExercises.length) {
        const targetGroup = getGroupedExercises[groupIndex];
        if (targetGroup.id === id && targetGroup.orderIndices.length > 0) {
          // Remove the last index from this group
          const indexToRemove = targetGroup.orderIndices[targetGroup.orderIndices.length - 1];
          setSelectedOrder(prevOrder => {
            const newOrder = [...prevOrder];
            newOrder.splice(indexToRemove, 1);
            
            // Remove this exercise index from the group and clean up
            setExerciseGroups(prevGroups => {
              let updatedGroups = prevGroups.map(group => {
                if (group.id === targetGroup.id) {
                  const newIndices = group.exerciseIndices
                    .filter(idx => idx !== indexToRemove)
                    .map(idx => idx > indexToRemove ? idx - 1 : idx) // Adjust indices after removal
                    .sort((a, b) => a - b);
                  return { ...group, exerciseIndices: newIndices };
                } else {
                  // Adjust indices for other groups
                  return {
                    ...group,
                    exerciseIndices: group.exerciseIndices
                      .map(idx => idx > indexToRemove ? idx - 1 : idx)
                      .sort((a, b) => a - b)
                  };
                }
              }).filter(group => group.exerciseIndices.length >= 2); // Remove groups with < 2 exercises
              
              // Renumber groups of each type after cleanup
              const types = ['Superset', 'HIIT'];
              types.forEach(type => {
                const groupsOfType = updatedGroups.filter(g => g.type === type).sort((a, b) => a.number - b.number);
                updatedGroups = updatedGroups.map(group => {
                  const typeIndex = groupsOfType.findIndex(g => g.id === group.id);
                  if (typeIndex !== -1) {
                    return { ...group, number: typeIndex + 1 };
                  }
                  return group;
                });
              });
              
              return updatedGroups;
            });
            
            // If this was the last occurrence, also remove from selectedIds
            const remainingCount = newOrder.filter(i => i === id).length;
            if (remainingCount === 0) {
              setSelectedIds(prevIds => prevIds.filter(i => i !== id));
            }
            return newOrder;
          });
        }
      }
    } else {
      // Remove the last occurrence
      setSelectedOrder(prevOrder => {
        const lastIndex = prevOrder.lastIndexOf(id);
        if (lastIndex !== -1) {
          const newOrder = [...prevOrder];
          newOrder.splice(lastIndex, 1);
          
          // Remove this exercise index from any groups
          setExerciseGroups(prevGroups => {
            let updatedGroups = prevGroups.map(group => ({
              ...group,
              exerciseIndices: group.exerciseIndices
                .filter(idx => idx !== lastIndex)
                .map(idx => idx > lastIndex ? idx - 1 : idx) // Adjust indices after removal
                .sort((a, b) => a - b)
            })).filter(group => group.exerciseIndices.length >= 2); // Remove groups with < 2 exercises
            
            // Renumber groups of each type after cleanup
            const types = ['Superset', 'HIIT'];
            types.forEach(type => {
              const groupsOfType = updatedGroups.filter(g => g.type === type).sort((a, b) => a.number - b.number);
              updatedGroups = updatedGroups.map(group => {
                const typeIndex = groupsOfType.findIndex(g => g.id === group.id);
                if (typeIndex !== -1) {
                  return { ...group, number: typeIndex + 1 };
                }
                return group;
              });
            });
            
            return updatedGroups;
          });
          
          // If this was the last occurrence, also remove from selectedIds
          const remainingCount = newOrder.filter(i => i === id).length;
          if (remainingCount === 0) {
            setSelectedIds(prevIds => prevIds.filter(i => i !== id));
          }
          return newOrder;
        }
        return prevOrder;
      });
    }
  };

  // Group management functions
  const handleCreateGroup = useCallback((type, selectedIndices) => {
    const sortedIndices = [...selectedIndices].sort((a, b) => a - b);
    const firstIndex = sortedIndices[0];
    const nextNumber = getNextGroupNumber(type);
    
    setSelectedOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const groupExerciseIds = sortedIndices.map(idx => newOrder[idx]);
      
      // Remove grouped items from their current positions (remove from highest to lowest to avoid index shifting)
      const indicesToRemove = [...sortedIndices].sort((a, b) => b - a);
      indicesToRemove.forEach(idx => {
        newOrder.splice(idx, 1);
      });
      
      // Insert grouped items at the first index position
      const insertPosition = firstIndex;
      newOrder.splice(insertPosition, 0, ...groupExerciseIds);
      
      // Calculate new consecutive indices for the new group
      const newGroupIndices = groupExerciseIds.map((_, idx) => insertPosition + idx);
      
      // Update all existing group indices to account for the reordering
      setExerciseGroups(prevGroups => {
        const updatedGroups = prevGroups.map(group => ({
          ...group,
          exerciseIndices: group.exerciseIndices.map(oldIdx => {
            // Count how many grouped items were removed before this index
            const removedBefore = sortedIndices.filter(idx => idx < oldIdx).length;
            
            if (sortedIndices.includes(oldIdx)) {
              // This index was part of the new group - it's now at insertPosition + offset
              const offset = sortedIndices.indexOf(oldIdx);
              return insertPosition + offset;
            } else if (oldIdx < firstIndex) {
              // Item was before the group - index unchanged
              return oldIdx;
            } else {
              // Item was after the group - adjust by number removed, then add group length
              return oldIdx - removedBefore + sortedIndices.length;
            }
          }).sort((a, b) => a - b)
        }));
        
        // Add the new group
        const newGroup = {
          id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type,
          number: nextNumber,
          exerciseIndices: newGroupIndices
        };
        
        return [...updatedGroups, newGroup];
      });
      
      return newOrder;
    });
    
    // Don't close group mode - let handleSaveGroup handle clearing selection state
  }, [getNextGroupNumber]);

  const handleEditGroup = useCallback((groupId) => {
    const group = exerciseGroups.find(g => g.id === groupId);
    if (group) {
      setEditingGroupId(groupId);
      setGroupSelectionMode('edit');
      setGroupSelectionIndices([...group.exerciseIndices]);
      setIsGroupMode(true);
      setSelectedGroupType(group.type);
    }
  }, [exerciseGroups]);

  const handleSaveGroup = useCallback(() => {
    if (groupSelectionMode === 'create') {
      // Creating a new group still requires at least 2 exercises
      if (groupSelectionIndices.length < 2) return;
      handleCreateGroup(selectedGroupType, groupSelectionIndices);
      // Clear selection but keep group mode open for creating another group
      setGroupSelectionMode('create');
      setGroupSelectionIndices([]);
      setEditingGroupId(null);
      setSelectedGroupType('Superset'); // Reset to default
      return;
    } else if (groupSelectionMode === 'edit' && editingGroupId) {
      // When editing, allow saving with 0 or 1 item
      if (groupSelectionIndices.length === 0) {
        // Delete the group if 0 items remain
        const groupToDelete = exerciseGroups.find(g => g.id === editingGroupId);
        if (groupToDelete) {
          // Remove the group and adjust indices for other groups
          setExerciseGroups(prev => {
            const filtered = prev.filter(g => g.id !== editingGroupId);
            
            // Renumber groups of the deleted group's type
            const deletedType = groupToDelete.type;
            const groupsOfType = filtered.filter(g => g.type === deletedType)
              .sort((a, b) => a.number - b.number);
            const renumbered = groupsOfType.map((group, index) => ({
              ...group,
              number: index + 1
            }));
            
            const otherGroups = filtered.filter(g => g.type !== deletedType);
            return [...otherGroups, ...renumbered];
          });
        }
        
        // Clear selection but keep group mode open
        setGroupSelectionMode(null);
        setEditingGroupId(null);
        setGroupSelectionIndices([]);
        setSelectedGroupType('Superset');
        return;
      }
      
      // Handle 1 or more items
      const sortedIndices = [...groupSelectionIndices].sort((a, b) => a - b);
      const firstIndex = sortedIndices[0];
      
      setSelectedOrder(prevOrder => {
        const newOrder = [...prevOrder];
        const groupExerciseIds = sortedIndices.map(idx => newOrder[idx]);
        
        // Remove grouped items from their current positions (remove from highest to lowest to avoid index shifting)
        const indicesToRemove = [...sortedIndices].sort((a, b) => b - a);
        indicesToRemove.forEach(idx => {
          newOrder.splice(idx, 1);
        });
        
        // Insert grouped items at the first index position
        const insertPosition = firstIndex;
        newOrder.splice(insertPosition, 0, ...groupExerciseIds);
        
        // Calculate new consecutive indices for the updated group
        const newGroupIndices = groupExerciseIds.map((_, idx) => insertPosition + idx);
        
        // Update exercise groups
        setExerciseGroups(prev => {
          const groupToEdit = prev.find(g => g.id === editingGroupId);
          if (!groupToEdit) return prev;
          
          const oldType = groupToEdit.type;
          const newType = selectedGroupType;
          
          // Update all existing group indices (except the one being edited) to account for the reordering
          const updatedGroups = prev.filter(g => g.id !== editingGroupId).map(group => ({
            ...group,
            exerciseIndices: group.exerciseIndices.map(oldIdx => {
              // Count how many grouped items were removed before this index
              const removedBefore = sortedIndices.filter(idx => idx < oldIdx).length;
              
              if (sortedIndices.includes(oldIdx)) {
                // This index was part of the edited group - it's now at insertPosition + offset
                const offset = sortedIndices.indexOf(oldIdx);
                return insertPosition + offset;
              } else if (oldIdx < firstIndex) {
                // Item was before the group - index unchanged
                return oldIdx;
              } else {
                // Item was after the group - adjust by number removed, then add group length
                return oldIdx - removedBefore + sortedIndices.length;
              }
            }).sort((a, b) => a - b)
          }));
          
          // Create updated group
          let updatedGroup = {
            ...groupToEdit,
            type: newType,
            exerciseIndices: newGroupIndices
          };
          
          if (oldType !== newType) {
            // Get next available number for new type
            const groupsOfNewType = updatedGroups.filter(g => g.type === newType);
            const nextNumber = groupsOfNewType.length === 0 
              ? 1 
              : Math.max(...groupsOfNewType.map(g => g.number)) + 1;
            updatedGroup.number = nextNumber;
            
            // Renumber old type groups
            const groupsOfOldType = updatedGroups.filter(g => g.type === oldType)
              .sort((a, b) => a.number - b.number);
            const renumberedOldType = groupsOfOldType.map((group, index) => ({
              ...group,
              number: index + 1
            }));
            
            const otherGroups = updatedGroups.filter(g => g.type !== oldType && g.type !== newType);
            return [...otherGroups, ...renumberedOldType, ...groupsOfNewType, updatedGroup];
          } else {
            // Type unchanged, just update the group
            return [...updatedGroups, updatedGroup];
          }
        });
        
        return newOrder;
      });
      
      // Clear selection but keep group mode open
      setGroupSelectionMode(null);
      setEditingGroupId(null);
      setGroupSelectionIndices([]);
      setSelectedGroupType('Superset'); // Reset to default
    }
  }, [groupSelectionMode, groupSelectionIndices, selectedGroupType, editingGroupId, handleCreateGroup, exerciseGroups]);

  const handleDeleteGroup = useCallback((groupId) => {
    const group = exerciseGroups.find(g => g.id === groupId);
    if (group) {
      setExerciseGroups(prev => prev.filter(g => g.id !== groupId));
      renumberGroups(group.type);
    }
  }, [exerciseGroups, renumberGroups]);

  const handleCancelGroup = useCallback(() => {
    setIsGroupMode(false);
    setGroupSelectionMode(null);
    setEditingGroupId(null);
    setGroupSelectionIndices([]);
    setSelectedGroupType('Superset'); // Reset to default
  }, []);

  const handleStartGroupingMode = useCallback(() => {
    setIsGroupMode(true);
    setGroupSelectionMode('create');
    setGroupSelectionIndices([]);
    setEditingGroupId(null);
    setSelectedGroupType('Superset'); // Default to Superset
  }, []);

  const handleToggleGroupType = useCallback(() => {
    setSelectedGroupType(prev => prev === 'HIIT' ? 'Superset' : 'HIIT');
  }, []);

  const handleAddAction = () => {
    // Use grouped exercises - each group represents one exercise instance to add
    // The count represents the number of sets for that exercise instance
    const exercisesToAdd = getGroupedExercises.map(group => ({
      ...group.exercise,
      _setCount: group.count // Pass the set count as metadata
    }));
    
    // Include group metadata for workout creation
    const groupsMetadata = exerciseGroups.length > 0 ? exerciseGroups.map(group => ({
      id: group.id,
      type: group.type,
      number: group.number,
      exerciseIndices: group.exerciseIndices
    })) : null;
    
    onAdd(exercisesToAdd, groupType || null, groupsMetadata);
    setSelectedIds([]);
    setSelectedOrder([]);
    setGroupType("");
    setExerciseGroups([]);
    setIsGroupMode(false);
    setEditingGroupId(null);
    setGroupSelectionMode(null);
    setSelectedGroupType('Superset');
    setGroupSelectionIndices([]);
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSelectedOrder([]);
    setGroupType("");
    setExerciseGroups([]);
    setIsGroupMode(false);
    setEditingGroupId(null);
    setGroupSelectionMode(null);
    setSelectedGroupType('Superset');
    setGroupSelectionIndices([]);
    onClose();
  };

  const groupOptions = [
    { value: "", label: "Individual" },
    { value: "Superset", label: "Superset" },
    { value: "HIIT", label: "HIIT" }
  ];

  // Gesture to block modal swipe-to-dismiss on the list area
  // This captures vertical pan gestures to prevent them from triggering modal dismiss
  // while still allowing ScrollView/SectionList to handle scrolling via native gesture
  const blockDismissGesture = useMemo(() => 
    Gesture.Pan()
      .activeOffsetY([-10, 10]) // Activate after 10px vertical movement
      .onStart(() => {})
      .onUpdate(() => {})
      .onEnd(() => {}),
    []
  );

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        {/* Backdrop to close dropdown when clicking outside */}
        {openFilter && (
          <TouchableOpacity 
            style={styles.dropdownBackdrop}
            activeOpacity={1}
            onPress={() => setOpenFilter(null)}
          />
        )}
        <View style={styles.header}>
          <HeaderTopRow
            onClose={handleClose}
            onCreate={onCreate}
            groupType={groupType}
            setGroupType={setGroupType}
            isGroupDropdownOpen={isGroupDropdownOpen}
            setIsGroupDropdownOpen={setIsGroupDropdownOpen}
            selectedIds={selectedIds}
            onAdd={handleAddAction}
            groupOptions={groupOptions}
          />
          <SearchBar search={search} setSearch={setSearch} />
          <Filters
            filterCategory={filterCategory}
            filterMuscle={filterMuscle}
            filterEquip={filterEquip}
            filterSecondaryMuscle={filterSecondaryMuscle}
            setFilterCategory={setFilterCategory}
            setFilterMuscle={setFilterMuscle}
            setFilterEquip={setFilterEquip}
            setFilterSecondaryMuscle={setFilterSecondaryMuscle}
            openFilter={openFilter}
            setOpenFilter={setOpenFilter}
            getAvailableSecondaryMuscles={getAvailableSecondaryMuscles}
          />
        </View>
        
        <GestureDetector gesture={blockDismissGesture}>
          <View style={styles.listContainer}>
            {/* Selected Exercises - separate section at top */}
            <SelectedReview
              selectedExercises={selectedExercises}
              selectedOrder={selectedOrder}
              groupedExercises={getGroupedExercises}
              exerciseGroups={exerciseGroups}
              isCollapsed={isSelectedSectionCollapsed}
              setIsCollapsed={setIsSelectedSectionCollapsed}
              onToggleSelect={handleToggleSelect}
              onReorder={handleReorder}
              onAddSet={handleAddSet}
              onRemoveSet={handleRemoveSet}
              isGroupMode={isGroupMode}
              groupSelectionMode={groupSelectionMode}
              selectedGroupType={selectedGroupType}
              groupSelectionIndices={groupSelectionIndices}
              setGroupSelectionIndices={setGroupSelectionIndices}
              setSelectedGroupType={setSelectedGroupType}
              setIsGroupMode={setIsGroupMode}
              setGroupSelectionMode={setGroupSelectionMode}
              handleStartGroupingMode={handleStartGroupingMode}
              handleToggleGroupType={handleToggleGroupType}
              handleSaveGroup={handleSaveGroup}
              handleCancelGroup={handleCancelGroup}
              handleEditGroup={handleEditGroup}
              getExerciseGroup={getExerciseGroup}
              isExerciseInGroup={isExerciseInGroup}
              editingGroupId={editingGroupId}
              filtered={filtered}
              setExerciseGroups={setExerciseGroups}
              setSelectedOrder={setSelectedOrder}
            />
            
            {/* All Exercises with integrated A-Z scrollbar - only show when selected section is collapsed */}
            {isSelectedSectionCollapsed && (
              <SelectedInGlossary
                exercises={allFilteredExercises}
                onToggleSelect={handleToggleSelect}
                highlightedLetter={highlightedLetter}
                setHighlightedLetter={setHighlightedLetter}
                selectedIds={selectedIds}
                selectedOrder={selectedOrder}
                onAddSet={handleAddSet}
                onRemoveSet={handleRemoveSet}
              />
            )}
          </View>
        </GestureDetector>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
    zIndex: 100,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 85,
    backgroundColor: 'transparent',
  },
  listContainer: {
    flex: 1,
  },
});

export default ExercisePicker;
