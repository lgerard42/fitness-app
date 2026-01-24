import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const prevVisibleRef = useRef(visible);
  const pendingDragRef = useRef(null); // Store drag function to call after collapse

  // Only reset state when modal opens (visible changes from false to true)
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    const isVisible = visible;

    if (!wasVisible && isVisible) {
      setReorderedItems(dragItems);
      setCollapsedGroupId(null);
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
        // CHANGE ID: We append '-col' to the ID for the dragged header. 
        // This forces React to unmount the collapsed view and remount the expanded view 
        // on drop, preventing the "disappearing up" animation glitch.
        return { ...item, isCollapsed: true, id: `${item.id}-col` };
      }
      if (item.type === 'GroupFooter' && item.groupId === groupId) {
        return { ...item, isCollapsed: true };
      }
      return item;
    });
  }, []);

  // Helper: Collapse ALL other groups except the one being dragged
  // This "freezes" other groups so they can't accept drops inside them
  const collapseAllOtherGroups = useCallback((items, draggedGroupId) => {
    // Find all unique group IDs except the one being dragged
    const otherGroupIds = new Set();
    items.forEach(item => {
      if (item.groupId && item.groupId !== draggedGroupId) {
        otherGroupIds.add(item.groupId);
      }
    });

    // Collapse all other groups
    return items.map(item => {
      if (item.groupId && otherGroupIds.has(item.groupId)) {
        if (item.type === 'GroupHeader' || item.type === 'Item' || item.type === 'GroupFooter') {
          return { ...item, isCollapsed: true };
        }
      }
      return item;
    });
  }, []);

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
            const { isCollapsed, ...rest } = item;
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
            const { isCollapsed, ...rest } = item;
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

      // Add the header (without isCollapsed flag, and RESTORE ID)
      const header = result[headerIndex];
      const { isCollapsed, id, ...headerRest } = header;
      // Restore the original ID if it was modified (remove '-col')
      const originalId = id.endsWith('-col') ? id.slice(0, -4) : id;
      newResult.push({ ...headerRest, id: originalId });

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

    // Remove collapsed flags from any remaining items
    return result.map(item => {
      if (item.isCollapsed) {
        const { isCollapsed, ...rest } = item;
        return rest;
      }
      return item;
    });
  }, []);

  // Effect to trigger pending drag after collapse is complete
  useEffect(() => {
    if (collapsedGroupId && pendingDragRef.current) {
      // Small delay to ensure the collapsed item has been rendered
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

  // --- RENDER HELPERS (Shared between real items and ghosts) ---

  const renderExerciseContent = (item, groupColorScheme, isFirstInGroup, isLastInGroup, isActive) => {
    return (
      <View
        key={item.id}
        style={[
          styles.exerciseCard,
          styles.exerciseCard__groupChild,
          groupColorScheme && {
            borderColor: groupColorScheme[200],
            backgroundColor: groupColorScheme[100],
          },
          // Outer Styles
          isFirstInGroup && styles.exerciseCard__groupChild__first,
          isLastInGroup && styles.exerciseCard__groupChild__last,

          // Outer Active State
          isActive && styles.exerciseCard__active,
          isActive && styles.exerciseCard__groupChild__active,

          isActive && groupColorScheme && {
            backgroundColor: groupColorScheme[100],
            borderColor: groupColorScheme[300],
          },
        ]}
      >
        <View
          style={[
            styles.groupChildWrapperLeft,
            { backgroundColor: groupColorScheme[200] },
            // CHANGE: Collapse left rail when active
            isActive && styles.groupChildWrapperLeft__active,
          ]}
        />

        <View style={[
          styles.exerciseCardContent,
          styles.exerciseCardContent__groupChild,
          groupColorScheme && { backgroundColor: groupColorScheme[50], borderBottomColor: groupColorScheme[200], borderColor: groupColorScheme[150] },
          isActive && groupColorScheme && { backgroundColor: groupColorScheme[100] },

          // Inner Styles
          isFirstInGroup && styles.exerciseCardContent__groupChild__first,
          isFirstInGroup && { borderTopColor: groupColorScheme[200] },

          isLastInGroup && styles.exerciseCardContent__groupChild__last,

          // Inner Active State
          isActive && styles.exerciseCardContent__active,
          isActive && styles.exerciseCardContent__groupChild__active,
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
          </View>
        </View>

        <View
          style={[
            styles.groupChildWrapperRight,
            { backgroundColor: groupColorScheme[200] },
            // CHANGE: Collapse right rail when active
            isActive && styles.groupChildWrapperRight__active,
          ]}
        />
      </View>
    );
  };

  const renderFooterContent = (groupColorScheme) => {
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
      </View>
    );
  };

  // --- MAIN RENDER ITEM ---

  const renderItem = useCallback(({ item, drag, isActive, getIndex }) => {
    const itemIndex = getIndex ? getIndex() : 0;

    // Render GroupHeader
    if (item.type === 'GroupHeader') {
      const groupColorScheme = item.group.type === 'HIIT'
        ? defaultHiitColorScheme
        : defaultSupersetColorScheme;

      const isCollapsed = item.isCollapsed || collapsedGroupId === item.groupId;
      const isDraggedGroup = collapsedGroupId === item.groupId;
      const shouldRenderGhosts = isCollapsed && !isDraggedGroup;

      // When actively dragging, simplify structure to avoid rendering order issues
      const isActivelyDragging = isActive && isDraggedGroup;

      return (
        <TouchableOpacity
          onLongPress={() => initiateGroupDrag(item.groupId, drag)}
          disabled={isActive}
          delayLongPress={150}
          activeOpacity={1}
          style={[
            styles.groupHeaderContainer,
            isActive && {
              opacity: 0.9,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 20, // Higher than other items to ensure it's on top
              zIndex: 9999,  // Much higher z-index to force header to front when dragging
              transform: [{ scale: 1.02 }], // Match regular items - creates stacking context
              position: 'relative', // Ensure proper stacking context
            },
          ]}
        >
          {/* Actual Header Part */}
          <View
            style={[
              styles.groupHeader,
              isDraggedGroup && styles.groupHeader__collapsed,
              {
                borderColor: groupColorScheme[200],
                backgroundColor: groupColorScheme[100],
              },
              // Added here: Override border color when dragged, with higher z-index
              isDraggedGroup && isActive && {
                borderColor: groupColorScheme[300],
                zIndex: 9999,
                elevation: 20,
              },
              isDraggedGroup && !isActive && {
                borderColor: groupColorScheme[300],
                zIndex: 900,
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
          </View>

          {/* Ghost Items - Only render when NOT actively dragging to simplify structure */}
          {shouldRenderGhosts && !isActivelyDragging && (
            <View>
              {reorderedItems
                .filter(i => i.groupId === item.groupId && i.type === 'Item')
                .map((ghostItem, index, array) => {
                  const isFirst = index === 0;
                  const isLast = index === array.length - 1;
                  return renderExerciseContent(ghostItem, groupColorScheme, isFirst, isLast, false);
                })}
              {renderFooterContent(groupColorScheme)}
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // Render GroupFooter - hide if collapsed
    if (item.type === 'GroupFooter') {
      const isCollapsed = item.isCollapsed || collapsedGroupId === item.groupId;
      if (isCollapsed) return <View style={styles.hiddenItem} />;

      const groupColorScheme = item.group.type === 'HIIT'
        ? defaultHiitColorScheme
        : defaultSupersetColorScheme;
      return renderFooterContent(groupColorScheme);
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

    // Normal Item Render
    if (isGroupChild) {
      return (
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          delayLongPress={150}
          activeOpacity={1}
        >
          {renderExerciseContent(item, groupColorScheme, isFirstInGroup, isLastInGroup, isActive)}
        </TouchableOpacity>
      )
    }

    // Standalone Item Render
    return (
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        delayLongPress={150}
        activeOpacity={1}
        style={[
          styles.exerciseCard,
          styles.exerciseCard__standalone,
          isActive && styles.exerciseCard__active,
        ]}
      >
        <View style={styles.exerciseCardContent}>
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
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [getItemGroupContext, initiateGroupDrag, collapsedGroupId, reorderedItems]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: 32 }]}>
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
            CellRendererComponent={({ children, style, ...props }) => (
              <View style={[style, { position: 'relative' }]} {...props}>
                {children}
              </View>
            )}
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
    paddingTop: 4,
    paddingBottom: 100,
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
  groupHeaderContainer: {
    // Container for the whole group when collapsed
    marginTop: 4,
    marginBottom: 0, // Add margin bottom here if it's the whole container
    position: 'relative', // Ensure proper stacking context
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    // marginTop: 12,  <-- REMOVED because container handles it now
    marginHorizontal: 0,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  groupHeader__collapsed: {
    // This style might be obsolete now if we always render "expanded looking" ghosts
    borderBottomWidth: 2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderStyle: 'dashed',
    marginBottom: 4,
    zIndex: 999,
    elevation: 10,
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
    paddingVertical: 2,
    marginBottom: 4, // <-- Changed to 0 because container handles margin
    marginHorizontal: 0,
    borderWidth: 2,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
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
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    marginVertical: 4,
    marginHorizontal: 0,
  },
  exerciseCard__groupChild: {
    marginHorizontal: 0,
    borderWidth: 0,
  },
  exerciseCard__groupChild__first: {
  },
  exerciseCard__groupChild__last: {
  },
  exerciseCard__active: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.slate[300],
    borderStyle: 'dashed',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 10,
    transform: [{ scale: 1.02 }],
    zIndex: 999,
  },
  exerciseCard__groupChild__active: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ scale: 1.02 }],
    // Ensure the dragged item has rounded corners even if it was a middle child
    borderRadius: 8,
    zIndex: 999,
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
    borderRadius: 6,
  },
  exerciseCardContent__groupChild: {
    marginHorizontal: 0,
    borderRadius: 0,
    marginVertical: 0,
    marginHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.red[500],
  },
  exerciseCardContent__groupChild__first: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  exerciseCardContent__groupChild__last: {
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderBottomColor: 'transparent',
  },
  exerciseCardContent__active: {
    borderRadius: 6,
    backgroundColor: COLORS.white,
  },
  groupChildWrapperLeft__active: {
    width: 0,
  },
  groupChildWrapperRight__active: {
    width: 0,
  },
  exerciseCardContent__groupChild__active: {
    marginHorizontal: 0,
    borderRadius: 6,
    backgroundColor: COLORS.white,
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
});

export default DragAndDropModal;