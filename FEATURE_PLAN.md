# Feature Plan: Fix Set Count Save Logic in DragAndDropModal

## Current State Analysis

### Problem
When a user updates the set count to 2 and saves, then re-opens the drag and drop modal, they see 2 identical exercises each showing "2" sets instead of 1 exercise showing "2" sets.

### Root Cause
1. `handleSave` correctly creates `newOrder` by pushing exercise IDs `count` times (e.g., `['exercise1', 'exercise1']` for count=2)
2. When modal re-opens, `dragItems` memo processes each index in `selectedOrder`
3. For `selectedOrder = ['exercise1', 'exercise1']`, `getGroupedExercises` creates one `GroupedExercise` with `count: 2` and `orderIndices: [0, 1]`
4. `dragItems` processes index 0: finds groupedExercise, creates item with count=2
5. `dragItems` processes index 1: finds the SAME groupedExercise (orderIndices includes 1), creates ANOTHER item with count=2
6. Result: Two items, each with count=2, instead of one item with count=2

### Current Code Structure
- `dragItems` memo (lines 87-167): Creates drag items from `selectedOrder`
- For standalone exercises (lines 150-162): Creates one item per index, even if multiple indices belong to same grouped exercise
- `handleSave` (lines 629-676): Correctly reconstructs order by pushing IDs `count` times

## Proposed Changes (Step-by-Step)

### Step 1: Fix dragItems Memo for Standalone Exercises
**File**: `DragAndDropModal.tsx`
**Location**: Lines 150-162 (standalone exercise handling in `dragItems` memo)
**Changes**:
- Before creating an item, check if this index is the `startIndex` of its grouped exercise
- Only create an item if `orderIndex === groupedExercise.startIndex`
- This ensures only ONE item is created per grouped exercise, regardless of how many indices it spans
- The item will have the correct `count` from the grouped exercise

### Step 2: Verify Group Exercise Handling
**File**: `DragAndDropModal.tsx`
**Location**: Lines 99-149 (group exercise handling)
**Changes**:
- Review the group exercise logic to ensure it doesn't have the same issue
- Group exercises already use `firstIndexInGroup` check, so they should be fine
- Verify that group children don't create duplicate items

### Step 3: Test Edge Cases
- Single exercise with count=1 (should work as before)
- Single exercise with count>1 (should create one item with correct count)
- Multiple different exercises (should work as before)
- Exercises in groups (should work as before)

## Potential Risks or Edge Cases

### Breaking Changes
- **Risk**: Changing the item creation logic might affect drag-and-drop behavior
- **Mitigation**: The change only affects how items are initially created, not their structure or drag behavior

### Group Exercise Indices
- **Risk**: Group exercise indices might need adjustment
- **Mitigation**: Group exercises already use `firstIndexInGroup` pattern, so they should be unaffected

### Order Index Consistency
- **Risk**: The `orderIndex` property on items might need to reference the first index
- **Mitigation**: `orderIndex` is used for display/grouping, not for reconstruction. `handleSave` uses the item's `count` to reconstruct order.

## User Approval Request

This fix ensures that when a user sets an exercise to have 2 sets and saves, reopening the modal shows 1 exercise with "2 x Exercise Name" instead of 2 exercises each with "2 x Exercise Name".

**Please review and approve this plan before I proceed with implementation.**
