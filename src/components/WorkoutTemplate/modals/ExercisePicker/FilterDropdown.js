import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

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
  
  const container_fullWidth = fullWidthContainer;
  const button_active = isActive;
  const button_inactive = !isActive;
  const button_muscleFilterPrimary = type === 'muscle' && filterMuscle.length > 0;
  const buttonText_active = isActive;
  const menu_leftAligned = leftAligned;

  return (
    <View style={[
      styles.container,
      container_fullWidth && styles.containerFullWidth,
    ]}>
      <TouchableOpacity 
        onPress={() => setOpenFilter(openFilter === type ? null : type)}
        style={[
          styles.button,
          button_active && styles.buttonActive,
          button_inactive && styles.buttonInactive,
          button_muscleFilterPrimary && styles.buttonMuscleFilterPrimary,
        ]}
      >
        <Text style={[
          styles.buttonText,
          buttonText_active && styles.buttonTextActive,
        ]} numberOfLines={1}>
          {displayText}
        </Text>
      </TouchableOpacity>
      
      {openFilter === type && !fullWidthContainer && (
        <View 
          style={[
            styles.menu,
            menu_leftAligned && styles.menuLeftAligned,
          ]}
          pointerEvents="box-none"
        >
          {options.map((item) => {
            const isSelected = Array.isArray(value) ? value.includes(item) : value === item;
            const option_selected = isSelected;

            return (
              <TouchableOpacity
                key={item}
                onPress={() => onToggleOption(type, item, value)}
                style={[
                  styles.option,
                  option_selected && styles.optionSelected,
                ]}
              >
                <Text style={styles.optionText}>
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
  container: {
    flex: 1,
    position: 'relative',
    minWidth: 0,
  },
  containerFullWidth: {
    position: 'relative',
    zIndex: 1,
    flexShrink: 1,
  },
  
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 0,
  },
  buttonActive: {
    backgroundColor: COLORS.blue[100],
    borderColor: COLORS.blue[200],
  },
  buttonInactive: {
    backgroundColor: COLORS.slate[100],
    borderColor: 'transparent',
  },
  buttonMuscleFilterPrimary: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[600],
    textAlign: 'center',
  },
  buttonTextActive: {
    color: COLORS.blue[700],
  },
  
  menu: {
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
  menuLeftAligned: {
    right: 'auto',
    minWidth: 180,
  },
  
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.slate[600],
  },
  optionSelected: {
    backgroundColor: COLORS.blue[500],
  },
  optionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default FilterDropdown;
