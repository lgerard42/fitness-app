# Feature Plan: Improve Swipe-to-Delete UX in DragAndDropModal

## Current State Analysis

### Existing Code Structure
- **File**: `src/components/WorkoutTemplate/modals/ExercisePicker/DragAndDropModal.tsx`
- Swipe-to-delete is implemented with gesture handlers
- Trash icon appears on ambiguous swipes (>50px but <70%)
- Currently, clicking anywhere on the card when trash is visible triggers deletion
- No visual indicator during swipe showing deletion threshold
- Trash icon doesn't hide when interacting with other cards

### Current Issues
1. **Card click deletes when trash visible**: The `TouchableOpacity` wrapper on standalone cards has `onPress` that might interfere, and group children don't have explicit click handlers but the gesture might be triggering deletion
2. **No swipe threshold indicator**: Users don't see visual feedback about the 70% threshold during swipe
3. **Trash icon persistence**: Trash icon stays visible when clicking other cards or swiping back

### Key Components
- `renderExerciseContent`: Renders group child exercises
- `renderItem`: Renders standalone exercises
- `createSwipeGesture`: Creates pan gesture handler
- `handleSwipeEnd`: Handles swipe end logic
- `swipedItemId`: State tracking which item is swiped

## Proposed Changes (Step-by-Step)

### Step 1: Prevent Card Click Deletion When Trash Visible
**File**: `DragAndDropModal.tsx`
**Location**: `renderExerciseContent` and `renderItem` functions
**Changes**:
- Add `onPress` handler to card that closes trash icon if visible (doesn't delete)
- Ensure trash icon `TouchableOpacity` is the only element that triggers deletion
- For standalone cards: Modify the existing `TouchableOpacity` to check if trash is visible and close it instead of triggering selection/drag
- For group children: Add `TouchableOpacity` wrapper that closes trash if visible

### Step 2: Hide Trash Icon on Swipe Right
**File**: `DragAndDropModal.tsx`
**Location**: `createSwipeGesture` and `handleSwipeEnd` functions
**Changes**:
- Update `onUpdate` to detect left-to-right swipe when trash is visible
- Update `handleSwipeEnd` to close trash icon when swiping right (even small swipes)
- Reset swipe translation and `swipedItemId` when swiping right

### Step 3: Hide Trash Icon When Clicking Other Cards
**File**: `DragAndDropModal.tsx`
**Location**: `renderItem` callback and card press handlers
**Changes**:
- Add `onPress` handler to all cards that checks if a different card's trash is visible
- If different card's trash is visible, close it before handling the current card's press
- Update `handleExerciseSelection` to close trash icon
- Update drag handlers to close trash icon

### Step 4: Add Red Bar Indicator During Swipe
**File**: `DragAndDropModal.tsx`
**Location**: `renderExerciseContent` and `renderItem` functions
**Changes**:
- Create animated red bar that appears behind the card during swipe
- Calculate bar width based on swipe distance (0% to 100% of card width)
- Show red bar when `translationX < 0` (swiping left)
- Position bar to the right of the card, revealed as card swipes left
- Use `Animated.View` with width calculated from `translateX` value
- Style with red background color

### Step 5: Update Styles
**File**: `DragAndDropModal.tsx`
**Location**: `styles` object
**Changes**:
- Add `swipeIndicatorBar` style for the red deletion indicator
- Ensure proper z-index and positioning
- Make bar height match card height

## Potential Risks or Edge Cases

### Breaking Changes
- **Risk**: Modifying card press handlers might break existing drag/selection functionality
- **Mitigation**: Preserve existing behavior when trash is not visible, only add new logic when trash is visible

### Gesture Conflicts
- **Risk**: Swipe right to close might conflict with drag gestures
- **Mitigation**: Use gesture handler's `activeOffsetX` to distinguish swipe from drag
- **Risk**: Card press might interfere with gesture detection
- **Mitigation**: Use `TouchableOpacity` with proper `activeOpacity` and ensure gesture detector wraps correctly

### State Synchronization
- **Risk**: Trash icon state might not reset properly when clicking other cards
- **Mitigation**: Add explicit reset logic in all card interaction handlers
- **Risk**: Red bar animation might cause performance issues
- **Mitigation**: Use native driver for animations, calculate width efficiently

### Visual Feedback
- **Risk**: Red bar might be too subtle or too prominent
- **Mitigation**: Use clear red color, ensure adequate width, test on different screen sizes
- **Risk**: Red bar might not align properly with card
- **Mitigation**: Use absolute positioning, match card height exactly

## Thinking Block: ExerciseItem Discriminated Union Analysis

**Current Structure:**
- No changes to `ExerciseItem` type structure
- Changes are UI/UX only, affecting gesture handling and visual feedback
- No impact on data structures or type narrowing

**Proposed Change Impact:**
- No changes to `ExerciseItem` discriminated union
- All changes are in rendering and gesture handling logic
- Type guards remain the same

**Type Narrowing Considerations:**
- No type narrowing changes needed
- All changes use existing type guards

**Utility Function Updates:**
- No changes needed to external utility functions
- All logic contained within `DragAndDropModal.tsx`

## User Approval Request

This plan improves the swipe-to-delete UX by:
1. Requiring explicit trash icon click for deletion (not card click)
2. Hiding trash icon when swiping right or clicking other cards
3. Showing visual red bar indicator during swipe to indicate deletion threshold

**Please review and approve this plan before I proceed with implementation.**
