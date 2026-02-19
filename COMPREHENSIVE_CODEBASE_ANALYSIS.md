# Workout Tracking Application - Comprehensive Architecture Analysis

Based on comprehensive exploration of the codebase, here's a detailed architectural analysis of this React Native/Expo workout tracking application (excluding admin module).

---

## 1. Project Architecture Overview

### Purpose & Domain
This is a **comprehensive workout tracking and exercise library management application** designed for fitness enthusiasts. It enables users to:
- Log live workouts with real-time timer and set tracking
- Manage an exercise library with detailed configuration
- Track workout history and personal records
- Monitor body measurements and fitness goals
- View exercise statistics and performance trends

### Technology Stack
- **React Native**: 0.81.5
- **Expo SDK**: ~54.0.33
- **React**: 19.1.0
- **React Navigation**: 7.0.0 (Bottom Tabs + Native Stack)
- **State Management**: React Context API (WorkoutContext, UserSettingsContext)
- **Data Persistence**: 
  - `@react-native-async-storage/async-storage` (2.2.0) for app data
  - `expo-sqlite` (~16.0.10) for exercise configuration/reference data
- **UI/UX Libraries**:
  - `lucide-react-native` for icons
  - `react-native-gesture-handler` (~2.28.0)
  - `react-native-reanimated` (^4.1.1)
  - `react-native-draggable-flatlist` (^4.0.3) - patched version
- **TypeScript**: ~5.9.2 (strict mode enabled)

### Architecture Pattern
**Context-based State Management + Component Composition**
- Global state managed via React Context (WorkoutContext, UserSettingsContext)
- Hybrid navigation (Bottom Tabs + Modal Stack)
- Component-based architecture with heavy use of custom hooks
- Utility-first approach for business logic
- SQLite database for static reference data + AsyncStorage for dynamic user data

---

## 2. Directory Structure & Responsibilities

### Root-Level Structure
```
src/
├── components/        # Reusable UI components and feature modules
├── constants/        # Static data, colors, layouts, default values
├── context/          # Global React Context providers
├── database/         # SQLite initialization, queries, hooks
├── screens/          # Top-level navigation screens
├── types/           # TypeScript type definitions
└── utils/           # Pure helper functions (no React)
```

### Detailed Breakdown

#### **`src/components/`** - Reusable Components
- **`common/`**: Shared primitives
  - `SwipeToDelete.tsx` - Swipeable list item component
  
- **`ExerciseEditor/`**: Exercise creation/configuration module (11 files)
  - `EditExercise.tsx` - Main modal for creating/editing exercises
  - `EditExerciseFields.tsx` - Dynamic field configuration
  - `EquipmentPickerModal.tsx` - Multi-select equipment picker
  - `GripTypeWidthPicker.tsx` - Grip configuration UI
  - `StanceTypeWidthPicker.tsx` - Stance configuration UI
  - `MotionPickerModal.tsx` - Motion plane/variation picker
  - `Chip.tsx`, `CustomDropdown.tsx` - UI primitives

- **`WorkoutTemplate/`**: **Core workout orchestration** (God component area)
  - `indexWorkoutTemplate.tsx` - Main orchestrator (~4,100+ lines) - **REFACTOR PRIORITY**
  - `SetRow.tsx` - Individual set row component (~1,700+ lines)
  - `WorkoutHeader.tsx` - Workout header with timer
  - `WorkoutTemplateDragAndDrop.tsx` - Drag-drop wrapper
  - `components/` subdirectory:
    - `RestTimerBar.tsx` - Rest timer UI and animations
    - `WorkoutModals.tsx` - Note/finish/cancel modals
    - `MoveModeBanner.tsx` - Visual feedback for drag mode
    - `SetRowHeadersPopup/` - Column header legend
  - `hooks/` subdirectory (7 custom hooks):
    - `useWorkoutRestTimer.ts` - Rest timer state/countdown
    - `useWorkoutSupersets.ts` - Superset creation/editing
    - `useWorkoutGroups.ts` - Drop-set grouping logic
    - `useWorkoutNotes.ts` - Session/exercise notes
    - `useSetRowLogic.ts` - SetRow focus/keyboard management
    - `useWorkoutDragDrop.ts` - Exercise reordering
    - `useSetDragAndDrop.ts` - Set reordering
  - `modals/` subdirectory:
    - `ExercisePicker/` - Add exercises modal (~1,900+ lines)
    - `SetRowDragAndDropModal/` - Set reordering modal (~1,100+ lines)
    - `CustomNumberKeyboard.tsx` - Custom numeric input
    - `ActiveRestTimerPopup.tsx` - Full-screen rest timer
    - `FinishWorkoutModal.tsx`, `CancelWorkoutModal.tsx`

- **Top-level components**:
  - `ActiveWorkoutBanner.tsx` - Persistent banner when workout is active
  - `ExerciseHistoryModal.tsx` - Exercise history viewer
  - `SavedNoteItem.tsx` - Note display component

