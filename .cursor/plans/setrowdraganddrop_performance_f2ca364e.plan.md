---
name: SetRowDragAndDrop Performance
overview: Eliminate O(n^2) render costs, cascading re-renders, and per-keystroke full-list invalidation in the SetRowDragAndDropModal by pre-computing display data, memoizing row components, and stabilizing callback references.
todos:
  - id: precompute-indices
    content: Pre-compute display indices in useMemo (O(n) single pass) and pass via Map instead of O(n) computation per row
    status: completed
  - id: extract-memo-row
    content: Extract SetRowItem as React.memo component with primitive/stable props
    status: completed
  - id: stable-callbacks
    content: Stabilize all handler callbacks with useRef pattern to prevent renderDragItem invalidation
    status: completed
  - id: timer-preview-prop
    content: Pre-compute timer preview value and pass as prop so only 1 row updates per keystroke
    status: completed
  - id: memo-swipe-delete
    content: Wrap SwipeToDelete in React.memo
    status: completed
  - id: stabilize-flatlist-props
    content: Memoize onDragBegin, onDragEnd, ListFooterComponent in parent
    status: completed
  - id: memo-timer-keyboard-props
    content: Memoize currentWorkout object passed to TimerKeyboard with useMemo
    status: completed
  - id: add-virtualization
    content: Add initialNumToRender, maxToRenderPerBatch, windowSize to DraggableFlatList
    status: completed
isProject: false
---

# SetRowDragAndDrop Performance Optimization

Running as Claude claude-4.6-opus-high-thinking.

## 1. Current State Analysis

### Files involved

- `[SetRowDragAndDrop.tsx](src/components/WorkoutTemplate/modals/SetRowDragAndDropModal/SetRowDragAndDrop.tsx)` -- the `useSetRowDragAndDrop` hook with `renderDragItem`, helper functions
- `[indexSetRowDragAndDrop.tsx](src/components/WorkoutTemplate/modals/SetRowDragAndDropModal/indexSetRowDragAndDrop.tsx)` -- the `SetDragModal` component, parent state, DraggableFlatList mount
- `[SwipeToDelete.tsx](src/components/common/SwipeToDelete.tsx)` -- swipe-to-delete wrapper (not memoized)

### Architecture

The `SetDragModal` parent owns ~15 state variables. It passes them all into `useSetRowDragAndDrop`, which returns a `renderDragItem` callback. That callback is given to `DraggableFlatList`. Every state change invalidates `renderDragItem` and causes every visible row to re-render.

---

## 2. Root Causes (ordered by severity)

### P0: `renderDragItem` has 30+ dependencies -- any state change re-renders ALL rows

```
617:617:src/.../SetRowDragAndDrop.tsx
}, [exercise, localDragItems, renderDropSetHeader, renderDropSetFooter,
    addTimerMode, restTimerInputOpen, restTimerSelectedSetIds,
    restTimerInputString, warmupMode, warmupSelectedSetIds, failureMode,
    failureSelectedSetIds, dropsetMode, dropsetSelectedSetIds,
    collapsedDropsetId, swipedItemId, handleDeleteSet, closeTrashIcon,
    isDragging, badgeRefs, modalContainerRef, setSwipedItemId,
    setRestTimerSelectedSetIds, setWarmupSelectedSetIds, ...]);
```

Notably `restTimerInputString` changes on **every keystroke** of the timer keyboard, invalidating the render callback and forcing every row to re-render just to show a preview on one row.

### P1: O(n^2) display index computation inside each row render

Inside `renderDragItem` (lines 242-311), each row:

- Linearly scans `localDragItems` to count preceding sets
- Calls `localDragItems.filter(isSetDragItem)` to get all sets
- Loops through all preceding sets for group number calculation

With N items, each render does O(N) work, and all N rows re-render = O(N^2) total.

### P2: `SwipeToDelete` is not wrapped in `React.memo`

