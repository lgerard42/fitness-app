# Architectural Standards

## Import Standards

### IMPORT STANDARD: Path Alias Usage

**CRITICAL RULE:** Always use the `@/` path alias for any file inside the `src` directory. Never use relative paths (`../`) for shared utilities, types, or constants.

**Examples:**
- ✅ `import { COLORS } from '@/constants/colors';`
- ✅ `import type { Workout } from '@/types/workout';`
- ✅ `import { updateExercisesDeep } from '@/utils/workoutHelpers';`
- ✅ `import { useWorkout } from '@/context/WorkoutContext';`
- ❌ `import { COLORS } from '../../constants/colors';`
- ❌ `import type { Workout } from '../../../types/workout';`

**Exception:** Relative imports (`./` or `../`) are acceptable ONLY for files within the same component directory structure (e.g., `./hooks/useWorkoutRestTimer` within `WorkoutTemplate/index.tsx`).

## WorkoutTemplate Component Architecture

### 1. Custom Hooks for State-Heavy Logic

**Rule:** Logic for WorkoutTemplate MUST reside in specialized hooks in `src/components/WorkoutTemplate/hooks/`.

**STRICT REQUIREMENT:** The main `WorkoutTemplate/index.tsx` component MUST NOT contain complex state logic or event handlers. All such logic MUST be extracted into custom hooks.

**UI and Logic Separation:** All state management and event handlers for WorkoutTemplate must reside in `src/components/WorkoutTemplate/hooks/`. The `SetRow.tsx` component should remain a 'dumb' UI component, receiving its action handlers as props from the hooks orchestrated in `index.tsx`.

**UI PURITY:** Presentational components (like SetRow) must delegate focus and interaction logic to specialized hooks. All focus management, input selection, and keyboard interaction handlers should be extracted into hooks (e.g., `useSetRowLogic.ts`).

**TYPE RECOGNITION:** All UI components must use explicit TypeScript interfaces for props, referencing `@/types/workout` as the ground truth. Never define inline interfaces for workout-related types.

#### When to Extract to Hooks
- State management involving multiple related state variables
- Complex `useEffect` dependencies and side effects
- Event handlers that manipulate multiple pieces of state
- Logic that can be reused or tested independently

#### Hook Organization
- Place hooks in `src/components/WorkoutTemplate/hooks/`
- Name hooks with `use` prefix: `useWorkoutRestTimer.ts`, `useWorkoutSupersets.ts`
- Each hook should handle a single domain of functionality
- Hooks should return state and handlers as an object
- All hooks must be TypeScript files (`.ts`) with proper type annotations

#### Example Pattern
```javascript
// hooks/useWorkoutFeature.js
export const useWorkoutFeature = (currentWorkout, handleWorkoutUpdate) => {
  const [state, setState] = useState(initialState);
  
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  const handleAction = () => {
    // Handler logic
  };
  
  return {
    state,
    setState,
    handleAction
  };
};
```

### 2. Component Extraction

**Rule:** UI for WorkoutTemplate MUST be extracted into `src/components/WorkoutTemplate/components/` or `modals/`.

**STRICT REQUIREMENT:** The main `WorkoutTemplate/index.tsx` component MUST act as an orchestrator only. Complex UI rendering logic MUST be extracted into dedicated components in `components/` or `modals/` directories.

#### Component Structure
- Place reusable UI components in `src/components/WorkoutTemplate/components/`
- Keep components focused on presentation
- Pass handlers and state as props
- Use descriptive component names: `RestTimerBar.js`, `MoveModeBanner.js`

#### When to Extract
- UI elements used in multiple places
- Complex rendering logic that clutters the main component
- Modal or popup components
- Form inputs or specialized controls

### 3. Pure Functions in Utilities

**Rule:** Always use pure functions in `src/utils/workoutHelpers.ts` for data manipulation.

#### Pure Function Requirements
- No side effects (no mutations, no API calls, no state updates)
- Same input always produces same output
- No dependencies on external state or context
- Functions should be easily testable

#### Utility Function Patterns
- Data transformation: `convertWorkoutUnits(exercise)`
- Deep operations: `updateExercisesDeep(list, instanceId, updateFn)`
- Queries: `findExerciseDeep(list, instanceId)`
- Formatting: `formatRestTime(seconds)`
- Parsing: `parseRestTimeInput(input)`

