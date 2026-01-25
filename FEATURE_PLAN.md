# Feature Plan: Duplicate Exercise Button

## Current State Analysis

The `DragAndDropModal.tsx` component displays exercise cards with:
- Set count text (`{item.count} x`) displayed as plain text before exercise name
- Group icon button that shows a dropdown menu for creating groups
- Exercise items can be in groups or standalone

**Relevant Files:**
- `src/components/WorkoutTemplate/modals/ExercisePicker/DragAndDropModal.tsx` (2054 lines)
  - `renderExerciseContent` function (lines 997-1164) - renders grouped exercise items
  - `renderItem` function (lines 1181-1472) - renders all item types including standalone exercises
  - Group type dropdown implementation (lines 1542-1604) - pattern to follow for duplicate dropdown
  - State management for dropdowns (lines 234-241)

**Current Patterns:**
- Dropdowns use `showGroupTypeModal` state and `dropdownPosition` state
- Button refs stored in `buttonRefsMap` for measuring position
- `exerciseToGroup` state tracks which exercise triggered the dropdown

## Proposed Changes (Step-by-Step)

### Step 1: Add State Management for Duplicate Dropdown
**File:** `DragAndDropModal.tsx`
**Lines:** ~234-241 (state declarations)
**Changes:**
- Add `showDuplicateModal` state (boolean)
- Add `exerciseToDuplicate` state (ExerciseItem | null)
- Add `duplicateDropdownPosition` state ({ x: number; y: number } | null)
- Add ref map for duplicate button positions (or reuse existing pattern)

### Step 2: Create Duplicate Handler Function
**File:** `DragAndDropModal.tsx`
**Lines:** After `handleDeleteExercise` (~line 709)
**Changes:**
- Create `handleDuplicateExercise` callback function
- Function should:
  - Find the exercise item in `reorderedItems`
  - Create a new exercise item with same properties (exercise, count, groupId, etc.)
  - Generate new unique ID
  - Insert duplicate after the original item
  - If in a group, maintain group structure
  - Update `reorderedItems` state

### Step 3: Convert Set Count Text to Button (Grouped Exercises)
**File:** `DragAndDropModal.tsx`
**Lines:** ~1103 (in `renderExerciseContent`)
**Changes:**
- Replace `<Text style={styles.setCountText}>{item.count} x</Text>` with `TouchableOpacity`
- Add `onPress` handler to show duplicate dropdown
- Add ref for measuring button position
- Style button appropriately (maintain current appearance but make it pressable)

### Step 4: Convert Set Count Text to Button (Standalone Exercises)
**File:** `DragAndDropModal.tsx`
**Lines:** ~1404 (in `renderItem` for standalone items)
**Changes:**
- Replace `<Text style={styles.setCountText}>{item.count} x </Text>` with `TouchableOpacity`
- Add `onPress` handler to show duplicate dropdown
- Add ref for measuring button position
- Style button appropriately

### Step 5: Add Dropdown Position Measurement Effect
**File:** `DragAndDropModal.tsx`
**Lines:** After existing `useEffect` for group type modal (~line 392)
**Changes:**
- Add `useEffect` to measure duplicate button position when `showDuplicateModal` becomes true
- Similar pattern to existing group type modal measurement (lines 373-392)

### Step 6: Add Duplicate Dropdown UI
**File:** `DragAndDropModal.tsx`
**Lines:** After group type dropdown (~line 1604)
**Changes:**
- Add duplicate dropdown modal similar to group type dropdown
- Single option: "Duplicate"
- Position dropdown based on `duplicateDropdownPosition`
- Handle selection to call `handleDuplicateExercise`
- Add overlay to close dropdown on outside click

### Step 7: Add Styles for Set Count Button
**File:** `DragAndDropModal.tsx`
**Lines:** In `StyleSheet.create` section (~line 1611)
**Changes:**
- Add `setCountButton` style (make it look like current text but pressable)
- Ensure proper hitSlop for touch target
- Maintain current visual appearance

### Step 8: Reset State on Modal Close
**File:** `DragAndDropModal.tsx`
**Lines:** In `useEffect` that resets on modal visibility change (~line 347)
**Changes:**
- Reset `showDuplicateModal` to false
- Reset `exerciseToDuplicate` to null
- Reset `duplicateDropdownPosition` to null

## Potential Risks or Edge Cases

1. **Group Membership**: When duplicating a grouped exercise, need to ensure:
   - Duplicate maintains same `groupId`
   - Duplicate is inserted in correct position within group
   - Group header/footer remain intact
   - First/last flags updated correctly

2. **ID Collisions**: New duplicate must have unique ID to avoid conflicts

3. **State Synchronization**: Duplicate dropdown state must reset when modal closes or when other actions occur

4. **Position Measurement**: Button ref might not be available immediately, need retry logic (similar to group type modal)

5. **Active Drag State**: Should disable duplicate button when item is being dragged (`isActive`)

6. **Selection Mode**: Should disable duplicate button when in selection mode

7. **Empty Groups**: If duplicating last item in a group, need to handle group footer positioning

## User Approval Request

This plan implements a duplicate exercise feature by:
1. Converting the set count display to a clickable button
2. Showing a dropdown menu with "Duplicate" option
3. Creating an exact duplicate of the exercise (same count, same group membership)

The implementation follows existing patterns in the codebase (group type dropdown) for consistency.

**Please approve this plan to proceed with implementation.**
