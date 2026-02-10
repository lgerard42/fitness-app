---
name: SetRowDragAndDropModal Documentation
overview: Create comprehensive documentation explaining how SetRowDragAndDropModal works, including technical details, plain English explanation, and visual diagrams showing component structure, data flow, rendering logic, event handling, and indexing system.
todos: []
isProject: false
---

# SetRowDragAndDropModal Documentation Plan

## Overview

The `SetRowDragAndDropModal` component (`indexSetRowDragAndDrop.tsx`) is a React Native modal that allows users to reorder workout sets within an exercise using drag-and-drop. It handles complex scenarios including dropsets (grouped sets), rest timers, and set metadata (warmup/failure flags).

## Technical Documentation

### Component Architecture

**Main File**: `src/components/WorkoutTemplate/modals/SetRowDragAndDropModal/indexSetRowDragAndDrop.tsx`

**Supporting Files**:

- `SetRowDragAndDrop.tsx` - Rendering logic and drag handlers
- `hooks/useSetDragAndDrop.ts` - Parent hook managing state
- Uses `react-native-draggable-flatlist` for drag functionality

### Key Props Interface

```typescript
interface SetDragModalProps {
    visible: boolean;                    // Modal visibility
    exercise: Exercise | null;          // Current exercise being edited
    setDragItems: SetDragListItem[];    // Array of sets + headers/footers
    onDragEnd: (params) => void;        // Called when drag completes
    onCancel: () => void;               // Cancel button handler
    onSave: () => void;                 // Save button handler
    onCreateDropset: (setId) => void;   // Create dropset group
    onUpdateSet: (setId, updates) => void; // Update set properties
    onAddSet: () => void;               // Add new set
    onUpdateRestTimer: (setId, seconds) => void; // Single set timer
    onUpdateRestTimerMultiple: (setIds[], seconds) => void; // Multiple sets
}
```

### Data Structure

**SetDragListItem Types**:

1. **SetDragItem** (`type: 'set'`): Individual set with metadata
  - Contains: `id`, `set` object, `hasRestTimer` flag
2. **DropSetHeaderItem** (`type: 'dropset_header'`): Marks start of dropset group
  - Contains: `dropSetId`, `setCount`
3. **DropSetFooterItem** (`type: 'dropset_footer'`): Marks end of dropset group
  - Contains: `dropSetId`

**Extended Types** (for collapse functionality):

- `CollapsibleSetDragListItem` - Adds `isCollapsed` flag to all types

### State Management

**Local State Variables**:

- `indexPopup` - Position and setId for context menu popup
- `restTimerInput` - Active rest timer input state
- `restTimerInputString` - Raw timer input string
- `addTimerMode` - Boolean for multi-set timer selection mode
- `restTimerSelectedSetIds` - Set of selected set IDs for bulk timer update
- `isDragging` - Whether drag operation is active
- `collapsedDropsetId` - ID of dropset currently collapsed for dragging
- `localDragItems` - Local copy of drag items (synced with parent)
- `swipedItemId` - ID of set showing delete swipe action
- `pendingDragRef` - Ref storing pending drag function after collapse
- `badgeRefs` - Map of set ID to View refs for popup positioning
- `modalContainerRef` - Ref to modal container for coordinate calculations

### Event Listeners & Triggers

**1. Modal Lifecycle**:

- `visible` prop change → Component mounts/unmounts
- `useEffect` on `visible` → Resets `swipedItemId` when modal closes

**2. Data Synchronization**:

- `useEffect` watching `setDragItems` and `collapsedDropsetId`
  - When `collapsedDropsetId` is null, syncs `localDragItems` with `setDragItems`
  - Prevents sync during dropset drag operations

**3. Drag Operations**:

- `DraggableFlatList.onDragBegin` → Sets `isDragging = true`
- `DraggableFlatList.onDragEnd` → Calls `handleLocalDragEnd`
  - Sets `isDragging = false`
  - Processes reordered data
  - Reconstructs dropset headers/footers
  - Updates parent via `onDragEnd`

