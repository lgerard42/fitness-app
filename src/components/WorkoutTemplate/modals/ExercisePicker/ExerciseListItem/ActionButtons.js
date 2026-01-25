import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '@/constants/colors';

const ActionButtons = ({
  isSelected,
  isReordering,
  showAddMore,
  renderingSection,
  onAdd,
  onRemove,
  groupedStyles = {},
}) => {
  const showAddRemoveButtons = isSelected && !isReordering && showAddMore;
  const showAddButtonOnly = !isSelected && !isReordering;
  const addButton_selected = isSelected && !isReordering;
  const addButton_unselected = !isSelected && !isReordering;
  const removeButton_selected = isSelected && !isReordering;

  if (showAddRemoveButtons) {
    if (renderingSection === 'selectedSection') {
      return (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
          <TouchableOpacity
            onPress={onRemove}
            style={[
              {
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: COLORS.white,
                borderWidth: 1,
                borderColor: COLORS.slate[300],
                alignItems: 'center',
                justifyContent: 'center',
              },
              removeButton_selected && {
              },
              removeButton_selected && renderingSection === 'selectedSection' && {
              },
              removeButton_selected && renderingSection === 'unselectedList' && {
              },
              groupedStyles.removeButtonContainer,
            ]}
          >
            <Text style={[
              {
                color: COLORS.slate[700],
                fontSize: 14,
                fontWeight: 'bold',
                lineHeight: 16,
              },
              removeButton_selected && {
              },
              removeButton_selected && renderingSection === 'selectedSection' && {
              },
              removeButton_selected && renderingSection === 'unselectedList' && {
              },
              groupedStyles.removeButtonText,
            ]}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onAdd}
            style={[
              {
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: COLORS.slate[50],
                borderWidth: 1,
                borderColor: COLORS.blue[400],
                alignItems: 'center',
                justifyContent: 'center',
              },
              addButton_selected && {
              },
              addButton_selected && renderingSection === 'selectedSection' && {
                backgroundColor: COLORS.blue[600],
                borderWidth: 1,
                borderColor: COLORS.blue[600], 
              },
              addButton_selected && renderingSection === 'unselectedList' && {
              },
              groupedStyles.addButtonContainer,
            ]}
          >
            <Text style={[
              {
                color: COLORS.blue[500],
                fontSize: 14,
                fontWeight: 'bold',
                lineHeight: 16,
              },
              addButton_selected && {
              },
              addButton_selected && renderingSection === 'selectedSection' && {
                color: COLORS.white,
              },
              addButton_selected && renderingSection === 'unselectedList' && {
              },
              groupedStyles.addButtonText,
            ]}>+</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <TouchableOpacity
          onPress={onAdd}
          style={[
            {
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: COLORS.slate[50],
              borderWidth: 1,
              borderColor: COLORS.blue[400],
              alignItems: 'center',
              justifyContent: 'center',
            },
            addButton_selected && {
            },
            addButton_selected && renderingSection === 'selectedSection' && {
              backgroundColor: COLORS.blue[600],
              borderWidth: 1,
              borderColor: COLORS.blue[600], 
            },
            addButton_selected && renderingSection === 'unselectedList' && {
            },
            groupedStyles.addButtonContainer,
          ]}
        >
          <Text style={[
            {
              color: COLORS.blue[500],
              fontSize: 14,
              fontWeight: 'bold',
              lineHeight: 16,
            },
            addButton_selected && {
            },
            addButton_selected && renderingSection === 'selectedSection' && {
              color: COLORS.white,
            },
            addButton_selected && renderingSection === 'unselectedList' && {
            },
            groupedStyles.addButtonText,
          ]}>+</Text>
        </TouchableOpacity>
      );
    }
  }

  if (showAddButtonOnly) {
    return (
      <TouchableOpacity
        onPress={onAdd}
        style={[
          {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: COLORS.slate[50],
            borderWidth: 1,
            borderColor: COLORS.slate[300],
            alignItems: 'center',
            justifyContent: 'center',
          },
          addButton_unselected && {
          },
          addButton_unselected && renderingSection === 'selectedSection' && {
          },
          addButton_unselected && renderingSection === 'unselectedList' && {
          },
          groupedStyles.addButtonOnlyContainer,
        ]}
      >
        <Text style={[
          {
            color: COLORS.slate[300],
            fontSize: 14,
            fontWeight: 'bold',
            lineHeight: 16,
          },
          addButton_unselected && {
          },
          addButton_unselected && renderingSection === 'selectedSection' && {
          },
          addButton_unselected && renderingSection === 'unselectedList' && {
          },
          groupedStyles.addButtonOnlyText,
        ]}>+</Text>
      </TouchableOpacity>
    );
  }

  return null;
};

export default ActionButtons;
