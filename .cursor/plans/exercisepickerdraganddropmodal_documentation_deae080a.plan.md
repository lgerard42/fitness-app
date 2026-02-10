---
name: ExercisePickerDragAndDropModal Documentation
overview: Create comprehensive documentation for ExercisePickerDragAndDropModal including technical explanation, plain English explanation, and visual diagrams covering component structure, event handling, rendering logic, indexing system, and drag-and-drop mechanics.
todos: []
isProject: false
---

# ExercisePickerDragAndDropModal Documentation Plan

## Overview

The `ExercisePickerDragAndDropModal` is a complex React Native modal component that allows users to reorder exercises, create exercise groups (Superset/HIIT), and manage sets through drag-and-drop interactions. This documentation will provide both technical and plain English explanations with visual diagrams.

## Files to Analyze

- `src/components/WorkoutTemplate/modals/ExercisePicker/ExercisePickerDragAndDropModal/indexExercisePickerDragAndDrop.tsx` (main component, ~3218 lines)
- `src/components/WorkoutTemplate/modals/ExercisePicker/ExercisePickerDragAndDropModal/exercisePickerDragAndDrop.tsx` (drag-and-drop helpers)
- `src/components/WorkoutTemplate/modals/ExercisePicker/HeaderTopRow.tsx` (parent component that opens the modal)

## Documentation Structure

### 1. Technical Explanation

#### Component Architecture

- **Props Interface**: `DragAndDropModalProps` defines all inputs
  - `visible`: Controls modal visibility
  - `selectedOrder`: Array of exercise IDs in current order
  - `exerciseGroups`: Array of group definitions (Superset/HIIT)
  - `groupedExercises`: Exercises that appear multiple times
  - `filtered`: Available exercise library items
  - `onReorder`: Callback when user saves changes
  - `exerciseSetGroups`, `itemIdToOrderIndices`, `itemSetGroupsMap`: Preserve set structure

#### State Management

- **Primary State**:
  - `reorderedItems`: Current drag-and-drop list state (DragItem[])
  - `collapsedGroupId`: Which group is collapsed during drag
  - `isSelectionMode`: Multi-select mode for grouping exercises
  - `selectedExercisesForGroup`: Set of selected exercise IDs
  - `showGroupTypeModal`, `showEditModal`: Modal visibility states
  - `dropsetExercises`: Set tracking which exercises have dropsets
- **Refs**:
  - `buttonRefsMap`: Stores button positions for dropdown positioning
  - `prevVisibleRef`: Tracks previous visibility for initialization
  - `pendingDragRef`: Stores drag function when group is collapsed

#### Event Listeners & Triggers

**Modal Lifecycle Events**:

- `visible` prop change → `useEffect` (lines 545-569) resets all state when modal opens
- `onClose` → Closes modal without saving
- `handleSave` → Processes changes and calls `onReorder`

**Drag and Drop Events**:

- `onLongPress` on exercise → Initiates drag (`drag()` function from DraggableFlatList)
- `onLongPress` on group header → `initiateGroupDrag()` collapses group and starts drag
- `onDragEnd` → `handleDragEnd()` processes final position and updates groups

**User Interaction Events**:

- Button clicks → Various handlers (increment/decrement sets, toggle dropset, etc.)
- Swipe gestures → `SwipeToDelete` component triggers delete
- Touch events → Selection mode, dropdown positioning

#### Rendering Logic

**Item Types** (from `exercisePickerDragAndDrop.tsx`):

1. **GroupHeaderItem**: Header for Superset/HIIT groups
2. **GroupFooterItem**: Footer for groups
3. **ExerciseItem**: Individual exercise card

**Render Flow** (`renderItem` callback, lines 1892-2193):

1. Check item type (GroupHeader, GroupFooter, or Item)
2. For GroupHeader: Render header with collapse/expand logic
3. For GroupFooter: Render footer (hidden if collapsed)
4. For Item: Check if in group or standalone
  - Group child: Render with group styling
  - Standalone: Render with swipe-to-delete wrapper

