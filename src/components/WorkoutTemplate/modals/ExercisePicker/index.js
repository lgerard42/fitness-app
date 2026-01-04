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

  // Separate selected and unselected exercises
  const selectedExercises = selectedOrder
    .map(id => filtered.find(ex => ex.id === id))
    .filter(Boolean);
  
  const unselectedExercises = filtered
    .filter(ex => !selectedIds.includes(ex.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        setSelectedOrder(prevOrder => prevOrder.filter(i => i !== id));
        return prev.filter(i => i !== id);
      } else {
        setSelectedOrder(prevOrder => [...prevOrder, id]);
        return [...prev, id];
      }
    });
  };

  const handleAddAction = () => {
    const selectedExercisesList = exercises.filter(ex => selectedIds.includes(ex.id));
    onAdd(selectedExercisesList, groupType || null);
    setSelectedIds([]);
    setGroupType("");
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
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
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
            onClose={onClose}
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
              isCollapsed={isSelectedSectionCollapsed}
              setIsCollapsed={setIsSelectedSectionCollapsed}
              onToggleSelect={handleToggleSelect}
            />
            
            {/* Unselected Exercises with integrated A-Z scrollbar */}
            <UnselectedExercisesList
              exercises={unselectedExercises}
              onToggleSelect={handleToggleSelect}
              highlightedLetter={highlightedLetter}
              setHighlightedLetter={setHighlightedLetter}
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
