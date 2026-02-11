import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/colors';
import type { ExerciseLibraryItem } from '@/types/workout';

interface GroupExercise {
  name: string;
  count: number;
}

interface ExerciseTagsProps {
  item: ExerciseLibraryItem;
  isCollapsedGroup: boolean;
  groupExercises: GroupExercise[] | null;
}

const tagContainerStyle = (backgroundColor: string) => ({
  backgroundColor,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
});

const tagTextStyle = (color: string, fontWeight?: '500') => ({
  fontSize: 10,
  color,
  ...(fontWeight && { fontWeight }),
});

const collapsedGroupTagStyle = tagContainerStyle(COLORS.slate[100]);
const collapsedGroupTagTextStyle = tagTextStyle(COLORS.slate[600], '500');
const categoryTagStyle = tagContainerStyle(COLORS.slate[100]);
const categoryTagTextStyle = tagTextStyle(COLORS.slate[500]);
const muscleTagStyle = tagContainerStyle(COLORS.indigo[50]);
const muscleTagTextStyle = tagTextStyle(COLORS.indigo[600]);

const ExerciseTags: React.FC<ExerciseTagsProps> = ({
  item,
  isCollapsedGroup,
  groupExercises,
}) => {
  if (isCollapsedGroup && groupExercises) {
    return (
      <>
        {groupExercises.map((groupExercise, idx) => (
          <View key={idx} style={collapsedGroupTagStyle}>
            <Text style={collapsedGroupTagTextStyle}>
              {groupExercise.name} ({groupExercise.count})
            </Text>
          </View>
        ))}
      </>
    );
  }

  const primaryMuscles = (item.primaryMuscles as string[]) || [];

  return (
    <>
      <View style={categoryTagStyle}>
        <Text style={categoryTagTextStyle}>{item.category}</Text>
      </View>
      {primaryMuscles.slice(0, 2).map(m => (
        <View key={m} style={muscleTagStyle}>
          <Text style={muscleTagTextStyle}>{m}</Text>
        </View>
      ))}
    </>
  );
};

export default ExerciseTags;