Every row wraps content in `SwipeToDelete`. Since it's not memoized, it re-renders whenever the parent does -- and internally recreates `Gesture.Pan()` on every render.

### P3: Inline functions on DraggableFlatList in parent

```
onDragBegin={() => setIsDragging(true)}  // new function every render
onDragEnd={(params) => { ... }}           // new function every render
ListFooterComponent={<TouchableOpacity .../>}  // new JSX every render
```

### P4: `currentWorkout` object literal for TimerKeyboard rebuilt every render

Lines 799-833 in `indexSetRowDragAndDrop.tsx` create a new object literal with an IIFE that iterates all `localDragItems` -- on every render, even when the keyboard isn't visible. `TimerKeyboard` itself is not `React.memo`'d either.

### P5: No virtualization props on DraggableFlatList

No `windowSize`, `maxToRenderPerBatch`, `initialNumToRender`, or `removeClippedSubviews`.

---

## 3. Proposed Changes (Step-by-Step)

### Step 1: Pre-compute display indices with `useMemo`

**File:** `SetRowDragAndDrop.tsx`

Move the display index calculation out of `renderDragItem` into a `useMemo` at the top of the hook. Compute a `Map<string, { displayIndexText: string; isSubIndex: boolean }>` keyed by set ID. This runs once per `localDragItems` change (O(n)) instead of once per row render (O(n) x n rows = O(n^2)).

```typescript
const displayIndexMap = useMemo(() => {
    const map = new Map<string, { displayIndexText: string; isSubIndex: boolean }>();
    const allSets = localDragItems.filter(isSetDragItem);
    // Single O(n) pass to compute all indices...
    return map;
}, [localDragItems]);
```

Then inside `renderDragItem`, replace the 70-line index computation block with:

```typescript
const indexInfo = displayIndexMap.get(set.id) ?? { displayIndexText: '?', isSubIndex: false };
```

### Step 2: Extract row into a memoized component

**File:** `SetRowDragAndDrop.tsx`

Create a `React.memo`'d `SetRowItem` component that accepts only the data it needs as primitive/stable props. This way, when `renderDragItem`'s reference changes, unchanged rows skip re-rendering because their props haven't changed.

Key props to extract:

- `set: Set` (the workout set data)
- `displayIndexText: string`, `isSubIndex: boolean` (from pre-computed map)
- `isActive: boolean`, `isSelected: boolean`, `selectionMode: string | null`
- `showTrash: boolean`, `isUngroupedSet: boolean`
- Stable callback refs via `useRef` for handlers

The `React.memo` comparator compares these simple values. Changes like a keystroke in `restTimerInputString` only affect the one row that shows the preview.

### Step 3: Stabilize callbacks with `useRef` pattern

**File:** `SetRowDragAndDrop.tsx`

For handler functions passed into the memoized row component, use the "ref-stable callback" pattern:

```typescript
const handleDeleteSetRef = useRef(handleDeleteSet);
handleDeleteSetRef.current = handleDeleteSet;
const stableHandleDeleteSet = useCallback((setId: string) => {
    handleDeleteSetRef.current(setId);
}, []);
```

This ensures the callback reference never changes while always calling the latest implementation. Apply to: `handleDeleteSet`, `closeTrashIcon`, `onUpdateSet`, `handleUngroupDropset`, `handleEnterDropsetMode`, `setSwipedItemId`, selection toggle handlers.

### Step 4: Move timer preview data into row props

**File:** `SetRowDragAndDrop.tsx`

Instead of passing `restTimerInputString` and `parseRestTimeInput` into every row, pre-compute the preview value for the one set that needs it:

```typescript
const timerPreview = useMemo(() => {
    if (!restTimerInputString || !restTimerInputOpen) return null;
    const seconds = parseRestTimeInput(restTimerInputString);
    return seconds > 0 ? { seconds, formatted: formatRestTime(seconds) } : null;
}, [restTimerInputString, restTimerInputOpen, parseRestTimeInput, formatRestTime]);
```

