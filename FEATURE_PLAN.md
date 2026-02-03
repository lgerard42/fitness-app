# Set-Level Drag and Drop Feature Plan

## ✅ IMPLEMENTATION COMPLETE

## Current State Analysis

### Relevant Files and Their Responsibilities

1. **`src/components/WorkoutTemplate/WorkoutTemplateIndex.tsx`** (~3788 lines)
   - Main workout template component
   - Uses `DraggableFlatList` for exercise-level reordering
   - `renderDragItem` callback handles both collapsed and expanded exercise rendering
   - Current drag trigger: `TouchableOpacity.onLongPress={drag}` wraps entire exercise card
   - Sets rendered via `ex.sets.map()` inside `renderExerciseCard` function (lines 1360-1542)

2. **`src/components/WorkoutTemplate/SetRow.tsx`** (~861 lines)
   - Individual set row component
   - No current drag capability
   - Has swipe-to-delete functionality via `SwipeToDelete` wrapper
   - Props include `onUpdate`, `onToggle`, `onDelete` for set operations

3. **`src/components/WorkoutTemplate/hooks/useWorkoutDragDrop.ts`** (~577 lines)
   - Manages exercise-level drag state
   - Handles group collapsing/expanding during drag
   - Returns `isDragging`, `dragItems`, `handlePrepareDrag`, `handleDragEnd`

4. **`src/types/workout.ts`**
   - `Set` interface includes `dropSetId?: string` for grouping sets
   - `Exercise.sets: Set[]` is the array to be reordered

### Current Drag Flow

1. User long-presses anywhere on exercise card in `renderDragItem`
2. `handlePrepareDrag` is called with `drag` callback
3. All exercise cards collapse to compact view
4. User drags to new position
5. `handleDragEnd` reconstructs `exercises` array

### Dependencies and Coupling

- `SetRow` receives `set`, `onUpdate`, `onDelete` from parent
- Exercise-level drag uses `updateExercisesDeep` helper to modify sets
- `dropSetId` property groups sets visually (dropset indicator bar)

---

## Thinking: ExerciseItem Discriminated Union Impact Analysis

**Current Structure:**
- `ExerciseItem = Exercise | ExerciseGroup`
- `Exercise.type = 'exercise'`
- `ExerciseGroup.type = 'group'`

**Proposed Change Impact:**
- **Exercise type**: Sets array (`Exercise.sets`) will be reordered in place. The `dropSetId` property on individual sets will be updated when moving sets into/out of dropset ranges.
- **ExerciseGroup type**: No direct impact - group children are still `Exercise[]`, and each exercise's sets can be reordered independently.
- **Type narrowing considerations**: The new `useSetDragAndDrop` hook will operate on a single `Exercise` (already narrowed), not on `ExerciseItem[]`.
- **Utility function updates needed**: 
  - `updateExercisesDeep` - already supports updating individual exercises, will be used to persist set order changes.
  - No new utility functions required since we're operating on `Exercise.sets` directly.

---

## Proposed Changes (Step-by-Step)

### Step 1: Modify Exercise Drag Triggers (~30 lines changed)

**Files Modified:** `WorkoutTemplateIndex.tsx`

**Changes:**
1. In `renderDragItem`, move the `onLongPress={drag}` trigger from the outer `TouchableOpacity` to only wrap the exercise header section.
2. For the non-dragging full card view (lines 1887-1918), restrict the `onLongPress` to the header area only.
3. Ensure set rows do NOT propagate long-press to parent drag handler.

**Why:** Separates exercise-level drag (header only) from set-level drag (set row).

### Step 2: Create Set Drag Hook (~200 lines new)

**New File:** `src/components/WorkoutTemplate/hooks/useSetDragAndDrop.ts`

**Responsibilities:**
- `isSetDragging: boolean` - indicates active set drag
- `activeExerciseId: string | null` - which exercise has active set drag
- `setDragItems: Set[]` - local copy of sets during drag
- `handleSetDragEnd({ data, from, to })` - calculates new order, updates `dropSetId`
- `startSetDrag(exerciseId: string)` - initiates set drag, freezes rest of UI
- `endSetDrag()` - clears drag state

**DropSet Logic in `handleSetDragEnd`:**
```typescript
// After reorder:
// 1. Find the previous and next sets around the dropped position
// 2. If either neighbor has a dropSetId and it matches, inherit that ID
// 3. If moved outside any dropset range, clear the dropSetId
// 4. Recalculate visual indicators (isDropSetStart, isDropSetEnd)
```

### Step 3: Refactor SetRow Component (~50 lines changed)

**Files Modified:** `src/components/WorkoutTemplate/SetRow.tsx`

**Changes:**
1. Add new props:
   - `drag?: () => void` - drag trigger callback from DraggableFlatList
   - `isSetDragActive?: boolean` - whether set-level drag is active for this exercise
   - `isBeingDragged?: boolean` - whether THIS set is currently being dragged

2. Wrap the touchable area with long-press handler:
   ```tsx
   <TouchableOpacity
     onLongPress={drag}
     delayLongPress={200}
     disabled={!drag || isSelectionMode}
   >
     {/* existing SwipeToDelete content */}
   </TouchableOpacity>
   ```

3. Add visual feedback for active drag state:
   ```tsx
   style={[
     styles.rowWrapper,
     isBeingDragged && styles.rowWrapper__dragging
   ]}
   ```

