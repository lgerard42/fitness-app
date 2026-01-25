import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/colors';

interface ReorderCheckboxProps {
  isSelected: boolean;
  hideNumber: boolean;
  selectionOrder: number | null;
  isReordering: boolean;
  isReordered: boolean;
  isGroupItemReorder: boolean;
  groupedStyles?: any;
}

const ReorderCheckbox: React.FC<ReorderCheckboxProps> = ({ 
  isSelected, 
  hideNumber, 
  selectionOrder, 
  isReordering, 
  isReordered, 
  isGroupItemReorder,
  groupedStyles = {},
}) => {
  const checkbox_reorderingUnmoved = isReordering && !isReordered;
  const checkbox_reorderingMoved = isReordering && isReordered;

  return (
    <View style={[
      {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
      },
      checkbox_reorderingUnmoved && !isGroupItemReorder && {
        backgroundColor: 'transparent',
        borderColor: COLORS.amber[400],
        borderStyle: 'dashed',
      },
      checkbox_reorderingMoved && !isGroupItemReorder && {
        backgroundColor: COLORS.green[100],
        borderColor: COLORS.green[200],
      },
      checkbox_reorderingUnmoved && isGroupItemReorder && {
        backgroundColor: 'transparent',
        borderColor: COLORS.indigo[400],
        borderStyle: 'dashed',
      },
      checkbox_reorderingMoved && isGroupItemReorder && {
        backgroundColor: COLORS.indigo[100],
        borderColor: COLORS.indigo[200],
      },
      groupedStyles.container,
    ]}>
      {isSelected && !hideNumber && selectionOrder !== null ? (
        <Text style={[
          {
            color: COLORS.green[500],
            fontSize: 12,
            fontWeight: 'bold',
          },
          groupedStyles.text,
        ]}>{selectionOrder}</Text>
      ) : null}
    </View>
  );
};

export default ReorderCheckbox;