**4. Dropset Drag Initiation**:

- Long press on dropset header → `initiateDropsetDrag`
  - Collapses target dropset
  - Collapses all other dropsets
  - Stores drag function in `pendingDragRef`
  - Sets `collapsedDropsetId`
- `useEffect` watching `collapsedDropsetId` → Executes pending drag after 50ms delay

**5. Set Interactions**:

- Long press on set → Starts drag (`DraggableFlatList` handles)
- Press on set index badge → Opens context popup
  - Measures badge position using `badgeRefs` and `modalContainerRef`
  - Calculates relative position
  - Sets `indexPopup` state
- Swipe left on set → Shows delete button (`SwipeToDelete` component)
  - Sets `swipedItemId`
- Press rest timer badge → Opens timer input
  - Sets `restTimerInput` and `restTimerInputString`

**6. Timer Keyboard**:

- `TimerKeyboard` component handles input
- `onAddRestPeriod` → Saves single set timer
- `onSetSelectionMode(true)` → Enters `addTimerMode`
  - Closes keyboard
  - Pre-selects current set
  - Allows multi-set selection

**7. Context Menu Actions**:

- Warmup/Failure toggle → Calls `onUpdateSet`
- Create dropset → Calls `onCreateDropset`
- Ungroup dropset → Calls `handleUngroupDropset`
- Delete set → Calls `handleDeleteSet`

### Rendering Logic

**Component Tree**:

```
Modal
├── GestureHandlerRootView (gesture support)
│   ├── Overlay (backdrop)
│   │   ├── ModalContainer
│   │   │   ├── Header (title, close button)
│   │   │   ├── Instructions
│   │   │   ├── DraggableFlatList
│   │   │   │   ├── renderDragItem (for each item)
│   │   │   │   │   ├── DropsetHeader (if type='dropset_header')
│   │   │   │   │   │   └── GhostItems (if collapsed)
│   │   │   │   │   ├── DropsetFooter (if type='dropset_footer')
│   │   │   │   │   └── SetRow (if type='set')
│   │   │   │   │       ├── SwipeToDelete wrapper
│   │   │   │   │       ├── IndexBadge (with ref)
│   │   │   │   │       ├── SetInfo (weight/reps)
│   │   │   │   │       ├── Indicators (warmup/failure/completed)
│   │   │   │   │       └── RestTimerBadge
│   │   │   │   └── ListFooterComponent (Add Set button)
│   │   │   ├── IndexPopup (conditional)
│   │   │   ├── RestTimerInputPopup (conditional)
│   │   │   └── Footer (Done/Cancel buttons)
│   │   └── TimerKeyboard (outside container, highest z-index)
```

**Render Conditions**:

- Modal only renders if `visible && exercise` are truthy
- Empty state shown if `localDragItems.length === 0`
- Index popup renders if `indexPopup !== null`
- Rest timer popup renders if `restTimerInput !== null`
- Timer keyboard renders if `restTimerInput && !addTimerMode`

**Item Rendering** (`renderDragItem`):

1. **Dropset Header**:
  - Always visible
  - Shows "Dropset (N sets)" text
  - Long press enabled for drag
  - If collapsed: shows ghost items preview
  - If actively dragging: highlighted border
2. **Dropset Footer**:
  - Hidden if collapsed (shown in header ghost)
  - Visual separator line
3. **Set Row**:
  - Hidden if collapsed (part of dropset being dragged)
  - Shows index badge, set info, indicators
  - Swipe-to-delete enabled
  - Long press for drag
  - In `addTimerMode`: shows checkbox instead of indicators

### Indexing System

**Display Index Calculation** (`SetRowDragAndDrop.tsx` lines 192-262):

**For Sets in Dropsets**:

1. Find position in full array (including headers/footers)
2. Count sets before this position
3. Calculate group number by iterating previous sets:
  - Count dropsets as single units (first set only)
  - Count standalone sets individually
