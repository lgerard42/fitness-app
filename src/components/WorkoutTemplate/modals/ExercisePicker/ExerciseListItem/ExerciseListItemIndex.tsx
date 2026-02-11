import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';
import { getGroupColorScheme } from '@/utils/workoutHelpers';
import { defaultSupersetColorScheme } from '@/constants/defaultStyles';
import ExerciseTags from './ExerciseTags';
import type { ExerciseLibraryItem, GroupType } from '@/types/workout';

interface ExerciseGroup {
  type: GroupType;
  number: number;
}

export interface GroupExercise {
  name: string;
  count: number;
}

interface ExerciseListItemProps {
  item: ExerciseLibraryItem;
  isSelected: boolean;
  isLastSelected: boolean;
  onToggle: (id: string) => void;
  onLongPress?: (() => void) | null;
  isReordering?: boolean;
  isReordered?: boolean;
  showAddMore?: boolean;
  renderingSection?: 'reviewContainer' | 'glossary' | null;
  exerciseGroup?: ExerciseGroup | null;
  isGroupMode?: boolean;
  isSelectedInGroup?: boolean;
  isCollapsedGroup?: boolean;
  groupExercises?: GroupExercise[];
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  disableTouch?: boolean;
}

const ExerciseListItem: React.FC<ExerciseListItemProps> = ({ 
  item, 
  isSelected, 
  isLastSelected, 
  onToggle,
  onLongPress = null,
  isReordering = false,
  isReordered = false,
  showAddMore = false,
  renderingSection = null,
  exerciseGroup = null,
  isGroupMode = false,
  isSelectedInGroup = false,
  isCollapsedGroup = false,
  groupExercises = [],
  isFirstInGroup = false,
  isLastInGroup = false,
  disableTouch = false,
}) => {
  const handlePress = () => {
    if (isGroupMode && onToggle) {
      onToggle(item.id);
      return;
    }
    
    if (isReordering && onToggle) {
      onToggle(item.id);
      return;
    }
    
    if (renderingSection === 'reviewContainer') {
      return;
    }
    
    // In glossary, don't toggle selection for already-selected exercises
    if (renderingSection === 'glossary' && isSelected) {
      return;
    }
    
    if (onToggle) {
      onToggle(item.id);
    }
  };

  const container_selected = isSelected && showAddMore;
  const container_selectedInGlossary = isSelected && showAddMore && renderingSection === 'glossary';
  const container_reorderingMode = isReordering && !isReordered;
  const container_reorderedItem = isReordering && isReordered;

  const groupColorScheme = exerciseGroup ? getGroupColorScheme(exerciseGroup.type) : null;
  const isGrouped = !!exerciseGroup;
  const isReviewContainerGroupStyle = !isReordering && !isGroupMode && renderingSection === 'reviewContainer';

  const container_groupModeSelected = isGroupMode && isSelectedInGroup;
  const container_groupModeUnselected = isGroupMode && !isSelectedInGroup;

  const getGroupBackgroundColor = (shade: keyof typeof defaultSupersetColorScheme) => ({
    backgroundColor: groupColorScheme![shade],
  });

  const getGroupBorderColor = (shade: keyof typeof defaultSupersetColorScheme) => ({
    borderBottomColor: groupColorScheme![shade],
  });

  return (
    <TouchableOpacity 
      onPress={disableTouch ? undefined : handlePress}
      onLongPress={disableTouch ? undefined : onLongPress || undefined}
      disabled={disableTouch}
      activeOpacity={disableTouch ? 1 : 0.7}
      style={[
        styles.itemContainer,
        isSelected && isReviewContainerGroupStyle && isGrouped && getGroupBackgroundColor(100),
        isSelected && isReviewContainerGroupStyle && !isGrouped && styles.containerSelectedInReviewContainer,
        container_selected && renderingSection !== 'reviewContainer' && styles.containerSelected,
        container_selected && isReviewContainerGroupStyle && isGrouped && [
          getGroupBackgroundColor(100),
          getGroupBorderColor(150),
        ],
        container_selectedInGlossary && styles.containerSelectedInGlossary,
        isFirstInGroup && isGrouped && isReviewContainerGroupStyle && styles.containerFirstInGroup,
        isLastInGroup && isGrouped && isReviewContainerGroupStyle && styles.containerLastInGroup,
        isGrouped && isReviewContainerGroupStyle && !isLastInGroup && getGroupBorderColor(150),
        container_reorderingMode && styles.containerReorderingMode,
        container_reorderedItem && styles.containerReorderedItem,
        container_groupModeSelected && [
          getGroupBackgroundColor(100),
          styles.containerGroupModeSelected,
        ],
        isLastInGroup && isGrouped && isGroupMode && isSelectedInGroup && styles.containerGroupModeSelectedLast,
        container_groupModeUnselected && isGrouped && [
          getGroupBackgroundColor(50),
          getGroupBorderColor(200),
        ],
        isLastInGroup && isGrouped && isGroupMode && !isSelectedInGroup && styles.containerGroupModeUnselectedLast,
        container_groupModeUnselected && !isGrouped && styles.containerGroupModeUnselectedUngrouped,
      ]}
    >
      <View style={styles.contentContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.nameText}>
            {item.name}
          </Text>
        </View>
        <View style={styles.tagsContainer}>
          <ExerciseTags
            item={item}
            isCollapsedGroup={isCollapsedGroup}
            groupExercises={groupExercises}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    paddingLeft: 16,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    borderBottomColor: COLORS.slate[100],
  },
  contentContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  containerSelectedInReviewContainer: {
    backgroundColor: COLORS.slate[50],
    borderWidth: 2,
    borderRadius: 8,
    borderColor: COLORS.slate[150],
    borderBottomColor: COLORS.slate[150],
  },
  containerSelected: {
    backgroundColor: COLORS.blue[100],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[50],
    borderRadius: 0,
  },
  containerSelectedInGlossary: {
    borderWidth: 1,
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
    borderBottomColor: COLORS.slate[50],
  },
  containerFirstInGroup: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  containerLastInGroup: {
    borderBottomColor: 'transparent',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  containerReorderingMode: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderRadius: 8,
    borderColor: COLORS.slate[100],
  },
  containerReorderedItem: {
    backgroundColor: COLORS.slate[50],
    borderWidth: 2,
    borderRadius: 8,
    borderColor: COLORS.slate[100],
  },
  containerGroupModeSelected: {
    borderBottomColor: COLORS.blue[200],
  },
  containerGroupModeSelectedLast: {
    borderBottomColor: COLORS.white,
  },
  containerGroupModeUnselectedLast: {
    borderBottomColor: COLORS.white,
  },
  containerGroupModeUnselectedUngrouped: {
    backgroundColor: COLORS.white,
    borderBottomColor: COLORS.slate[100],
  },
});

export default ExerciseListItem;
