# Feature Plan: Prevent Dragged Item Shift on Collapse

## Current State Analysis

### Files Involved
1. **`src/components/WorkoutTemplate/index.tsx`**
   - Contains the `DraggableFlatList` component with `contentContainerStyle={styles.dragListContent}`
   - Currently has `paddingTop: 0` in `dragListContent` style
   - Handles drag initiation via `handlePrepareDrag` (exercises) and `initiateGroupDrag` (group headers)
   - Uses `onLongPress` to trigger drag operations

2. **`src/components/WorkoutTemplate/hooks/useWorkoutDragDrop.ts`**
   - Manages drag state: `isDragging`, `collapsedGroupId`, `pendingDragItemId`
   - `handlePrepareDrag`: Sets `isDragging = true`, which triggers collapse of all items
   - `initiateGroupDrag`: Sets `isDragging = true` and collapses the dragged group
   - `pendingDragItemId` is already stored but only used for scrolling

3. **`src/components/WorkoutTemplate/index.tsx` - `renderDragItem`**
   - Renders items in collapsed state when `isDragging || isActive`
   - Items collapse immediately when `isDragging` becomes true

### Current Flow
1. User presses down on item → `onLongPress` fires
2. `handlePrepareDrag` or `initiateGroupDrag` is called
3. `setIsDragging(true)` is called immediately
4. React re-renders with `isDragging = true`
5. All items above the dragged item collapse (height reduces)
6. The dragged item shifts up because items above it lost height
7. `onDragBegin` fires from `DraggableFlatList` (actual drag starts)

### Problem
When items collapse, the total height of items above the dragged item decreases, causing the dragged item to shift upward. This creates a jarring visual experience.

## Proposed Changes (Step-by-Step)

### Step 1: Add State to Track Pre-Collapse Position
**File**: `src/components/WorkoutTemplate/hooks/useWorkoutDragDrop.ts`
- Add new state: `preCollapsePaddingTop: number | null`
- This will store the calculated padding needed to prevent shift

**Approximate lines**: ~5-10 lines

### Step 2: Calculate Height Difference Before Collapse
**File**: `src/components/WorkoutTemplate/index.tsx`
- Before calling `handlePrepareDrag` or `initiateGroupDrag`, measure the position of the item being dragged
- Use `listRef.current` and item measurement to calculate:
  - Total height of items above the dragged item (before collapse)
  - Total height of items above the dragged item (after collapse - estimated)
  - Difference = paddingTop needed

**Approximate lines**: ~20-30 lines

### Step 3: Update Drag Preparation Functions
**File**: `src/components/WorkoutTemplate/hooks/useWorkoutDragDrop.ts`
- Modify `handlePrepareDrag` to accept optional `paddingTop` parameter
- Modify `initiateGroupDrag` to accept optional `paddingTop` parameter
- Store the padding value in state

**Approximate lines**: ~10-15 lines

### Step 4: Apply Dynamic Padding to Content Container
**File**: `src/components/WorkoutTemplate/index.tsx`
- Update `contentContainerStyle` for `DraggableFlatList` to conditionally apply `paddingTop` when `isDragging` is true
- Use the `preCollapsePaddingTop` value from the hook
- Reset padding when drag ends

**Approximate lines**: ~5-10 lines

### Step 5: Reset Padding on Drag End
**File**: `src/components/WorkoutTemplate/hooks/useWorkoutDragDrop.ts`
- In `handleDragEnd` and `handleCancelDrag`, reset `preCollapsePaddingTop` to `null`

**Approximate lines**: ~5 lines

### Step 6: Add Style for Dynamic Padding
**File**: `src/components/WorkoutTemplate/index.tsx`
- Update `dragListContent` style or create dynamic style object
- Ensure padding doesn't interfere with existing layout

**Approximate lines**: ~5-10 lines

## Potential Risks or Edge Cases

### 1. Measurement Timing
- **Risk**: Measuring item position before collapse might not be accurate if layout hasn't settled
- **Mitigation**: Use `onLayout` callbacks or `requestAnimationFrame` to ensure measurement happens after layout

### 2. Different Collapse Heights
- **Risk**: Different items have different heights, so collapse height reduction varies
- **Mitigation**: Calculate based on actual item heights, or use a conservative estimate

### 3. Group Header Drag
- **Risk**: When dragging a group header, only that group collapses, not all items
- **Mitigation**: Calculate padding based on the specific group's height reduction

