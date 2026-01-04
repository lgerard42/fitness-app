import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS } from '../../../../constants/colors';
import { CATEGORIES, PRIMARY_MUSCLES, WEIGHT_EQUIP_TAGS } from '../../../../constants/data';
import FilterDropdown from './FilterDropdown';
import SecondaryMuscleFilter from './SecondaryMuscleFilter';

const Filters = ({
  filterCategory,
  filterMuscle,
  filterEquip,
  filterSecondaryMuscle,
  setFilterCategory,
  setFilterMuscle,
  setFilterEquip,
  setFilterSecondaryMuscle,
  openFilter,
  setOpenFilter,
  getAvailableSecondaryMuscles
}) => {
  const handleToggleOption = (type, item, currentValue) => {
    if (Array.isArray(currentValue)) {
      const newValue = currentValue.includes(item) 
        ? currentValue.filter(v => v !== item)
        : [...currentValue, item];
      
      if (type === 'category') setFilterCategory(newValue);
      if (type === 'muscle') {
        setFilterMuscle(newValue);
        if (newValue.length === 0) setFilterSecondaryMuscle([]);
      }
      if (type === 'equip') setFilterEquip(newValue);
      if (type === 'secondary') setFilterSecondaryMuscle(newValue);
    }
  };

  const handleToggleMuscle = (item) => {
    const newValue = filterMuscle.includes(item) 
      ? filterMuscle.filter(v => v !== item)
      : [...filterMuscle, item];
    setFilterMuscle(newValue);
    if (newValue.length === 0) setFilterSecondaryMuscle([]);
  };

  const handleToggleSecondary = (item) => {
    setFilterSecondaryMuscle(
      filterSecondaryMuscle.includes(item) 
        ? filterSecondaryMuscle.filter(v => v !== item)
        : [...filterSecondaryMuscle, item]
    );
  };

  return (
    <View style={styles.filtersRow}>
      <FilterDropdown 
        label="Category" 
        value={filterCategory} 
        options={CATEGORIES} 
        type="category"
        openFilter={openFilter}
        setOpenFilter={setOpenFilter}
        onToggleOption={handleToggleOption}
        filterMuscle={filterMuscle}
      />
      <View style={styles.muscleFiltersContainer}>
        <FilterDropdown 
          label="Muscle" 
          value={filterMuscle} 
          options={PRIMARY_MUSCLES} 
          type="muscle" 
          fullWidthContainer={true}
          openFilter={openFilter}
          setOpenFilter={setOpenFilter}
          onToggleOption={handleToggleOption}
          filterMuscle={filterMuscle}
        />
        <SecondaryMuscleFilter
          isEnabled={filterMuscle.length > 0}
          isActive={filterSecondaryMuscle.length > 0}
          isOpen={openFilter === 'secondary'}
          isPrimaryActive={filterMuscle.length > 0}
          onToggle={() => setOpenFilter(openFilter === 'secondary' ? null : 'secondary')}
          styles={styles}
        />
        {/* Render dropdown menus at container level for proper positioning */}
        {openFilter === 'muscle' && (
          <View style={styles.muscleFilterMenu}>
            {PRIMARY_MUSCLES.map((item) => {
              const isSelected = filterMuscle.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => handleToggleMuscle(item)}
                  style={[styles.filterOption, isSelected && styles.filterOptionSelected]}
                >
                  <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextSelected]}>
                    {item}
                  </Text>
                  {isSelected && <Check size={12} color={COLORS.white} />}
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
                  onPress={() => handleToggleSecondary(item)}
                  style={[styles.filterOption, isSelected && styles.filterOptionSelected]}
                >
                  <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextSelected]}>
                    {item}
                  </Text>
                  {isSelected && <Check size={12} color={COLORS.white} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
      <FilterDropdown 
        label="Equipment" 
        value={filterEquip} 
        options={WEIGHT_EQUIP_TAGS} 
        type="equip"
        openFilter={openFilter}
        setOpenFilter={setOpenFilter}
        onToggleOption={handleToggleOption}
        filterMuscle={filterMuscle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 90,
    alignItems: 'center',
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
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
    minHeight: 0,
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
    minHeight: 0,
  },
  secondaryFilterBorderActive: {
    borderColor: COLORS.blue[200],
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.slate[600],
  },
  filterOptionSelected: {
    backgroundColor: COLORS.blue[500],
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  filterOptionTextSelected: {
    color: COLORS.white,
  },
});

export default Filters;

