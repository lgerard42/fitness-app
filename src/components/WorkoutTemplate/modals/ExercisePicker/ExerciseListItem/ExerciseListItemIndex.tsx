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

interface GroupExercise {
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
  const container_selectedInReviewContainer = isSelected && !showAddMore;
  const container_selectedInGlossary = isSelected && showAddMore && renderingSection === 'glossary';
  const container_lastSelected = isLastSelected;
  const container_reorderingMode = isReordering && !isReordered;
  const container_reorderedItem = isReordering && isReordered;

  const text_selected = isSelected && showAddMore;
  const text_selectedInReviewContainer = isSelected && !showAddMore;
  const text_selectedInGlossary = isSelected && showAddMore && renderingSection === 'glossary';
  const text_reorderingMode = isReordering && !isReordered;

  const groupColorScheme = exerciseGroup ? getGroupColorScheme(exerciseGroup.type) : null;
  const isGrouped = !!exerciseGroup;

  const container_groupModeSelected = isGroupMode && isSelectedInGroup;
  const container_groupModeUnselected = isGroupMode && !isSelectedInGroup;
  const container_firstInGroup = isFirstInGroup && isGrouped;
  const container_lastInGroup = isLastInGroup && isGrouped;

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
        isSelected && !isReordering && !isGroupMode && isGrouped && renderingSection === 'reviewContainer' && getGroupBackgroundColor(100),
        isSelected && !isReordering && !isGroupMode && !isGrouped && renderingSection === 'reviewContainer' && styles.containerSelectedInReviewContainer,
        container_selected && renderingSection !== 'reviewContainer' && styles.containerSelected,
        container_selected && !isReordering && !isGroupMode && isGrouped && renderingSection === 'reviewContainer' && [
          getGroupBackgroundColor(100),
          getGroupBorderColor(150),
        ],
        container_selectedInGlossary && styles.containerSelectedInGlossary,
        container_lastSelected && styles.containerLastSelected,
        isFirstInGroup && isGrouped && !isReordering && !isGroupMode && renderingSection === 'reviewContainer' && styles.containerFirstInGroup,
        isLastInGroup && isGrouped && !isReordering && !isGroupMode && renderingSection === 'reviewContainer' && styles.containerLastInGroup,
        isGrouped && !isGroupMode && renderingSection === 'reviewContainer' && !isLastInGroup && getGroupBorderColor(150),
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
          <Text style={[
            styles.nameText,
            text_selectedInReviewContainer && styles.nameTextSelectedInReviewContainer,
            text_selected && styles.nameTextSelected,
            text_selectedInGlossary && styles.nameTextSelectedInGlossary,
            text_reorderingMode && styles.nameTextReorderingMode,
          ]}>
            {item.name}
          </Text>
        </View>
        <View style={styles.tagsContainer}>
          <ExerciseTags
            item={item}
            isCollapsedGroup={isCollapsedGroup}
            groupExercises={groupExercises}
            showAddMore={showAddMore}
            renderingSection={renderingSection === 'glossary' || renderingSection === 'reviewContainer' ? 'selectedSection' : null}
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
  nameTextSelectedInReviewContainer: {
    color: COLORS.slate[900],
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
  nameTextSelected: {
    color: COLORS.slate[900],
  },
  containerSelectedInGlossary: {
    borderWidth: 1,
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
    borderBottomColor: COLORS.slate[50],
  },
  nameTextSelectedInGlossary: {
    color: COLORS.slate[900],
  },
  containerLastSelected: {},
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
  nameTextReorderingMode: {},
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
