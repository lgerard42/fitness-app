# Feature Plan: Refactor DragAndDropModal Button Functionality

## Current State Analysis

**Current Implementation:**
1. **Set Count Button** (lines 1193-1218, 1520-1545):
   - Set count "N x" is a clickable button
   - Shows duplicate dropdown when clicked
   - Uses `duplicateButtonRefsMap` for positioning

2. **Group Icon Button** (lines 1441-1463):
   - Uses `Layers` icon from lucide-react-native
   - Shows group type dropdown (Superset/HIIT) when clicked
   - Uses `buttonRefsMap` for positioning

3. **Duplicate Dropdown** (lines 1749-1787):
   - Separate dropdown for duplicate functionality
   - Positioned relative to set count button

**Relevant Files:**
- `src/components/WorkoutTemplate/modals/ExercisePicker/DragAndDropModal.tsx` (2267 lines)
- `src/types/workout.ts` - may need to check for dropset type

**Current Patterns:**
- Dropdowns use state: `showGroupTypeModal`, `showDuplicateModal`
- Button refs stored in maps for position measurement
- Group type dropdown shows Superset/HIIT options

## Proposed Changes (Step-by-Step)

### Step 1: Remove Set Count Button Functionality
**File:** `DragAndDropModal.tsx`
**Lines:** ~1193-1218 (grouped exercises), ~1520-1545 (standalone exercises)
**Changes:**
- Remove `TouchableOpacity` wrapper around set count text
- Remove `duplicateButtonRefsMap` ref assignment
- Convert back to plain `<Text>` component
- Remove duplicate-related state and handlers from set count button
- Keep the text display but make it non-interactive

### Step 2: Change Group Icon to Edit Icon
**File:** `DragAndDropModal.tsx`
**Lines:** ~7 (imports), ~1441-1463 (button rendering)
**Changes:**
- Replace `Layers` import with `Edit` or `Edit2` from lucide-react-native
- Update icon component in button rendering
- Update icon size/color if needed for consistency

### Step 3: Add Dropset State Management
**File:** `DragAndDropModal.tsx`
**Lines:** ~232-250 (state declarations)
**Changes:**
- Add `dropsetExercises` state: `Set<string>` to track which exercises are marked as dropsets
- Add state to track dropset in the final data structure
- Consider adding to `ExerciseItem` interface if needed

### Step 4: Update Edit Button Dropdown Menu
**File:** `DragAndDropModal.tsx`
**Lines:** ~1664-1747 (group type dropdown), ~1749-1787 (duplicate dropdown)
**Changes:**
- Replace group type dropdown with new edit dropdown
- Add three options:
  - **"Create Group"**: Only show if `item.groupId === null` (ungrouped)
    - When clicked, show the existing Superset/HIIT selection flow
  - **"Duplicate"**: Move duplicate functionality here
    - Use existing `handleDuplicateExercise` function
  - **"Dropset"**: New functionality
    - Toggle dropset state for the exercise
    - Add visual indicator (bar before "N x")
- Update dropdown positioning to use edit button ref instead of group button ref
- Merge duplicate dropdown logic into edit dropdown

### Step 5: Implement Dropset Visual Indicator
**File:** `DragAndDropModal.tsx`
**Lines:** ~1190-1220 (grouped exercise rendering), ~1517-1548 (standalone exercise rendering)
**Changes:**
- Add visual bar before "N x" when exercise is marked as dropset
- Style similar to `groupChildWrapperLeft` (2px width, colored bar)
- Use appropriate color (maybe orange/yellow for dropset vs blue/purple for groups)
- Add to both grouped and standalone exercise rendering

### Step 6: Update handleSave to Include Dropset Information
**File:** `DragAndDropModal.tsx`
**Lines:** ~993-1033 (`handleSave`)
**Changes:**
- Include dropset information in the data passed to `onReorder`
- May need to extend the data structure to include dropset metadata
- Ensure dropset exercises are properly marked when saved

### Step 7: Clean Up Unused Code
**File:** `DragAndDropModal.tsx`
**Changes:**
- Remove `duplicateButtonRefsMap` ref
- Remove `showDuplicateModal` state
- Remove `exerciseToDuplicate` state
- Remove `duplicateDropdownPosition` state
- Remove duplicate dropdown UI (lines 1749-1787)
- Remove duplicate button positioning useEffect (lines 401-434)
- Clean up any unused imports

### Step 8: Update Styles
**File:** `DragAndDropModal.tsx`
**Lines:** ~2041-2044 (setCountButton), ~2180-2204 (duplicateDropdown styles)
**Changes:**
- Remove or update `setCountButton` style (may not be needed if text is not clickable)
- Update dropdown styles to accommodate new menu options
- Add style for dropset indicator bar
- Consider renaming dropdown styles to be more generic (e.g., `editDropdown`)

## Potential Risks or Edge Cases

1. **Dropset State Persistence**:
   - Dropset state needs to persist when exercises are reordered
   - Need to track dropset by exercise ID, not just index
   - Handle dropset state when exercises are duplicated

2. **Group Creation Flow**:
   - "Create Group" should trigger the existing group creation flow
   - Need to ensure it works for both grouped and standalone exercises
   - May need to handle case where exercise is already in a group

3. **Visual Consistency**:
   - Dropset bar should be visually distinct from group bars
   - Need to ensure proper spacing and alignment
   - Consider how dropset bar looks with group bars (if exercise is in both)

4. **Data Structure**:
   - Need to determine how dropset information is stored
   - May need to extend `ExerciseItem` or create separate metadata
   - Ensure dropset info is passed through `onReorder` correctly

5. **Duplicate Functionality**:
   - Moving duplicate to edit menu should preserve all existing behavior
   - Duplicated exercises should inherit dropset state if applicable
   - Need to ensure duplicate works for both grouped and standalone exercises

6. **Backward Compatibility**:
   - Ensure existing group functionality still works
   - Don't break the save/reorder flow
   - Maintain compatibility with ExercisePicker's expectations

## Thinking Block: ExerciseItem Union Impact Analysis

**Current Structure:**
- `ExerciseItem = Exercise | ExerciseGroup` (from `src/types/workout.ts`)
- `Exercise.type = 'exercise'`
- `ExerciseGroup.type = 'group'`

**Proposed Change Impact:**
- **Exercise type**: May need to add `isDropset?: boolean` property
- **ExerciseGroup type**: No change needed (dropset is per-exercise, not per-group)
- **Type narrowing**: No breaking changes expected
- **Utility functions**: May need to handle dropset flag when processing exercises

**Alternative Approach:**
- Store dropset information separately in metadata (similar to groupsMetadata)
- Pass dropset exercise IDs through `onReorder` callback
- This avoids modifying the core Exercise type

## User Approval Request

This plan will:
1. Remove button functionality from set count display
2. Change group icon to edit icon
3. Create new edit dropdown with "Create Group", "Duplicate", and "Dropset" options
4. Add visual dropset indicator (colored bar)
5. Ensure dropset state is preserved and passed to workout template

The implementation will maintain all existing functionality while consolidating actions into a single edit menu and adding dropset support.

**Please approve this plan to proceed with implementation.**
