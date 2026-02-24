# Only Fit - Comprehensive Codebase Analysis Report

**Generated:** February 20, 2026  
**Project:** Only Fit Fitness Tracking Ecosystem  
**Components:** Admin Panel, Mobile App (React Native), Web App (Next.js)

---

## Executive Summary

Only Fit is a comprehensive fitness tracking ecosystem consisting of three interconnected components:

1. **Admin Panel** - Local web-based tool for managing exercise configuration data (JSON tables)
2. **Mobile App** - React Native/Expo application for workout logging and tracking
3. **Web App** - Next.js marketing site and user dashboard (currently mock data)

**Key Architecture Pattern:** The admin panel manages reference data (JSON files) that the mobile app consumes via SQLite. The web app is designed to eventually sync with mobile app data through a backend API (currently uses mock data).

---

## Table of Contents

1. [Admin Panel Analysis](#1-admin-panel-analysis)
2. [Mobile App Analysis](#2-mobile-app-analysis)
3. [Web App Analysis](#3-web-app-analysis)
4. [Interconnections & Data Flow](#4-interconnections--data-flow)
5. [Technology Stack Comparison](#5-technology-stack-comparison)
6. [Data Models & Type System](#6-data-models--type-system)
7. [Future Integration Roadmap](#7-future-integration-roadmap)

---

## 1. Admin Panel Analysis

### 1.1 Overview

**Purpose:** Local-only web application for managing exercise configuration tables stored as JSON files in `src/database/tables/`. This is a developer/admin tool, not a user-facing application.

**Location:** `admin/` folder at project root

**Technology Stack:**
- **Frontend:** React 19 + Vite + TypeScript + TailwindCSS
- **Backend:** Express.js (Node.js) server
- **State Management:** React hooks (useState, useEffect)
- **UI Libraries:** React Router DOM, React Hot Toast, React Flow (@xyflow/react)
- **Architecture:** Monorepo-style, separate from mobile app

### 1.2 Architecture

```
admin/
├── server/                 # Express backend
│   ├── index.ts           # Server entry point (port 3001)
│   ├── tableRegistry.ts   # Schema definitions for all 27 JSON tables
│   ├── tableRegistry.ts   # File operations (read/write JSON)
│   └── routes/
│       ├── tables.ts      # CRUD endpoints for tables
│       └── schema.ts      # Schema/metadata endpoints
├── src/                    # React frontend
│   ├── App.tsx            # Main app router
│   ├── api.ts             # API client
│   ├── pages/
│   │   ├── Dashboard.tsx  # Table browser with row counts
│   │   ├── TableEditor.tsx # Main CRUD interface
│   │   ├── FilterMatrix.tsx # Bulk matrix editor
│   │   └── RelationshipGraph.tsx # Visual FK graph
│   └── components/
│       ├── RowEditor.tsx  # Row detail panel
│       ├── FieldRenderers/ # Specialized field editors
│       └── ...
└── package.json
```

### 1.3 Core Features

#### 1.3.1 Table Management (27 JSON Tables)

The admin manages **27 JSON tables** organized into 5 groups:

**Exercise Setup (3 tables):**
- `exerciseCategories.json` - Exercise category definitions
- `cardioTypes.json` - Cardio exercise types
- `trainingFocus.json` - Training focus categories

**Muscles (4 tables - hierarchical):**
- `muscleGroups.json` - Top-level muscle groups (Chest, Back, etc.)
- `primaryMuscles.json` - Primary muscle definitions
- `secondaryMuscles.json` - FK: references primary muscles
- `tertiaryMuscles.json` - FK: references secondary muscles

**Equipment (5 tables):**
- `equipmentCategories.json` - Equipment category hierarchy
- `gymEquipment.json` - Gym equipment catalog (~100+ items)
- `cableAttachments.json` - Cable machine attachments
- `supportEquipmentCategories.json` - Support equipment
- `weightsEquipmentCategories.json` - Weight equipment categories

**Motions (3 tables):**
- `motionPlanes.json` - Motion plane definitions
- `primaryMotions.json` - Primary motion types
- `primaryMotionVariations.json` - FK: motion variations

**Grips & Stance (6 tables):**
- `gripTypes.json` - Grip type definitions
- `gripWidths.json` - Grip width options
- `gripTypeVariations.json` - Grip variations
- `stanceTypes.json` - Stance type definitions
- `stanceWidths.json` - Stance width options
- `loadingAids.json` - Loading aid equipment

**Additional Tables (6):**
- `equipmentIcons.json` - Key-value map for equipment icons
- `torsoOrientations.json` - Body positioning
- `torsoAngles.json` - Torso angle options
- `footPositions.json` - Foot positioning
- `supportStructures.json` - Support structure definitions
- `elbowRelationship.json` - Elbow positioning relationships

#### 1.3.2 Schema-Driven UI

**Central Schema Registry** (`admin/server/tableRegistry.ts`):
- Defines field types: `string`, `number`, `boolean`, `string[]`, `json`, `fk`, `fk[]`
- Foreign key relationships with `refTable` and `refLabelField`
- JSON shape hints for specialized editors (`muscle_targets`, `motion_planes_config`, etc.)
- Default values and required field validation

**Dynamic Field Renderers:**
- `StringField.tsx` - Text input
- `NumberField.tsx` - Numeric input
- `BooleanField.tsx` - Checkbox
- `ArrayField.tsx` - Array editor (add/remove items)
- `FKDropdown.tsx` - Foreign key single-select dropdown
- `FKMultiSelect.tsx` - Foreign key multi-select
- `JsonEditor.tsx` - JSON editor with shape-specific UIs
- `MuscleTargetTree.tsx` - Specialized muscle target hierarchy editor
- `MotionConfigTree.tsx` - Motion configuration tree editor
- `MatrixFieldCheckboxGrid.tsx` - Checkbox grid for filter matrices

#### 1.3.3 CRUD Operations

**Table Editor Page** (`TableEditor.tsx`):
- **Data Grid:** Sortable, filterable table view
- **Row Detail Panel:** Side panel for editing individual rows
- **Add Row:** Create new records with default values
- **Update Row:** Edit existing records with validation
- **Delete Row:** With FK integrity checks (warns about downstream references)
- **Drag-to-Reorder:** Reorder rows by `sort_order` field
- **Bulk Import:** Import rows from JSON via modal
- **Column Settings:** Show/hide columns, adjust widths

**API Endpoints:**
```
GET    /api/tables              # List all tables with row counts
GET    /api/tables/:key         # Get all rows for a table
PUT    /api/tables/:key         # Replace entire table
POST   /api/tables/:key/rows    # Add new row
PUT    /api/tables/:key/rows/:id # Update row
DELETE /api/tables/:key/rows/:id # Delete row
POST   /api/tables/:key/reorder # Reorder rows
```

#### 1.3.4 Specialized Features

**Filter Matrix Editor** (`FilterMatrix.tsx`):
- Bulk editing of grip/stance configurations for equipment
- Checkbox grid interface for `gymEquipment` and `cableAttachments`
- Updates multiple rows simultaneously

**Relationship Graph** (`RelationshipGraph.tsx`):
- Visual graph showing foreign key relationships between tables
- Uses React Flow (@xyflow/react) for node/edge visualization
- Interactive exploration of data dependencies

**FK Integrity Checks:**
- Before deleting a row, checks for references in other tables
- Shows warning with list of dependent records
- Option to break links or reassign to another record

**Muscle Target Visualization:**
- Color-coded bars showing muscle group targeting scores
- Tooltip on hover showing detailed breakdown
- Used in exercise configuration editing

### 1.4 Data Flow

```
Admin UI (React)
    ↓ HTTP REST API
Express Server (port 3001)
    ↓ fs.readFile / fs.writeFile
JSON Files (src/database/tables/*.json)
    ↓ require() on app load
Mobile App (initDatabase.ts)
    ↓ SQLite INSERT
SQLite Database (workout.db)
```

**Key Points:**
- Admin writes JSON files directly to filesystem
- Mobile app reads JSON files on startup and seeds SQLite
- No runtime connection between admin and mobile app
- Changes require mobile app restart to take effect

### 1.5 File Operations

**Atomic Writes:**
- Uses temporary files + rename for atomic writes
- Prevents corruption if write is interrupted
- Validates JSON before writing

**Validation:**
- Schema-based validation before save
- Required field checks
- Type checking (string, number, boolean, etc.)
- FK reference validation

---

## 2. Mobile App Analysis

### 2.1 Overview

**Purpose:** Primary user-facing fitness tracking application for iOS and Android.

**Location:** Root directory (React Native/Expo project)

**Technology Stack:**
- **Framework:** React Native 0.81.5 + Expo SDK ~54.0.33
- **React:** 19.1.0
- **Navigation:** React Navigation 7.0.0 (Bottom Tabs + Native Stack)
- **State Management:** React Context API (WorkoutContext, UserSettingsContext)
- **Data Persistence:**
  - `@react-native-async-storage/async-storage` (2.2.0) - User data
  - `expo-sqlite` (~16.0.10) - Reference data
- **UI Libraries:**
  - `lucide-react-native` - Icons
  - `react-native-gesture-handler` (~2.28.0)
  - `react-native-reanimated` (^4.1.1)
  - `react-native-draggable-flatlist` (^4.0.3)
- **TypeScript:** ~5.9.2 (strict mode)

### 2.2 Architecture

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Shared primitives
│   ├── ExerciseEditor/ # Exercise creation/editing (11 files)
│   ├── WorkoutTemplate/ # Core workout UI (~4,100+ lines)
│   └── ...
├── context/            # Global state (2 contexts)
│   ├── WorkoutContext.tsx      # Workout data hub
│   └── UserSettingsContext.tsx # User preferences
├── database/           # SQLite + reference data
│   ├── initDatabase.ts         # DB initialization (~852 lines)
│   ├── exerciseConfigService.ts # Typed queries (~567 lines)
│   ├── useExerciseConfig.ts    # React hooks (~444 lines)
│   └── tables/                # 27 JSON reference files
├── screens/            # Top-level navigation screens
│   ├── LogScreen.tsx           # Start workout
│   ├── LiveWorkoutScreen.tsx   # Active workout flow
│   ├── EditWorkoutScreen.tsx   # Edit past workout
│   ├── HistoryScreen.tsx       # Workout history
│   ├── LibraryScreen.tsx       # Exercise library
│   └── ProfileTab/             # Profile, settings, goals
├── types/              # TypeScript definitions
│   └── workout.ts      # Core domain types
└── utils/             # Pure helper functions
    ├── workoutHelpers.ts
    ├── workoutInstanceHelpers.ts
    ├── exerciseFilters.ts
    └── equipmentIcons.ts
```

### 2.3 Core Features

#### 2.3.1 Workout Logging

**Live Workout Flow:**
1. User starts empty workout from `LogScreen`
2. `LiveWorkoutScreen` renders `WorkoutTemplate` component
3. User adds exercises from library or creates new ones
4. Logs sets with weight, reps, duration, distance
5. Manages rest timers between sets
6. Creates supersets and dropsets
7. Adds exercise notes and session notes
8. Finishes workout → saves to history

**WorkoutTemplate Component** (`components/WorkoutTemplate/indexWorkoutTemplate.tsx`):
- **Size:** ~4,100+ lines (refactor priority)
- **Responsibilities:**
  - Exercise list rendering
  - Set row management
  - Rest timer orchestration
  - Superset/dropset grouping
  - Drag-and-drop reordering
  - Modal management (notes, finish, cancel)
  - Keyboard navigation
  - Focus management

**SetRow Component** (`components/WorkoutTemplate/SetRow.tsx`):
- **Size:** ~1,700+ lines
- **Features:**
  - Weight/reps/duration/distance input
  - Custom numeric keyboard
  - Set type (Working/Warmup/Failure)
  - Dropset marking
  - Rest timer integration
  - Focus management for keyboard navigation

#### 2.3.2 Exercise Library

**Exercise Library Screen** (`screens/LibraryScreen.tsx`):
- Browse all exercises (default + custom)
- Filter by category, muscle group, equipment
- Search by name
- Create new exercises
- Edit existing exercises
- View exercise history

**Exercise Editor** (`components/ExerciseEditor/`):
- **EditExercise.tsx** - Main modal for creating/editing
- **EditExerciseFields.tsx** - Dynamic field configuration
- **EquipmentPickerModal.tsx** - Multi-select equipment
- **GripTypeWidthPicker.tsx** - Grip configuration
- **StanceTypeWidthPicker.tsx** - Stance configuration
- **MotionPickerModal.tsx** - Motion plane/variation picker

**Exercise Configuration:**
- Category (Lifts/Cardio/Training)
- Muscle targets (primary/secondary/tertiary)
- Equipment selection
- Grip type and width
- Stance type and width
- Motion planes and variations
- Custom notes (pinned to exercise)

#### 2.3.3 Workout History

**History Screen** (`screens/HistoryScreen.tsx`):
- List of completed workouts
- Filter by date range
- View workout details
- Edit past workouts
- Delete workouts
- Statistics overview

**Edit Workout Screen** (`screens/EditWorkoutScreen.tsx`):
- Reuses `WorkoutTemplate` in edit mode
- Allows modifying completed workouts
- Updates history on save

#### 2.3.4 Rest Timers

**Rest Timer System:**
- Configurable default rest time (UserSettings)
- Per-set rest periods
- Visual countdown bar (`RestTimerBar.tsx`)
- Full-screen rest timer popup
- Vibration on completion (optional)
- Pause/resume functionality

**Implementation:**
- `useWorkoutRestTimer.ts` hook manages timer state
- `RestTimerBar.tsx` displays visual progress
- `ActiveRestTimerPopup.tsx` full-screen view

#### 2.3.5 Supersets & Dropsets

**Superset Creation:**
- Select multiple exercises
- Group into superset
- Alternating set logging
- `useWorkoutSupersets.ts` hook manages logic

**Dropset Creation:**
- Mark sets as dropsets
- Link dropset sets together
- Visual grouping in UI
- `useWorkoutGroups.ts` hook manages grouping

#### 2.3.6 Exercise Statistics

**Exercise Stats Tracking:**
- Personal records (PRs)
- Last performed date
- Historical set data
- Volume calculations
- Progress tracking

**Stats Storage:**
- `exercise_stats` key in AsyncStorage
- `ExerciseStatsMap` type: `Record<string, ExerciseStats>`
- Updated automatically when workout finishes

#### 2.3.7 Profile & Settings

**Profile Tab** (`screens/ProfileTab/`):
- User profile (name, photo, body weight)
- Body measurements tracking
- Goals (strength, consistency)
- Personal records display
- App settings

**User Settings** (`context/UserSettingsContext.tsx`):
- Weight unit (lbs/kg)
- Distance unit system (US/Metric)
- Weight calculation mode (1x/2x for dumbbells)
- Reps configuration mode (1x/2x/left-right split)
- Default rest timer seconds
- Vibration on timer finish
- Keep screen awake during workout

**Body Measurements:**
- Weight tracking
- Body fat percentage
- Circumference measurements (neck, chest, waist, arms, thighs)
- Unit preferences (weight: lbs/kg, circumference: in/cm)

**Goals:**
- Strength goals (target weight for specific exercise)
- Consistency goals (workouts per week)
- Progress tracking
- Completion status

### 2.4 Data Persistence

#### 2.4.1 AsyncStorage (User Data)

**Storage Keys:**
- `workout_history` - Array of completed `Workout` objects
- `exercise_library` - Array of `ExerciseLibraryItem` objects
- `active_workout` - Single `Workout` object (or null)
- `exercise_stats` - `ExerciseStatsMap` object
- `user_settings` - `UserSettings` object
- `body_measurements` - Array of `BodyMeasurement` objects
- `user_goals` - Array of `UserGoal` objects
- `user_profile` - `UserProfile` object

**Persistence Pattern:**
- Load on app start (WorkoutContext, UserSettingsContext)
- Save on state change (useEffect hooks)
- Automatic persistence (no manual save buttons)

#### 2.4.2 SQLite Database (Reference Data)

**Database:** `workout.db` (created by `expo-sqlite`)

**Tables (20+ tables):**
- Exercise categories, cardio types, training focus
- Muscle groups, primary/secondary/tertiary muscles
- Equipment categories, gym equipment, cable attachments
- Grip types, grip widths, grip variations
- Stance types, stance widths
- Motion planes, primary motions, motion variations
- Equipment icons (key-value map)

**Initialization Flow:**
1. App loads → `initExerciseConfigDatabase()` called
2. `initDatabase()` opens/creates database
3. Check version → run migrations if needed (current: v17)
4. Re-seed equipment, muscles, grips from JSON on every load
5. Database instance cached in `useExerciseConfig.ts`

**Migration System:**
- Version-based migrations (`DATABASE_VERSION = 17`)
- Migrations add columns, reseed data, restructure tables
- Example: v7 → v8 added `upper_lower` column to `primary_muscles`

**Data Source:**
- JSON files in `src/database/tables/` (managed by admin panel)
- Read on app startup
- Seeded into SQLite for fast querying

### 2.5 Navigation Structure

**Bottom Tab Navigator (Main Tabs):**
1. **Dash (History)** - Workout history and statistics
2. **Library** - Exercise library browser
3. **Workout (Log)** - Start new workout
4. **Profile** - User profile, settings, goals
5. **More** - Coming soon placeholder

**Stack Navigator (Modals):**
- `LiveWorkout` - Full-screen workout modal
- `EditWorkout` - Full-screen edit modal

**Navigation Flow:**
```
App.tsx
  └── NavigationContainer
      └── Stack Navigator
          ├── Main (Bottom Tabs)
          │   ├── HistoryScreen
          │   ├── LibraryScreen
          │   ├── LogScreen
          │   ├── ProfileIndex
          │   └── ComingSoonScreen
          ├── LiveWorkout (Modal)
          │   └── LiveWorkoutScreen
          │       └── WorkoutTemplate
          └── EditWorkout (Modal)
              └── EditWorkoutScreen
                  └── WorkoutTemplate (edit mode)
```

### 2.6 State Management

#### 2.6.1 WorkoutContext

**State:**
- `activeWorkout: Workout | null` - Current live workout
- `workoutHistory: Workout[]` - Completed workouts
- `exercisesLibrary: ExerciseLibraryItem[]` - Exercise definitions
- `exerciseStats: ExerciseStatsMap` - PRs and history
- `isLoading: boolean` - Loading state

**Actions:**
- `startEmptyWorkout()` - Create new workout
- `updateWorkout(workout)` - Update active workout
- `updateHistory(workout)` - Update history entry
- `finishWorkout(bodyWeight?)` - Save workout to history
- `cancelWorkout()` - Discard active workout
- `addExerciseToLibrary(exercise)` - Add custom exercise
- `updateExerciseInLibrary(id, updates)` - Update exercise

**Persistence:**
- Loads from AsyncStorage on mount
- Saves to AsyncStorage on state change (useEffect)

#### 2.6.2 UserSettingsContext

**State:**
- `settings: UserSettings` - User preferences

**Actions:**
- `updateSettings(updates)` - Update preferences

**Persistence:**
- Loads from AsyncStorage on mount
- Saves to AsyncStorage on change

---

## 3. Web App Analysis

### 3.1 Overview

**Purpose:** Marketing website and user dashboard for Only Fit mobile app.

**Location:** `web/` folder

**Technology Stack:**
- **Framework:** Next.js 14.2.0 (App Router)
- **React:** 18.3.0
- **Styling:** TailwindCSS 3.4.4
- **Charts:** Recharts 2.12.0
- **Icons:** Lucide React 0.400.0
- **TypeScript:** 5.5.0

### 3.2 Architecture

```
web/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles + Tailwind
│   ├── pricing/          # Pricing page
│   ├── privacy/           # Privacy policy
│   ├── terms/             # Terms of service
│   └── dashboard/        # Protected dashboard
│       ├── layout.tsx     # Auth gate + dashboard layout
│       ├── LoginForm.tsx  # Mock login form
│       ├── page.tsx       # Overview with stats & charts
│       ├── history/       # Workout history table
│       ├── analytics/     # Exercise analytics & charts
│       ├── measurements/  # Body measurements tracking
│       └── goals/         # Goal tracking & progress
├── components/
│   ├── marketing/         # Landing page components
│   │   ├── Navbar.tsx
│   │   ├── HeroSection.tsx
│   │   ├── FeatureSection.tsx
│   │   ├── PricingTable.tsx
│   │   ├── SocialProof.tsx
│   │   ├── Footer.tsx
│   │   ├── PhoneMockup.tsx
│   │   ├── AppleWatchMockup.tsx
│   │   ├── TabletMockup.tsx
│   │   └── BackgroundWave.tsx
│   ├── dashboard/         # Dashboard components
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatCard.tsx
│   │   ├── ChartCard.tsx
│   │   ├── GoalCard.tsx
│   │   └── Charts.tsx (Recharts wrapper)
│   └── ui/                # Reusable UI primitives
│       ├── Button.tsx
│       ├── BrandIcon.tsx
│       └── Input.tsx
├── lib/
│   ├── auth-context.tsx   # Mock authentication
│   ├── mockData.ts        # Mock data layer
│   └── utils.ts           # Utility functions
├── types/
│   └── index.ts           # TypeScript types (from mobile app)
└── constants/
    └── index.ts           # Brand, navigation, features
```

### 3.3 Core Features

#### 3.3.1 Marketing Website

**Landing Page** (`app/page.tsx`):
- **Hero Section:**
  - Large headline: "Track Your Fitness. Achieve Your Goals."
  - Green CTA button: "Get Started"
  - App Store + Google Play badges
  - Device mockups (iPhone, Apple Watch, Tablet)
  - Orange gradient background with wave shapes

- **Feature Sections:**
  - Live Workout Logging
  - Exercise Library
  - Smart Analytics
  - Built for Everyone

- **Social Proof:**
  - Testimonials
  - Usage statistics
  - Star ratings

- **Pricing Table:**
  - Free vs PRO comparison
  - Feature lists
  - CTA buttons

- **Footer:**
  - Navigation links
  - Legal pages
  - Social media links
  - Copyright

**Additional Pages:**
- `/pricing` - Detailed pricing page
- `/privacy` - Privacy policy
- `/terms` - Terms of service

#### 3.3.2 User Dashboard

**Authentication:**
- Mock authentication (`lib/auth-context.tsx`)
- Login form accepts any email/password
- Protected routes via `AuthGate` component
- Session stored in React state (no persistence)

**Dashboard Overview** (`app/dashboard/page.tsx`):
- **Stat Cards:**
  - Total Workouts
  - Current Streak
  - Total Volume
  - Best PR
  - Active Goals

- **Charts (Recharts):**
  - Volume Over Time (Line Chart)
  - Workout Frequency (Bar Chart)
  - 1RM Progression (Line Chart)

**Workout History** (`app/dashboard/history/page.tsx`):
- Table of completed workouts
- Date filters
- Expandable rows showing exercises and sets
- PR badges for personal records
- Sortable columns

**Exercise Analytics** (`app/dashboard/analytics/page.tsx`):
- Exercise dropdown selector
- Weight progression chart
- Rep progression chart
- PR timeline
- Historical sets table

**Body Measurements** (`app/dashboard/measurements/page.tsx`):
- Weight chart over time
- Body fat percentage chart
- Measurement cards (neck, chest, waist, arms, thighs)
- Trend indicators (up/down arrows)

**Goals** (`app/dashboard/goals/page.tsx`):
- Active goals list
- Completed goals list
- Progress bars (orange track, green fill)
- Goal type indicators (strength/consistency)

### 3.4 Data Architecture

#### 3.4.1 Mock Data Layer

**Current Implementation** (`lib/mockData.ts`):
- Static mock data matching mobile app types
- `getUserData()` function returns `DashboardData`
- No backend connection (yet)

**Mock Data Structure:**
```typescript
{
  user: UserProfile,
  workoutHistory: Workout[],
  exerciseStats: ExerciseStatsMap,
  bodyMeasurements: BodyMeasurement[],
  goals: UserGoal[],
  personalRecords: PersonalRecord[]
}
```

**Future Integration:**
- Replace `getUserData()` with API calls
- Create API routes in `app/api/` or external API
- Implement real authentication (NextAuth, Clerk, etc.)

#### 3.4.2 Type System

**Types** (`types/index.ts`):
- Ported from mobile app (`src/types/workout.ts`)
- Shared types: `Workout`, `Exercise`, `WorkoutSet`, `ExerciseStats`, etc.
- Additional web-specific: `DashboardData`, `UserProfile`

**Type Consistency:**
- Web app types match mobile app types
- Ensures compatibility when syncing data
- Single source of truth (mobile app types)

### 3.5 Theme System

**Color Palette:**
- Primary: `#FF6B35` (Energetic Orange)
- Accent: `#10B981` (Vibrant Green)
- Warning: `#F59E0B` (Amber)
- Neutrals: `#2D2D2D` (Dark), `#F7F7F7` (Light), `#FFFFFF` (White)

**CSS Variables** (`app/globals.css`):
```css
:root {
  --primary: #FF6B35;
  --accent: #10B981;
  --warning: #F59E0B;
  --neutral-dark: #2D2D2D;
  --neutral-light: #F7F7F7;
  --white: #FFFFFF;
}
```

**Tailwind Integration:**
- Extended theme with full shade scales (50-900)
- Custom color utilities
- Consistent branding across components

---

## 4. Interconnections & Data Flow

### 4.1 Admin Panel ↔ Mobile App

**Connection Type:** File-based (JSON files)

**Flow:**
```
Admin Panel (React UI)
    ↓ User edits data
Express Server (port 3001)
    ↓ fs.writeFile
JSON Files (src/database/tables/*.json)
    ↓ App restart
Mobile App (initDatabase.ts)
    ↓ require() JSON files
    ↓ SQLite INSERT
SQLite Database (workout.db)
    ↓ Query via hooks
Mobile App UI
```

**Key Points:**
- **One-way:** Admin → Mobile (admin writes, mobile reads)
- **No runtime sync:** Changes require mobile app restart
- **Shared data:** 27 JSON tables managed by admin, consumed by mobile
- **Schema sync:** Admin schema registry must match mobile app expectations

**Data Shared:**
- Exercise categories, cardio types, training focus
- Muscle hierarchy (groups → primary → secondary → tertiary)
- Equipment catalog (gym equipment, cable attachments, categories)
- Grip types, widths, variations
- Stance types, widths
- Motion planes, motions, variations
- Equipment icons

### 4.2 Mobile App ↔ Web App

**Connection Type:** Currently disconnected (future: API-based)

**Current State:**
- Web app uses mock data (`lib/mockData.ts`)
- No backend connection
- Types are shared (ensures compatibility)

**Future Integration Flow:**
```
Mobile App (AsyncStorage)
    ↓ User syncs data
Backend API (future)
    ↓ Store in database
Web App Dashboard
    ↓ fetch('/api/user')
    ↓ Display data
```

**Planned Integration:**
1. **Backend API:**
   - REST API or GraphQL
   - PostgreSQL database (suggested schema in `web/README.md`)
   - Authentication (NextAuth, Clerk, or custom)

2. **Mobile App Sync:**
   - Export AsyncStorage data to API
   - Import API data to AsyncStorage
   - Conflict resolution strategy

3. **Web App Integration:**
   - Replace `getUserData()` with API calls
   - Real authentication
   - Real-time updates (optional: WebSockets)

**Data to Sync:**
- Workout history
- Exercise library (custom exercises)
- Exercise statistics
- Body measurements
- Goals
- Personal records
- User profile

**Not Synced (Local Only):**
- Active workout (resume capability)
- User settings (preferences)

### 4.3 Admin Panel ↔ Web App

**Connection Type:** None (admin is developer tool)

**Relationship:**
- Admin panel manages reference data for mobile app
- Web app does not use admin-managed data
- Web app uses user workout data (future: from backend)

### 4.4 Data Model Alignment

**Shared Types:**
- `Workout`, `Exercise`, `WorkoutSet` - Core workout types
- `ExerciseStats`, `ExerciseStatsMap` - Statistics
- `BodyMeasurement` - Body tracking
- `UserGoal`, `PersonalRecord` - Goals and PRs
- `UserProfile` - User information

**Type Sources:**
- **Mobile App:** `src/types/workout.ts` (source of truth)
- **Web App:** `web/types/index.ts` (ported from mobile)
- **Admin Panel:** Uses TypeScript but no shared types (manages JSON structure)

**Consistency:**
- Mobile and web types are aligned
- Ensures smooth data transfer when backend is implemented
- Admin panel JSON structure matches mobile app expectations

---

## 5. Technology Stack Comparison

| Component | Framework | State Management | Data Storage | UI Library |
|-----------|-----------|-----------------|--------------|------------|
| **Admin Panel** | React 19 + Vite | React hooks | JSON files (fs) | TailwindCSS |
| **Mobile App** | React Native + Expo | React Context | AsyncStorage + SQLite | React Native components |
| **Web App** | Next.js 14 | React Context | Mock data (future: API) | TailwindCSS + Recharts |

**Common Technologies:**
- **TypeScript:** All three use TypeScript (strict mode)
- **React:** All use React (different versions)
- **TailwindCSS:** Admin and Web use TailwindCSS

**Unique Technologies:**
- **Admin:** Express.js backend, React Flow for graphs
- **Mobile:** React Native, Expo SDK, SQLite, AsyncStorage
- **Web:** Next.js App Router, Recharts for charts

---

## 6. Data Models & Type System

### 6.1 Core Workout Types

**Workout:**
```typescript
interface Workout {
  id: string;
  name: string;
  startedAt: number;        // Timestamp
  finishedAt?: number;      // Timestamp
  exercises: ExerciseItem[]; // Exercise or ExerciseGroup
  sessionNotes?: SessionNote[];
  duration?: string;        // "60m"
  date?: string;            // ISO string
}
```

**Exercise:**
```typescript
interface Exercise {
  instanceId: string;       // Unique per workout instance
  exerciseId: string;       // References ExerciseLibraryItem
  name: string;
  category: ExerciseCategory; // "Lifts" | "Cardio" | "Training"
  type: "exercise";
  sets: WorkoutSet[];
  notes?: Note[];
  weightUnit?: WeightUnit;
  // ... configuration fields
}
```

**WorkoutSet:**
```typescript
interface WorkoutSet {
  id: string;
  type: SetType;            // "Working" | "Warmup" | "Failure"
  weight: string;          // User input (string for flexibility)
  weight2?: string;         // For dumbbells (left/right)
  reps: string;
  reps2?: string;           // For alternating reps
  duration: string;         // For cardio
  distance: string;         // For cardio
  completed: boolean;
  isWarmup?: boolean;
  isDropset?: boolean;
  isFailure?: boolean;
}
```

### 6.2 Exercise Library Types

**ExerciseLibraryItem:**
```typescript
interface ExerciseLibraryItem {
  id: string;
  name: string;
  category: ExerciseCategory;
  pinnedNotes?: Note[];
  // ... configuration fields (equipment, muscles, grips, etc.)
}
```

**ExerciseStats:**
```typescript
interface ExerciseStats {
  pr: number;              // Personal record weight
  lastPerformed: string | null; // ISO date
  history: Array<{
    date: string;
    sets: Array<{
      weight: string;
      reps: string;
      // ... set details
    }>;
  }>;
}
```

### 6.3 Profile & Settings Types

**UserSettings:**
```typescript
interface UserSettings {
  weightUnit: WeightUnit;              // "lbs" | "kg"
  distanceUnit: DistanceUnitSystem;    // "US" | "Metric"
  weightCalcMode: "1x" | "2x";         // For dumbbells
  repsConfigMode: "1x" | "2x" | "lrSplit";
  defaultRestTimerSeconds: number;
  vibrateOnTimerFinish: boolean;
  keepScreenAwake: boolean;
}
```

**BodyMeasurement:**
```typescript
interface BodyMeasurement {
  id: string;
  date: string;            // ISO string
  weight?: number;
  bodyFatPercent?: number;
  neck?: number;
  chest?: number;
  waist?: number;
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
  unit: WeightUnit;
  circumferenceUnit: "in" | "cm";
}
```

**UserGoal:**
```typescript
interface UserGoal {
  id: string;
  type: GoalType;          // "strength" | "consistency"
  exerciseId?: string;     // For strength goals
  exerciseName?: string;
  targetWeight?: number;
  targetWeightUnit?: WeightUnit;
  targetWorkoutsPerWeek?: number; // For consistency goals
  createdAt: string;
  completed: boolean;
}
```

### 6.4 Reference Data Types (Admin-Managed)

**JSON Table Structure:**
- All tables have: `id`, `label`, `sort_order`, `is_active`
- Many have: `technical_name`, `common_names`, `icon`, `short_description`
- Foreign keys: `primary_muscle_ids`, `secondary_muscle_ids`, etc.
- JSON fields: `muscle_targets`, `motion_planes_config`, etc.

---

## 7. Future Integration Roadmap

### 7.1 Backend API Development

**Recommended Stack:**
- **Database:** PostgreSQL (suggested schema in `web/README.md`)
- **API:** REST API or GraphQL
- **Authentication:** NextAuth.js, Clerk, or custom JWT
- **Hosting:** Vercel, Railway, or AWS

**API Endpoints Needed:**
```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/user
PUT    /api/user
GET    /api/workouts
POST   /api/workouts
PUT    /api/workouts/:id
DELETE /api/workouts/:id
GET    /api/exercises
POST   /api/exercises
GET    /api/stats
GET    /api/measurements
POST   /api/measurements
GET    /api/goals
POST   /api/goals
```

### 7.2 Mobile App Sync

**Sync Strategy:**
1. **Export:** Read AsyncStorage → POST to API
2. **Import:** GET from API → Write to AsyncStorage
3. **Conflict Resolution:** Last-write-wins or merge strategy
4. **Incremental Sync:** Only sync changed data

**Implementation:**
- Add sync button in Profile tab
- Background sync (optional)
- Conflict resolution UI
- Offline support (queue changes)

### 7.3 Web App Integration

**Steps:**
1. Create API routes in `app/api/` or external API
2. Replace `getUserData()` with API calls
3. Implement real authentication
4. Add loading states and error handling
5. Optional: Real-time updates with WebSockets

### 7.4 Admin Panel Enhancements

**Potential Improvements:**
- Export/import JSON tables
- Validation rules editor
- Bulk operations
- Search across all tables
- Change history/audit log
- Data migration tools

---

## 8. Key Architectural Decisions

### 8.1 Why JSON Files for Reference Data?

**Decision:** Admin panel manages JSON files, mobile app reads them.

**Rationale:**
- Simple version control (Git-friendly)
- Easy to edit manually if needed
- No database setup required for admin
- Mobile app seeds SQLite for performance

**Trade-offs:**
- No runtime sync (requires app restart)
- Manual file management
- No concurrent editing protection

### 8.2 Why AsyncStorage + SQLite?

**Decision:** User data in AsyncStorage, reference data in SQLite.

**Rationale:**
- AsyncStorage: Simple key-value store for user data
- SQLite: Fast queries for reference data (equipment, muscles, etc.)
- Separation of concerns (mutable vs. immutable data)

**Trade-offs:**
- Two storage systems to manage
- No relational queries across user data
- Migration complexity

### 8.3 Why Mock Data in Web App?

**Decision:** Web app uses mock data initially.

**Rationale:**
- Rapid development (UI first, backend later)
- Type system ensures compatibility
- Easy to replace with API calls

**Trade-offs:**
- No real data until backend is built
- Potential type drift if not careful

### 8.4 Why React Context for State?

**Decision:** React Context API instead of Redux/Zustand.

**Rationale:**
- Simpler API (no external dependencies)
- Sufficient for app's state needs
- Built into React

**Trade-offs:**
- Performance concerns with large state (mitigated by splitting contexts)
- No time-travel debugging
- Manual optimization needed

---

## 9. Code Quality & Technical Debt

### 9.1 Refactor Priorities

**High Priority:**
1. **WorkoutTemplate Component** (~4,100 lines)
   - Split into smaller components
   - Extract hooks for business logic
   - Improve testability

2. **SetRow Component** (~1,700 lines)
   - Extract sub-components
   - Simplify focus management
   - Reduce prop drilling

**Medium Priority:**
1. **Database Migration System**
   - Simplify migration logic
   - Add rollback capability
   - Better error handling

2. **Type System**
   - Ensure web types stay in sync with mobile
   - Consider shared type package
   - Add runtime validation (Zod?)

### 9.2 Testing Coverage

**Current State:**
- Unit tests: `src/utils/workoutHelpers.test.ts`
- Component tests: `src/components/ExerciseEditor/Chip.test.tsx`
- Context tests: `src/context/WorkoutContext.test.tsx`
- E2E tests: Maestro flows in `.maestro/`

**Gaps:**
- Limited test coverage
- No integration tests
- E2E tests need expansion

### 9.3 Documentation

**Current State:**
- `COMPREHENSIVE_CODEBASE_ANALYSIS.md` (mobile app)
- `ARCHITECTURE_MAP.md` (refactor plan)
- `README.md` files in each component
- Inline code comments

**Improvements Needed:**
- API documentation (when backend is built)
- Component documentation (Storybook?)
- User guides
- Developer onboarding docs

---

## 10. Conclusion

Only Fit is a well-architected fitness tracking ecosystem with three distinct components serving different purposes:

1. **Admin Panel:** Developer tool for managing exercise reference data
2. **Mobile App:** Primary user-facing application for workout tracking
3. **Web App:** Marketing site and future user dashboard

**Strengths:**
- Clear separation of concerns
- Type-safe codebase (TypeScript)
- Consistent data models
- Scalable architecture

**Areas for Improvement:**
- Backend API integration (web app)
- Mobile app sync capability
- Code refactoring (large components)
- Test coverage expansion

**Next Steps:**
1. Build backend API
2. Implement mobile app sync
3. Connect web app to backend
4. Refactor large components
5. Expand test coverage

---

**Report Generated:** February 20, 2026  
**Analysis Tool:** Cursor AI Codebase Explorer  
**Version:** 1.0
