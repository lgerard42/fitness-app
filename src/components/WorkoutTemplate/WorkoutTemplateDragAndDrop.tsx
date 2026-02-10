import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { Layers } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { getGroupColorScheme } from '@/utils/workoutHelpers';
import type { WorkoutDragItem, ExerciseDragItem } from './hooks/useWorkoutDragDrop';
import type { GroupType } from '@/types/workout';

interface WorkoutTemplateDragAndDropProps {
  dragItems: WorkoutDragItem[];
  isDragging: boolean;
  collapsedGroupId: string | null;
  itemHeights: React.MutableRefObject<Map<string, number>>;
  collapsedItemHeights: React.MutableRefObject<Map<string, number>>;
  recordTouchPosition: (itemId: string, pageY: number) => void;
  handlePrepareDrag: (drag: () => void, itemId: string) => void;
  initiateGroupDrag: (groupId: string, drag: () => void) => void;
  renderExerciseCard: (
    exercise: any,
    isGroupChild: boolean,
    isLastInGroup: boolean,
    groupType: GroupType | null,
    groupId: string | null,
    isFirstInGroup: boolean
  ) => React.ReactNode;
}

export const useWorkoutTemplateDragAndDrop = ({
  dragItems,
  isDragging,
  collapsedGroupId,
  itemHeights,
  collapsedItemHeights,
  recordTouchPosition,
  handlePrepareDrag,
  initiateGroupDrag,
  renderExerciseCard,
}: WorkoutTemplateDragAndDropProps) => {
  // Draggable list item renderer - shows collapsed cards when dragging, full view otherwise
  const renderDragItem = useCallback(({ item, drag, isActive }: RenderItemParams<WorkoutDragItem>) => {
    // Helper to initiate drag with two-phase approach - passes item ID for scroll centering
    const initiateDelayedDrag = () => {
      handlePrepareDrag(drag, item.id);
    };

    if (item.type === 'GroupHeader') {
      const groupColorScheme = getGroupColorScheme(item.groupType);
      const isCollapsed = item.isCollapsed || collapsedGroupId === item.groupId;
      const isDraggedGroup = collapsedGroupId === item.groupId;
      const shouldRenderGhosts = isCollapsed && !isDraggedGroup;
      const isActivelyDragging = isActive && isDraggedGroup;

      const itemsInThisGroup = dragItems.filter(i =>
        i.groupId === item.groupId && i.type === 'Exercise'
      );
      const isActuallyEmpty = itemsInThisGroup.length === 0;

      return (
        <TouchableOpacity
          onPressIn={(e) => recordTouchPosition(item.id, e.nativeEvent.pageY)}
          onLongPress={() => {
            if (item.groupId && !shouldRenderGhosts) {
              initiateGroupDrag(item.groupId, drag);
            }
          }}
          disabled={isActive || shouldRenderGhosts}
          delayLongPress={150}
          activeOpacity={1}
          style={[
            styles.dragGroupHeaderContainer,
            isDragging && !isActive && styles.dragGroupHeaderContainer__exerciseDrag,
            isActive && {
              opacity: 0.9,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 20,
              zIndex: 9999,
              marginTop: 4,
              transform: [{ scale: 1.02 }],
              position: 'relative',
            },
          ]}
        >
          <View
            onLayout={(e) => {
              if (isDragging || isActive) {
                collapsedItemHeights.current.set(item.id, e.nativeEvent.layout.height);
              } else {
                itemHeights.current.set(item.id, e.nativeEvent.layout.height);
              }
            }}
            style={[
              styles.dragGroupHeader,
              isDraggedGroup && styles.dragGroupHeader__collapsed,
              {
                borderColor: groupColorScheme[200],
                backgroundColor: groupColorScheme[100],
              },
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
            <View style={styles.dragGroupHeaderContent}>
              <Layers size={16} color={groupColorScheme[600]} />
              <Text style={[styles.dragGroupHeaderText, { color: groupColorScheme[700] }]}>
                {item.groupType}
              </Text>
            </View>
          </View>

          {shouldRenderGhosts && !isActivelyDragging && (
            <View>
              {dragItems
                .filter((i): i is ExerciseDragItem => i.groupId === item.groupId && i.type === 'Exercise')
                .map((ghostItem, index, array) => {
                  const isFirst = index === 0;
                  const isLast = index === array.length - 1;
                  return (
                    <View
                      key={ghostItem.id}
                      style={[
                        styles.dragExerciseCard,
                        styles.dragExerciseCard__inGroup,
                        groupColorScheme && {
                          backgroundColor: groupColorScheme[50],
                          borderColor: groupColorScheme[200],
                        },
                        isFirst && styles.dragExerciseCard__firstInGroup,
                        isLast && styles.dragExerciseCard__lastInGroup,
                      ]}
                    >
                      <View style={styles.dragExerciseContent}>
                        <Text style={styles.dragExerciseName}>{ghostItem.exercise.name}</Text>
                        <Text style={[
                          styles.dragExerciseSetCount,
                          groupColorScheme && { color: groupColorScheme[600] }
                        ]}>
                          {ghostItem.setCount} sets
                        </Text>
                      </View>
                    </View>
                  );
                })}
              <View
                style={[
                  styles.dragGroupFooter,
                  styles.dragGroupFooter__dragging,
                  {
                    borderColor: groupColorScheme[200],
                    backgroundColor: groupColorScheme[100],
                  },
                ]}
              />
            </View>
          )}
        </TouchableOpacity>
      );
    }

    if (item.type === 'GroupFooter') {
      const groupColorScheme = getGroupColorScheme(item.groupType);
      const isCollapsed = item.isCollapsed || collapsedGroupId === item.groupId;
      const isDraggedGroup = collapsedGroupId === item.groupId;

      // Hide collapsed group footers only if they're part of the dragged group
      // Other collapsed groups show their footer as part of the ghost rendering
      if (isCollapsed && isDraggedGroup) {
        return <View style={{ height: 0, overflow: 'hidden' }} />;
      }

      // Don't render footer if it's part of a collapsed group (ghost rendering handles it)
      if (isCollapsed && !isDraggedGroup) {
        return <View style={{ height: 0, overflow: 'hidden' }} />;
      }

      return (
        <View
          onLayout={(e) => {
            if (isDragging) {
              collapsedItemHeights.current.set(item.id, e.nativeEvent.layout.height);
            } else {
              itemHeights.current.set(item.id, e.nativeEvent.layout.height);
            }
          }}
          style={[
            styles.dragGroupFooter,
            isDragging && !isDraggedGroup && styles.dragGroupFooter__exerciseDrag,
            {
              borderColor: groupColorScheme[200],
              backgroundColor: groupColorScheme[100],
              opacity: isDragging ? 1 : 0, // Visible only when dragging
            },
          ]}
        />
      );
    }

    // Exercise item
    const groupColorScheme = item.groupId
      ? getGroupColorScheme((dragItems.find(d => d.type === 'GroupHeader' && d.groupId === item.groupId) as any)?.groupType)
      : null;

    const isCollapsed = item.isCollapsed || (collapsedGroupId && item.groupId === collapsedGroupId);
    const isDraggedGroup = collapsedGroupId === item.groupId;

    // Hide collapsed exercises only if they're part of the dragged group
    // Other collapsed groups show their exercises as ghosts in the header
    if (isCollapsed && isDraggedGroup) {
      return <View style={{ height: 0, overflow: 'hidden' }} />;
    }

    // Hide exercises that are part of other collapsed groups (frozen groups - shown as ghosts in header)
    if (isCollapsed && !isDraggedGroup) {
      return <View style={{ height: 0, overflow: 'hidden' }} />;
    }

    // When dragging or active, show collapsed card
    if (isDragging || isActive) {
      return (
        <TouchableOpacity
          onPressIn={(e) => recordTouchPosition(item.id, e.nativeEvent.pageY)}
          onLongPress={drag}
          disabled={isActive}
          delayLongPress={150}
          activeOpacity={1}
          style={[
            isActive && {
              opacity: 0.9,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 20,
              zIndex: 9999,
              transform: [{ scale: 1.02 }],
              position: 'relative',
            },
          ]}
        >
          <View
            onLayout={(e) => {
              if (isDragging || isActive) {
                collapsedItemHeights.current.set(item.id, e.nativeEvent.layout.height);
              } else {
                itemHeights.current.set(item.id, e.nativeEvent.layout.height);
              }
            }}
            style={[
              styles.dragExerciseCard,
              item.groupId && styles.dragExerciseCard__inGroup,
              item.groupId && groupColorScheme && {
                backgroundColor: groupColorScheme[50],
                borderColor: groupColorScheme[200],
              },
              item.isFirstInGroup && styles.dragExerciseCard__firstInGroup,
              item.isLastInGroup && styles.dragExerciseCard__lastInGroup,
              isActive && styles.dragItem__active,
              isActive && item.groupId && groupColorScheme && {
                borderColor: groupColorScheme[300],
                zIndex: 9999,
                elevation: 20,
              },
              // Add bottom border for grouped exercises (not last in group) when dragging
              // Applies when dragging individual exercise OR when a collapsed group is being dragged
              // When dragging a collapsed group, collapsedGroupId is set; when dragging individual exercise, isDragging is true
              // Other groups are frozen (collapsed) when dragging a collapsed group, so only non-collapsed exercises in the dragged group receive this styling
              ((isDragging && !isActive) || (collapsedGroupId && !isDraggedGroup)) && item.groupId && !isCollapsed && !item.isLastInGroup && groupColorScheme && {
                borderBottomWidth: 1,
                borderBottomColor: groupColorScheme[200],
              },
            ]}
          >
            <View style={styles.dragExerciseContent}>
              <Text style={styles.dragExerciseName}>{item.exercise.name}</Text>
              <Text style={[
                styles.dragExerciseSetCount,
                groupColorScheme && { color: groupColorScheme[600] }
              ]}>
                {item.setCount} sets
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // When not dragging, render full exercise card wrapped with long-press handler
    const fullCard = renderExerciseCard(
      item.exercise,
      !!item.groupId,
      item.isLastInGroup,
      item.groupId
        ? ((dragItems.find(d => d.type === 'GroupHeader' && d.groupId === item.groupId) as any)?.groupType as GroupType | null) || null
        : null,
      item.groupId || null,
      item.isFirstInGroup
    );

    // Wrap with TouchableOpacity that triggers two-phase drag
    // Note: Keys are handled by FlatList's keyExtractor, don't add key prop here
    return (
      <TouchableOpacity
        onPressIn={(e) => recordTouchPosition(item.id, e.nativeEvent.pageY)}
        onLongPress={initiateDelayedDrag}
        delayLongPress={200}
        activeOpacity={1}
        disabled={isActive}
      >
        <View
          onLayout={(e) => {
            if (!isDragging && !isActive) {
              itemHeights.current.set(item.id, e.nativeEvent.layout.height);
            }
          }}
        >
          {fullCard}
        </View>
      </TouchableOpacity>
    );
  }, [dragItems, isDragging, collapsedGroupId, renderExerciseCard, handlePrepareDrag, initiateGroupDrag, itemHeights, collapsedItemHeights, recordTouchPosition]);

  const dragKeyExtractor = useCallback((item: WorkoutDragItem) => item.id, []);

  return {
    renderDragItem,
    dragKeyExtractor,
  };
};

const styles = StyleSheet.create({
  // Drag Mode Styles
  dragListContent: {
    paddingHorizontal: 6,
    paddingTop: 0,
    paddingBottom: 100,
  },
  dragGroupHeaderContainer: {
    marginTop: 0,
    marginBottom: 0,
    position: 'relative',
    marginHorizontal: -2,
  },
  dragGroupHeaderContainer__exerciseDrag: {
    marginHorizontal: 0,
  },
  dragGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 0,
    marginTop: 4,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dragGroupHeader__collapsed: {
    borderBottomWidth: 2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderStyle: 'dashed',
    marginBottom: 4,
    zIndex: 999,
    elevation: 10,
  },
  dragGroupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dragGroupHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dragGroupFooter: {
    paddingHorizontal: 12,
    paddingVertical: 0,
    marginBottom: 0,
    marginHorizontal: 0,
    borderWidth: 2,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    minHeight: 1,
  },
  dragGroupFooter__dragging: {
    minHeight: 8, // Taller footer when collapsed and being dragged
  },
  dragGroupFooter__exerciseDrag: {
    minHeight: 8, // Taller footer when dragging an individual exercise
  },
  dragExerciseCard: {
    backgroundColor: COLORS.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    marginTop: 4,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  dragExerciseCard__inGroup: {
    borderRadius: 0,
    marginTop: 0,
    marginBottom: 0,
    marginVertical: 0,
    borderWidth: 0,
    borderLeftWidth: 2,
    borderRightWidth: 2,
  },
  dragExerciseCard__firstInGroup: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: 0,
  },
  dragExerciseCard__lastInGroup: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  dragItem__active: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.slate[300],
    borderStyle: 'dashed',
    borderRadius: 6,
  },
  dragExerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dragExerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.slate[900],
    flex: 1,
  },
  dragExerciseSetCount: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.slate[500],
    marginLeft: 12,
  },
});
