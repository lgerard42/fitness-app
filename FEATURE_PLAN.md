# Feature Plan: Inline Drag and Drop for Workout Template

## Status: IMPLEMENTED ✓

## Overview

Native inline drag and drop functionality for reordering exercises directly on the WorkoutTemplate. When the user long-presses an exercise, all cards collapse immediately and they can drag to reorder right there - no separate screen, no header banner, just simple one-at-a-time drag and drop.

## Key User Experience

1. **Normal View**: Full exercise cards with all sets visible
2. **Long-press any exercise** → That item immediately starts being dragged
3. **All cards collapse** → Only exercise name and set count shown
4. **Small instruction text** → "Drag to reorder • Release to drop"
5. **Drag to new position** → Visual feedback (dashed border, shadow, scale)
6. **Release to drop** → Reordering applied, cards expand back

**No modal, no header banner, no separate screen** - just inline drag and drop.

## Implementation Summary

### Files:
1. **`src/components/WorkoutTemplate/hooks/useWorkoutDragDrop.ts`**
   - `isDragging` - Set when drag begins
   - `handleDragBegin` - Called by DraggableFlatList when drag starts
   - `handleDragEnd` - Reconstructs exercise order, exits drag mode
   - `dragItems` - Converts exercises to drag-compatible items

2. **`src/components/WorkoutTemplate/index.tsx`**
   - Uses `DraggableFlatList` as main exercise renderer
   - `renderDragItem` wraps exercise cards with `drag` callback
   - Shows full cards when `isDragging=false`, collapsed when `isDragging=true`
   - Small instruction banner during drag (no MoveModeBanner)

## Technical Flow

```
User long-presses exercise
    ↓
DraggableFlatList captures long-press via drag callback
    ↓
onDragBegin triggers → isDragging = true
    ↓
All cards re-render collapsed (just name + set count)
    ↓
User drags item to new position
    ↓
onDragEnd triggers → reconstructs order → isDragging = false
    ↓
Cards expand back to full view
```

## Key Code Changes

### Exercise Card Wrapper:
```typescript
// renderDragItem wraps cards with drag handler
return (
  <TouchableOpacity
    onLongPress={drag}
    delayLongPress={200}
    activeOpacity={1}
    disabled={isActive}
  >
    {fullCard}  // renderExerciseCard output
  </TouchableOpacity>
);
```

### Conditional Rendering:
```typescript
const shouldCollapse = isDragging || isActive;

if (shouldCollapse) {
  // Render collapsed card (name + set count only)
} else {
  // Render full exercise card with all sets
}
```

### No Header Banner:
- Removed `MoveModeBanner` for drag mode
- Only shows small instruction text: "Drag to reorder • Release to drop"

## Testing Notes

1. Open a workout with multiple exercises
2. Long-press any exercise card
3. Observe: All exercises collapse, dragging starts immediately
4. Drag to new position
5. Release
6. Observe: All exercises expand, new order applied
