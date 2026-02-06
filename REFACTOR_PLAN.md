# Refactor Plan: Dynamic Column Headers Based on Exercise Configuration

## Current State Analysis

### Existing Structure
- **Column Headers**: Currently conditionally rendered based on `category`:
  - For "Lifts": Shows "Set", "Previous", "Weight (lbs/kg)", "Reps", "-"
  - For "Cardio": Shows "Set", "Previous", "Time", "Dist/Reps", "-"
  - For "Training": Shows "Set", "Previous", "Time", "Dist/Reps", "-"

- **SetRow Component**: Uses conditional logic to render inputs based on category:
  - `isLift` determines if weight/reps are shown
  - `isCardio` determines if duration/distance are shown
  - Training exercises use duration and reps

- **Exercise Configuration Fields** (from EditExercise.tsx):
  - `trackDuration`: boolean - "Track duration by default" toggle
  - `trackReps`: boolean - "Track reps" toggle (inside Weight Equip. for Training)
  - `weightEquipTags`: string[] - Array of equipment tags (if populated, Weight Equip. is utilized)

- **Exercise Type**: Currently only stores `category`, `name`, `exerciseId`, `sets`, etc. Does NOT store `trackDuration`, `trackReps`, or `weightEquipTags`

- **Library Lookup Pattern**: Codebase already uses `exercisesLibrary.find(libEx => libEx.id === ex.exerciseId)` to access library exercise data

### Relevant Files
1. `src/components/WorkoutTemplate/WorkoutTemplateIndex.tsx` (3778 lines)
   - Contains column header rendering logic (lines ~1367-1383)
   - Renders SetRow components with props
   - Has access to `exercisesLibrary` prop

2. `src/components/WorkoutTemplate/SetRow.tsx` (887 lines)
   - Renders individual set rows with inputs
   - Currently uses `category` prop to determine which inputs to show
   - Has logic for weight/reps vs duration/distance

3. `src/types/workout.ts`
   - Defines `Exercise` type
   - Defines `ExerciseLibraryItem` type (has `[key: string]: unknown` for flexibility)

4. `src/utils/workoutInstanceHelpers.ts`
   - `createExerciseInstance()` - Creates exercise instances from library items
   - Currently only copies `id`, `name`, `category`

## Proposed Changes (Step-by-Step)

### Step 1: Update Exercise Type Definition
**File**: `src/types/workout.ts`
**Changes**:
- Add optional fields to `Exercise` interface:
  - `trackDuration?: boolean`
  - `trackReps?: boolean`
  - `weightEquipTags?: string[]`
**Why**: Need to store configuration fields on Exercise instances for column visibility logic
**Lines**: ~25-35

### Step 2: Update Exercise Instance Creation
**File**: `src/utils/workoutInstanceHelpers.ts`
**Changes**:
- Update `createExerciseInstance()` to copy configuration fields:
  - `trackDuration` from library item
  - `trackReps` from library item
  - `weightEquipTags` from library item
- Update `createExerciseInstanceWithSetGroups()` similarly
**Why**: Ensure new exercise instances include configuration data
**Lines**: ~10-42, ~51-87

### Step 3: Create Column Visibility Helper Function
**File**: `src/components/WorkoutTemplate/WorkoutTemplateIndex.tsx`
**Changes**:
- Create helper function `getVisibleColumns(exercise: Exercise, libraryExercise?: ExerciseLibraryItem)` that returns:
  ```typescript
  {
    showDuration: boolean;
    showDistance: boolean;
    showWeight: boolean;
    showReps: boolean;
  }
  ```
- Logic:
  - `showDuration`: category === 'Cardio' OR trackDuration === true
  - `showDistance`: category === 'Cardio'
  - `showWeight`: category === 'Lifts' OR (category === 'Cardio' | 'Training' AND weightEquipTags?.length > 0)
  - `showReps`: category === 'Lifts' OR (category === 'Training' AND trackReps === true)
**Why**: Centralize column visibility logic for reuse
**Lines**: ~1095-1100 (near renderExerciseCard)

### Step 4: Update Column Headers Rendering
**File**: `src/components/WorkoutTemplate/WorkoutTemplateIndex.tsx`
**Changes**:
- Replace conditional column header rendering with individual columns:
  - Always show: "Set", "Previous", "-"
  - Conditionally show: "Duration", "Distance", "Weight", "Reps" based on `getVisibleColumns()`
- Update column header styles to handle variable number of columns
- Use flex layout to distribute columns evenly
**Why**: Support flexible column display based on exercise configuration
**Lines**: ~1367-1383

### Step 5: Update SetRow Component Props
**File**: `src/components/WorkoutTemplate/SetRow.tsx`
**Changes**:
- Add new props:
  - `showDuration?: boolean`
  - `showDistance?: boolean`
  - `showWeight?: boolean`
  - `showReps?: boolean`
- Keep `category` prop for backward compatibility and other logic
**Why**: Allow parent to control which columns are visible
**Lines**: ~15-52 (interface)

