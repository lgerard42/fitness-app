# Feature Plan: Drag and Drop for Workout Template Exercise Reordering

## Status: IMPLEMENTED ✓

## Overview

Native drag and drop functionality for reordering exercises directly on the WorkoutTemplate, following the DragAndDropModal as the golden standard.

## Implementation Summary

### Files Created:
1. **`src/components/WorkoutTemplate/hooks/useWorkoutDragDrop.ts`** (~230 lines)
   - Custom hook managing drag mode state
   - Converts workout exercises to drag items
   - Handles drag start, end, and cancel
   - Manages group collapse/expand logic
   - Uses `flattenExercises` and `reconstructExercises` utilities

### Files Modified:
1. **`src/components/WorkoutTemplate/index.tsx`**
   - Added `DraggableFlatList` import from `react-native-draggable-flatlist`
   - Added `useWorkoutDragDrop` hook import and usage
   - Added `renderDragItem` callback for rendering drag items
   - Added `renderDraggableList` function for drag mode UI
   - Modified main render to conditionally show DraggableFlatList in drag mode
   - Updated exercise card `onLongPress` to trigger `handleDragStart`
   - Updated group header `onLongPress` to trigger `handleDragStart`
   - Added new styles for drag mode UI

## Key Behaviors

### User Interaction:
1. **Long press on exercise header** → Enters drag mode with all sets collapsed
2. **Long press on group header** → Enters drag mode with entire group as draggable unit
3. **Drag item to new position** → Visual feedback during drag
4. **Release to drop** → Applies reordering and exits drag mode
5. **Tap Cancel button** → Reverts to original order and exits drag mode

### Technical Behavior:
- When drag mode activates, displays `DraggableFlatList` with condensed exercise cards
- Only exercise name and set count shown during drag (sets hidden)
- Groups displayed as: Header → Exercise items → Footer
- Uses `MoveModeBanner` for cancel/done actions
- Drag changes are applied via `reconstructExercises` utility

## Drag Item Types

```typescript
type WorkoutDragItem = GroupHeaderDragItem | GroupFooterDragItem | ExerciseDragItem;

interface GroupHeaderDragItem {
  id: string;
  type: 'GroupHeader';
  groupId: string | null;
  groupType: GroupType;
  childCount: number;
  data: ExerciseGroup;
}

interface ExerciseDragItem {
  id: string;
  type: 'Exercise';
  groupId: string | null;
  exercise: Exercise;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  setCount: number;
}
```

## Architecture Compliance

### Follows `.cursor/rules/architectural-standards.md`:
- ✓ State logic extracted to `hooks/useWorkoutDragDrop.ts`
- ✓ Uses `@/` path alias for imports
- ✓ Types imported from `@/types/workout`
- ✓ Pure functions used from `@/utils/workoutHelpers`
- ✓ Mode-based rendering (drag mode vs normal mode)

### Follows DragAndDropModal Pattern:
- ✓ Uses `DraggableFlatList` from same library
- ✓ Similar item type structure (Header, Footer, Item)
- ✓ Collapsed view during drag
- ✓ Color schemes for groups (Superset/HIIT)
- ✓ Visual feedback for active drag item

## Testing Notes

To test the implementation:
1. Open a workout with exercises
2. Long press on an exercise card header
3. Observe: All sets collapse, drag mode banner appears
4. Drag exercise to new position
5. Release to confirm reorder
6. Verify exercises are in new order

For groups:
1. Long press on a group header (Superset/HIIT)
2. Observe: Entire group moves as one unit
3. Drag to new position
4. Release to confirm

## Potential Future Enhancements

1. **Haptic feedback** on drag start/end
2. **Auto-scroll** when dragging near edges
3. **Visual drop indicators** showing where item will land
4. **Undo** functionality after reorder