**Conditional Rendering Triggers**:

- `collapsedGroupId` → Hides items in collapsed group
- `isSelectionMode` → Shows selection UI
- `swipedItemId` → Shows trash icon
- `isActive` → Highlights item being dragged

#### Indexing System

**Order Indices** (`orderIndex`):

- Each exercise has an `orderIndex` representing its position in `selectedOrder`
- Used to determine group membership and exercise order
- Preserved through drag-and-drop operations

**Item ID System**:

- Format: `item-${exerciseId}-${orderIndex}` for new items
- Preserved item IDs from `itemIdToOrderIndices` map
- Maps item IDs to arrays of order indices (handles multiple sets)

**Group Indexing**:

- `exerciseIndices`: Array of order indices belonging to a group
- `startIndex`: First order index of a grouped exercise
- `orderIndices`: All order indices for a grouped exercise

**Set Group Indexing**:

- Each exercise can have multiple `setGroups` (e.g., 3x warmup, 5x working)
- `setGroup.id`: Unique identifier for each set group
- `setGroup.count`: Number of sets in that group
- Preserved through `itemSetGroupsMap` by item ID

#### Function Execution Flow

**Initialization** (`useMemo` for `dragItems`, lines 84-415):

1. Check if `itemIdToOrderIndices` exists (preserved structure)
2. If yes: Reconstruct items from saved structure
3. If no: Process `selectedOrder` and create items
4. Add GroupHeaders/Footers based on `exerciseGroups`
5. Calculate `isFirstInGroup`/`isLastInGroup` flags

**Drag Start** (`initiateGroupDrag`, line 1483):

1. User long-presses group header
2. Collapse dragged group (`collapseGroup`)
3. Collapse all other groups (`collapseAllOtherGroups`)
4. Store drag function in `pendingDragRef`
5. Set `collapsedGroupId` state

**Drag End** (`handleDragEnd`, line 1488):

1. Expand collapsed groups (`expandAllGroups`)
2. Process new positions
3. Update group membership (check for GroupHeader/Footer pairs)
4. Update `isFirstInGroup`/`isLastInGroup` flags
5. Clear `collapsedGroupId`

**Save Process** (`handleSave`, lines 1493-1582):

1. Expand all groups if collapsed
2. Build `newOrder` array by iterating items
3. For each Item: Add exercise ID `count` times (from setGroups)
4. Build `updatedGroups` with new `exerciseIndices`
5. Build `itemIdToOrderIndices` map (preserves separate cards)
6. Build `itemSetGroupsMap` (preserves set structure)
7. Call `onReorder` with all data

**Group Creation** (`createGroupWithExercises`, lines 453-539):

1. Calculate next group number
2. Create new `ExerciseGroup` object
3. Sort exercises by order index
4. Find item indices in `reorderedItems`
5. Create GroupHeader, Items (with updated flags), GroupFooter
6. Remove old items, insert new group structure

### 2. Plain English Explanation

**What It Does**:
Imagine you're organizing a workout plan. You have a list of exercises, and you want to:

- Rearrange them by dragging
- Group exercises together (like doing bicep curls and tricep extensions back-to-back - that's a "Superset")
- Set how many sets of each exercise you'll do
- Mark some sets as warmup or failure sets

**How It Works**:

**Opening the Modal**:

- When you click "Review" button, the modal opens
- It shows all your selected exercises in a list
- Each exercise shows how many sets you'll do

**Dragging Exercises**:

- Press and hold an exercise card to start dragging
- Move it up or down to reorder
- When you release, it snaps into the new position
- The app remembers the new order

**Creating Groups**:

- Click the three-dot menu on an exercise
- Choose "Superset" or "HIIT"
- Select other exercises to add to the group
- The exercises get a colored border showing they're grouped
- When you drag the group header, the whole group moves together

**Managing Sets**:

- Each exercise card shows "3 x Exercise Name" (3 sets)
- Use + and - buttons to change the number of sets
- Click the three-dot menu to:
  - Mark sets as warmup (orange flame icon)
  - Mark sets as failure (red icon)
  - Create dropsets (doing multiple sets with decreasing weight)
  - Edit sets in detail

**Saving Changes**:

- Click "Save" to apply all changes
- Click "Cancel" to discard changes
- Your workout plan updates with the new order and settings

**Behind the Scenes**:

- The app tracks each exercise's position using numbers (indices)
- When you drag, it updates these numbers
- Groups are like folders - exercises inside share the same group ID
- Sets are organized into "set groups" - like "3 warmup sets" and "5 working sets"
- Everything is preserved so you don't lose your settings

### 3. Visual Diagrams

**Component Structure Tree**:

```
ExercisePickerDragAndDropModal
├── Modal (visible prop)
│   ├── Header
│   │   ├── Cancel Button (onClose)
│   │   ├── Title "Reorder Items"
│   │   └── Save Button (handleSave)
│   ├── Selection Mode Banner (conditional)
│   │   ├── Selection Instructions
│   │   └── Cancel/Done Buttons
│   ├── Instructions Bar (conditional)
│   ├── DraggableFlatList
│   │   └── renderItem → DragItem
│   │       ├── GroupHeaderItem
│   │       │   ├── Group Type Button (toggleGroupType)
│   │       │   ├── Empty Placeholder (if no exercises)
│   │       │   └── Ghost Items (if collapsed)
│   │       ├── GroupFooterItem
│   │       └── ExerciseItem
│   │           ├── SwipeToDelete Wrapper
│   │           ├── Exercise Card
│   │           │   ├── Set Group Rows (multiple)
│   │           │   │   ├── Set Count Display
│   │           │   │   ├── Exercise Name
│   │           │   │   ├── +/- Buttons (handleIncrement/DecrementSetGroup)
│   │           │   │   └── Menu Button (setShowEditModal)
│   │           │   └── Selection Indicator (if selection mode)
│   │           └── TouchableOpacity (drag handler)
│   ├── Group Type Dropdown (showGroupTypeModal)
│   │   ├── Superset Option
│   │   └── HIIT Option
│   └── Edit Dropdown (showEditModal)
│       ├── Warmup Toggle
│       ├── Failure Toggle
│       ├── Dropset Toggle
│       ├── Edit Sets Button (handleEditSets → SetDragModal)
│       ├── Duplicate Exercise
│       └── Delete Row (if multiple set groups)
```

**Data Flow Diagram**:

```
Props Input
├── selectedOrder: string[]
├── exerciseGroups: ExerciseGroup[]
├── groupedExercises: GroupedExercise[]
└── itemIdToOrderIndices, itemSetGroupsMap (preserved structure)
    │
    ▼
useMemo: dragItems (lines 84-415)
├── Reconstruct from preserved structure OR
└── Build from selectedOrder
    │
    ▼
State: reorderedItems
├── User drags items → handleDragEnd
├── User creates group → createGroupWithExercises
├── User edits sets → handleEditSets → SetDragModal
└── User saves → handleSave
    │
    ▼
handleSave Processing
├── Expand all groups
├── Build newOrder array
├── Build updatedGroups
├── Build itemIdToOrderIndices map
└── Build itemSetGroupsMap
    │
    ▼
onReorder Callback
└── Updates parent component state
```

**Drag and Drop Process Flow**:

```
User Action: Long Press Exercise
    │
    ▼
DraggableFlatList.onDragStart
    │
    ▼
renderItem provides drag() function
    │
    ▼
User drags item
    │
    ▼
DraggableFlatList updates visual position
    │
    ▼
User releases (onDragEnd)
    │
    ▼
handleDragEnd (lines 1488-1491)
    ├── Expand collapsed groups
    ├── Process new positions
    ├── Update group membership
    │   ├── Check for GroupHeader before item
    │   ├── Check for GroupFooter after item
    │   └── Update groupId if between header/footer
    ├── Update isFirstInGroup/isLastInGroup
    └── setReorderedItems(updatedData)
```

**Group Drag Process Flow**:

```
User Action: Long Press Group Header
    │
    ▼
initiateGroupDrag (line 1483)
    │
    ▼
collapseGroup (dragged group)
    │
    ▼
collapseAllOtherGroups
    │
    ▼
setCollapsedGroupId(groupId)
    │
    ▼
Store drag() in pendingDragRef
    │
    ▼
useEffect (lines 652-662) detects collapsedGroupId
    │
    ▼
Execute pendingDragRef.current() after 50ms
    │
    ▼
DraggableFlatList drag starts
    │
    ▼
User drags collapsed group header
    │
    ▼
User releases (onDragEnd)
    │
    ▼
handleDragEnd expands groups
    │
    ▼
Process final positions
```

**Indexing System Diagram**:

```
selectedOrder: ["ex1", "ex2", "ex1", "ex3"]
index:          [  0,    1,    2,    3  ]

ExerciseGroup:
├── id: "group-1"
├── type: "Superset"
├── number: 1
└── exerciseIndices: [1, 2]  ← positions in selectedOrder

GroupedExercise:
├── id: "grouped-ex1"
├── exercise: ExerciseLibraryItem (ex1)
├── count: 2  ← appears twice
├── startIndex: 0  ← first occurrence
└── orderIndices: [0, 2]  ← all positions

ExerciseItem:
├── id: "item-ex1-0"  ← unique per card
├── exercise: ExerciseLibraryItem (ex1)
├── orderIndex: 0  ← position in selectedOrder
├── count: 5  ← total sets
├── setGroups: [
│     { id: "sg1", count: 3, isWarmup: true },
│     { id: "sg2", count: 2, isWarmup: false }
│   ]
└── groupId: null  ← not in group

itemIdToOrderIndices:
{
  "item-ex1-0": [0],      ← this card occupies position 0
  "item-ex2-1": [1],      ← this card occupies position 1
  "item-ex1-2": [2]       ← this card occupies position 2
}

itemSetGroupsMap:
{
  "item-ex1-0": [{ id: "sg1", count: 3 }, { id: "sg2", count: 2 }],
  "item-ex2-1": [{ id: "sg3", count: 5 }],
  "item-ex1-2": [{ id: "sg4", count: 4 }]
}
```

**Rendering Decision Tree**:

```
renderItem called
    │
    ▼
Check item.type
    │
    ├── "GroupHeader"
    │   ├── Check if collapsed (collapsedGroupId === groupId)
    │   ├── If collapsed: Render header + ghost items
    │   ├── If empty: Render placeholder
    │   └── If normal: Render header only
    │
    ├── "GroupFooter"
    │   ├── Check if collapsed
    │   ├── If collapsed: Return hidden view
    │   └── If visible: Render footer
    │
    └── "Item"
        ├── Check if collapsed (collapsedGroupId === groupId)
        ├── If collapsed: Return hidden view
        ├── Check if in group (getItemGroupContext)
        │   ├── If in group: Render with group styling
        │   └── If standalone: Render with SwipeToDelete
        ├── Check selection mode
        │   ├── If active: Show selection UI
        │   └── If inactive: Show normal controls
        └── Render set group rows (map over setGroups)
```

## Implementation Notes

- Use mermaid diagrams for process flows and decision trees
- Include code references with line numbers for key functions
- Explain the dual indexing system (orderIndex vs item ID)
- Clarify the difference between exercise ID and item ID
- Document the set group preservation system
- Explain group collapse/expand mechanics
- Detail the selection mode workflow