#### **`src/constants/`** - Static Configuration (9 files)
- `colors.js` - Color palette (uses Tailwind-style slate/blue/red/amber)
- `layout.ts` - Layout constants and dimensions
- `data.js` - Legacy migration helpers, equipment options, stance/grip configs
- `defaultStyles.js` - Default color schemes (superset, HIIT)
- `defaultToggles.js` - Default toggle states
- `gripImages.ts`, `gripWidthImages.ts`, `stanceImages.ts`, `stanceLabels.ts` - Reference data

#### **`src/context/`** - Global State Management (2 contexts)
- **`WorkoutContext.tsx`**: Central workout data hub
  - `activeWorkout` - Current live workout
  - `workoutHistory` - Completed workouts array
  - `exercisesLibrary` - Exercise definitions
  - `exerciseStats` - PRs, last performed, history
  - CRUD operations: `startEmptyWorkout`, `updateWorkout`, `finishWorkout`, `cancelWorkout`, `addExerciseToLibrary`, `updateExerciseInLibrary`
  - Data persistence via AsyncStorage (4 keys: history, library, active_workout, stats)
  
- **`UserSettingsContext.tsx`**: User preferences
  - `settings`: distanceUnit, weightUnit, weightCalcMode, repsConfigMode, defaultRestTimerSeconds, vibrateOnTimerFinish, keepScreenAwake
  - `updateSettings` function
  - AsyncStorage key: 'user_settings'

#### **`src/database/`** - SQLite Reference Data (3 files + tables/)
- **`initDatabase.ts`** (~852 lines) - Database schema creation and seeding
  - Creates 20+ tables for exercise configuration
  - Migration system (DATABASE_VERSION = 8)
  - Re-seeds equipment, muscle, grip data on every app load
  
- **`exerciseConfigService.ts`** (~567 lines) - Typed query functions
  - Functions like `getExerciseCategories()`, `getPrimaryMuscles()`, `getGymEquipment()`, etc.
  - Interfaces for all database entities
  
- **`useExerciseConfig.ts`** (~444 lines) - React hooks wrapping database queries
  - Hooks like `useExerciseCategories()`, `usePrimaryMuscles()`, `useEquipmentPickerSections()`
  - In-memory caching for performance
  
- **`tables/`** - 22 JSON files containing reference data:
  - Equipment: `gymEquipment.json`, `cableAttachments.json`, `equipmentCategories.json`
  - Muscles: `muscleGroups.json`, `primaryMuscles.json`, `secondaryMuscles.json`, `tertiaryMuscles.json`
  - Motions: `motionPlanes.json`, `primaryMotions.json`, `primaryMotionVariations.json`
  - Stances: `stanceTypes.json`, `stanceWidths.json`
  - Grips: `gripTypes.json`, `gripWidths.json`, `rotatingGripVariations.json`
  - Categories: `exerciseCategories.json`, `cardioTypes.json`, `trainingFocus.json`

#### **`src/screens/`** - Navigation Targets (5 main screens + ProfileTab/)
- **`LogScreen.tsx`** (~266 lines) - Workout initiation screen
  - Start empty workout button
  - Resume active workout card
  - Routines list (placeholder)
  
- **`HistoryScreen.tsx`** (~205 lines) - Workout history browser
  - Segmented control: Workouts / Statistics
  - List of completed workouts
  - Navigation to EditWorkoutScreen
  
- **`LibraryScreen.tsx`** (~209 lines) - Exercise library management
  - Search/filter exercises
  - Add new exercises
  - Edit existing exercises
  - View exercise history modal
  
- **`LiveWorkoutScreen.tsx`** (~50 lines) - Live workout wrapper
  - Thin wrapper around WorkoutTemplate
  - Passes `mode="live"`, active workout, finish/cancel handlers
  - Retrieves bodyWeight for assisted-negative calculations
  
- **`EditWorkoutScreen.tsx`** (~119 lines) - Past workout editor
  - Local state for edited workout
  - Custom header and finish button
  - Switches between `readonly` and `edit` modes
  - Updates workout history on save
  
- **`ProfileTab/`** - Profile and settings module
  - `ProfileIndex.tsx` (~653 lines) - Main profile screen
  - `components/`: ProfileHeader, SettingItem, StatCard, SectionHeader, MeasurementHistoryItem
  - `hooks/`: useBodyStats, useGoals, usePersonalRecords, useUserProfile
  - `modals/`: AddMeasurementModal, AddGoalModal, MeasurementHistoryModal, EditProfileModal

#### **`src/types/`** - TypeScript Definitions (1 file)
- **`workout.ts`** (~250 lines) - Comprehensive type definitions
  - Core types: `Workout`, `Exercise`, `ExerciseGroup`, `Set`, `Note`, `SessionNote`
  - Exercise types: `ExerciseItem = Exercise | ExerciseGroup`
  - Configuration types: `ExerciseLibraryItem`, `UserSettings`, `ExerciseStats`
  - UI types: `WorkoutMode`, `RestTimer`, `FlatExerciseRow`, `FocusNextSet`
  - Profile types: `UserProfile`, `BodyMeasurement`, `UserGoal`, `PersonalRecord`
  - Enums: `SetType`, `WeightUnit`, `DistanceUnit`, `ExerciseCategory`, `GroupType`

