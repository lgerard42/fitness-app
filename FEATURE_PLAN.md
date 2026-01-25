# Feature Plan: Multi-Exercise Group Creation with Selection Mode

## 1. Current State Analysis

### Existing Code Structure
- **File**: `src/components/WorkoutTemplate/modals/ExercisePicker/DragAndDropModal.tsx`
- **Current Flow**:
  1. User clicks group icon on an ungrouped exercise card
  2. Dropdown appears with "Superset" and "HIIT" options
  3. User selects a group type
  4. `addExerciseToGroup` is called immediately, creating a group with only that single exercise

### Key Components
- `addExerciseToGroup`: Currently creates a group with a single exercise immediately
- `exerciseToGroup`: State tracking which exercise triggered the group creation
- `showGroupTypeModal`: Controls dropdown visibility
- `reorderedItems`: Array of `DragItem[]` representing the current order
- `renderItem`: Renders exercise cards, group headers, and footers

### Current State Variables
- `exerciseToGroup: ExerciseItem | null` - The exercise that triggered group creation
- `showGroupTypeModal: boolean` - Controls dropdown visibility
- `dropdownPosition: { x: number; y: number } | null` - Dropdown positioning

## 2. Proposed Changes (Step-by-Step)

### Step 1: Add Selection Mode State
**File**: `DragAndDropModal.tsx`
**Changes**:
- Add `isSelectionMode: boolean` state to track when user is in selection mode
- Add `selectedExercisesForGroup: Set<string>` state to track selected exercise IDs
- Add `pendingGroupType: GroupType | null` state to store the selected group type
- Add `pendingGroupInitialExercise: ExerciseItem | null` state to store the initial exercise

**Approximate lines**: ~10 lines

### Step 2: Modify Dropdown Selection Handler
**File**: `DragAndDropModal.tsx`
**Changes**:
- Instead of calling `addExerciseToGroup` immediately when user selects "Superset" or "HIIT"
- Set `isSelectionMode = true`
- Set `pendingGroupType` to the selected type
- Set `pendingGroupInitialExercise` to `exerciseToGroup`
- Add the initial exercise to `selectedExercisesForGroup`
- Close the dropdown
- Keep the initial exercise highlighted/selected

**Location**: Lines ~959-990 (dropdown item onPress handlers)
**Approximate lines**: ~15 lines modified

### Step 3: Add Visual Selection Indicators
**File**: `DragAndDropModal.tsx`
**Changes**:
- Modify `renderItem` to show selection state for ungrouped exercises when `isSelectionMode` is true
- Add visual indicator (e.g., border color, background color, checkmark) for selected exercises
- Disable drag functionality when in selection mode
- Show different styling for selectable vs selected exercises

**Location**: `renderItem` function, specifically the standalone exercise card rendering (~833-891)
**Approximate lines**: ~30 lines

### Step 4: Add Exercise Selection Logic
**File**: `DragAndDropModal.tsx`
**Changes**:
- Add `handleExerciseSelection` function that toggles exercise selection
- Only allow selection of ungrouped exercises (where `groupId === null`)
- Update `selectedExercisesForGroup` Set when exercise is clicked
- Prevent selection of the initial exercise (it's already in the group)

**Approximate lines**: ~20 lines

### Step 5: Add Selection Mode UI Banner
**File**: `DragAndDropModal.tsx`
**Changes**:
- Add a banner/header above the list when `isSelectionMode` is true
- Display: "Select exercises to add to [GroupType] group" or similar message
- Show count of selected exercises
- Include "Done" and "Cancel" buttons

**Location**: After instructionsContainer, before DraggableFlatList
**Approximate lines**: ~40 lines

### Step 6: Implement Done Button Handler
**File**: `DragAndDropModal.tsx`
**Changes**:
- Create `handleCreateGroupWithSelectedExercises` function
- Find all selected exercises in `reorderedItems` (including initial exercise)
- Sort them by their current order index
- Create a new group with all selected exercises
- Replace selected exercises with group header, all exercise items, and group footer
- Reset selection mode state
- Close any open modals/dropdowns

**Approximate lines**: ~50 lines

### Step 7: Implement Cancel Handler
**File**: `DragAndDropModal.tsx`
**Changes**:
- Create `handleCancelSelection` function
- Reset all selection mode state variables
- Clear `selectedExercisesForGroup`
- Set `isSelectionMode = false`
- Reset `pendingGroupType` and `pendingGroupInitialExercise`

**Approximate lines**: ~10 lines

### Step 8: Update State Reset Logic
**File**: `DragAndDropModal.tsx`
**Changes**:
- Update the `useEffect` that resets state when modal opens/closes
- Include new selection mode state variables in reset
- Ensure clean state on modal close

**Location**: Lines ~240-254
**Approximate lines**: ~5 lines

### Step 9: Modify Exercise Card Click Handler
**File**: `DragAndDropModal.tsx`
**Changes**:
- When in selection mode, clicking an ungrouped exercise should toggle selection
- When not in selection mode, clicking should do nothing (or maintain current behavior)
- Update the TouchableOpacity onPress for standalone exercise cards

**Location**: `renderItem` function, standalone exercise card (~836-890)
**Approximate lines**: ~10 lines

### Step 10: Update addExerciseToGroup (Optional Refactor)
**File**: `DragAndDropModal.tsx`
**Changes**:
- Consider refactoring `addExerciseToGroup` to accept multiple exercises
- Or create a new function `createGroupWithExercises` that handles multiple exercises
- Keep `addExerciseToGroup` for backward compatibility if needed elsewhere

**Approximate lines**: ~30 lines (if refactoring)

## 3. Potential Risks or Edge Cases

### Breaking Changes
- **Risk**: Changing the immediate group creation behavior might affect other parts of the codebase
- **Mitigation**: Keep `addExerciseToGroup` function but make it private/internal, or create a new function for multi-exercise groups

### State Management
- **Risk**: Complex state management with multiple related state variables
- **Mitigation**: Consider using a reducer pattern if state becomes too complex, but for now, individual state variables should be manageable

### UI/UX Considerations
- **Edge Case**: User selects group type but then cancels - need to ensure clean state reset
- **Edge Case**: User tries to select grouped exercises - should be prevented
- **Edge Case**: User tries to select the same exercise twice - should toggle off
- **Edge Case**: User selects exercises but they get reordered - need to maintain selection by ID, not index

### Performance Implications
- **Risk**: Re-rendering all items when selection state changes
- **Mitigation**: Use `useMemo` and `useCallback` appropriately, which are already in use

### Backward Compatibility
- **Risk**: If `addExerciseToGroup` is used elsewhere, changing its behavior could break things
- **Mitigation**: Check for other usages, create new function if needed

### Edge Cases to Handle
1. User clicks "Done" with only the initial exercise selected (should still create group)
2. User scrolls while in selection mode (selections should persist)
3. User tries to drag while in selection mode (should be disabled)
4. Modal closes while in selection mode (should reset state)
5. User selects exercises that are not adjacent in the list (group should include all selected, maintaining relative order)

## 4. User Approval Request

This plan implements a selection mode for multi-exercise group creation. The flow will be:
1. User clicks group icon → selects "Superset" or "HIIT"
2. Enters selection mode with initial exercise pre-selected
3. User can tap other ungrouped exercises to add them to selection
4. Visual feedback shows which exercises are selected
5. User clicks "Done" to create group with all selected exercises
6. User can click "Cancel" to exit selection mode without creating group

**Please review and approve this plan before I proceed with implementation.**
