import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';

const SecondaryMuscleFilter = ({
  isEnabled,
  isActive,
  isOpen,
  isPrimaryActive,
  onToggle,
  styles: externalStyles
}) => {
  if (!isEnabled) return null;
  
  const button_active = isActive;
  const button_inactive = !isActive;
  const button_openOrPrimaryActive = isOpen || isPrimaryActive;
  const button_primaryActive = isPrimaryActive;
  const icon_active = isActive;
  const icon_inactive = !isActive;

  return (
    <View style={externalStyles.secondaryFilterContainer}>
      <TouchableOpacity 
        onPress={onToggle}
        style={[
          externalStyles.filterButton,
          externalStyles.secondaryFilterButton,
          button_openOrPrimaryActive ? externalStyles.secondaryFilterBorderActive : styles.buttonBorderInactive,
          button_primaryActive ? externalStyles.secondaryFilterLeftBorder : {},
          button_active ? styles.buttonActive : styles.buttonInactive,
        ]}
      >
        <MaterialCommunityIcons 
          name={icon_active ? "arm-flex" : "arm-flex-outline"} 
          size={14} 
          color={icon_active ? COLORS.blue[700] : COLORS.blue[400]} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonBorderInactive: {
    borderColor: 'transparent',
  },
  buttonActive: {
    backgroundColor: COLORS.blue[100],
  },
  buttonInactive: {
    backgroundColor: COLORS.slate[100],
  },
});

export default SecondaryMuscleFilter;
