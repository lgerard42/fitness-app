import React, { useState, useEffect, useMemo } from 'react';
import { View, Modal, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { COLORS } from '../../../../constants/colors';
import { PRIMARY_TO_SECONDARY_MAP } from '../../../../constants/data';
import HeaderTopRow from './HeaderTopRow';
import SearchBar from './SearchBar';
import Filters from './Filters';
import SelectedExercisesSection from './SelectedExercisesSection';
import UnselectedExercisesList from './UnselectedExercisesList';

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
        // Add: always append to selectedOrder (grouping happens in display)
        setSelectedOrder(prevOrder => [...prevOrder, id]);
        return [...prev, id];
      }
    });
  };

  const handleReorder = (newOrder) => {
    setSelectedOrder(newOrder);
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
      // Default behavior: append to end
      setSelectedOrder(prevOrder => [...prevOrder, id]);
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

  const handleAddAction = () => {
    const selectedExercisesList = exercises.filter(ex => selectedIds.includes(ex.id));
    onAdd(selectedExercisesList, groupType || null);
    setSelectedIds([]);
    setSelectedOrder([]);
    setGroupType("");
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSelectedOrder([]);
    setGroupType("");
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
            <SelectedExercisesSection
              selectedExercises={selectedExercises}
              selectedOrder={selectedOrder}
              groupedExercises={getGroupedExercises}
              isCollapsed={isSelectedSectionCollapsed}
              setIsCollapsed={setIsSelectedSectionCollapsed}
              onToggleSelect={handleToggleSelect}
              onReorder={handleReorder}
              onAddSet={handleAddSet}
              onRemoveSet={handleRemoveSet}
            />
            
            {/* All Exercises with integrated A-Z scrollbar */}
            <UnselectedExercisesList
              exercises={allFilteredExercises}
              onToggleSelect={handleToggleSelect}
              highlightedLetter={highlightedLetter}
              setHighlightedLetter={setHighlightedLetter}
              selectedIds={selectedIds}
              selectedOrder={selectedOrder}
              onAddSet={handleAddSet}
              onRemoveSet={handleRemoveSet}
            />
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