#### **`src/utils/`** - Pure Helper Functions (4 files)
- **`workoutHelpers.ts`** (~282 lines) - Workout tree manipulation
  - `updateExercisesDeep()` - Update exercise in nested structure
  - `deleteExerciseDeep()` - Remove exercise from tree
  - `findExerciseDeep()` - Locate exercise in tree
  - `flattenExercises()`, `reconstructExercises()` - Tree ↔ flat list conversion
  - Time formatting: `formatRestTime()`, `formatDurationTime()`
  - Input parsing: `parseRestTimeInput()`, `parseDurationInput()`
  
- **`workoutInstanceHelpers.ts`** (~178 lines) - Exercise instance creation
  - `createExerciseInstance()` - Create exercise from library item
  - `createExerciseInstanceWithSetGroups()` - Create with dropsets/warmups
  - `settingsToDefaults()` - Convert user settings to defaults
  - SetGroup type definition for configuring set groups
  
- **`exerciseFilters.ts`** (~75 lines) - Exercise filtering logic
  - `filterExercises()` - Multi-criteria filtering (search, category, muscle, equipment)
  - `getAvailableSecondaryMusclesForPrimaries()` - Hierarchical muscle filtering
  
- **`equipmentIcons.ts`** - Equipment icon resolution (embedded SVG data)

---

## 3. Core Data Flow

### Data Flow Diagram
```
User Actions
    ↓
Screens (LogScreen, LiveWorkoutScreen, etc.)
    ↓
WorkoutContext (activeWorkout, updateWorkout)
    ↓
AsyncStorage (persistence)
    ↑
App Load → Context Initialization
```

### State Management Approach

