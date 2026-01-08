import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { COLORS } from '../../../../constants/colors';
import { defaultSupersetColorScheme, defaultHiitColorScheme } from '../../../../constants/defaultStyles';

const DragAndDropModal = ({
  visible,
  onClose,
  selectedOrder,
  exerciseGroups,
  groupedExercises,
  filtered,
  getExerciseGroup,
  onReorder,
}) => {
  // Build a flat list of items (GroupHeaders, Items, and GroupFooters)
  const dragItems = useMemo(() => {
    const items = [];
    const processedIndices = new Set();

    selectedOrder.forEach((exerciseId, orderIndex) => {
      if (processedIndices.has(orderIndex)) return;

      const exercise = filtered.find(ex => ex.id === exerciseId);
      if (!exercise) return;

      const exerciseGroup = getExerciseGroup ? getExerciseGroup(orderIndex) : null;

      if (exerciseGroup) {
        // This is part of a group
        const firstIndexInGroup = exerciseGroup.exerciseIndices[0];
        const lastIndexInGroup = exerciseGroup.exerciseIndices[exerciseGroup.exerciseIndices.length - 1];

        // If this is the first exercise in the group, push a GroupHeader
        if (orderIndex === firstIndexInGroup) {
          // Collect all exercises in this group for the header
          const groupExercisesData = [];
          exerciseGroup.exerciseIndices.forEach(idx => {
            const exId = selectedOrder[idx];
            const ex = filtered.find(e => e.id === exId);
            const groupedEx = groupedExercises.find(g => g.orderIndices.includes(idx));
            if (ex) {
              groupExercisesData.push({
                exercise: ex,
                orderIndex: idx,
                count: groupedEx ? groupedEx.count : 1,
              });
            }
          });

          items.push({
            id: `header-${exerciseGroup.id}`,
            type: 'GroupHeader',
            group: exerciseGroup,
            groupId: exerciseGroup.id,
            groupExercises: groupExercisesData,
          });
        }

        // Push the Item
        processedIndices.add(orderIndex);
        const groupedExercise = groupedExercises.find(g => g.orderIndices.includes(orderIndex));
        const count = groupedExercise ? groupedExercise.count : 1;

        items.push({
          id: `item-${exerciseId}-${orderIndex}`,
          type: 'Item',
          exercise: exercise,
          orderIndex: orderIndex,
          count: count,
          groupId: exerciseGroup.id,
          isFirstInGroup: orderIndex === firstIndexInGroup,
          isLastInGroup: orderIndex === lastIndexInGroup,
        });

        // If this is the last exercise in the group, push a GroupFooter
        if (orderIndex === lastIndexInGroup) {
          items.push({
            id: `footer-${exerciseGroup.id}`,
            type: 'GroupFooter',
            group: exerciseGroup,
            groupId: exerciseGroup.id,
          });
        }
      } else {
        // Standalone exercise
        processedIndices.add(orderIndex);
        const groupedExercise = groupedExercises.find(g => g.orderIndices.includes(orderIndex));
        items.push({
          id: `item-${exerciseId}-${orderIndex}`,
          type: 'Item',
          exercise: exercise,
          orderIndex: orderIndex,
          count: groupedExercise ? groupedExercise.count : 1,
          groupId: null,
          isFirstInGroup: false,
          isLastInGroup: false,
        });
      }
    });

    return items;
  }, [selectedOrder, exerciseGroups, groupedExercises, filtered, getExerciseGroup]);

  const [reorderedItems, setReorderedItems] = useState(dragItems);
  const [collapsedGroupId, setCollapsedGroupId] = useState(null);
  const [groupHeights, setGroupHeights] = useState({}); // Store measured heights of groups
  const groupHeightRefs = useRef({}); // Store refs for measuring group heights
  const prevVisibleRef = useRef(visible);
  const pendingDragRef = useRef(null); // Store drag function to call after collapse

  // Only reset state when modal opens (visible changes from false to true)
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    const isVisible = visible;

    if (!wasVisible && isVisible) {
      setReorderedItems(dragItems);
      setCollapsedGroupId(null);
      setGroupHeights({});
      groupHeightRefs.current = {};
      pendingDragRef.current = null;
    }

    prevVisibleRef.current = isVisible;
  }, [visible, dragItems]);

  // Helper: Mark group items as collapsed (keep structure, just mark items as hidden)
  const collapseGroup = useCallback((items, groupId) => {
    return items.map(item => {
      if (item.type === 'Item' && item.groupId === groupId) {
        return { ...item, isCollapsed: true };
      }
      if (item.type === 'GroupHeader' && item.groupId === groupId) {
        return { ...item, isCollapsed: true };
      }
      if (item.type === 'GroupFooter' && item.groupId === groupId) {
        return { ...item, isCollapsed: true };
      }
      return item;
    });
  }, []);

  // Helper: Calculate estimated height of a group based on its items
  // Uses actual measurements from styles for accurate height preservation
  const calculateGroupHeight = useCallback((items, groupId) => {
    // Actual measurements from styles (DragAndDropModal renders items individually, no container wrapper):

    // Group Header (from DragAndDropModal styles):
    // - paddingVertical: 10 = 20px (10 top + 10 bottom)
    // - marginTop: 12px
    // - borderWidth: 2 (top) = 2px
    // - Content height (text + badge): ~18px
    // - marginBottom: 4px (normal) or 8px when collapsed
    // Header normal: 20 + 12 + 2 + 18 + 4 = ~56px
    // Header collapsed: 20 + 12 + 2 + 18 + 8 + 2 (bottom border) = ~62px
    const HEADER_PADDING_VERTICAL = 20; // 10 top + 10 bottom
    const HEADER_MARGIN_TOP = 12;
    const HEADER_BORDER_TOP = 2;
    const HEADER_CONTENT_HEIGHT = 18; // Text + badge approximate
    const HEADER_MARGIN_BOTTOM_NORMAL = 4; // Normal marginBottom
    const HEADER_BORDER_BOTTOM_COLLAPSED = 2; // Bottom border when collapsed
    const HEADER_MARGIN_BOTTOM_COLLAPSED = 8; // marginBottom when collapsed (replaces normal 4)
    const HEADER_COLLAPSED = HEADER_PADDING_VERTICAL + HEADER_MARGIN_TOP +
      HEADER_BORDER_TOP + HEADER_BORDER_BOTTOM_COLLAPSED +
      HEADER_CONTENT_HEIGHT + HEADER_MARGIN_BOTTOM_COLLAPSED; // ~62px

    // Group Footer (from DragAndDropModal styles):
    // - paddingVertical: 8 = 16px (8 top + 8 bottom)
    // - marginBottom: 8px
    // - borderWidth: 2 (bottom) = 2px
    // - Content (divider line): 3px
    // Footer: 16 + 8 + 2 + 3 = ~29px
    const FOOTER_PADDING_VERTICAL = 16; // 8 top + 8 bottom
    const FOOTER_MARGIN_BOTTOM = 8;
    const FOOTER_BORDER_BOTTOM = 2;
    const FOOTER_CONTENT_HEIGHT = 3; // Divider line
    const FOOTER_TOTAL = FOOTER_PADDING_VERTICAL + FOOTER_MARGIN_BOTTOM +
      FOOTER_BORDER_BOTTOM + FOOTER_CONTENT_HEIGHT; // ~29px

    // Exercise List Items (from ExerciseListItem styles + group child styling):
    // - paddingVertical: 12 = 24px (12 top + 12 bottom) from itemContainer
    // - Text height: fontSize 16, bold = ~20px
    // - Tags container marginTop: 4px
    // - Tags height: ~20-24px
    // - marginVertical: 3 = 6px (3 top + 3 bottom) from exerciseCardContent__groupChild
    // - borderWidth: 1 when in group
    // Item total: 24 + 20 + 4 + 22 + 6 + 1 = ~77px per item
    const ITEM_PADDING_VERTICAL = 24; // 12 top + 12 bottom
    const ITEM_TEXT_HEIGHT = 20; // Font size 16, bold, approximate line height
    const ITEM_TAGS_MARGIN_TOP = 4; // marginTop for tags container
    const ITEM_TAGS_HEIGHT = 22; // Approximate tags height
    const ITEM_MARGIN_VERTICAL = 6; // 3 top + 3 bottom (from exerciseCardContent__groupChild)
    const ITEM_BORDER = 1; // Border when in group
    const ITEM_TOTAL = ITEM_PADDING_VERTICAL + ITEM_TEXT_HEIGHT +
      ITEM_TAGS_MARGIN_TOP + ITEM_TAGS_HEIGHT +
      ITEM_MARGIN_VERTICAL + ITEM_BORDER; // ~77px per item

    let itemCount = 0;
    let hasHeader = false;
    let hasFooter = false;

    items.forEach(item => {
      if (item.groupId === groupId) {
        if (item.type === 'GroupHeader') {
          hasHeader = true;
        } else if (item.type === 'GroupFooter') {
          hasFooter = true;
        } else if (item.type === 'Item') {
          itemCount += item.count || 1;
        }
      }
    });

    // Calculate total height for collapsed header
    // When collapsed, the header represents the ENTIRE group (header + items + footer)
    // So we need: normal header height + all items + footer
    let totalHeight = 0;

    // Header (normal height when expanded, not collapsed height)
    // Normal header: padding + marginTop + borderTop + content + marginBottom (normal)
    const HEADER_NORMAL = HEADER_PADDING_VERTICAL + HEADER_MARGIN_TOP +
      HEADER_BORDER_TOP + HEADER_CONTENT_HEIGHT +
      HEADER_MARGIN_BOTTOM_NORMAL; // ~56px
    if (hasHeader) {
      totalHeight += HEADER_NORMAL; // ~56px
    }

    // Items (each item contributes its height when expanded)
    totalHeight += itemCount * ITEM_TOTAL; // ~77px per item

    // Footer
    if (hasFooter) {
      totalHeight += FOOTER_TOTAL; // ~29px
    }

    // Note: When the header is collapsed, it gets additional styling:
    // - borderBottomWidth: 2 (adds 2px)
    // - marginBottom: 8 (instead of normal 4, adds 4px)
    // So collapsed header gets ~6px extra, but we're calculating the space it should fill
    // which is the normal group height, not the collapsed header's own height

    return totalHeight;
  }, []);

  // Helper: Collapse ALL other groups except the one being dragged
  // This "freezes" other groups so they can't accept drops inside them
  // Calculates and stores heights before collapsing
  const collapseAllOtherGroups = useCallback((items, draggedGroupId) => {
    // Find all unique group IDs except the one being dragged
    const otherGroupIds = new Set();
    items.forEach(item => {
      if (item.groupId && item.groupId !== draggedGroupId) {
        otherGroupIds.add(item.groupId);
      }
    });

    // Calculate heights for all other groups before collapsing
    const heights = {};
    otherGroupIds.forEach(groupId => {
      heights[groupId] = calculateGroupHeight(items, groupId);
    });
    setGroupHeights(prev => ({ ...prev, ...heights }));

    // Collapse all other groups and add stored height to headers
    return items.map(item => {
      if (item.groupId && otherGroupIds.has(item.groupId)) {
        if (item.type === 'GroupHeader') {
          return {
            ...item,
            isCollapsed: true,
            collapsedHeight: heights[item.groupId] // Store height for collapsed header
          };
        } else if (item.type === 'Item' || item.type === 'GroupFooter') {
          return { ...item, isCollapsed: true };
        }
      }
      return item;
    });
  }, [calculateGroupHeight]);

  // Helper: Expand ALL collapsed groups (remove collapsed markers and ensure correct order)
  const expandAllGroups = useCallback((items) => {
    // Find all unique group IDs that have collapsed items
    const collapsedGroupIds = new Set();
    items.forEach(item => {
      if (item.isCollapsed && item.groupId) {
        collapsedGroupIds.add(item.groupId);
      }
    });

    if (collapsedGroupIds.size === 0) {
      // No collapsed groups, just remove all collapsed flags
      return items.map(item => {
        if (item.isCollapsed) {
          const { isCollapsed, ...rest } = item;
          return rest;
        }
        return item;
      });
    }

    // Expand each group one by one
    let result = [...items];

    collapsedGroupIds.forEach(groupId => {
      // Find the header position for this group
      const headerIndex = result.findIndex(item =>
        item.type === 'GroupHeader' && item.groupId === groupId
      );

      if (headerIndex === -1) {
        // Header not found, just remove collapsed flags for this group
        result = result.map(item => {
          if (item.groupId === groupId && item.isCollapsed) {
            const { isCollapsed, collapsedHeight, ...rest } = item;
            return rest;
          }
          return item;
        });
        return;
      }

      // Collect all group items (Items and Footer) that belong to this group
      const groupItems = [];
      result.forEach(item => {
        if (item.groupId === groupId && (item.type === 'Item' || item.type === 'GroupFooter')) {
          if (item.isCollapsed) {
            const { isCollapsed, collapsedHeight, ...rest } = item;
            groupItems.push(rest);
          } else {
            groupItems.push(item);
          }
        }
      });

      // Sort group items: Items first (by orderIndex), then Footer
      groupItems.sort((a, b) => {
        if (a.type === 'GroupFooter') return 1;
        if (b.type === 'GroupFooter') return -1;
        return (a.orderIndex || 0) - (b.orderIndex || 0);
      });

      // Reconstruct array: items before header, header, group items, items after header
      const newResult = [];

      // Add all items before the header (excluding this group's items)
      for (let i = 0; i < headerIndex; i++) {
        if (result[i].groupId !== groupId || result[i].type === 'GroupHeader') {
          newResult.push(result[i]);
        }
      }

      // Add the header (without isCollapsed flag and collapsedHeight)
      const header = result[headerIndex];
      const { isCollapsed, collapsedHeight, ...headerRest } = header;
      newResult.push(headerRest);

      // Add all group items right after the header
      newResult.push(...groupItems);

      // Add all items after the header (excluding this group's items)
      for (let i = headerIndex + 1; i < result.length; i++) {
        if (result[i].groupId !== groupId || result[i].type === 'GroupHeader') {
          newResult.push(result[i]);
        }
      }

      result = newResult;
    });

    // Remove collapsed flags and collapsedHeight from any remaining items
    return result.map(item => {
      if (item.isCollapsed || item.collapsedHeight) {
        const { isCollapsed, collapsedHeight, ...rest } = item;
        return rest;
      }
      return item;
    });
  }, []);

  // Effect to trigger pending drag after collapse is complete
  useEffect(() => {
    if (collapsedGroupId && pendingDragRef.current) {
      // Small delay to ensure the collapsed item has been measured
      const timeoutId = setTimeout(() => {
        if (pendingDragRef.current) {
          pendingDragRef.current();
          pendingDragRef.current = null;
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [collapsedGroupId, reorderedItems]);

  // Handle initiating a group header drag - collapse dragged group AND freeze all others
  const initiateGroupDrag = useCallback((groupId, drag) => {
    // Step 1: Collapse the group being dragged
    let collapsed = collapseGroup(reorderedItems, groupId);

    // Step 2: Collapse ALL other groups to "freeze" them (prevent drops inside them)
    collapsed = collapseAllOtherGroups(collapsed, groupId);

    setReorderedItems(collapsed);
    setCollapsedGroupId(groupId);
    // Store the drag function to call after state updates
    pendingDragRef.current = drag;
  }, [reorderedItems, collapseGroup, collapseAllOtherGroups]);

  const handleDragEnd = useCallback(({ data, from, to }) => {
    // If we have a collapsed group, expand ALL groups at their new positions
    if (collapsedGroupId) {
      const expanded = expandAllGroups(data);
      setReorderedItems(expanded);
      setCollapsedGroupId(null);
      setGroupHeights({}); // Clear stored heights after drag ends
    } else {
      setReorderedItems(data);
    }
    pendingDragRef.current = null;
  }, [collapsedGroupId, expandAllGroups]);

  const keyExtractor = useCallback((item) => item.id, []);

  const handleSave = useCallback(() => {
    if (!onReorder) return;

    // Make sure any collapsed groups are expanded first
    let finalItems = reorderedItems;
    if (collapsedGroupId) {
      finalItems = expandAllGroups(reorderedItems);
    }

    // Parse the flat list to reconstruct newOrder and updatedGroups
    const newOrder = [];
    const updatedGroups = [];

    let currentGroup = null;
    let currentGroupIndices = [];

    finalItems.forEach((item) => {
      if (item.type === 'GroupHeader') {
        currentGroup = { ...item.group };
        currentGroupIndices = [];
      } else if (item.type === 'Item') {
        const count = item.count || 1;
        for (let i = 0; i < count; i++) {
          if (currentGroup) {
            currentGroupIndices.push(newOrder.length);
          }
          newOrder.push(item.exercise.id);
        }
      } else if (item.type === 'GroupFooter') {
        if (currentGroup && currentGroupIndices.length > 0) {
          updatedGroups.push({
            ...currentGroup,
            exerciseIndices: currentGroupIndices,
          });
        }
        currentGroup = null;
        currentGroupIndices = [];
      }
    });

    if (currentGroup && currentGroupIndices.length > 0) {
      updatedGroups.push({
        ...currentGroup,
        exerciseIndices: currentGroupIndices,
      });
    }

    onReorder(newOrder, updatedGroups);
    onClose();
  }, [reorderedItems, collapsedGroupId, expandAllGroups, onReorder, onClose]);

  // Helper to determine if an Item is visually inside a group based on current ordering
  const getItemGroupContext = useCallback((itemIndex) => {
    let currentGroupId = null;
    let groupType = null;
    let isFirstInGroup = false;
    let isLastInGroup = false;

    for (let i = 0; i <= itemIndex; i++) {
      const item = reorderedItems[i];
      if (item.type === 'GroupHeader') {
        currentGroupId = item.groupId;
        groupType = item.group.type;
      } else if (item.type === 'GroupFooter') {
        currentGroupId = null;
        groupType = null;
      }
    }

    if (currentGroupId) {
      let foundPreviousItem = false;
      for (let i = itemIndex - 1; i >= 0; i--) {
        const item = reorderedItems[i];
        if (item.type === 'GroupHeader' && item.groupId === currentGroupId) {
          isFirstInGroup = true;
          break;
        }
        if (item.type === 'Item') {
          foundPreviousItem = true;
          break;
        }
        if (item.type === 'GroupFooter') break;
      }
      if (!foundPreviousItem) isFirstInGroup = true;

      let foundNextItem = false;
      for (let i = itemIndex + 1; i < reorderedItems.length; i++) {
        const item = reorderedItems[i];
        if (item.type === 'GroupFooter' && item.groupId === currentGroupId) {
          isLastInGroup = true;
          break;
        }
        if (item.type === 'Item') {
          foundNextItem = true;
          break;
        }
        if (item.type === 'GroupHeader') break;
      }
      if (!foundNextItem) isLastInGroup = true;
    }

    return { currentGroupId, groupType, isFirstInGroup, isLastInGroup };
  }, [reorderedItems]);

  const renderItem = useCallback(({ item, drag, isActive, getIndex }) => {
    const itemIndex = getIndex ? getIndex() : 0;

    // Render GroupHeader
    if (item.type === 'GroupHeader') {
      const groupColorScheme = item.group.type === 'HIIT'
        ? defaultHiitColorScheme
        : defaultSupersetColorScheme;
      const isCollapsed = item.isCollapsed || collapsedGroupId === item.groupId;
      const isOtherGroupFrozen = item.isCollapsed && collapsedGroupId && collapsedGroupId !== item.groupId;
      const collapsedHeight = item.collapsedHeight || groupHeights[item.groupId];

      // When collapsed, render header with rounded corners all around (no footer gap)
      // If it's a frozen other group, apply the calculated height to preserve space
      return (
        <TouchableOpacity
          onLongPress={() => initiateGroupDrag(item.groupId, drag)}
          disabled={isActive}
          delayLongPress={150}
          activeOpacity={1}
          style={[
            styles.groupHeader,
            isCollapsed && styles.groupHeader__collapsed,
            {
              borderColor: groupColorScheme[200],
              backgroundColor: groupColorScheme[100],
            },
            isOtherGroupFrozen && collapsedHeight && {
              minHeight: collapsedHeight,
              height: collapsedHeight,
              justifyContent: 'center',
            },
            isActive && {
              opacity: 0.9,
              backgroundColor: groupColorScheme[150],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 4,
            },
          ]}
        >
          <View style={styles.groupHeaderContent}>
            <Text style={[styles.groupHeaderTypeText, { color: groupColorScheme[700] }]}>
              {item.group.type}
            </Text>
            <View style={[styles.groupHeaderBadge, { backgroundColor: groupColorScheme[200] }]}>
              <Text style={[styles.groupHeaderBadgeText, { color: groupColorScheme[700] }]}>
                {item.group.type === 'HIIT' ? 'H' : 'S'}{item.group.number}
              </Text>
            </View>
          </View>
          <View style={styles.dragHandle}>
            <Text style={[styles.dragHandleText, { color: groupColorScheme[400] }]}>≡</Text>
          </View>
        </TouchableOpacity>
      );
    }

    // Render GroupFooter - hide if collapsed
    if (item.type === 'GroupFooter') {
      const isCollapsed = item.isCollapsed || collapsedGroupId === item.groupId;

      // Hide footer when collapsed
      if (isCollapsed) {
        return <View style={styles.hiddenItem} />;
      }

      const groupColorScheme = item.group.type === 'HIIT'
        ? defaultHiitColorScheme
        : defaultSupersetColorScheme;

      // Footer is not draggable - use View instead of TouchableOpacity
      return (
        <View
          style={[
            styles.groupFooter,
            {
              borderColor: groupColorScheme[200],
              backgroundColor: groupColorScheme[100],
            },
          ]}
        >
          <View style={styles.groupFooterContent}>
            <View style={[styles.groupFooterLine, { backgroundColor: groupColorScheme[200] }]} />
          </View>
        </View>
      );
    }

    // Render Item (exercise) - hide if collapsed
    if (item.isCollapsed || (collapsedGroupId && item.groupId === collapsedGroupId)) {
      return <View style={styles.hiddenItem} />;
    }

    const { currentGroupId, groupType, isFirstInGroup, isLastInGroup } = getItemGroupContext(itemIndex);
    const isGroupChild = !!currentGroupId;

    const groupColorScheme = groupType === 'HIIT'
      ? defaultHiitColorScheme
      : defaultSupersetColorScheme;

    return (
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        delayLongPress={150}
        activeOpacity={1}
        style={[
          styles.exerciseCard,
          isGroupChild && styles.exerciseCard__groupChild,
          isGroupChild && groupColorScheme && {
            borderColor: groupColorScheme[200],
            backgroundColor: groupColorScheme[50],
          },
          isGroupChild && isFirstInGroup && styles.exerciseCard__groupChild__first,
          isGroupChild && isLastInGroup && styles.exerciseCard__groupChild__last,
          !isGroupChild && styles.exerciseCard__standalone,
          isActive && styles.exerciseCard__active,
          isActive && isGroupChild && groupColorScheme && {
            backgroundColor: groupColorScheme[100],
            borderColor: groupColorScheme[300],
          },
        ]}
      >
        {isGroupChild && (
          <View
            style={[
              styles.groupChildWrapperLeft,
              { backgroundColor: groupColorScheme[100] },
            ]}
          />
        )}

        <View style={[
          styles.exerciseCardContent,
          isGroupChild && styles.exerciseCardContent__groupChild,
          isGroupChild && groupColorScheme && { backgroundColor: groupColorScheme[50] },
          isActive && isGroupChild && groupColorScheme && { backgroundColor: groupColorScheme[100] },
        ]}>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName}>{item.exercise.name}</Text>
            <View style={styles.exerciseMeta}>
              {item.exercise.category && (
                <Text style={styles.exerciseCategory}>{item.exercise.category}</Text>
              )}
              {item.exercise.primaryMuscle && (
                <Text style={styles.exerciseMuscle}>{item.exercise.primaryMuscle}</Text>
              )}
            </View>
          </View>

          <View style={styles.exerciseRight}>
            {item.count > 1 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>×{item.count}</Text>
              </View>
            )}
            <View style={styles.dragHandle}>
              <Text style={[
                styles.dragHandleText,
                isGroupChild && groupColorScheme && { color: groupColorScheme[400] },
              ]}>≡</Text>
            </View>
          </View>
        </View>

        {isGroupChild && (
          <View
            style={[
              styles.groupChildWrapperRight,
              { backgroundColor: groupColorScheme[100] },
            ]}
          />
        )}
      </TouchableOpacity>
    );
  }, [getItemGroupContext, initiateGroupDrag, collapsedGroupId, groupHeights]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reorder Items</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Press and hold to drag • Drag headers to move entire groups
          </Text>
        </View>

        {reorderedItems.length > 0 ? (
          <DraggableFlatList
            data={reorderedItems}
            onDragEnd={handleDragEnd}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items to reorder</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.slate[600],
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.green[500],
    borderRadius: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  instructionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.blue[50],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.blue[100],
  },
  instructionsText: {
    fontSize: 12,
    color: COLORS.blue[700],
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.slate[500],
    textAlign: 'center',
  },

  // Hidden item (for collapsed group children)
  hiddenItem: {
    height: 0,
    overflow: 'hidden',
  },

  // Group Header Styles
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    marginHorizontal: 0,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  groupHeader__collapsed: {
    borderBottomWidth: 2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginBottom: 8,
    // When collapsed, header acts as a complete rounded container
  },
  groupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupHeaderTypeText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupHeaderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  groupHeaderBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Group Footer Styles
  groupFooter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    marginHorizontal: 0,
    borderWidth: 2,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  groupFooterContent: {
    alignItems: 'center',
  },
  groupFooterLine: {
    width: '40%',
    height: 3,
    borderRadius: 2,
    opacity: 0.5,
  },

  // Exercise Card Styles
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: 0,
    overflow: 'hidden',
  },
  exerciseCard__standalone: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    marginVertical: 4,
    marginHorizontal: 0,
  },
  exerciseCard__groupChild: {
    marginHorizontal: 0,
    borderWidth: 0,
  },
  exerciseCard__groupChild__first: {},
  exerciseCard__groupChild__last: {},
  exerciseCard__active: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ scale: 1.02 }],
  },

  groupChildWrapperLeft: {
    width: 2,
  },
  groupChildWrapperRight: {
    width: 2,
  },

  exerciseCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
  },
  exerciseCardContent__groupChild: {
    marginHorizontal: 0,
    borderRadius: 6,
    marginVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
  },

  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.slate[900],
  },
  exerciseMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  exerciseCategory: {
    fontSize: 12,
    color: COLORS.slate[500],
  },
  exerciseMuscle: {
    fontSize: 12,
    color: COLORS.slate[400],
  },

  exerciseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  countBadge: {
    backgroundColor: COLORS.blue[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.blue[700],
  },

  dragHandle: {
    paddingHorizontal: 4,
  },
  dragHandleText: {
    fontSize: 20,
    color: COLORS.slate[400],
    fontWeight: 'bold',
  },
});

export default DragAndDropModal;