### Step 6: Update SetRow Rendering Logic
**File**: `src/components/WorkoutTemplate/SetRow.tsx`
**Changes**:
- Replace conditional rendering based on `isLift`/`isCardio` with conditional rendering based on new props
- Always render: Set index, Previous, Checkbox
- Conditionally render: Duration input, Distance input, Weight input, Reps input
- Update input focus logic to work with new column structure
- Update custom keyboard logic to handle all field types
**Why**: Support flexible column display
**Lines**: ~229-625 (render logic)

### Step 7: Update SetRow Props Passing
**File**: `src/components/WorkoutTemplate/WorkoutTemplateIndex.tsx`
**Changes**:
- In `renderExerciseCard()`, get visible columns using helper function
- Pass column visibility props to SetRow component
- Look up library exercise if needed for configuration fields
**Why**: Connect column visibility logic to SetRow component
**Lines**: ~1524-1561 (setRowProps)

### Step 8: Update Column Width Calculations
**File**: `src/components/WorkoutTemplate/WorkoutTemplateIndex.tsx` and `SetRow.tsx`
**Changes**:
- Update flex styles to handle variable number of columns
- Ensure columns distribute evenly regardless of which ones are visible
- Update `colWeight`, `colReps`, etc. styles to be conditional
**Why**: Maintain proper layout with variable columns
**Lines**: Styles sections

### Step 9: Handle Distance Unit Display
**File**: `src/components/WorkoutTemplate/SetRow.tsx`
**Changes**:
- Update distance input placeholder/label to support both US (miles) and metric (km) systems
- May need to check if there's a global unit preference or use a default
**Why**: User requirement mentions distance needs to support both systems
**Lines**: ~574 (placeholder)

### Step 10: Update Previous Set Display Logic
**File**: `src/components/WorkoutTemplate/SetRow.tsx`
**Changes**:
- Update `renderPrevious()` to handle all possible column combinations
- Show appropriate previous values based on visible columns
**Why**: Previous column should show relevant historical data
**Lines**: ~204-227

## Potential Risks or Edge Cases

### Breaking Changes
1. **Exercise Type Extension**: Adding optional fields to `Exercise` type should be backward compatible (optional fields)
2. **SetRow Props**: Adding new optional props maintains backward compatibility
3. **Column Layout**: Changing from fixed columns to dynamic may affect layout calculations

### Dependencies
1. **Library Exercise Lookup**: Need to ensure `exercisesLibrary` is always available when rendering exercises
2. **Exercise Instance Creation**: Must update all places where exercises are created to include new fields
3. **Exercise Replacement**: When replacing exercises, need to preserve or update configuration fields

### State Management Considerations
1. **Exercise Updates**: Configuration fields should be read-only (from library), but need to ensure they're preserved during updates
2. **Workout Persistence**: Need to ensure configuration fields are saved/loaded correctly

### UI/UX Impacts
1. **Column Width**: Variable columns may cause layout shifts - need to ensure smooth transitions
2. **Input Focus**: Custom keyboard logic needs to handle all field types correctly
3. **Previous Column**: May show different data formats depending on visible columns

### Performance Implications
1. **Library Lookup**: Looking up library exercise for each render could be expensive - consider memoization or storing on Exercise instance
2. **Re-renders**: Column visibility changes shouldn't cause unnecessary re-renders

### Backward Compatibility
1. **Existing Workouts**: Old workouts without configuration fields should default to current behavior (category-based)
2. **Migration**: May need migration logic for existing exercise instances

## Thinking: ExerciseItem Discriminated Union Impact Analysis

**Current Structure:**
- `ExerciseItem = Exercise | ExerciseGroup`
- `Exercise.type = 'exercise'`
- `ExerciseGroup.type = 'group'` (contains children: Exercise[])

**Proposed Change Impact:**
- **Exercise Type**: Adding optional configuration fields (`trackDuration`, `trackReps`, `weightEquipTags`) does NOT affect the discriminated union structure
- **ExerciseGroup Type**: No changes needed - groups contain Exercise instances, so they inherit the new fields indirectly
- **Type Narrowing**: No impact - we're adding optional fields, not changing the type structure
- **Utility Functions**: 
  - `findExerciseDeep()` - No changes needed (searches by instanceId)
  - `updateExercisesDeep()` - No changes needed (updates Exercise properties)
  - `deleteExerciseDeep()` - No changes needed
- **Impact on Existing Code**: Minimal - all code that processes `ExerciseItem[]` will continue to work since we're only adding optional fields

**Conclusion**: This change is safe and does not require updates to discriminated union handling logic.

## User Approval Request

This plan refactors the column header system to be dynamic based on exercise configuration rather than category alone. The changes will:

1. Add configuration fields to Exercise type
2. Update exercise creation to include configuration
3. Create flexible column visibility system
4. Update both column headers and SetRow to support dynamic columns
5. Maintain backward compatibility with existing workouts

**Please review and approve this plan before I proceed with implementation.**
