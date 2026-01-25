import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/colors';

const ExerciseTags = ({ 
  item, 
  isCollapsedGroup, 
  groupExercises, 
  showAddMore, 
  renderingSection,
  groupedStyles = {},
}) => {
  if (isCollapsedGroup && groupExercises) {
    // Show summary of exercises and sets in the group
    return (
      <>
        {groupExercises.map((groupExercise, idx) => (
          <View key={idx} style={[
            {
              backgroundColor: COLORS.slate[100],
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            },
            groupedStyles.collapsedGroupItemContainer,
          ]}>
            <Text style={[
              {
                fontSize: 10,
                color: COLORS.slate[600],
                fontWeight: '500',
              },
              groupedStyles.collapsedGroupItemText,
            ]}>{groupExercise.name} ({groupExercise.count})</Text>
          </View>
        ))}
      </>
    );
  }

  return (
    <>
      <View style={[
        {
          backgroundColor: COLORS.slate[100],
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
        },
        showAddMore && {
        },
        showAddMore && renderingSection === 'unselectedList' && {
        },
        groupedStyles.categoryTagContainer,
      ]}>
        <Text style={[
          {
            fontSize: 10,
            color: COLORS.slate[500],
          },
          showAddMore && {
          },
          showAddMore && renderingSection === 'unselectedList' && {
          },
          groupedStyles.categoryTagText,
        ]}>{item.category}</Text>
      </View>
      {item.primaryMuscles && item.primaryMuscles.slice(0, 2).map(m => (
        <View key={m} style={[
          {
            backgroundColor: COLORS.indigo[50],
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
          },
          showAddMore && {
          },
          showAddMore && renderingSection === 'unselectedList' && {
          },
          groupedStyles.muscleTagContainer,
        ]}>
          <Text style={[
            {
              fontSize: 10,
              color: COLORS.indigo[600],
            },
            showAddMore && {
            },
            showAddMore && renderingSection === 'unselectedList' && {
            },
            groupedStyles.muscleTagText,
          ]}>{m}</Text>
        </View>
      ))}
    </>
  );
};

export default ExerciseTags;