4. Find index within dropset (1-based)
5. Display:
  - First set in dropset: `groupNumber` (e.g., "3")
  - Subsequent sets: `.indexInDropSet` (e.g., ".2", ".3")

**For Standalone Sets**:

1. Count all sets before this one
2. Treat dropsets as single units
3. Display: `overallSetNumber` (e.g., "5")

**Index Badge Styling**:

- Normal: Gray background, dark text
- Warmup: Orange background/text
- Failure: Red background/text
- Sub-index: Smaller font, lighter color

### Drag End Processing

**Individual Set Drag** (`createHandleLocalDragEnd` lines 622-700):

1. Extract sets from reordered data (filter headers/footers)
2. For each set, determine dropset membership:
  - Find position in full array
  - Look backwards for nearest header
  - Look forwards for nearest footer
  - If header and footer match: set belongs to that dropset
  - Otherwise: standalone set
3. Reconstruct items with headers/footers
4. Update local state
5. Call parent `onDragEnd`

**Dropset Group Drag** (lines 554-619):

1. Collect all sets in dragged dropset
2. Find dropset footer
3. Keep header in new position
4. Remove sets and footer from array
5. Re-insert sets after header, footer after sets
6. Expand all collapsed items
7. Preserve original `dropSetId` (no recalculation)
8. Reconstruct and update

### Dropset Collapse/Expand

**Collapse Process**:

- `collapseDropset`: Marks sets, header, footer as `isCollapsed: true`
- `collapseAllOtherDropsets`: Collapses all dropsets except dragged one
- Sets render as `<View style={hiddenItem} />` (height: 0)
- Header shows ghost preview of collapsed sets

**Expand Process**:

- `expandAllDropsets`: Removes `isCollapsed` flags
- Sets render normally again
- Ghost previews disappear

### Key Functions Flow

**handleDeleteSet** (lines 96-134):

1. Extract all sets from `localDragItems`
2. Filter out deleted set
3. Reconstruct items (headers/footers)
4. Update local state
5. Call `onDragEnd` to sync parent
6. Close popups/swipe if needed

**handleUngroupDropset** (lines 178-213):

1. Extract all sets
2. Remove `dropSetId` from sets in dropset
3. Reconstruct items (no more header/footer for this group)
4. Update local and parent state

**initiateDropsetDrag** (lines 142-150):

1. Collapse target dropset
2. Collapse all other dropsets
3. Update local state
4. Store drag function in ref
5. Set `collapsedDropsetId`
6. Pending drag executes after collapse animation

## Plain English Explanation

### What This Component Does

Imagine you're organizing a stack of workout cards. Each card represents one set (like "100 lbs × 10 reps"). The SetRowDragAndDropModal is like a special table where you can:

1. **See all your sets** for one exercise in a list
2. **Drag and drop** to reorder them
3. **Group sets together** (called "dropsets") - like putting cards in a folder
4. **Edit set properties** - mark as warmup, mark as failure, add rest timers
5. **Delete sets** by swiping

### How It Works (Step by Step)

**Opening the Modal**:

- Someone clicks a button to reorder sets
- The modal appears as an overlay on your screen
- It shows all sets for that exercise in a scrollable list

**The List Structure**:

- Each set appears as a row with a number badge on the left
- Some sets might be grouped together (dropsets) - these have a header saying "Dropset (3 sets)"
- The header acts like a folder label - you can drag the whole folder at once

**Dragging Individual Sets**:

1. You press and hold on a set row
2. The set highlights and you can move it up or down
3. When you release, the set drops in its new position
4. The app automatically updates all the set numbers
5. If you drag a set between a dropset header and footer, it joins that group

**Dragging a Whole Dropset**:

1. You press and hold on the dropset header (the folder label)
2. The dropset collapses - you see a preview showing the sets inside
3. All other dropsets also collapse so you can see where you're moving it
4. You drag the collapsed header to a new position
5. When you release, the dropset expands again in its new location

**Set Numbering**:

- Sets are numbered 1, 2, 3, etc.
- If sets are in a dropset group:
  - The first set shows the group number (e.g., "3")
  - Other sets in the group show sub-numbers (e.g., ".2", ".3")
