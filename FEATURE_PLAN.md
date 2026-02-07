# Feature Plan: Dual Weight Input for Exercises with 2nd Weight Equipment

## Current State Analysis

### Existing Structure
- **Set Type** (`src/types/workout.ts`): Currently has a single `weight: string` field
- **Exercise Type**: Has `weightEquipTags?: string[]` which can contain 1 or 2 equipment tags
- **EditExercise Modal**: Has "ADD 2ND" toggle that controls whether `weightEquipTags.length > 1`
- **SetRow Component**: Renders a single weight input when `showWeight` is true
- **WorkoutTemplateIndex**: Handles weight updates, calculations (multiplyWeightBy2), and unit conversions

### Current Weight Usage
- Weight is stored as a string in the Set object
- Weight is displayed in SetRow with a single TextInput
- Weight calculations (like multiplyWeightBy2) operate on the single weight value
- Weight is used in history/previous set lookups
- Weight unit conversion (lbs/kg) is applied to the single weight value

### Detection Logic
- An exercise has "2nd Weight Equip." when `weightEquipTags.length > 1`
- This is determined in `WorkoutTemplateIndex.tsx` via `getVisibleColumns()` function
- The exercise instance inherits `weightEquipTags` from the library exercise

## Proposed Changes (Step-by-Step)

### Step 1: Update Type Definitions
**File**: `src/types/workout.ts`
- Add optional `weight2?: string` field to the `Set` interface
- This maintains backward compatibility (existing sets without weight2 will continue to work)

### Step 2: Update SetRow Component - Add Second Weight Input
**File**: `src/components/WorkoutTemplate/SetRow.tsx`
- Add props:
  - `hasSecondWeight?: boolean` - indicates if exercise has 2 weight equipment tags
  - `weight2` handling similar to existing weight handling
- Add state for `weight2InputSelection` (similar to `weightInputSelection`)
- Add ref for `weight2InputRef` (similar to `weightInputRef`)
- Add `weight2` to missing value checks: `isMissingWeight2`
- Update `isMissingValue` to include `isMissingWeight2`
- Render second weight input conditionally when `hasSecondWeight` is true
- Position second input below first weight input in the weight column
- Handle custom keyboard for weight2 (similar to weight)
- Update `getInputStyle()` to handle weight2
- Update `renderPrevious()` to display both weights if previous set has weight2

### Step 3: Update WorkoutTemplateIndex - Pass hasSecondWeight Prop
**File**: `src/components/WorkoutTemplate/WorkoutTemplateIndex.tsx`
- In `renderExerciseCard()`, determine if exercise has 2 weight equipment tags:
  ```typescript
  const hasSecondWeight = (ex.weightEquipTags && ex.weightEquipTags.length > 1) || 
    (libraryExercise?.weightEquipTags && libraryExercise.weightEquipTags.length > 1);
  ```
- Pass `hasSecondWeight` prop to SetRow component
- Update `handleUpdateSet` to handle weight2 updates
- Update `handleAddSet` to copy weight2 from previous set if present
- Update `handleToggleComplete` focus logic to handle weight2
- Update `handleCustomKeyboardOpen` to support 'weight2' field
- Update `handleCustomKeyboardNext` to navigate to weight2 after weight
- Update `handleFinish` to apply multiplyWeightBy2 to both weight and weight2
- Update previous set data conversion to include weight2

### Step 4: Update Weight Calculations
**File**: `src/components/WorkoutTemplate/WorkoutTemplateIndex.tsx`
- In `handleFinish()`, when applying `multiplyWeightBy2`, multiply both weight and weight2
- Ensure total weight calculations sum both weight and weight2 where applicable
- Update unit conversion logic to convert both weight and weight2

### Step 5: Update History/Previous Set Display
**File**: `src/components/WorkoutTemplate/SetRow.tsx`
- Update `renderPrevious()` to show both weights if previous set has weight2
- Format: "weight1 + weight2 = total" or "weight1 / weight2" depending on UX preference
- Consider showing: "45lb + 25lb = 70lb" format

### Step 6: Update Set Creation/Initialization
**File**: `src/components/WorkoutTemplate/WorkoutTemplateIndex.tsx`
- When creating new sets via `handleAddSet`, if exercise has second weight, initialize weight2 as empty string
- When copying from previous set, copy weight2 if present

## Potential Risks or Edge Cases

### Breaking Changes
- **Low Risk**: Adding optional `weight2` field maintains backward compatibility
- Existing sets without weight2 will continue to work normally
- Need to handle cases where exercise gains/loses second weight equipment tag

### Data Migration
- **No migration needed**: Existing sets will have `weight2` as undefined, which is handled gracefully
- When user edits exercise to add/remove 2nd equipment, existing sets won't automatically get/lose weight2 field

### UI/UX Considerations
- **Column Layout**: Second weight input should fit within existing weight column
- **Visual Hierarchy**: Second input should be clearly associated with first weight input
- **Keyboard Navigation**: Custom keyboard should support navigating between weight and weight2
- **Previous Set Display**: Need clear formatting for showing two weights from previous set

### State Management
- **Custom Keyboard**: Need to track which weight field (weight or weight2) is active
- **Focus Management**: Focus logic needs to handle weight2 field
- **Selection Mode**: Weight2 should be included in missing value checks for completion

### Calculations
- **Total Weight**: When calculating totals, sum weight + weight2
- **multiplyWeightBy2**: Should multiply both weight and weight2
- **Unit Conversion**: Both weights should be converted when toggling units
- **History Matching**: Previous set lookup should consider both weights

### Edge Cases
- Exercise changes from 1 to 2 weight equipment tags mid-workout
- Exercise changes from 2 to 1 weight equipment tags mid-workout
- Sets with weight2 but exercise no longer has 2 equipment tags
- Empty weight2 vs missing weight2 (undefined vs empty string)

## Thinking Block: ExerciseItem Discriminated Union Analysis

### Current Structure
- `ExerciseItem = Exercise | ExerciseGroup`
- `Exercise.type = 'exercise'`
- `ExerciseGroup.type = 'group'`
- Sets are nested within Exercise objects

### Proposed Change Impact

**Exercise Type:**
- No direct changes to Exercise type
- Changes are at the Set level (adding weight2 field)
- Exercise instances may have sets with or without weight2 depending on weightEquipTags

**ExerciseGroup Type:**
- No changes needed
- Groups contain Exercise children, which contain Sets
- Weight2 logic applies to individual exercises within groups

**Type Narrowing:**
- No new type guards needed
- Existing `ex.type === 'exercise'` checks remain valid
- Weight2 is optional, so no narrowing required

**Utility Functions:**
- `updateExercisesDeep`: No changes needed (already handles Set updates generically)
- `findExerciseDeep`: No changes needed
- `deleteExerciseDeep`: No changes needed
- `flattenExercises`: No changes needed (weight2 is part of Set, not Exercise structure)

**Impact on Existing Code:**
- Code that processes `ExerciseItem[]` is unaffected
- Code that accesses `set.weight` needs to consider `set.weight2` for calculations
- Code that displays weight needs to handle weight2 display

## User Approval Request

This plan implements dual weight inputs for exercises with 2 weight equipment tags. The changes are backward compatible and maintain existing functionality while adding the new feature.

**Key Implementation Points:**
1. Add optional `weight2` field to Set type
2. Render second weight input in SetRow when exercise has 2 weight equipment tags
3. Sum both weights for total calculations
4. Apply multipliers and unit conversions to both weights

Please review and approve this plan before implementation.
