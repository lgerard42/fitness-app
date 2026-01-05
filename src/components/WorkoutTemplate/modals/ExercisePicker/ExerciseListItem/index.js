import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
  hideNumber = false,
  isReordering = false,
  isReordered = false,
  showAddMore = false,
  onAddMore = null,
  onRemoveSet = null,
  selectedCount = 0,
  selectedInListStyle = null,
  selectedInListNameStyle = null,
  renderingSection = null, // 'selectedSection' | 'unselectedList' | null
  exerciseGroup = null, // Group object if exercise belongs to a group
  isGroupMode = false, // Whether in group creation/edit mode
  isSelectedInGroup = false, // Whether this exercise is selected in group mode
  isCollapsedGroup = false, // Whether this is a collapsed group view
  groupExercises = [], // Array of {name, count} for collapsed group summary
  isGroupItemReorder = false, // Whether this is a group item being reordered (use indigo colors)
  isFirstInGroup = false, // Whether this is the first item in a group
  isLastInGroup = false, // Whether this is the last item in a group
}) => {
  const handlePress = () => {
    // In group mode, container click toggles selection
    if (isGroupMode && onToggle) {
      onToggle(item.id);
      return;
    }
    
    // In reordering mode, container click should trigger reorder assignment
    if (isReordering && onToggle) {
      onToggle(item.id);
      return;
    }
    
    // In selectedSection, container click does nothing - user must use +/- buttons
    if (renderingSection === 'selectedSection') {
      return;
    }
    
    if (isSelected && showAddMore && onRemoveSet) {
      // If already selected, clicking container removes one set (only in unselectedList)
      onRemoveSet(item.id);
    } else if (onToggle) {
      // If unselected, clicking container adds one set
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
      // For selected exercises, add another set
      onAddMore(item.id);
    } else if (onToggle) {
      // For unselected exercises, use onToggle to add
      onToggle(item.id);
    }
  };

  // Define styling condition variables
  const container_selectedInSection = isSelected && !showAddMore;
  const container_selectedInList = isSelected && showAddMore;
  const container_lastSelected = isLastSelected;
  const container_reorderingMode = isReordering && !isReordered;
  const container_reorderedItem = isReordering && isReordered;
  const container_addMoreMode = showAddMore;

  const text_selectedInSection = isSelected && !showAddMore;
  const text_selectedInList = isSelected && showAddMore;
  const text_reorderingMode = isReordering && !isReordered;
  const text_addMoreMode = showAddMore;

  const container_groupModeSelected = isGroupMode && isSelectedInGroup;
  const container_groupModeUnselected = isGroupMode && !isSelectedInGroup;
  const container_firstInGroup = isFirstInGroup && isGrouped;
  const container_lastInGroup = isLastInGroup && isGrouped;

  // Determine if we should show the count badge next to name (selected, non-reorder, only in unselectedList)
  const showCountBadge = isSelected && selectedCount > 0;
  
  // Determine if we should show the group badge (show in group mode so users can see which items are in groups)
  const showGroupBadge = exerciseGroup && renderingSection === 'selectedSection';

  // Determine if we should show the + button (selected, non-reorder)
  const showAddRemoveButtons = isSelected && !isReordering && showAddMore;
  
  // Determine if we should show just the + button (unselected, non-reorder)
  const showAddButtonOnly = !isSelected && !isReordering;

  // Grouped styles - empty object that can be populated when exerciseGroup exists
  const groupColorScheme = exerciseGroup?.type === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;
  const isGrouped = !!exerciseGroup;
  const groupedStyles = isGrouped ? {
    // Container styles
    container: {},
    // Text/Name styles
    nameText: {},
    // GroupBadge styles
    groupBadge: {
      container: {},
      text: {},
    },
    // CountBadge styles
    countBadge: {
      container: {},
      plusText: {},
      countText: {},
    },
    // ExerciseTags styles
    tags: {
      categoryTagContainer: {},
      categoryTagText: {},
      muscleTagContainer: {},
      muscleTagText: {},
      collapsedGroupItemContainer: {},
      collapsedGroupItemText: {},
    },
    // ActionButtons styles
    buttons: {
      addButtonContainer: {},
      addButtonText: {},
      removeButtonContainer: {},
      removeButtonText: {},
      addButtonOnlyContainer: {},
      addButtonOnlyText: {},
    },
    // ReorderCheckbox styles
    checkbox: {
      container: {},
      text: {},
    },
  } : {};

  // Flatten groupedStyles for child components
  const groupBadgeStyles = groupedStyles.groupBadge || {};
  const countBadgeStyles = groupedStyles.countBadge || {};
  const exerciseTagsStyles = groupedStyles.tags || {};
  const actionButtonsStyles = groupedStyles.buttons || {};
  const reorderCheckboxStyles = groupedStyles.checkbox || {};

  return (
    <TouchableOpacity 
      onPress={handlePress}
      style={[
        {
          paddingLeft: 16,
          paddingRight: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.slate[50],
        }, 
        // ===== NORMAL VIEW MODE =====
        container_selectedInSection && {
          backgroundColor: COLORS.blue[50],
          borderBottomColor: COLORS.white,
          paddingRight: 32,
        },
        container_selectedInSection && renderingSection === 'selectedSection' && {
        },
        container_selectedInSection && !isReordering && !isGroupMode && isGrouped && renderingSection === 'selectedSection' && {
          backgroundColor: groupColorScheme[100],
        },
        container_selectedInList && {
          backgroundColor: COLORS.blue[50],
          borderBottomColor: COLORS.blue[100],
        },
        container_selectedInList && !isReordering && !isGroupMode && isGrouped && renderingSection === 'selectedSection' && {
          backgroundColor: groupColorScheme[100],
          borderBottomColor: groupColorScheme[150],
        },
        container_selectedInList && renderingSection === 'unselectedList' && {
          borderBottomColor: COLORS.slate[50],
        },
        container_lastSelected && {
          borderBottomColor: COLORS.slate[100],
        },
        // Normal view - First in group
        isFirstInGroup && isGrouped && !isReordering && !isGroupMode && renderingSection === 'selectedSection' && {
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        },
        // Normal view - Last in group
        isLastInGroup && isGrouped && !isReordering && !isGroupMode && renderingSection === 'selectedSection' && {
          borderBottomColor: 'transparent',
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
        },
        // Force grouped items border color - override any white borders that might be set earlier
        isGrouped && !isGroupMode && renderingSection === 'selectedSection' && !isLastInGroup && {
          borderBottomColor: groupColorScheme[150],
        },
        
        // ===== REORDER MODE =====
        container_reorderingMode && {
          backgroundColor: COLORS.white,
          borderBottomColor: COLORS.blue[100],
        },
        container_reorderedItem && {
          backgroundColor: COLORS.blue[50],
          borderBottomColor: COLORS.blue[100],
        },
        
        // ===== GROUP MODE =====
        // Group mode - Selected
        container_groupModeSelected && {
          backgroundColor: groupColorScheme[100],
          borderBottomColor: COLORS.blue[200],
        },
        isFirstInGroup && isGrouped && isGroupMode && isSelectedInGroup && {
          // First item in group - group mode selected
        },
        isLastInGroup && isGrouped && isGroupMode && isSelectedInGroup && {
          borderBottomColor: COLORS.white, // Overrides container_groupModeSelected borderBottomColor
        },
        // Group mode - Unselected (grouped)
        container_groupModeUnselected && isGrouped && {
          backgroundColor: groupColorScheme[50],
          borderBottomColor: groupColorScheme[200],
        },
        isFirstInGroup && isGrouped && isGroupMode && !isSelectedInGroup && {
          // First item in group - group mode unselected
        },
        isLastInGroup && isGrouped && isGroupMode && !isSelectedInGroup && {
          borderBottomColor: COLORS.white, // Overrides container_groupModeUnselected borderBottomColor
        },
        // Group mode - Unselected (ungrouped)
        container_groupModeUnselected && !isGrouped && {
          backgroundColor: COLORS.white,
          borderBottomColor: COLORS.slate[100],
        },
        container_addMoreMode && {
        },
        isGrouped && groupedStyles.container,
        selectedInListStyle,
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
          <Text style={[
            {
              fontSize: 16,
              fontWeight: 'bold',
              color: COLORS.slate[900],
            }, 
            text_selectedInSection && {
              color: COLORS.blue[600],
            },
            text_selectedInSection && renderingSection === 'selectedSection' && {
            },
            text_selectedInList && {
              color: COLORS.slate[900],
            },
            text_selectedInList && renderingSection === 'unselectedList' && {
            },
            text_reorderingMode && !isGroupItemReorder && {
              color: COLORS.amber[600],
            },
            text_reorderingMode && isGroupItemReorder && {
              color: COLORS.indigo[600],
            },
            text_addMoreMode && {
            },
            isGrouped && groupedStyles.nameText,
            selectedInListNameStyle,
          ]}>
            {item.name}
          </Text>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}>
            {showGroupBadge && (
              <GroupBadge 
                exerciseGroup={exerciseGroup} 
                groupedStyles={groupBadgeStyles}
              />
            )}
            {showCountBadge && (
              <CountBadge 
                selectedCount={selectedCount}
                groupedStyles={countBadgeStyles}
              />
            )}
          </View>
        </View>
        <View style={{
          flexDirection: 'row',
          gap: 8,
          marginTop: 4,
          flexWrap: 'wrap',
        }}>
          <ExerciseTags
            item={item}
            isCollapsedGroup={isCollapsedGroup}
            groupExercises={groupExercises}
            showAddMore={showAddMore}
            renderingSection={renderingSection}
            groupedStyles={exerciseTagsStyles}
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
          groupedStyles={actionButtonsStyles}
        />
      ) : (
        <ReorderCheckbox
          isSelected={isSelected}
          hideNumber={hideNumber}
          selectionOrder={selectionOrder}
          isReordering={isReordering}
          isReordered={isReordered}
          isGroupItemReorder={isGroupItemReorder}
          groupedStyles={reorderCheckboxStyles}
        />
      )}
    </TouchableOpacity>
  );
};

export default ExerciseListItem;
