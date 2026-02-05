import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';
import { getGroupColorScheme } from '@/utils/workoutHelpers';
import { defaultSupersetColorScheme } from '@/constants/defaultStyles';
import GroupBadge from './GroupBadge';
import CountBadge from './CountBadge';
import ExerciseTags from './ExerciseTags';
import ActionButtons from './ActionButtons';
import ReorderCheckbox from './ReorderCheckbox';
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
  selectionOrder: number | null;
  onToggle: (id: string) => void;
  onLongPress?: (() => void) | null;
  hideNumber?: boolean;
  isReordering?: boolean;
  isReordered?: boolean;
  showAddMore?: boolean;
  onAddMore?: (() => void) | null;
  onRemoveSet?: (() => void) | null;
  selectedCount?: number;
  renderingSection?: 'reviewContainer' | 'glossary' | null;
  exerciseGroup?: ExerciseGroup | null;
  isGroupMode?: boolean;
  isSelectedInGroup?: boolean;
  isCollapsedGroup?: boolean;
  groupExercises?: GroupExercise[];
  isGroupItemReorder?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  disableTouch?: boolean;
}

const ExerciseListItem: React.FC<ExerciseListItemProps> = ({ 
  item, 
  isSelected, 
  isLastSelected, 
  selectionOrder, 
  onToggle,
  onLongPress = null,
  hideNumber = false,
  isReordering = false,
  isReordered = false,
  showAddMore = false,
  onAddMore = null,
  onRemoveSet = null,
  selectedCount = 0,
  renderingSection = null,
  exerciseGroup = null,
  isGroupMode = false,
  isSelectedInGroup = false,
  isCollapsedGroup = false,
  groupExercises = [],
  isGroupItemReorder = false,
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
    
    if (isSelected && showAddMore && onRemoveSet) {
      onRemoveSet();
    } else if (onToggle) {
      onToggle(item.id);
    }
  };

  const handleRemove = (e: any) => {
    e.stopPropagation();
    if (onRemoveSet) {
      onRemoveSet();
    }
  };

  const handleAdd = (e: any) => {
    e.stopPropagation();
    if (showAddMore && onAddMore) {
      onAddMore();
    } else if (onToggle) {
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

  const container_groupModeSelected = isGroupMode && isSelectedInGroup;
  const container_groupModeUnselected = isGroupMode && !isSelectedInGroup;
  const container_firstInGroup = isFirstInGroup && isGrouped;
  const container_lastInGroup = isLastInGroup && isGrouped;

  const showCountBadge = isSelected && selectedCount > 0;
  const showGroupBadge = exerciseGroup && renderingSection === 'reviewContainer';
  const showAddRemoveButtons = isSelected && !isReordering && showAddMore;
  // Don't show add button for unselected exercises in glossary (list view)
  const showAddButtonOnly = !isSelected && !isReordering && renderingSection !== 'glossary';

  const groupColorScheme = exerciseGroup ? getGroupColorScheme(exerciseGroup.type) : null;
  const isGrouped = !!exerciseGroup;

  const getGroupBackgroundColor = (shade: keyof typeof defaultSupersetColorScheme) => ({
    backgroundColor: groupColorScheme[shade],
  });

  const getGroupBorderColor = (shade: keyof typeof defaultSupersetColorScheme) => ({
    borderBottomColor: groupColorScheme[shade],
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
            text_reorderingMode && !isGroupItemReorder && styles.nameTextReorderingMode,
            text_reorderingMode && isGroupItemReorder && styles.nameTextReorderingModeGroup,
          ]}>
            {item.name}
          </Text>
          <View style={styles.badgesContainer}>
            {showGroupBadge && (
              <GroupBadge 
                exerciseGroup={exerciseGroup} 
              />
            )}
          </View>
        </View>
        <View style={styles.tagsContainer}>
          <ExerciseTags
            item={item}
            isCollapsedGroup={isCollapsedGroup}
            groupExercises={groupExercises}
            showAddMore={showAddMore}
            renderingSection={renderingSection}
          />
        </View>
      </View>
      {showCountBadge && (
        <View style={styles.countBadgeWrapper}>
          <CountBadge 
            selectedCount={selectedCount}
          />
        </View>
      )}
      {showAddRemoveButtons || showAddButtonOnly ? (
        <ActionButtons
          isSelected={isSelected}
          isReordering={isReordering}
          showAddMore={showAddMore}
          renderingSection={renderingSection}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
      ) : renderingSection === 'glossary' && !isSelected ? null : (
        <ReorderCheckbox
          isSelected={isSelected}
          hideNumber={hideNumber}
          selectionOrder={selectionOrder}
          isReordering={isReordering}
          isReordered={isReordered}
          isGroupItemReorder={isGroupItemReorder}
        />
      )}
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
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  countBadgeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    height: 24,
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
    borderBottomRadius: 1,
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
  nameTextReorderingModeGroup: {
    color: COLORS.indigo[600],
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
