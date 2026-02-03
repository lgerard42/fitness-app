import React from 'react';
import { View, Text } from 'react-native';
import { getGroupColorScheme } from '@/utils/workoutHelpers';
import type { GroupType } from '@/types/workout';

interface ExerciseGroup {
  type: GroupType;
  number: number;
}

interface GroupBadgeProps {
  exerciseGroup: ExerciseGroup | null;
  groupedStyles?: any;
}

const GroupBadge: React.FC<GroupBadgeProps> = ({ exerciseGroup, groupedStyles = {} }) => {
  if (!exerciseGroup) return null;

  const groupColorScheme = getGroupColorScheme(exerciseGroup.type);
  const badgeText = `${exerciseGroup.type === 'HIIT' ? 'H' : 'S'}${exerciseGroup.number}`;

  return (
    <View style={[
      {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 12,
        backgroundColor: groupColorScheme[100],
      },
      groupedStyles.container,
    ]}>
      <Text style={[
        {
          color: groupColorScheme[600],
          fontSize: 14,
          fontWeight: 'bold',
        },
        groupedStyles.text,
      ]}>{badgeText}</Text>
    </View>
  );
};

export default GroupBadge;