#### Example
```javascript
// ✅ Pure function
export const convertWorkoutUnits = (exercise) => {
  // No mutations, no side effects
  return {
    ...exercise,
    weightUnit: newUnit,
    sets: exercise.sets.map(/* transformation */)
  };
};

// ❌ Impure (avoid)
export const convertWorkoutUnits = (exercise) => {
  exercise.weightUnit = newUnit; // Mutation
  updateDatabase(exercise); // Side effect
  return exercise;
};
```

### 4. Mode-Based Rendering

**Rule:** Maintain strict mode-based rendering (live | edit | readonly).

#### Mode Definitions
- `live`: Active workout session with timer and completion tracking
- `edit`: Template editing mode with full modification capabilities
- `readonly`: View-only mode with no editing capabilities

#### Implementation Requirements
- Determine mode at component entry: `const isEditMode = mode === 'edit'`
- Use mode flags consistently throughout the component
- Conditionally render UI based on mode
- Disable interactions in `readonly` mode
- Show/hide controls based on mode

#### Pattern
```javascript
const WorkoutTemplate = ({ mode = 'live', ... }) => {
  const isEditMode = mode === 'edit';
  const isLiveMode = mode === 'live';
  const readOnly = mode === 'readonly';
  
  // Mode-specific logic
  if (readOnly) {
    // Disable all interactions
  }
  
  return (
    <View>
      {isEditMode && <EditControls />}
      {isLiveMode && <LiveTimer />}
      {/* ... */}
    </View>
  );
};
```

## File Organization

```
src/components/WorkoutTemplate/
├── index.tsx                   # Main orchestrator component (TypeScript)
├── components/                 # Reusable UI components
│   ├── RestTimerBar.js
│   └── MoveModeBanner.js
├── hooks/                      # Custom hooks for state logic (TypeScript)
│   ├── useWorkoutRestTimer.ts
│   ├── useWorkoutSupersets.ts
│   └── useWorkoutGroups.ts
└── modals/                     # Modal components
    ├── ExercisePicker/
    └── FinishWorkoutModal.js
```

## Type Definitions

### 5. Centralized Type Definitions

**Rule:** Centralized types in `src/types/workout.ts` are the absolute ground truth. Check this file before proposing any state changes.

**STRICT REQUIREMENT:** 
- Before modifying any workout-related state, data structure, or type, you MUST first read and understand `src/types/workout.ts`
- Never guess the shape of a workout, exercise, set, or ExerciseItem union type
- Always refer to this file when:
  - Adding new state variables
  - Modifying existing state structures
  - Creating new handlers that manipulate workout data
  - Proposing changes to component props

#### Type Import Pattern
- Always import types from `src/types/workout.ts` (or relative path `../../types/workout`)
- Never define inline interfaces for workout-related types
- Use the centralized types for:
  - `Workout`, `Exercise`, `Set`, `ExerciseItem`
  - `WorkoutMode`, `GroupType`, `ExerciseCategory`
  - `ExerciseLibraryItem`, `ExerciseStatsMap`
  - `RestTimer`, `SupersetSelection`, `GroupSelectionMode`

#### Example
```typescript
// ✅ Correct - import from centralized types
import type { Workout, Exercise, Set, WorkoutMode } from '../../types/workout';

// ❌ Incorrect - inline type definition
interface Workout {
  // Don't define here - use src/types/workout.ts
}
```

#### When Adding New Types
- Add new workout-related types to `src/types/workout.ts`
- Export all types from this single source of truth
- Update existing types in this file, not in component files

## Migration Guidelines

When refactoring existing code:
1. Identify state-heavy logic → Extract to custom hook
2. Identify reusable UI → Move to `components/`
3. Identify data manipulation → Move to `workoutHelpers.ts` as pure function
4. Ensure mode-based rendering is maintained
5. Update imports and prop passing
6. Always import types from `src/types/workout.ts` - never guess data structures

## TypeScript Adherence

### 100% TSX ADHERENCE

**CRITICAL RULE:** The project is now fully TypeScript. All new components or screens must be created as `.tsx` files using centralized types from `@/types/workout.ts`.

**Requirements:**
- ✅ All new components must be `.tsx` files
- ✅ All new screens must be `.tsx` files
- ✅ All types must reference `@/types/workout.ts` as the ground truth
- ✅ Never create new `.js` files for React components
- ✅ Use proper TypeScript interfaces for all props
- ✅ Use type imports: `import type { Workout } from '@/types/workout';`

**Exception:** Configuration files (e.g., `babel.config.js`, `app.json`) may remain as `.js` files.

---

**GROUND TRUTH:** Refer to `src/types/workout.ts` for all data structures.