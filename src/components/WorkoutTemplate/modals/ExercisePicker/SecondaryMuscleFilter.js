import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../../../constants/colors';

const SecondaryMuscleFilter = ({
  isEnabled,
  isActive,
  isOpen,
  isPrimaryActive,
  onToggle,
  styles: externalStyles
}) => {
  if (!isEnabled) return null;
  
  return (
    <View style={externalStyles.secondaryFilterContainer}>
      <TouchableOpacity 
        onPress={onToggle}
        style={[
          externalStyles.filterButton,
          externalStyles.secondaryFilterButton,
          (isOpen || isPrimaryActive) ? externalStyles.secondaryFilterBorderActive : { borderColor: 'transparent' },
          isPrimaryActive ? externalStyles.secondaryFilterLeftBorder : {},
          isActive ? { backgroundColor: COLORS.blue[100] } : { backgroundColor: COLORS.slate[100] }
        ]}
      >
        <MaterialCommunityIcons 
          name={isActive ? "arm-flex" : "arm-flex-outline"} 
          size={14} 
          color={isActive ? COLORS.blue[700] : COLORS.blue[400]} 
        />
      </TouchableOpacity>
    </View>
  );
};

export default SecondaryMuscleFilter;

