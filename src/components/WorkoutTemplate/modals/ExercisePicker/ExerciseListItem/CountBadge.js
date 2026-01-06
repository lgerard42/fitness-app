import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../../../constants/colors';

const CountBadge = ({ selectedCount, groupedStyles = {} }) => {
  if (!selectedCount || selectedCount === 0) return null;

  return (
    <Text style={[
      styles.countText,
      groupedStyles.countText,
    ]}>{selectedCount}</Text>
  );
};

const styles = StyleSheet.create({
  countText: {
    color: COLORS.blue[600],
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
    includeFontPadding: false, // Prevent extra padding on Android
    textAlignVertical: 'center',
  },
});

export default CountBadge;
