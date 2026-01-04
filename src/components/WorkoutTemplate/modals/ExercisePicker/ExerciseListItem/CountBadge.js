import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '../../../../../constants/colors';

const CountBadge = ({ selectedCount, groupedStyles = {} }) => {
  if (!selectedCount || selectedCount === 0) return null;

  return (
    <View style={[
      {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 12,
        backgroundColor: COLORS.blue[50],
      },
      groupedStyles.container,
    ]}>
      <Text style={[
        {
          color: COLORS.slate[600],
          fontSize: 14,
          fontWeight: 'normal',
          marginRight: 1,
        },
        groupedStyles.plusText,
      ]}>+</Text>
      <Text style={[
        {
          color: COLORS.blue[600],
          fontSize: 14,
          fontWeight: 'bold',
        },
        groupedStyles.countText,
      ]}>{selectedCount}</Text>
    </View>
  );
};

export default CountBadge;