- The app counts dropsets as single units when numbering

**Editing Sets**:

- Tap the number badge → Menu appears with options:
  - Toggle warmup (orange flame icon)
  - Toggle failure (red lightning icon)
  - Create dropset (group this set with others)
  - Delete set
- Tap the rest timer badge → Keyboard appears to set rest time
- Swipe left on a set → Delete button appears

**Adding Rest Timers**:

- Tap "+ rest" on a set → Timer keyboard appears
- Type time (like "1:30" for 1 minute 30 seconds)
- Press "Save" → Timer is added
- You can also select multiple sets and add the same timer to all

**Saving Changes**:

- Press "Done" → All changes are saved and modal closes
- Press "Cancel" or X → Changes are discarded, modal closes

### Visual Flow Example

**Before Drag**:

```
Set 1: 100 lbs × 10
Set 2: 100 lbs × 10
[Dropset Header: 3 sets]
Set 3: 90 lbs × 10
Set 4: 80 lbs × 10
Set 5: 70 lbs × 10
[Dropset Footer]
Set 6: 100 lbs × 8
```

**During Dropset Drag** (collapsed):

```
Set 1: 100 lbs × 10
Set 2: 100 lbs × 10
[Dropset Header: 3 sets] ← You're dragging this
  Preview: 90×10, 80×10, 70×10
Set 6: 100 lbs × 8
```

**After Drag**:

```
Set 1: 100 lbs × 10
[Dropset Header: 3 sets]
Set 2: 90 lbs × 10
Set 3: 80 lbs × 10
Set 4: 70 lbs × 10
[Dropset Footer]
Set 5: 100 lbs × 10
Set 6: 100 lbs × 8
```

Notice: Set numbers automatically updated, and Set 2-4 are now in the dropset.

## Diagrams

### Component Structure Tree

```
SetRowDragAndDropModal
│
├── Modal (React Native)
│   │
│   ├── GestureHandlerRootView
│   │   │
│   │   ├── Overlay (backdrop)
│   │   │   │
│   │   │   ├── ModalContainer
│   │   │   │   │
│   │   │   │   ├── Header
│   │   │   │   │   ├── Title: "Reorder Sets"
│   │   │   │   │   ├── Subtitle: Exercise name
│   │   │   │   │   └── Close Button (X)
│   │   │   │   │
│   │   │   │   ├── Instructions Text
│   │   │   │   │
│   │   │   │   ├── DraggableFlatList
│   │   │   │   │   │
│   │   │   │   │   ├── Item: DropsetHeader
│   │   │   │   │   │   ├── Text: "Dropset (N sets)"
│   │   │   │   │   │   ├── Grip Icon
│   │   │   │   │   │   └── Ghost Items (if collapsed)
│   │   │   │   │   │
│   │   │   │   │   ├── Item: SetRow
│   │   │   │   │   │   ├── SwipeToDelete Wrapper
│   │   │   │   │   │   │   └── TouchableOpacity
│   │   │   │   │   │   │       ├── IndexBadge (ref)
│   │   │   │   │   │   │       ├── SetInfo (weight/reps)
│   │   │   │   │   │   │       ├── Indicators (warmup/failure)
│   │   │   │   │   │   │       └── RestTimerBadge
│   │   │   │   │   │
│   │   │   │   │   └── Item: DropsetFooter
│   │   │   │   │
│   │   │   │   │   └── Footer: Add Set Button
│   │   │   │   │
│   │   │   │   ├── IndexPopup (conditional)
│   │   │   │   │   ├── Warmup/Failure Toggle
│   │   │   │   │   ├── Create/Ungroup Dropset
│   │   │   │   │   └── Delete Set
│   │   │   │   │
│   │   │   │   ├── RestTimerInputPopup (conditional)
│   │   │   │   │   └── Timer Display
│   │   │   │   │
│   │   │   │   └── Footer Buttons
│   │   │   │       ├── Done (or)
│   │   │   │       └── Cancel/Save (in timer mode)
│   │   │   │
│   │   └── TimerKeyboard (outside container)
│   │       └── Number pad + Time display
```

