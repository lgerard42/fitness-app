import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS } from '../../../../constants/colors';

const FilterDropdown = ({ 
  label, 
  value, 
  options, 
  type, 
  leftAligned = false, 
  fullWidthContainer = false,
  openFilter,
  setOpenFilter,
  onToggleOption,
  filterMuscle
}) => {
  const isActive = Array.isArray(value) ? value.length > 0 : value !== "All";
  const displayText = Array.isArray(value) 
    ? (value.length === 0 ? label : value.length === 1 ? value[0] : `${value.length} selected`)
    : (value === "All" ? label : value);
  
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
                onPress={() => onToggleOption(type, item, value)}
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
  );
};

const styles = StyleSheet.create({
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
  filterMenuLeftAligned: {
    right: 'auto',
    minWidth: 180,
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

export default FilterDropdown;