Pass `timerPreview` as a prop to the row. Only the row where the preview applies will see a prop change. Other rows see the same `null` and skip re-rendering.

### Step 5: Wrap `SwipeToDelete` in `React.memo`

**File:** `SwipeToDelete.tsx`

Add `React.memo` wrapper:

```typescript
export default React.memo(SwipeToDelete);
```

Also memoize `Dimensions.get('window').width` outside the component or with `useMemo` since it doesn't change per render.

### Step 6: Stabilize DraggableFlatList props in parent

**File:** `indexSetRowDragAndDrop.tsx`

```typescript
const handleDragBegin = useCallback(() => setIsDragging(true), []);
const handleDragEndWrapper = useCallback((params) => {
    setIsDragging(false);
    handleLocalDragEnd(params);
}, [handleLocalDragEnd]);

const listFooter = useMemo(() => (
    restTimerInput && !addTimerMode ? null : (
        <TouchableOpacity onPress={onAddSet} style={styles.addSetButton}>
            <Plus size={18} color={COLORS.blue[600]} />
            <Text style={styles.addSetButtonText}>Add set</Text>
        </TouchableOpacity>
    )
), [restTimerInput, addTimerMode, onAddSet]);
```

### Step 7: Memoize TimerKeyboard props

**File:** `indexSetRowDragAndDrop.tsx`

Wrap the `currentWorkout` object computation in `useMemo`:

```typescript
const timerKeyboardWorkout = useMemo(() => {
    if (!exercise || !restTimerInput) return null;
    // ... build the workout object
}, [exercise, localDragItems, restTimerInput, restTimerInputString]);
```

Only compute when the keyboard is actually visible. Short-circuit with `if (!restTimerInput) return null`.

### Step 8: Add virtualization props

**File:** `indexSetRowDragAndDrop.tsx`

```typescript
<DraggableFlatList
    ...
    initialNumToRender={10}
    maxToRenderPerBatch={5}
    windowSize={5}
    removeClippedSubviews={false}  // keep false for drag-and-drop compatibility
/>
```

---

## 4. Potential Risks and Edge Cases

- `**React.memo` on `SetRowItem**`: Must ensure the comparator correctly detects when a row *should* re-render (e.g., when selection state changes for that specific row). Using primitive props (booleans, strings) instead of objects/Sets makes this safe with default shallow comparison.
- **Ref-stable callbacks**: The pattern is standard but must ensure refs are updated synchronously before renders that use them. Assigning `ref.current = fn` in the component body (not in useEffect) guarantees this.
- `**SwipeToDelete` memo**: Since it receives `children` (ReactNode), the memo won't help unless the children are also stable. The memoized `SetRowItem` makes the children stable.
- **DraggableFlatList internals**: Some versions of `react-native-draggable-flatlist` have issues with memoized render items. Test that drag interactions still work correctly after memoization.
- **Timer keyboard preview**: The preview must still update in real-time for the targeted set. The `timerPreview` prop approach ensures only that one row updates.

---

## 5. Thinking Block: ExerciseItem Discriminated Union Analysis

This refactor does not change any data structures, type definitions, or data flow between components. It only optimizes rendering performance within the `SetRowDragAndDropModal`. The `ExerciseItem` union (`Exercise | ExerciseGroup`) is not affected -- no changes to type guards, utility functions, or type narrowing logic.

---

## 6. Expected Impact

- **Keystroke in timer keyboard**: Currently re-renders ALL rows. After: re-renders 1 row (the previewed one).
- **Selection toggle**: Currently re-renders ALL rows. After: re-renders 1 row (the toggled one).
- **Display index computation**: Currently O(n^2). After: O(n) via single-pass `useMemo`.
- **Swipe gesture setup**: Currently recreated for all rows on any state change. After: only recreated when the specific row's props change.