### 4. Performance
- **Risk**: Measuring and calculating on every drag start might cause lag
- **Mitigation**: Cache measurements, use `useMemo` for calculations

### 5. Scroll Position
- **Risk**: If user has scrolled, the padding calculation needs to account for scroll offset
- **Mitigation**: Use `listRef.current?.scrollToOffset` or measure relative to viewport

### 6. Multiple Rapid Drags
- **Risk**: User might start another drag before previous one ends
- **Mitigation**: Reset padding in `handleCancelDrag` and ensure state is cleaned up

### 7. Edge Cases
- Empty workout: No items to measure
- Single item: No items above to collapse
- Very long list: Measurement might be expensive

## Alternative Approaches Considered

### Approach 1: Measure All Items Above
- Measure each item above the dragged item individually
- Calculate total height difference
- **Pros**: Accurate
- **Cons**: Expensive, complex

### Approach 2: Estimate Based on Item Count
- Count items above, multiply by average collapsed height
- **Pros**: Simple, fast
- **Cons**: Inaccurate for varying item heights

### Approach 3: Use Fixed Padding
- Add fixed padding when dragging starts
- **Pros**: Simplest
- **Cons**: Doesn't account for actual height differences

### Approach 4: Measure Item Position (Selected)
- Measure the dragged item's position before collapse
- Calculate how much it would shift
- Add padding equal to the shift amount
- **Pros**: Accurate, accounts for actual layout
- **Cons**: Requires measurement API usage

## Revised Implementation Strategy

We have two options:

1) **Snap-to-touch approach (preferred)**  
   - Capture the exact finger Y on press-in.  
   - After collapse, scroll/offset so the pressed item’s top aligns with that Y.  
   - This avoids brittle height-difference math.

2) **Refine calculations**  
   - Further improve measured/estimated height diffs.  
   - Risk: still drift if measurements lag or vary per item.

### Chosen approach: Snap-to-touch
- Use press-in to record `touchY` and `touchItemId`.
- On collapse, compute the item’s current Y (sum measured heights of prior items + scroll offset).
- Compute delta = currentY - touchY. Apply a temporary `paddingTop` and scroll adjustment so the item aligns to touchY.
- Clear padding once drag ends.

### Step-by-step (refined)
1. **Capture touch**  
   - File: `src/components/WorkoutTemplate/index.tsx`  
   - On press-in for headers and exercises: store `touchY` + `item.id` via hook.

2. **Measure list absolute Y**  
   - File: `index.tsx`  
   - Wrap `DraggableFlatList` in a container `View` with a ref; on layout, call `measureInWindow` and store the container’s top (`listTopPageY`) in the hook (`setListLayoutY`).

3. **Expose touch refs in hook**  
   - File: `src/components/WorkoutTemplate/hooks/useWorkoutDragDrop.ts`  
   - Keep `touchYRef`, `touchItemIdRef`, `listLayoutYRef`; reset on end/cancel.

4. **Align after collapse (snap-to-touch)**  
   - File: hook  
   - After collapse is triggered, compute collapsed tops using measured collapsed heights (fallback approximations).  
   - Compute `touchRel = touchY - listTopPageY`.  
   - `scrollOffset = collapsedTop - touchRel`; if negative, convert to `paddingTop` and clamp offset to 0.  
   - Apply `paddingTop` and `scrollToOffset`.

5. **Account for size changes static → drag**  
   - Keep dual measurements: full heights when not dragging; collapsed heights when dragging/active.  
   - Ensure footers/headers/exercises all record collapsed heights.

6. **Cleanup**  
   - Reset padding, touch refs, and height maps on drag end/cancel.

## Potential Risks or Edge Cases
- Measurement timing: still need the layout pass; use `requestAnimationFrame` before aligning.
- Scroll offset: must include current scroll when computing item position.
- Very fast taps: ensure press-in captured before collapse triggers.
- Missing measurements: fallback to approximate heights if a height is missing; align best-effort.

## User Approval Request

This plan will:
- Add state management for tracking pre-collapse padding
- Implement measurement logic to calculate height difference
- Apply dynamic padding to prevent item shift
- Handle both individual exercise drags and group header drags
- Reset padding when drag ends or is cancelled

**Estimated total changes**: ~60-80 lines across 2 files

Please review and approve this plan before I proceed with implementation.
