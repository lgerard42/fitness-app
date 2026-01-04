import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { COLORS } from '../../../../constants/colors';

const SelectedSectionHeader = ({ section, isCollapsed, onToggle }) => {
  if (section.title !== 'Selected' || section.data.length === 0) {
    return null;
  }

  return (
    <TouchableOpacity 
      onPress={onToggle}
      style={styles.selectedSectionHeader}
    >
      <Text style={styles.selectedSectionHeaderText}>Selected ({section.data.length})</Text>
      {isCollapsed ? (
        <ChevronDown size={16} color={COLORS.slate[600]} />
      ) : (
        <ChevronUp size={16} color={COLORS.slate[600]} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  selectedSectionHeader: {
    backgroundColor: COLORS.slate[50],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedSectionHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[600],
    textTransform: 'uppercase',
  },
});

export default SelectedSectionHeader;

