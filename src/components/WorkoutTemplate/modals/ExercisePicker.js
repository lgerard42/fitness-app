import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { X, Plus, Search, ChevronDown, Check, Layers, Dumbbell, Activity } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';
import { CATEGORIES, PRIMARY_MUSCLES, WEIGHT_EQUIP_TAGS, PRIMARY_TO_SECONDARY_MAP } from '../../../constants/data';

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

  // Auto-select newly created exercise
  useEffect(() => {
    if (newlyCreatedId && !selectedIds.includes(newlyCreatedId)) {
      // Check if the exercise exists in the exercises list before selecting
      const exerciseExists = exercises.some(ex => ex.id === newlyCreatedId);
      if (exerciseExists) {
        setSelectedIds(prev => [...prev, newlyCreatedId]);
        // Clear search and filters so the newly created exercise is visible
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
    
    // Multi-select category filter
    const matchesCategory = filterCategory.length === 0 || filterCategory.includes(ex.category);
    
    // Multi-select primary muscle filter
    const matchesPrimaryMuscle = filterMuscle.length === 0 || 
      filterMuscle.some(muscle => ex.primaryMuscles.includes(muscle));
    
    // Multi-select secondary muscle filter
    const matchesSecondaryMuscle = filterSecondaryMuscle.length === 0 || 
      (ex.secondaryMuscles && filterSecondaryMuscle.some(muscle => ex.secondaryMuscles.includes(muscle)));
    
    // Multi-select equipment filter
    const matchesEquip = filterEquip.length === 0 || 
      (ex.weightEquipTags && filterEquip.some(equip => ex.weightEquipTags.includes(equip)));

    return matchesSearch && matchesCategory && matchesPrimaryMuscle && matchesSecondaryMuscle && matchesEquip;
  });

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleAddAction = () => {
    const selectedExercises = exercises.filter(ex => selectedIds.includes(ex.id));
    onAdd(selectedExercises, groupType || null);
    setSelectedIds([]);
    setGroupType("");
    // onClose(); // Usually handled by parent, but web code calls onAdd then parent closes.
  };

  const groupOptions = [
    { value: "", label: "Individual" },
    { value: "Superset", label: "Superset" },
    { value: "HIIT", label: "HIIT" }
  ];

  const isDisabled = selectedIds.length < 2;

  const FilterDropdown = ({ label, value, options, type, leftAligned = false, fullWidthContainer = false }) => {
    const isActive = Array.isArray(value) ? value.length > 0 : value !== "All";
    const displayText = Array.isArray(value) 
      ? (value.length === 0 ? label : value.length === 1 ? value[0] : `${value.length} selected`)
      : (value === "All" ? label : value);
    
    const toggleOption = (item) => {
      if (Array.isArray(value)) {
        // Multi-select logic
        const newValue = value.includes(item) 
          ? value.filter(v => v !== item)
          : [...value, item];
        
        if (type === 'category') setFilterCategory(newValue);
        if (type === 'muscle') {
          setFilterMuscle(newValue);
          // Clear secondary muscles if no primary muscles selected
          if (newValue.length === 0) setFilterSecondaryMuscle([]);
        }
        if (type === 'equip') setFilterEquip(newValue);
        if (type === 'secondary') setFilterSecondaryMuscle(newValue);
      } else {
        // Old single-select logic (backward compatibility)
        if(type === 'category') setFilterCategory(item);
        if(type === 'muscle') setFilterMuscle(item);
        if(type === 'equip') setFilterEquip(item);
        setOpenFilter(null);
      }
    };
    
    return (
      <View style={[styles.filterDropdownContainer, fullWidthContainer && styles.filterDropdownContainerFullWidth]}>
        <TouchableOpacity 
          onPress={() => setOpenFilter(openFilter === type ? null : type)}
          style={[
            styles.filterButton,
            isActive ? styles.filterButtonActive : styles.filterButtonInactive,
            type === 'muscle' && filterMuscle.length > 0 && styles.muscleFilterPrimary
          ]}
        >
          <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]} numberOfLines={1}>
            {displayText}
          </Text>
        </TouchableOpacity>
        
        {openFilter === type && !fullWidthContainer && (
          <View 
            style={[
              styles.filterMenu, 
              leftAligned && styles.filterMenuLeftAligned
            ]}
            pointerEvents="box-none"
          >
            {options.map((item) => {
              const isSelected = Array.isArray(value) ? value.includes(item) : value === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => toggleOption(item)}
                  style={[styles.filterOption, isSelected && styles.filterOptionSelected]}
                >
                  <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextSelected]}>
                    {item}
                  </Text>
                  {isSelected && <Check size={12} color={COLORS.blue[600]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // Secondary Muscle Filter Component
  const SecondaryMuscleFilter = () => {
    const availableSecondaries = getAvailableSecondaryMuscles();
    const isEnabled = filterMuscle.length > 0;
    const isActive = filterSecondaryMuscle.length > 0;
    const isOpen = openFilter === 'secondary';
    const isPrimaryActive = filterMuscle.length > 0;
    
    if (!isEnabled) return null;
    
    return (
      <View style={styles.secondaryFilterContainer}>
        <TouchableOpacity 
          onPress={() => setOpenFilter(openFilter === 'secondary' ? null : 'secondary')}
          style={[
            styles.filterButton,
            styles.secondaryFilterButton,
            (isOpen || isPrimaryActive) ? styles.secondaryFilterBorderActive : { borderColor: 'transparent' },
            isPrimaryActive ? styles.secondaryFilterLeftBorder : {},
            isActive ? { backgroundColor: COLORS.blue[100] } : { backgroundColor: COLORS.slate[100] },
            styles.muscleFilterMerged
          ]}
        >
          <MaterialCommunityIcons 
            name={isActive ? "arm-flex" : "arm-flex-outline"} 
            size={16} 
            color={isActive ? COLORS.blue[700] : COLORS.blue[400]} 
          />
        </TouchableOpacity>
        
      </View>
    );
  };

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
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={COLORS.slate[500]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onCreate} style={styles.createButton}>
                <Plus size={14} color={COLORS.slate[700]} />
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.headerRight}>
              <View style={{ position: 'relative', zIndex: 10 }}>
                 <TouchableOpacity
                   disabled={isDisabled}
                   onPress={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                   style={[styles.groupButton, isDisabled && styles.groupButtonDisabled]}
                 >
                   <Text style={[styles.groupButtonText, isDisabled && styles.groupButtonTextDisabled]}>
                     {groupType || "Individual"}
                   </Text>
                   <ChevronDown size={14} color={isDisabled ? COLORS.slate[400] : COLORS.slate[700]} style={{ transform: [{ rotate: isGroupDropdownOpen ? '180deg' : '0deg' }] }} />
                 </TouchableOpacity>

                 {isGroupDropdownOpen && !isDisabled && (
                   <View style={styles.groupDropdown}>
                     {groupOptions.map((option) => (
                       <TouchableOpacity
                         key={option.label}
                         onPress={() => {
                           setGroupType(option.value);
                           setIsGroupDropdownOpen(false);
                         }}
                         style={[styles.groupOption, groupType === option.value && styles.groupOptionSelected]}
                       >
                         <Text style={[styles.groupOptionText, groupType === option.value && styles.groupOptionTextSelected]}>
                           {option.label}
                         </Text>
                         {groupType === option.value && <Check size={12} color={COLORS.blue[600]} />}
                       </TouchableOpacity>
                     ))}
                   </View>
                 )}
              </View>
              <TouchableOpacity 
                onPress={handleAddAction}
                disabled={selectedIds.length === 0}
                style={[styles.addButton, selectedIds.length === 0 && styles.addButtonDisabled]}
              >
                <Text style={styles.addButtonText}>
                  Add {selectedIds.length > 0 && `(${selectedIds.length})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Search size={18} color={COLORS.slate[400]} style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor={COLORS.slate[400]}
              value={search}
              onChangeText={setSearch}
              autoFocus={false} 
            />
          </View>

          <View style={styles.filtersRow}>
             <FilterDropdown label="Category" value={filterCategory} options={CATEGORIES} type="category" />
              <View style={styles.muscleFiltersContainer}>
                <FilterDropdown label="Muscle" value={filterMuscle} options={PRIMARY_MUSCLES} type="muscle" fullWidthContainer={true} />
                <SecondaryMuscleFilter />
                {/* Render dropdown menus at container level for proper positioning */}
                {openFilter === 'muscle' && (
                  <View style={styles.muscleFilterMenu}>
                    {PRIMARY_MUSCLES.map((item) => {
                      const isSelected = filterMuscle.includes(item);
                      return (
                        <TouchableOpacity
                          key={item}
                          onPress={() => {
                            const newValue = isSelected 
                              ? filterMuscle.filter(v => v !== item)
                              : [...filterMuscle, item];
                            setFilterMuscle(newValue);
                            if (newValue.length === 0) setFilterSecondaryMuscle([]);
                          }}
                          style={[styles.filterOption, isSelected && styles.filterOptionSelected]}
                        >
                          <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextSelected]}>
                            {item}
                          </Text>
                          {isSelected && <Check size={12} color={COLORS.blue[600]} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {openFilter === 'secondary' && filterMuscle.length > 0 && (
                  <View style={styles.muscleFilterMenu}>
                    {getAvailableSecondaryMuscles().map((item) => {
                      const isSelected = filterSecondaryMuscle.includes(item);
                      return (
                        <TouchableOpacity
                          key={item}
                          onPress={() => {
                            setFilterSecondaryMuscle(
                              isSelected 
                                ? filterSecondaryMuscle.filter(v => v !== item)
                                : [...filterSecondaryMuscle, item]
                            );
                          }}
                          style={[styles.filterOption, isSelected && styles.filterOptionSelected]}
                        >
                          <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextSelected]}>
                            {item}
                          </Text>
                          {isSelected && <Check size={12} color={COLORS.blue[600]} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
             <FilterDropdown label="Equipment" value={filterEquip} options={WEIGHT_EQUIP_TAGS} type="equip" />
          </View>
        </View>
        
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No exercises found.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <TouchableOpacity 
                onPress={() => handleToggleSelect(item.id)}
                style={styles.exerciseItem}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exerciseName, isSelected && styles.exerciseNameSelected]}>{item.name}</Text>
                  <View style={styles.tagsRow}>
                    <View style={styles.tagContainer}>
                      <Text style={styles.tagText}>{item.category}</Text>
                    </View>
                    {item.primaryMuscles.slice(0, 2).map(m => (
                        <View key={m} style={styles.muscleTagContainer}>
                          <Text style={styles.muscleTagText}>{m}</Text>
                        </View>
                    ))}
                  </View>
                </View>
                <View style={[styles.checkbox, isSelected ? styles.checkboxSelected : styles.checkboxUnselected]}>
                  {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            );
          }}
        />
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    zIndex: 101,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeButton: {
    padding: 4,
    marginLeft: -8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.slate[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[700],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 102,
  },
  groupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.slate[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  groupButtonDisabled: {
    opacity: 0.5,
  },
  groupButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[700],
  },
  groupButtonTextDisabled: {
    color: COLORS.slate[400],
  },
  groupDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    width: 120,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 200,
  },
  groupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  groupOptionSelected: {
    backgroundColor: COLORS.blue[50],
  },
  groupOptionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[700],
  },
  groupOptionTextSelected: {
    color: COLORS.blue[600],
  },
  addButton: {
    backgroundColor: COLORS.blue[600],
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 12,
    zIndex: 1,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 10,
    zIndex: 2,
  },
  searchInput: {
    backgroundColor: COLORS.slate[100],
    borderRadius: 999,
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.slate[900],
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
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 90,
    alignItems: 'center',
  },
  filterDropdownContainer: {
    flex: 1,
    position: 'relative',
    minWidth: 0,
  },
  filterDropdownContainerFullWidth: {
    position: 'relative',
    zIndex: 1,
    flexShrink: 1,
  },
  muscleFiltersContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 0,
    alignSelf: 'stretch',
    position: 'relative',
  },
  muscleFilterMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
    overflow: 'hidden',
  },
  secondaryFilterContainer: {
    position: 'relative',
    width: 40,
    zIndex: 1,
  },
  secondaryFilterButton: {
    borderLeftWidth: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 8,
    minHeight: 36,
  },
  secondaryFilterLeftBorder: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.blue[200],
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
  },
  muscleFilterPrimary: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  filterButtonInactive: {
    backgroundColor: COLORS.slate[100],
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: COLORS.blue[100],
    borderColor: COLORS.blue[200],
  },
  secondaryFilterBorderActive: {
    borderColor: COLORS.blue[200],
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[600],
    textAlign: 'center',
  },
  filterButtonTextActive: {
    color: COLORS.blue[700],
  },
  filterMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
    overflow: 'hidden',
  },
  filterMenuLeftAligned: {
    right: 'auto',
    minWidth: 180,
  },
  filterMenuFullWidth: {
    left: 0,
    right: 0,
  },
  secondaryFilterMenu: {
    minWidth: 200,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterOptionSelected: {
    backgroundColor: COLORS.blue[50],
  },
  filterOptionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[700],
  },
  filterOptionTextSelected: {
    color: COLORS.blue[600],
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.slate[400],
    fontSize: 14,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  exerciseNameSelected: {
    color: COLORS.blue[600],
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  tagContainer: {
    backgroundColor: COLORS.slate[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: COLORS.slate[500],
  },
  muscleTagContainer: {
    backgroundColor: COLORS.indigo[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  muscleTagText: {
    fontSize: 10,
    color: COLORS.indigo[600],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnselected: {
    borderColor: COLORS.slate[300],
  },
  checkboxSelected: {
    backgroundColor: COLORS.blue[600],
    borderColor: COLORS.blue[600],
  },
});

export default ExercisePicker;