4. New styles:
   ```tsx
   rowWrapper__dragging: {
     transform: [{ scale: 1.02 }],
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.15,
     shadowRadius: 4,
     elevation: 5,
     opacity: 0.95,
   }
   ```

### Step 4: Integration in WorkoutTemplateIndex (~150 lines changed)

**Files Modified:** `WorkoutTemplateIndex.tsx`

**Changes:**

1. Import and use the new hook:
   ```tsx
   const {
     isSetDragging,
     activeExerciseId,
     setDragItems,
     handleSetDragEnd,
     startSetDrag,
     endSetDrag
   } = useSetDragAndDrop(currentWorkout, handleWorkoutUpdate);
   ```

2. In `renderExerciseCard`, replace the `.map()` with a nested `DraggableFlatList`:
   ```tsx
   <DraggableFlatList
     data={isSetDragging && activeExerciseId === ex.instanceId 
       ? setDragItems 
       : ex.sets}
     keyExtractor={(set) => set.id}
     onDragBegin={() => startSetDrag(ex.instanceId)}
     onDragEnd={handleSetDragEnd}
     renderItem={({ item: set, drag, isActive }) => (
       <SetRow
         {...existingProps}
         drag={drag}
         isSetDragActive={isSetDragging && activeExerciseId === ex.instanceId}
         isBeingDragged={isActive}
       />
     )}
     containerStyle={{ minHeight: 50 }}
     scrollEnabled={false}
   />
   ```

3. Add dimming overlay when set drag is active:
   ```tsx
   {isSetDragging && (
     <View style={[
       styles.setDragDimmingOverlay,
       { 
         opacity: 0.5, 
         pointerEvents: 'none' 
       }
     ]} />
   )}
   ```

4. Conditionally apply dimming to exercises not being edited:
   ```tsx
   style={[
     styles.exerciseCard,
     isSetDragging && activeExerciseId !== ex.instanceId && {
       opacity: 0.5,
       pointerEvents: 'none'
     }
   ]}
   ```

5. Prevent exercise-level drag when set-level drag is active:
   ```tsx
   <TouchableOpacity
     onLongPress={isSetDragging ? undefined : initiateDelayedDrag}
     ...
   />
   ```

---

## Potential Risks or Edge Cases

### 1. Nested DraggableFlatList Conflicts
- **Risk:** Having a `DraggableFlatList` inside another `DraggableFlatList` may cause gesture conflicts.
- **Mitigation:** Disable exercise-level drag when set drag is active. Set `scrollEnabled={false}` on inner list.

### 2. DropSet Boundary Logic
- **Risk:** Complex edge cases when moving sets between/around dropsets.
- **Mitigation:** Clear and well-tested algorithm:
  1. If dropped between two sets with SAME dropSetId → inherit that ID
  2. If dropped at start/end of dropset range → consider position (include or exclude)
  3. If no neighbors have dropSetId → clear it

### 3. Performance with Many Sets
- **Risk:** Re-rendering all sets on every drag move.
- **Mitigation:** Use `React.memo` on `SetRow`, ensure stable callbacks with `useCallback`.

### 4. Gesture Handler Interference
- **Risk:** SwipeToDelete on SetRow may conflict with drag gesture.
- **Mitigation:** Disable swipe when set drag is active.

### 5. Selection Mode Conflicts
- **Risk:** Set selection mode (`isSelectionMode`) and set drag could conflict.
- **Mitigation:** Disable drag when in selection mode (already handled by `disabled={isSelectionMode}`).

### 6. Rest Timer Bar Rendering
- **Risk:** Rest timer bars between sets need to remain in correct positions during drag.
- **Mitigation:** Include rest timer as part of the draggable item or re-render after drag ends.

### 7. State Synchronization
- **Risk:** Local drag state getting out of sync with global workout state.
- **Mitigation:** Always persist to context via `handleWorkoutUpdate` in `handleSetDragEnd`.

---

## Implementation Order

1. **Step 2 first** - Create the `useSetDragAndDrop` hook (can be developed/tested independently)
2. **Step 1** - Modify exercise drag triggers (minimal change, low risk)
3. **Step 3** - Refactor SetRow (add props, can test in isolation)
4. **Step 4** - Integration (ties everything together)

---

## Final Implementation Summary

### Approach Taken: Modal-Based Set Reordering

Instead of nesting `DraggableFlatList` (which could cause conflicts), a **modal-based approach** was implemented:

1. User long-presses (150ms) on any set row
2. A modal opens showing all sets for that exercise in a `DraggableFlatList`
3. User reorders sets by dragging within the modal
4. Rest timer badges are shown alongside each set
5. DropSet indicators (left colored bar) are visible
6. On "Done" or drag end, sets are persisted with updated `dropSetId` values

### Files Created/Modified

| File | Status | Description |
|------|--------|-------------|
| `hooks/useSetDragAndDrop.ts` | ✅ Created | Hook managing set drag state and dropSetId logic |
| `modals/SetDragModal.tsx` | ✅ Created | Modal UI with DraggableFlatList for sets |
| `SetRow.tsx` | ✅ Modified | Added `Pressable` wrapper with `onLongPressRow` prop |
| `WorkoutTemplateIndex.tsx` | ✅ Modified | Integrated hook and modal, passed `onLongPressRow` to SetRow |

### Gesture Priority

- **Set long-press**: 150ms delay (inner, triggers first)
- **Exercise long-press**: 200ms delay (outer, triggers if set doesn't capture)

This ensures the set reorder modal opens when pressing on a set, while exercise drag still works when pressing on the exercise header.