### Data Flow Diagram

```
Parent Component
    │
    │ (calls startSetDrag)
    ▼
useSetDragAndDrop Hook
    │
    │ (transforms sets → SetDragListItem[])
    ▼
SetRowDragAndDropModal
    │
    │ (receives setDragItems prop)
    ├──► Local State Sync
    │    └──► localDragItems
    │
    ├──► User Interactions
    │    ├──► Drag → handleLocalDragEnd
    │    ├──► Delete → handleDeleteSet
    │    ├──► Edit → onUpdateSet
    │    └──► Timer → onUpdateRestTimer
    │
    └──► State Updates
         │
         ├──► Local Updates (localDragItems)
         │
         └──► Parent Updates (onDragEnd callback)
              │
              ▼
         useSetDragAndDrop
              │
              ▼
         Parent Component (workout state)
```

### Drag Operation Flow

```
User Long Presses Item
    │
    ▼
DraggableFlatList.onDragBegin
    │
    ├──► setIsDragging(true)
    │
    └──► If Dropset Header:
         │
         └──► initiateDropsetDrag
              │
              ├──► collapseDropset(target)
              ├──► collapseAllOtherDropsets
              ├──► setCollapsedDropsetId
              └──► Store drag() in pendingDragRef
                   │
                   ▼
              useEffect (50ms delay)
                   │
                   └──► Execute pendingDragRef.current()
                        │
                        ▼
                   DraggableFlatList starts drag
    │
    ▼
User Drags Item
    │
    ▼
DraggableFlatList handles visual feedback
    │
    ▼
User Releases Item
    │
    ▼
DraggableFlatList.onDragEnd
    │
    ├──► setIsDragging(false)
    │
    └──► handleLocalDragEnd(data, from, to)
         │
         ├──► If dropset drag:
         │    │
         │    ├──► Extract dropset sets
         │    ├──► Reconstruct around header
         │    ├──► expandAllDropsets
         │    └──► Preserve dropSetId
         │
         └──► If individual set drag:
              │
              ├──► Extract sets (filter headers/footers)
              ├──► Determine dropset membership
              │    ├──► Look backwards for header
              │    ├──► Look forwards for footer
              │    └──► Assign dropSetId if between matching pair
              │
              └──► Reconstruct items
                   │
                   ├──► reconstructItemsFromSets
                   │    ├──► Add headers at dropset starts
                   │    ├──► Add sets
                   │    └──► Add footers at dropset ends
                   │
                   └──► Update state
                        │
                        ├──► setLocalDragItems
                        └──► onDragEnd (parent callback)
```

### Index Calculation Process

```
Set Row Render
    │
    ▼
Get Full Array Index (including headers/footers)
    │
    ▼
Count Sets Before This Position
    │
    ▼
Check if Set Has dropSetId
    │
    ├──► YES (In Dropset)
    │    │
    │    ├──► Find All Sets in Same Dropset
    │    ├──► Calculate Index in Dropset (1-based)
    │    │
    │    ├──► Calculate Group Number
    │    │    ├──► Iterate Previous Sets
    │    │    ├──► Count Dropsets as Single Units
    │    │    └──► Count Standalone Sets
    │    │
    │    └──► Display:
    │         ├──► If First in Dropset: groupNumber ("3")
    │         └──► If Subsequent: ".indexInDropSet" (".2")
    │
    └──► NO (Standalone)
         │
         ├──► Calculate Overall Set Number
         │    ├──► Iterate Previous Sets
         │    ├──► Count Dropsets as Single Units
         │    └──► Count Standalone Sets
         │
         └──► Display: overallSetNumber ("5")
```

### State Transition Diagram