#### **Global State (React Context)**
1. **WorkoutContext** - Single source of truth for:
   - Active workout being logged
   - Workout history (array of completed workouts)
   - Exercise library (user's custom exercises)
   - Exercise statistics (PRs, history)
   - Loading state

2. **UserSettingsContext** - Application preferences
   - Units (weight, distance)
   - Default rest timer
   - Vibration/screen preferences

#### **Local Component State**
- `WorkoutTemplate`: Modal visibility, focus state, selection modes, drag modes
- `SetRow`: Input selection, focus refs
- `EditWorkoutScreen`: Local copy of workout being edited
- Modals: Form state, validation

#### **Data Persistence Strategy**

**AsyncStorage** (User Data - Mutable)
- `workout_history` - Array of completed workouts
- `exercise_library` - User's exercise definitions
- `active_workout` - Current live workout (resume capability)
- `exercise_stats` - PRs and exercise history
- `user_settings` - User preferences
- `body_measurements` - Weight/body fat tracking
- `user_goals` - Strength/consistency goals
- `user_profile` - Profile info and photo

**SQLite Database** (Reference Data - Mostly Static)
- Exercise categories, cardio types, training focus
- Muscle groups (primary/secondary/tertiary)
- Equipment catalog (gym equipment, cable attachments)
- Grip types, grip widths, stance types, stance widths
- Motion planes, motion variations
- Re-seeded on every app load for consistency

### Key Data Models & Relationships

```
Workout
├── id, name, startedAt, finishedAt, duration, date
├── exercises: ExerciseItem[]  (Exercise | ExerciseGroup)
└── sessionNotes: SessionNote[]

Exercise
├── instanceId (unique per workout)
├── exerciseId (FK to library)
├── name, category
├── sets: Set[]
├── notes: Note[]
├── configuration: weightUnit, trackDuration, trackReps, etc.
└── [references ExerciseLibraryItem via exerciseId]

ExerciseGroup (Superset/HIIT)
├── instanceId
├── groupType: 'Superset' | 'HIIT'
└── children: Exercise[]

Set
├── id
├── type: 'Working' | 'Warmup' | 'Failure'
├── weight, weight2, reps, reps2, duration, distance
├── completed: boolean
├── restPeriodSeconds
├── dropSetId (groups sets visually)
└── flags: isWarmup, isDropset, isFailure

ExerciseLibraryItem
├── id, name, category
├── Configuration fields: trackDuration, trackReps, weightEquipTags, etc.
└── pinnedNotes: Note[]

ExerciseStats (per exerciseId)
├── pr: number (personal record)
├── lastPerformed: string
└── history: Array<{ date, sets }>
```

---

## 4. Key Components & Screens

### Screen Summary

| Screen | Purpose | Key Features |
|--------|---------|--------------|
| **LogScreen** | Workout initiation hub | Start empty workout, resume active, routines (coming soon) |
| **LiveWorkoutScreen** | Live workout logging | Real-time timer, set tracking, rest timer, delegate to WorkoutTemplate |
| **EditWorkoutScreen** | Past workout editor | Edit completed workout, update history, read-only/edit toggle |
| **HistoryScreen** | Workout history browser | List workouts, view stats, filter, navigate to edit |
| **LibraryScreen** | Exercise management | Search/filter, add/edit exercises, view history |
| **ProfileIndex** | User profile & settings | Body measurements, goals, PRs, app settings |

### Major Reusable Components

#### **WorkoutTemplate** (`indexWorkoutTemplate.tsx` - 4,100+ lines)
**THE GOD COMPONENT** - Orchestrates entire workout UI
- **Responsibilities**:
  - Exercise list rendering (flat + grouped)
  - Set row rendering for each exercise
  - Drag-and-drop reordering (exercises + sets)
  - Modal management (picker, notes, finish, cancel)
  - Rest timer coordination
  - Superset/dropset creation and editing
  - Focus management across inputs
  - Custom keyboard handling
  - Previous set data lookup
  - Weight/reps/duration calculations
- **Props** (~15):
  - `workout`, `mode` ('live' | 'edit' | 'readonly')
  - `onUpdate`, `onFinish`, `onCancel`
  - `exercisesLibrary`, `exerciseStats`
  - `navigation`, `customHeader`, `customFinishButton`, `hideTimer`
- **State** (~40+ state variables):
  - Modal visibility flags
  - Selection modes (superset, dropset)
  - Drag mode, focus state
  - Custom keyboard state
- **Known Issues**: Tight coupling, inline event handlers, large JSX blocks

#### **SetRow** (`SetRow.tsx` - 1,700+ lines)
Individual set row component with input fields
- **Responsibilities**:
  - Render weight/reps/duration/distance inputs
  - Handle focus and keyboard navigation
  - Display previous set data
  - Show completion checkbox
  - Rest timer button
  - Drop-set indicator
- **Props** (~40+):
  - Set data, exercise config, mode
  - Handlers: onUpdate, onComplete, onFocus, onKeyboard
  - Previous set data, stats
  - Focus state, selection mode
- **Features**:
  - Custom number keyboard support
  - Alternating reps (L/R split)
  - Dual weight inputs (coming soon - see FEATURE_PLAN.md)
  - Missing value highlighting

#### **ExercisePicker** (`ExercisePicker/ExercisePickerIndex.tsx` - 1,900+ lines)
Exercise selection modal with advanced features
- **Responsibilities**:
  - Search and filter exercises
  - Multi-select exercises
  - Configure set count and dropsets
  - Create supersets from picker
  - Inline exercise creation
  - Set group editor (drag-and-drop sets)
- **Features**:
  - Hierarchical filters (category → primary muscle → secondary muscle)
  - Equipment filtering
  - "Create New" button → EditExercise modal
  - Bottom sheet with selected exercises
  - Set configuration per exercise
  - Group metadata for complex subgroups

#### **EditExercise** (`ExerciseEditor/EditExercise.tsx`)
Exercise creation/configuration modal
- **Features**:
  - Category selection (Lifts/Cardio/Training)
  - Name input
  - Equipment picker (multi-select with 2nd equipment option)
  - Muscle targeting (primary/secondary/tertiary)
  - Motion configuration (plane, primary motion, variations)
  - Grip/stance pickers (conditional on equipment)
  - Track duration/reps/distance toggles
  - Pinned notes

---

## 5. Business Logic & Utilities

### Core Business Logic Locations

**WorkoutContext (`context/WorkoutContext.tsx`):**
- Workout lifecycle: start, update, finish, cancel
- Exercise library CRUD
- Stats calculation (PRs, volume)
- Effective weight calculation (for assisted machines: bodyWeight - inputWeight)
- Data migration (`migrateExercise`, `migrateAssistedMachine`)

**Utility Modules (`utils/`):**
- **Tree operations** (`workoutHelpers.ts`): Deep updates, deletions, searches in nested exercise structure
- **Instance creation** (`workoutInstanceHelpers.ts`): Convert library exercises to workout instances with set configuration
- **Filtering** (`exerciseFilters.ts`): Multi-criteria exercise filtering
- **Time parsing/formatting** (`workoutHelpers.ts`): Rest timer and duration input parsing

**Custom Hooks (`components/WorkoutTemplate/hooks/`):**
- **Rest timer logic** (`useWorkoutRestTimer.ts`): Countdown timer, completion handling
- **Superset management** (`useWorkoutSupersets.ts`): Create/edit superset groups
- **Drop-set logic** (`useWorkoutGroups.ts`): Group set selection and submission
- **Drag-and-drop** (`useWorkoutDragDrop.ts`, `useSetDragAndDrop.ts`): Reordering logic
- **Notes** (`useWorkoutNotes.ts`): Session and exercise notes state

### Utility Functions Summary

| File | Key Functions | Purpose |
|------|---------------|---------|
| `workoutHelpers.ts` | `updateExercisesDeep`, `deleteExerciseDeep`, `findExerciseDeep` | Navigate/modify nested exercise tree |
| | `flattenExercises`, `reconstructExercises` | Convert tree ↔ flat list for drag-drop |
| | `formatRestTime`, `formatDurationTime` | Display time in MM:SS / HH:MM:SS |
| | `parseRestTimeInput`, `parseDurationInput` | Parse numeric input to seconds |
| `workoutInstanceHelpers.ts` | `createExerciseInstance` | Create exercise instance from library |
| | `createExerciseInstanceWithSetGroups` | Create with dropset/warmup configuration |
| | `settingsToDefaults` | Map user settings to exercise defaults |
| `exerciseFilters.ts` | `filterExercises` | Multi-criteria filtering (search, category, muscle, equipment) |
| | `getAvailableSecondaryMusclesForPrimaries` | Hierarchical muscle filtering |

---

## 6. Database & Storage

### SQLite Database Structure

**Purpose**: Store static reference data for exercise configuration

**Tables** (20+):
- `exercise_categories` - Lifts, Cardio, Training
- `cardio_types` - Running, Cycling, etc.
- `muscle_groups` - Metadata table
- `primary_muscles`, `secondary_muscles`, `tertiary_muscles` - Hierarchical muscle taxonomy
- `training_focus` - Strength, Hypertrophy, Endurance, etc.
- `equipment_categories` - Bars, Free-Weights, Machines, etc.
- `support_equipment_categories`, `weights_equipment_categories` - Equipment subcategories
- `gym_equipment` - ~100+ equipment entries
- `cable_attachments` - Rope, Bar, Handle, etc.
- `grip_types`, `grip_widths`, `rotating_grip_variations` - Grip configuration
- `stance_types`, `stance_widths` - Stance configuration (not in DB, in constants)
- `motion_planes`, `primary_motions`, `primary_motion_variations` - Movement taxonomy

**Schema Features**:
- Foreign key relationships (e.g., `secondary_muscles.primary_muscle_ids`)
- JSON columns for arrays (e.g., `equipment_categories.sub_categories_table`)
- Metadata columns: `sort_order`, `is_active`, `common_names`, `short_description`
- Version management via `PRAGMA user_version` (current: 8)

**Initialization flow**:
1. App loads → `initExerciseConfigDatabase()` called
2. `initDatabase()` opens/creates database
3. Check version → run migrations if needed
4. Re-seed equipment, muscles, grips on every load (ensures consistency)
5. Database instance cached in `useExerciseConfig.ts`

### AsyncStorage Usage Patterns

**Storage Keys**:
- `workout_history` - JSON array of Workout objects
- `exercise_library` - JSON array of ExerciseLibraryItem objects
- `active_workout` - Single Workout object (or null)
- `exercise_stats` - Object mapping exerciseId → ExerciseStats
- `user_settings` - UserSettings object
- `body_measurements` - Array of BodyMeasurement objects
- `user_goals` - Array of UserGoal objects
- `user_profile` - UserProfile object

**Patterns**:
- **Load on mount**: Context providers load data on app start
- **Save on change**: `useEffect` hooks save data when state changes (debounced by React)
- **Sanitization**: `sanitizeWorkout()` ensures exercises is always an array
- **Migration**: `migrateExercise()`, `migrateAssistedMachine()` update legacy data on load

### Data Initialization & Migration

**Database Migrations**:
- Version-based migration system (`DATABASE_VERSION = 8`)
- Migrations add columns, reseed data, or restructure tables
- Example: v7 → v8 added `upper_lower` column to `primary_muscles`

**App Data Migration**:
- `migrateExercise()` - Updates legacy equipment labels to new format
- `migrateAssistedMachine()` - Adds `assistedNegative` flag to exercises
- Runs on every app load when reading from AsyncStorage

---

## 7. Type System

### Main TypeScript Types & Interfaces

#### **Core Domain Types**

```typescript
// Workout tree structure
Workout {
  id, name, startedAt, finishedAt?, endedAt?, duration?, date?
  exercises: ExerciseItem[]
  sessionNotes?: SessionNote[]
}

ExerciseItem = Exercise | ExerciseGroup

Exercise {
  instanceId, exerciseId, name, category
  type: 'exercise'
  sets: Set[]
  notes?: Note[]
  // Configuration
  weightUnit?, trackDuration?, trackReps?, trackDistance?
  weightEquipTags?, multiplyWeightBy2?, alternatingRepsBy2?
  weightCalcMode?, repsConfigMode?
  distanceUnitSystem?, distanceUnit?, assistedNegative?
  collapsed?
}

ExerciseGroup {
  instanceId
  type: 'group'
  groupType: 'Superset' | 'HIIT'
  children: Exercise[]
}

Set {
  id, type: SetType
  weight, weight2?, reps, reps2?, duration, distance
  completed: boolean
  restPeriodSeconds?, restTimerCompleted?
  dropSetId?, isWarmup?, isDropset?, isFailure?
}
```

#### **Library & Stats**

```typescript
ExerciseLibraryItem {
  id, name, category: ExerciseCategory
  pinnedNotes?: Note[]
  assistedNegative?: boolean
  [key: string]: unknown  // Flexible for configuration fields
}

ExerciseStats {
  pr: number
  lastPerformed: string | null
  history: Array<{ date, sets }>
}

ExerciseStatsMap = Record<string, ExerciseStats>
```

#### **Configuration & Settings**

```typescript
UserSettings {
  distanceUnit: 'US' | 'Metric'
  weightUnit: 'lbs' | 'kg'
  weightCalcMode: '1x' | '2x'
  repsConfigMode: '1x' | '2x' | 'lrSplit'
  defaultRestTimerSeconds: number
  vibrateOnTimerFinish: boolean
  keepScreenAwake: boolean
}

UserProfile {
  id, name, email, phone?, address?, profilePictureUri?
  dateOfBirth?, bio?, bodyWeight?
  createdAt, updatedAt
}

BodyMeasurement {
  id, date, weight?, bodyFatPercent?
  neck?, chest?, waist?, leftArm?, rightArm?, leftThigh?, rightThigh?
  unit: WeightUnit
  circumferenceUnit: 'in' | 'cm'
}

UserGoal {
  id, type: 'strength' | 'consistency'
  // Strength fields
  exerciseId?, exerciseName?, targetWeight?, targetWeightUnit?
  // Consistency fields
  targetWorkoutsPerWeek?
  createdAt, completed
}
```

#### **UI State Types**

```typescript
WorkoutMode = 'live' | 'edit' | 'readonly'

FlatExerciseRow {
  type: 'group_header' | 'exercise'
  id, data: ExerciseItem
  depth: number  // 0 for top-level, 1 for grouped
  groupId: string | null
}

RestTimer {
  exerciseId, setId
  remainingSeconds, totalSeconds
  isPaused: boolean
}

FocusNextSet {
  exerciseId, setId
  field: 'weight' | 'weight2' | 'reps' | 'reps2' | 'duration' | 'distance'
}

SupersetSelection {
  exerciseId, mode: 'create' | 'add' | 'edit'
  supersetId?
}

GroupSelectionMode {
  exerciseId
  type: 'drop_set'
  editingGroupId?, triggeringSetId?
}
```

### Type Safety Patterns

1. **Discriminated Unions**: `ExerciseItem` uses `type` field to differentiate Exercise vs ExerciseGroup
2. **Optional Chaining**: Extensive use for nested properties (e.g., `ex.weightEquipTags?.length`)
3. **Type Guards**: Functions like `item.type === 'exercise'` narrow types
4. **Strict Mode**: `tsconfig.json` has `"strict": true`
5. **Generic Types**: `Record<string, T>`, `Array<T>` for maps and lists
6. **Utility Types**: `Partial<T>`, `Pick<T, K>` for update operations
7. **Path Aliases**: `@/*` maps to `src/*` for clean imports

---

## 8. Navigation Structure

### Navigation Pattern
**Hybrid: Bottom Tabs + Modal Stack** (using `@react-navigation`)

```
<NavigationContainer>
  <Stack.Navigator>
    <Stack.Screen name="Main" component={MainTabs} />
    <Stack.Screen name="LiveWorkout" presentation="fullScreenModal" />
    <Stack.Screen name="EditWorkout" presentation="fullScreenModal" />
  </Stack.Navigator>
</NavigationContainer>

MainTabs (Bottom Tab Navigator):
  - History (HistoryScreen) - Tab 0
  - Library (LibraryScreen) - Tab 1
  - Log (LogScreen) - Tab 2 (Workout button)
  - Profile (ProfileIndex) - Tab 3
  - More (ComingSoonScreen) - Tab 4
```

### Stack Navigator (RootStackParamList)
```typescript
type RootStackParamList = {
  Main: undefined;
  LiveWorkout: undefined;
  EditWorkout: { workout: Workout };
};
```

### Navigation Flow

**Starting a Workout**:
1. User on LogScreen → taps "Start Empty Workout"
2. Calls `startEmptyWorkout()` (WorkoutContext)
3. Navigates to `LiveWorkout` screen
4. LiveWorkout renders WorkoutTemplate with `mode="live"`

**Viewing/Editing History**:
1. User on HistoryScreen → taps workout card
2. Navigates to `EditWorkout` with workout param
3. EditWorkout renders WorkoutTemplate with `mode="readonly"` initially
4. User taps edit → switches to `mode="edit"`

**Exercise Library**:
1. User on LibraryScreen → taps exercise
2. Opens `ExerciseHistoryModal` (not navigation, just modal)
3. User taps edit → opens `EditExercise` modal

### Tab Structure

| Tab | Icon | Label | Screen | Purpose |
|-----|------|-------|--------|---------|
| 0 | Calendar | Dash | HistoryScreen | View workout history |
| 1 | Book | Library | LibraryScreen | Manage exercises |
| 2 | Play (filled) | Workout | LogScreen | Start workout |
| 3 | User | Profile | ProfileIndex | Settings & stats |
| 4 | CircleDashed | More | ComingSoonScreen | Future features |

### Safe Area Handling
- All screens use `SafeAreaView` from `react-native-safe-area-context`
- Conditional edges: if `activeWorkout` exists, only show bottom/left/right edges (to make room for ActiveWorkoutBanner)

---

## 9. Custom Hooks

### WorkoutTemplate Hooks

| Hook | File | Purpose |
|------|------|---------|
| **useWorkoutRestTimer** | `useWorkoutRestTimer.ts` | Manages rest timer countdown, start/cancel, completion handling |
| **useWorkoutSupersets** | `useWorkoutSupersets.ts` | Superset selection mode, create/add/edit logic |
| **useWorkoutGroups** | `useWorkoutGroups.ts` | Drop-set selection mode, group creation/editing |
| **useWorkoutNotes** | `useWorkoutNotes.ts` | Session notes and exercise notes state, modal management |
| **useSetRowLogic** | `useSetRowLogic.ts` | SetRow focus management, refs, keyboard open/close |
| **useWorkoutDragDrop** | `useWorkoutDragDrop.ts` | Flatten/reconstruct exercises for drag-drop, reorder handler |
| **useSetDragAndDrop** | `useSetDragAndDrop.ts` | Set reordering within exercise, dropset editing |

### ProfileTab Hooks

| Hook | File | Purpose |
|------|------|---------|
| **useBodyStats** | `hooks/useBodyStats.ts` | Load/save body measurements, calculate weight/body fat deltas |
| **useGoals** | `hooks/useGoals.ts` | Load/save user goals, add/complete/delete operations |
| **usePersonalRecords** | `hooks/usePersonalRecords.ts` | Extract PRs from workout history |
| **useUserProfile** | `hooks/useUserProfile.ts` | Load/save user profile, image picker integration |

### Database Hooks (useExerciseConfig.ts)

All hooks load from SQLite and cache in memory:
- `useExerciseCategories()` - Returns `ExerciseCategory[]`
- `useCardioTypes()` - Returns `CardioType[]`
- `usePrimaryMuscles()`, `useSecondaryMuscles()`, `useTertiaryMuscles()` - Muscle data
- `useTrainingFocus()` - Training focus options
- `useEquipmentPickerSections()` - Hierarchical equipment data for picker
- `useGripTypes()`, `useGripWidths()` - Grip configuration options
- `useCableAttachments()` - Cable attachment options
- Legacy compatibility hooks (e.g., `useCategoriesAsStrings()`)

### Hook Composition Patterns

1. **Context Consumption**: Most hooks use `useContext()` to access WorkoutContext/UserSettingsContext
2. **AsyncStorage Integration**: Hooks like `useBodyStats` encapsulate load/save logic
3. **State + Effects**: Hooks manage local state and sync with AsyncStorage via `useEffect`
4. **Derived State**: Hooks calculate derived values (e.g., `getWeightDelta()` in useBodyStats)
5. **Callback Memoization**: Use `useCallback` to prevent re-renders

---

## 10. External Dependencies

### Key Third-Party Libraries

#### **Navigation & Routing**
- `@react-navigation/native` (^7.0.0) - Core navigation
- `@react-navigation/bottom-tabs` (^7.0.0) - Tab navigator
- `@react-navigation/native-stack` (^7.0.0) - Stack navigator
- `react-native-screens` (~4.16.0) - Native screen optimization
- `react-native-safe-area-context` (~5.6.0) - Safe area handling

#### **Gestures & Animations**
- `react-native-gesture-handler` (~2.28.0) - Touch gestures
- `react-native-reanimated` (^4.1.1) - Animations (shared values, worklets)
- `react-native-worklets` (^0.5.1) - Worklet runtime
- `react-native-draggable-flatlist` (^4.0.3) - Drag-and-drop lists (patched)

#### **Data & Storage**
- `@react-native-async-storage/async-storage` (2.2.0) - Persistent key-value storage
- `expo-sqlite` (~16.0.10) - SQLite database

#### **Media & Assets**
- `expo-asset` (^12.0.12) - Asset management
- `expo-font` (~14.0.11) - Custom fonts
- `expo-image-picker` (~17.0.10) - Photo picker
- `lucide-react-native` (latest) - Icon library

#### **Expo SDK**
- `expo` (~54.0.33) - Expo framework
- `expo-dev-client` (~6.0.20) - Development build
- `expo-constants` (~18.0.13) - App constants
- `expo-status-bar` (~3.0.9) - Status bar control

#### **UI Components**
- `react-native-svg` (15.12.1) - SVG rendering
- `@react-native-community/datetimepicker` (8.4.4) - Date/time picker

### Native Modules Being Used

1. **expo-sqlite**: Local database for reference data
2. **expo-image-picker**: Camera/gallery access for profile pictures
3. **@react-native-async-storage/async-storage**: Native storage APIs
4. **react-native-screens**: Native screen management for better performance
5. **react-native-reanimated**: Native animation thread (uses worklets)
6. **react-native-gesture-handler**: Native gesture recognizers

### Patches Applied
- `react-native-draggable-flatlist+4.0.3.patch` - Custom modifications (see `patches/` directory)

---

## Summary & Technical Debt

### Code Patterns & Conventions

**Naming Conventions**:
- Components: PascalCase (e.g., `WorkoutTemplate`)
- Files: Match component name (e.g., `WorkoutTemplate.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useWorkoutRestTimer`)
- Types: PascalCase (e.g., `ExerciseItem`, `SetType`)
- Constants: UPPER_SNAKE_CASE or PascalCase

**File Organization**:
- Index files for re-exports (e.g., `components/ExerciseEditor/index.ts`)
- Colocation: Hooks, components, modals grouped with feature (e.g., WorkoutTemplate/)
- Separation of concerns: utils/ for pure functions, context/ for global state

**TypeScript Usage**:
- Strict mode enabled
- Extensive use of interfaces and type aliases
- Optional properties for flexibility
- Discriminated unions for polymorphism

### Technical Debt & Refactoring Needs

**Critical Areas** (Documented in `ARCHITECTURE_MAP.md`):

1. **WorkoutTemplate (indexWorkoutTemplate.tsx)** - 4,100+ lines
   - **Issues**: God component, tight coupling of UI and business logic, 40+ state variables, inline handlers
   - **Recommendation**: Extract state machine or reducer, separate business logic layer, break into sub-components

2. **SetRow (SetRow.tsx)** - 1,700+ lines
   - **Issues**: 40+ props, mixing presentation with validation/parsing logic
   - **Recommendation**: Extract parsing/formatting utilities, reduce prop drilling via context or composition

3. **ExercisePicker (ExercisePickerIndex.tsx)** - 1,900+ lines
   - **Issues**: Mixed concerns (filtering, selection, set config, drag-drop), heavy local state
   - **Recommendation**: Separate filtering logic, extract set configuration UI, simplify state management

4. **SetRowDragAndDropModal** - 1,100+ lines
   - **Issues**: Complex drag-drop logic mixed with UI, large inline styles
   - **Recommendation**: Extract drag-drop logic to hook, move styles to StyleSheet

### Areas Identified for Improvement

**Architecture**:
- **State Management**: Consider Redux or Zustand for complex state (especially in WorkoutTemplate)
- **Component Size**: Break large components into smaller, focused components
- **Prop Drilling**: Use composition or context to reduce prop passing
- **Business Logic**: Extract to services or hooks (especially weight calculations, time parsing)

**Performance**:
- **Memoization**: Use `React.memo`, `useMemo`, `useCallback` more extensively in large lists
- **Virtualization**: Consider `FlashList` instead of `FlatList` for long lists
- **Reanimated**: Move more animations to UI thread using worklets

**Type Safety**:
- **Any Types**: Replace `any` with proper types (e.g., `groupsMetadata: any` in WorkoutTemplate)
- **Dynamic Fields**: Consider more specific types for `[key: string]: unknown` in ExerciseLibraryItem

**Testing**:
- **No test files found**: Add unit tests for utils, integration tests for contexts, component tests

**Data Validation**:
- Add runtime validation (e.g., Zod, Yup) for AsyncStorage data to prevent corruption

**Code Duplication**:
- Shared logic between `useWorkoutRestTimer`, `useWorkoutGroups`, `useWorkoutSupersets` could be abstracted
- Similar patterns in ProfileTab hooks (load/save from AsyncStorage) could be generalized

---

## Conclusion

This is a **feature-rich, well-structured workout tracking application** with a comprehensive exercise configuration system. The codebase demonstrates:

**Strengths**:
- Clear separation of concerns (contexts, utils, components)
- Type-safe TypeScript with strict mode
- Comprehensive data modeling for workouts and exercises
- Flexible exercise configuration system (tracked fields, equipment, muscles, motions)
- Good use of custom hooks for logic encapsulation
- AsyncStorage + SQLite hybrid approach for data persistence
- Well-documented architecture (ARCHITECTURE_MAP.md, REFACTOR_PLAN.md, FEATURE_PLAN.md)

**Areas for Growth**:
- Refactor large components (WorkoutTemplate, SetRow, ExercisePicker)
- Extract business logic from UI components
- Reduce state complexity in WorkoutTemplate
- Add automated testing
- Improve performance with memoization and virtualization

The application is production-ready but would benefit significantly from the refactoring efforts outlined in the existing REFACTOR_PLAN.md, particularly around the WorkoutTemplate component which serves as the core of the workout logging experience.
