# FEATURE_PLAN.md - Preserve SetGroups on Save ✅ COMPLETED

## Current State Analysis

### Problem
When the user creates multiple set groups within an exercise card in the DragAndDropModal (e.g., "dropset x 2" + "dropset x 2"), upon saving and reopening the modal, the set groups are merged into a single count (e.g., "dropset x 4").

### Current Data Flow
1. `HeaderTopRow.tsx` renders `DragAndDropModal` and passes:
   - `selectedOrder: string[]` - flat array of exercise IDs (IDs repeat based on count)
   - `groupedExercises: GroupedExercise[]` - exercises with total `count`
   - `exerciseGroups: ExerciseGroup[]` - superset/HIIT groups
   
2. `DragAndDropModal` initializes `dragItems` from these props:
   - Creates a single `SetGroup` per exercise with the total count
   - **No information about multiple set groups exists in props**

3. When saving (`handleSave`):
   - Flattens `setGroups` back into `newOrder` (just exercise IDs repeated)
   - Passes `dropsetExerciseIds` (which exercises are dropsets)
   - **SetGroups structure is lost**

4. `handleDragDropReorder` in `HeaderTopRow` calls:
   - `setSelectedOrder(newOrder)` - stores flat array
   - `setDropsetExerciseIds(dropsetExerciseIds)` - stores dropset flags
   - **No setGroups storage**

### Files Involved
- `src/components/WorkoutTemplate/modals/ExercisePicker/DragAndDropModal.tsx` - modal logic
- `src/components/WorkoutTemplate/modals/ExercisePicker/HeaderTopRow.tsx` - modal parent

## Proposed Changes (Step-by-Step)

### Step 1: Define SetGroups Map Type in DragAndDropModal
**File:** `DragAndDropModal.tsx`
- Export the `SetGroup` interface (currently only internal)
- Add `exerciseSetGroups?: Map<string, SetGroup[]>` to props interface

### Step 2: Update onReorder Callback Signature  
**File:** `DragAndDropModal.tsx`
- Add a 4th parameter: `exerciseSetGroups?: Map<string, SetGroup[]>`

### Step 3: Pass SetGroups When Saving
**File:** `DragAndDropModal.tsx` (handleSave)
- Build a map of exercise ID → SetGroup[] from finalItems
- Pass it as the 4th argument to onReorder

### Step 4: Update HeaderTopRow to Handle SetGroups
**File:** `HeaderTopRow.tsx`
- Add `setGroupsMap` state: `useState<Map<string, SetGroup[]>>(new Map())`
- Add prop: `setExerciseSetGroups?: (map: Map<string, SetGroup[]>) => void`
- Update `handleDragDropReorder` to accept and store the setGroups map
- Pass `exerciseSetGroups` prop to DragAndDropModal

### Step 5: Use SetGroups When Initializing DragItems  
**File:** `DragAndDropModal.tsx` (dragItems memo)
- When creating an ExerciseItem, check if `exerciseSetGroups` has data for this exercise
- If yes, use those setGroups instead of creating a default one

### Step 6: Lift State to ExercisePickerIndex (Parent of HeaderTopRow)
**File:** Look for where HeaderTopRow gets its props from
- The setGroups map needs to be stored at the level that persists across modal open/close

## Potential Risks or Edge Cases

1. **Map Serialization**: React state with `Map` objects should work, but need to ensure proper reference updates
2. **Exercise ID Changes**: If exercise IDs change between modal opens, setGroups won't match
3. **Backward Compatibility**: Old saved data won't have setGroups - fallback to single group needed
4. **Memory/Performance**: Map with setGroups for many exercises - minimal impact expected

## Thinking: ExerciseItem Discriminated Union Analysis

N/A - This change does not affect the ExerciseItem discriminated union in `src/types/workout.ts`. The changes are confined to the DragAndDropModal's internal data structures and its parent component's state management.

## User Approval Request

Please approve this plan to:
1. Add `exerciseSetGroups` to the callback and props
2. Store setGroups when saving
3. Restore setGroups when reopening the modal

This will preserve the multi-setGroup structure (e.g., "dropset x 2" + "dropset x 2") across save/reopen cycles.