```
Initial State
    │
    ├──► visible = false → Component Hidden
    │
    └──► visible = true → Component Renders
         │
         ├──► Sync setDragItems → localDragItems
         │
         ├──► User Interactions
         │    │
         │    ├──► Long Press Set
         │    │    └──► isDragging = true
         │    │
         │    ├──► Long Press Dropset Header
         │    │    ├──► collapsedDropsetId = dropsetId
         │    │    ├──► Collapse dropsets
         │    │    └──► pendingDragRef = drag function
         │    │
         │    ├──► Tap Index Badge
         │    │    └──► indexPopup = {setId, top, left}
         │    │
         │    ├──► Tap Rest Timer
         │    │    └──► restTimerInput = {setId, currentValue}
         │    │
         │    └──► Swipe Set
         │         └──► swipedItemId = setId
         │
         ├──► Drag End
         │    │
         │    ├──► Process Reorder
         │    ├──► Reconstruct Headers/Footers
         │    ├──► Update localDragItems
         │    ├──► Call onDragEnd (parent)
         │    └──► isDragging = false
         │
         └──► Save/Cancel
              │
              ├──► onSave → Parent saves, closes modal
              └──► onCancel → Parent discards, closes modal
```

### Dropset Collapse/Expand Flow

```
Normal State (All Expanded)
    │
    ├──► Dropset Header Visible
    ├──► All Sets in Dropset Visible
    └──► Dropset Footer Visible
    │
    ▼
User Long Presses Header
    │
    ▼
initiateDropsetDrag Called
    │
    ├──► collapseDropset(target)
    │    └──► Mark items as isCollapsed: true
    │
    ├──► collapseAllOtherDropsets
    │    └──► Mark other dropsets as isCollapsed: true
    │
    └──► setCollapsedDropsetId = targetId
         │
         ▼
    Render Update
         │
         ├──► Target Header: Shows Ghost Preview
         ├──► Target Sets: Hidden (height: 0)
         ├──► Target Footer: Hidden
         ├──► Other Headers: Show Ghost Preview
         ├──► Other Sets: Hidden
         └──► Other Footers: Hidden
         │
         ▼
    Drag Executes (after 50ms)
         │
         ▼
    Drag End
         │
         ├──► Reconstruct Items
         ├──► expandAllDropsets
         │    └──► Remove isCollapsed flags
         │
         └──► setCollapsedDropsetId = null
              │
              ▼
         Render Update
              │
              ├──► All Headers: Normal View
              ├──► All Sets: Visible
              └──► All Footers: Visible
```

## Key Technical Details

### Rendering Optimization

- Uses `useCallback` for render functions to prevent unnecessary re-renders
- `useMemo` for `restPeriodSetInfoMemo` to prevent TimerKeyboard effect re-fires
- Conditional rendering based on state flags

### Coordinate Calculations

- Index popup positioning uses `measureInWindow` API
- Calculates relative position to modal container
- Accounts for badge height when positioning below badge

### Dropset Membership Logic

- Determined by position between matching header/footer pairs
- When dragging individual sets, membership recalculated based on final position
- When dragging dropset group, membership preserved (no recalculation)

### Index Badge References

- `badgeRefs` Map stores View refs for each set
- Used for popup positioning calculations
- Updated on mount/unmount of badge components

### Pending Drag Pattern

- Dropset drag requires collapse animation before drag starts
- `pendingDragRef` stores drag function
- `useEffect` executes after collapse completes (50ms delay)
- Prevents race conditions between collapse and drag start

## Files Referenced

- **Main Component**: `src/components/WorkoutTemplate/modals/SetRowDragAndDropModal/indexSetRowDragAndDrop.tsx`
- **Rendering Logic**: `src/components/WorkoutTemplate/modals/SetRowDragAndDropModal/SetRowDragAndDrop.tsx`
- **Parent Hook**: `src/components/WorkoutTemplate/hooks/useSetDragAndDrop.ts`
- **Usage**: `src/components/WorkoutTemplate/indexWorkoutTemplate.tsx` and `src/components/WorkoutTemplate/modals/ExercisePicker/ExercisePickerDragAndDropModal/indexExercisePickerDragAndDrop.tsx`

