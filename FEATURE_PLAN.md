# Feature Plan: Add Set Count Display and Controls to DragAndDropModal

## Current State Analysis

### Existing Code Structure
- **File**: `src/components/WorkoutTemplate/modals/ExercisePicker/DragAndDropModal.tsx`
- The `DragAndDropModal` component manages a reorderable list of exercises with support for grouping (Superset/HIIT)
- Each `ExerciseItem` has a `count` property representing how many sets (instances) of that exercise exist
- Currently, the count is only displayed as a badge (`×{count}`) when `count > 1`
- The count is derived from how many times an exercise ID appears in the `selectedOrder` array
- The component receives `selectedOrder` as a prop and calls `onReorder` with updated order and groups

### Key Data Structures
- `ExerciseItem`: Contains `exercise`, `orderIndex`, `count`, `groupId`, etc.
- `DragItem`: Union type of `GroupHeaderItem | GroupFooterItem | ExerciseItem`
- `selectedOrder`: Array of exercise IDs representing the order
- `reorderedItems`: Local state array of `DragItem[]` used for drag-and-drop

### Current Rendering
- Standalone exercises: Show exercise name, category, muscles, optional count badge (if > 1), and group icon button
- Group children: Show exercise name, category, muscles, optional count badge (if > 1)
- Count badge is positioned in `exerciseRight` section, only visible when `count > 1`

## Proposed Changes (Step-by-Step)

### Step 1: Add Set Count Display
**File**: `DragAndDropModal.tsx`
**Location**: `renderExerciseContent` function (lines 700-778) and standalone exercise rendering (lines 950-1000)
**Changes**:
- Modify the exercise name display to always show the set count to the right of the name
- Format: `{exerciseName} ({count} sets)` or similar
- Update both `renderExerciseContent` (for group children) and standalone exercise rendering
- Remove the conditional count badge display (or keep it as a secondary indicator)

### Step 2: Add Set Control Buttons
**File**: `DragAndDropModal.tsx`
**Location**: Same rendering locations as Step 1
**Changes**:
- Add "-" and "+" buttons before the group icon button (for standalone exercises)
- Add "-" and "+" buttons in the `exerciseRight` section (for group children)
- Position buttons between the count display and the group icon
- Style buttons consistently with existing UI patterns
- Disable "-" button when count is 1 (minimum one set)
- Disable buttons during drag operations (`isActive` check)

### Step 3: Implement Set Increment Handler
**File**: `DragAndDropModal.tsx`
**Location**: New callback function, add after `handleCreateGroupWithSelectedExercises` (around line 509)
**Changes**:
- Create `handleIncrementSet` callback
- Find the exercise item in `reorderedItems` by ID
- Add the exercise ID to `selectedOrder` at the appropriate position
- Update `reorderedItems` to reflect the new count
- Handle both standalone exercises and group children
- For group children, add the new instance within the group boundaries
- Update `dragItems` memoization dependency if needed

### Step 4: Implement Set Decrement Handler
**File**: `DragAndDropModal.tsx`
**Location**: New callback function, add after `handleIncrementSet`
**Changes**:
- Create `handleDecrementSet` callback
- Find the exercise item in `reorderedItems` by ID
- Remove one instance of the exercise ID from `selectedOrder` at the appropriate position
- Update `reorderedItems` to reflect the new count
- Handle edge case: prevent removing if count would go below 1
- For group children, remove the last instance within the group
- Update group indices if needed

### Step 5: Update Save Handler
**File**: `DragAndDropModal.tsx`
**Location**: `handleSave` function (lines 596-646)
**Changes**:
- Ensure the save handler correctly processes the updated counts
- The existing logic already handles count by iterating through items and pushing IDs `count` times
- Verify that group indices are correctly maintained when sets are added/removed
- No major changes needed, but verify edge cases

### Step 6: Update UI Styles
**File**: `DragAndDropModal.tsx`
**Location**: `styles` object (lines 1141-1522)
**Changes**:
- Add styles for set count text (next to exercise name)
- Add styles for increment/decrement buttons
- Ensure buttons are properly sized and positioned
- Add disabled state styles for buttons
- Import icons if needed (likely use `Minus` and `Plus` from `lucide-react-native`)

### Step 7: Update Props and State Management
**File**: `DragAndDropModal.tsx`
**Location**: Component props and state (lines 77-180)
**Changes**:
- May need to update `onReorder` callback signature if parent needs to know about count changes
- Verify that `selectedOrder` prop updates correctly when parent re-renders
- Ensure `dragItems` memoization accounts for count changes

## Potential Risks or Edge Cases

### Breaking Changes
- **Risk**: Modifying `selectedOrder` directly could break parent component expectations
- **Mitigation**: The component already calls `onReorder` with updated order, so parent should handle updates correctly

### State Synchronization
- **Risk**: `reorderedItems` state might get out of sync with `selectedOrder` prop
- **Mitigation**: The `useEffect` at line 281 already syncs `reorderedItems` when modal opens. Need to ensure count changes update both local state and trigger proper save.

### Group Boundaries
- **Risk**: Adding/removing sets for group children could break group structure
- **Mitigation**: When modifying group children, ensure new instances are added within group boundaries (between header and footer)

### Minimum Set Count
- **Risk**: User might try to remove all sets, leaving exercise with 0 sets
- **Mitigation**: Disable "-" button when count is 1, prevent decrement below 1

### Drag State Conflicts
- **Risk**: User might try to modify sets while dragging
- **Mitigation**: Disable buttons when `isActive` is true

### Performance
- **Risk**: Frequent re-renders when rapidly clicking +/- buttons
- **Mitigation**: Use `useCallback` for handlers, ensure proper memoization

### Selection Mode
- **Risk**: Set controls might interfere with selection mode UI
- **Mitigation**: Hide or disable set controls during selection mode (similar to group icon button)

## Thinking Block: ExerciseItem Discriminated Union Analysis

**Current Structure:**
- `ExerciseItem = Exercise | ExerciseGroup` (from `src/types/workout.ts`)
- However, in `DragAndDropModal.tsx`, there's a local `ExerciseItem` interface (line 48) that represents a drag item, not the workout type
- The local `ExerciseItem` has `type: 'Item'` and contains `exercise: ExerciseLibraryItem`, `orderIndex`, `count`, etc.
- This is different from the workout `ExerciseItem` type

**Proposed Change Impact:**
- The change affects the local `ExerciseItem` interface in `DragAndDropModal.tsx`, not the workout type system
- No impact on `Exercise | ExerciseGroup` discriminated union
- The `count` property already exists on the local `ExerciseItem` type
- Changes are UI-only for displaying and modifying the count value
- The underlying data structure (how exercises are stored in `selectedOrder`) remains the same

**Type Narrowing Considerations:**
- No type narrowing changes needed
- The local `ExerciseItem` is already part of the `DragItem` union type
- Type guards remain the same (`item.type === 'Item'`)

**Utility Function Updates:**
- No changes needed to `flattenExercises` or `reconstructExercises` in `workoutHelpers.ts`
- The count is handled at the UI level in the modal, and the final order is passed back via `onReorder`

## User Approval Request

This plan adds:
1. Always-visible set count display next to exercise names
2. Increment/decrement buttons for adjusting set counts
3. Proper handling of set changes for both standalone and grouped exercises

The implementation will maintain existing functionality while adding the requested features. All changes are contained within `DragAndDropModal.tsx`.

**Please review and approve this plan before I proceed with implementation.**
