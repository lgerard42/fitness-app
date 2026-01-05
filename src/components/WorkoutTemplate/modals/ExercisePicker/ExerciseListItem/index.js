import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../../../../constants/colors';
import { defaultSupersetColorScheme, defaultHiitColorScheme } from '../../../../../constants/defaultStyles';
import GroupBadge from './GroupBadge';
import CountBadge from './CountBadge';
import ExerciseTags from './ExerciseTags';
import ActionButtons from './ActionButtons';
import ReorderCheckbox from './ReorderCheckbox';

const ExerciseListItem = ({ 
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
  renderingSection = null, // 'reviewContainer' | 'glossary' | null
  exerciseGroup = null,
  isGroupMode = false,
  isSelectedInGroup = false,
  isCollapsedGroup = false,
  groupExercises = [],
  isGroupItemReorder = false,
  isFirstInGroup = false,
  isLastInGroup = false,
  disableTouch = false, // New prop to disable touch handling for drag mode
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
      onRemoveSet(item.id);
    } else if (onToggle) {
      onToggle(item.id);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemoveSet) {
      onRemoveSet(item.id);
    }
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    if (showAddMore && onAddMore) {
      onAddMore(item.id);
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
  const showAddButtonOnly = !isSelected && !isReordering;

  const groupColorScheme = exerciseGroup?.type === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;
  const isGrouped = !!exerciseGroup;

  const getGroupBackgroundColor = (shade) => ({
    backgroundColor: groupColorScheme[shade],
  });

  const getGroupBorderColor = (shade) => ({
    borderBottomColor: groupColorScheme[shade],
  });

  return (
    <TouchableOpacity 
      onPress={disableTouch ? undefined : handlePress}
      onLongPress={disableTouch ? undefined : onLongPress}
      disabled={disableTouch}
      activeOpacity={disableTouch ? 1 : 0.7}
      style={[
        styles.itemContainer,
        container_selectedInReviewContainer && !isReordering && !isGroupMode && isGrouped && renderingSection === 'reviewContainer' && getGroupBackgroundColor(100),
        container_selected && styles.containerSelected,
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
            {showCountBadge && (
              <CountBadge 
                selectedCount={selectedCount}
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
      {showAddRemoveButtons || showAddButtonOnly ? (
        <ActionButtons
          isSelected={isSelected}
          isReordering={isReordering}
          showAddMore={showAddMore}
          renderingSection={renderingSection}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
      ) : (
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
    borderBottomWidth: 1,
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
  
  nameTextSelectedInReviewContainer: {
    color: COLORS.slate[900],
  },
  
  containerSelected: {
    backgroundColor: COLORS.slate[50],
    borderWidth: 1,
    borderColor: COLORS.slate[100],
    borderRadius: 8,
  },
  nameTextSelected: {
    color: COLORS.slate[900],
  },
  
  containerSelectedInGlossary: {
    borderWidth: 1,
    borderRadius: 8,
    borderColor: COLORS.slate[50],
  },
  nameTextSelectedInGlossary: {
    color: COLORS.slate[900],
  },
  
  containerLastSelected: {
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
  nameTextReorderingMode: {
  },
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
