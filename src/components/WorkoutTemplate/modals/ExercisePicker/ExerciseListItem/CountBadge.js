import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../../../constants/colors';

const CountBadge = ({ selectedCount, groupedStyles = {} }) => {
  if (!selectedCount || selectedCount === 0) return null;

  return (
    <View style={[
      styles.container,
      groupedStyles.container,
    ]}>
      <Text style={[
        styles.plusText,
        groupedStyles.plusText,
      ]}>+</Text>
      <Text style={[
        styles.countText,
        groupedStyles.countText,
      ]}>{selectedCount}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: COLORS.blue[50],
    height: 20, // Fixed height to prevent layout shifts
    minHeight: 20,
    maxHeight: 20,
  },
  plusText: {
    color: COLORS.slate[600],
    fontSize: 14,
    fontWeight: 'normal',
    lineHeight: 16, // Explicit line height to match count text
    marginRight: 1,
    includeFontPadding: false, // Prevent extra padding on Android
    textAlignVertical: 'center',
  },
  countText: {
    color: COLORS.blue[600],
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16, // Explicit line height to match plus text
    includeFontPadding: false, // Prevent extra padding on Android
    textAlignVertical: 'center',
  },
});

export default CountBadge;
