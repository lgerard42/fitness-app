# Feature Plan: Fix Dropset Application in Workout Template

## SOLUTION IMPLEMENTED

**Root Cause Found**: The UI expects sets to have a shared `dropSetId` string to visually group them together. We were incorrectly setting `isDropset: true` on individual sets, which doesn't create the visual grouping.

**Fix Applied**: In `createExerciseInstance`, when `isDropset` is true:
1. Generate a unique `dropSetId` string
2. Assign that `dropSetId` to ALL sets in the exercise
3. This causes the UI to visually group those sets as a dropset

## Current State Analysis

### Data Flow Traced:
1. **DragAndDropModal**: User toggles dropset → `dropsetExercises` state (Set<string>) is updated
2. **DragAndDropModal.handleSave**: Collects dropset IDs from `finalItems`, calls `onReorder(newOrder, updatedGroups, dropsetExerciseIds)`
3. **HeaderTopRow.handleDragDropReorder**: Receives dropset IDs, calls `setDropsetExerciseIds(dropsetExerciseIds || [])`
4. **ExercisePicker**: State is updated → useEffect syncs to ref
5. **ExercisePicker.handleAddAction**: Calls `convertToWorkoutFormat()` which uses `dropsetExerciseIdsRef.current`
6. **WorkoutTemplate.handleAddExercisesFromPicker**: Receives exercises with `_isDropset`, creates instances

### IDENTIFIED ISSUES:

**Issue 1: Race Condition with Ref Sync**
The `useEffect` that syncs the ref runs AFTER the render. If state updates and `handleAddAction` are batched or happen in quick succession, the ref might not be updated yet.

```javascript
// Current (buggy):
useEffect(() => {
  dropsetExerciseIdsRef.current = dropsetExerciseIds;  // Runs AFTER render
}, [dropsetExerciseIds]);
```

**Issue 2: Missing Dependency in handleDragDropReorder**
In `HeaderTopRow.tsx`, the `handleDragDropReorder` callback is missing `setDropsetExerciseIds` in its dependency array:
```javascript
}, [setSelectedOrder, setExerciseGroups, setSelectedIds]);
// Missing: setDropsetExerciseIds
```

**Issue 3: State Update Timing**
React's state updates are asynchronous. When `handleDragDropReorder` calls `setDropsetExerciseIds`, the state update is queued but may not complete before `convertToWorkoutFormat` reads the ref.

## Proposed Changes (Step-by-Step)

### Step 1: Create Atomic Setter for Dropset IDs
**File**: `src/components/WorkoutTemplate/modals/ExercisePicker/index.tsx`
**Lines**: 57-63
**Action**: 
- Create a custom setter that updates BOTH the ref AND the state synchronously
- Remove the useEffect that syncs state to ref (no longer needed)

```javascript
// Before:
const [dropsetExerciseIds, setDropsetExerciseIds] = useState<string[]>([]);
const dropsetExerciseIdsRef = useRef<string[]>([]);

useEffect(() => {
  dropsetExerciseIdsRef.current = dropsetExerciseIds;
}, [dropsetExerciseIds]);

// After:
const [dropsetExerciseIds, setDropsetExerciseIdsRaw] = useState<string[]>([]);
const dropsetExerciseIdsRef = useRef<string[]>([]);

const setDropsetExerciseIds = useCallback((ids: string[]) => {
  dropsetExerciseIdsRef.current = ids; // Update ref IMMEDIATELY
  setDropsetExerciseIdsRaw(ids);       // Queue state update
}, []);
```

**Why**: This ensures the ref is ALWAYS up-to-date immediately when the setter is called, not after a render cycle.

### Step 2: Fix Dependency Array in HeaderTopRow
**File**: `src/components/WorkoutTemplate/modals/ExercisePicker/HeaderTopRow.tsx`
**Lines**: 85
**Action**: Add `setDropsetExerciseIds` to the dependency array

```javascript
// Before:
}, [setSelectedOrder, setExerciseGroups, setSelectedIds]);

// After:
}, [setSelectedOrder, setExerciseGroups, setSelectedIds, setDropsetExerciseIds]);
```

**Why**: Ensures the callback always has the latest reference to `setDropsetExerciseIds`.

### Step 3: Update Reset Calls to Use New Setter
**File**: `src/components/WorkoutTemplate/modals/ExercisePicker/index.tsx`
**Lines**: 529, 541
**Action**: Ensure the reset calls use the new setter (should work automatically since we're keeping the same function name)

## Thinking Block: ExerciseItem Discriminated Union Analysis

**Current Structure:**
- `ExerciseItem = Exercise | ExerciseGroup`
- `Set.isDropset?: boolean` (on individual sets)

**Proposed Change Impact:**
- No changes to the ExerciseItem union structure
- Dropset is handled at the Set level within Exercise
- The change is purely in the flow of data from ExercisePicker to WorkoutTemplate
- No type narrowing or utility function changes needed

## Potential Risks or Edge Cases

1. **Multiple Rapid Clicks**: If user clicks "Add" multiple times rapidly, the state might not match the ref - but the ref is always correct so this is fine.

2. **Component Unmount**: If ExercisePicker unmounts before state update completes, no issue since we're using the ref.

3. **Callback Stability**: The new `setDropsetExerciseIds` callback needs to be stable (wrapped in useCallback with empty deps).

## Implementation Status: COMPLETE

### Changes Made:

1. **ExercisePicker (index.tsx)** - Lines 57-65:
   - Renamed state setter to `setDropsetExerciseIdsRaw`
   - Created custom `setDropsetExerciseIds` callback that updates BOTH the ref AND state
   - The ref is now updated SYNCHRONOUSLY before the async state update
   - Removed the useEffect that synced state to ref (no longer needed)

2. **HeaderTopRow.tsx** - Line 85:
   - Added `setDropsetExerciseIds` to the dependency array of `handleDragDropReorder`

### How It Works Now:

1. User opens DragAndDropModal and toggles dropsets
2. User clicks "Save" → `handleSave` collects dropset IDs and calls `onReorder(..., dropsetExerciseIds)`
3. `handleDragDropReorder` calls `setDropsetExerciseIds(dropsetExerciseIds)`
4. **NEW**: The custom setter immediately updates `dropsetExerciseIdsRef.current` (synchronous)
5. Modal closes
6. User clicks "Add" → `handleAddAction` calls `convertToWorkoutFormat()`
7. `convertToWorkoutFormat` reads from `dropsetExerciseIdsRef.current` which is guaranteed to be up-to-date
8. Exercises are created with `_isDropset: true`
9. WorkoutTemplate receives exercises with `_isDropset` and marks all sets with `isDropset: true`
