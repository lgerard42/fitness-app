---
name: Exercise Config Finalization
overview: "Revised three-phase roadmap with ruthless prioritization: ship the scoring engine and constraint evaluator first as the critical path, defer infrastructure (canonicalization, version manifests, diagnostic schemas) until the core works, start the mobile refactor in parallel, and add a data-authoring completeness workstream."
todos:
  - id: prereq-shared-dir
    content: Create shared/ directory at repo root with TypeScript types + configure path aliases in admin (vite.config.ts) and mobile (metro.config.js, tsconfig.json)
    status: pending
  - id: phase1-t1-scoring
    content: "Phase 1 Tier 1: Build resolveDeltas.ts (inherit recursion, parent_id traversal, circular ref guard, home-base {} handling) + computeActivation.ts (base + sum-deltas + clamp/normalize)"
    status: pending
  - id: phase1-t1-constraint
    content: "Phase 1 Tier 1: Build Constraint Evaluator Core (deterministic allowed/hidden/disabled/defaulted/suppressed output based on modifier_constraints + exercise_input_permissions + dead-zone rules)"
    status: pending
  - id: phase1-t1-types
    content: "Phase 1 Tier 1: Define TypeScript interfaces for delta_rules, modifier_constraints, muscle_targets, score_policy, ConstraintEvaluatorOutput"
    status: pending
  - id: phase1-t1-tests
    content: "Phase 1 Tier 1: Create golden test fixtures (5-10 real lifts: flat bench, sumo deadlift, cable fly, incline DB press, etc.) and run with jest"
    status: pending
  - id: phase1-t2-zod
    content: "Phase 1 Tier 2: Add Zod schemas wrapping the TS types for runtime validation of delta_rules, modifier_constraints, muscle_targets"
    status: pending
  - id: phase1-t2-linter
    content: "Phase 1 Tier 2: Build delta/inheritance linter (unknown IDs, invalid inherit, circular refs, empty states) + validate-all-deltas CLI script"
    status: pending
  - id: phase1-t2-policy
    content: "Phase 1 Tier 2: Define score policy config (clamp/normalization, missing-key behavior, output mode)"
    status: pending
  - id: phase1-t3-infra
    content: "Phase 1 Tier 3: Version manifest + config hash + mobile reseed trigger + canonicalization spec doc + migration policy (defer until Tiers 1-2 stable)"
    status: pending
  - id: parallel-mobile-refactor
    content: "Parallel: Begin extracting state/logic from indexWorkoutTemplate.tsx (4100 lines) and SetRow.tsx (1700 lines) into hooks/reducer/state layer (no dependency on scoring engine)"
    status: pending
  - id: parallel-data-completeness
    content: "Parallel: Use Motion Delta Matrix to identify + fill critical delta_rules gaps for top 10 motions across highest-impact modifier tables (Grips, Torso Angles, Stance Widths, Grip Widths)"
    status: pending
  - id: phase2-integration
    content: "Phase 2: Wire existing admin tools (Filter Matrix, Motion Delta Matrix, RowEditor) to use shared/ scoring engine + constraint evaluator; tighten modifier_constraints to Zod schema"
    status: pending
  - id: phase2-new-features
    content: "Phase 2: Build new admin features: dry-run preview, trace panel, hybrid undo, batch transactions, QA dashboard (coverage buckets + row links)"
    status: pending
  - id: phase3-composer-v1
    content: "Phase 3 v1: Build mobile exercise composer (constraint-driven UI + live scoring + activation viz + label generation + offline operation)"
    status: pending
  - id: phase3-v11-hashing
    content: "Phase 3 v1.1 (deferred): Canonical hashing + computed config cache + version-manifest cache invalidation (only when building progression tracking)"
    status: pending
  - id: todo-1771950604788-r6fa8u3cw
    content: once done the chnages above, make sure the backend is updated accordingly with the recent changes.
    status: pending
  - id: todo-1771950673576-8yp6si5pu
    content: Add unit test suits for the chnages we have done in this plan and test them and show me the test results. if there are any bugs present , fix them too.
    status: pending
isProject: false
---

# Exercise Config System Finalization Plan (Revised)

**Core Principle:** Every user-logged "exercise" is a computation -- base motion score + modifier deltas + constraint/dead-zone logic + score policy. Authored in admin, shared across the repo, consumed offline by mobile.

**Lock date:** February 23, 2026
**Repo:** monorepo with admin + mobile; `TABLE_REGISTRY` in [admin/server/tableRegistry.ts](admin/server/tableRegistry.ts) is the central schema source.

### Key Revision Notes

This plan revises the original locked roadmap based on a pragmatic assessment of the actual codebase state:

- No `/packages/shared` exists yet; no workspaces configured
- No test files exist (jest is installed but unused)
- No Zod anywhere in the codebase
- Admin already has working Filter Matrix, Motion Delta Matrix, and Relationship Graph
- Mobile god components (`indexWorkoutTemplate.tsx` at 4100+ lines, `SetRow.tsx` at 1700+ lines) need structural refactoring before the scoring engine can plug in
- Many motion x modifier delta cells are empty -- the math engine is useless without data coverage

The revisions: tier deliverables by criticality, start the mobile refactor early, distinguish already-built admin features from new ones, defer canonical hashing, and add data completeness as an explicit workstream.

### Revised Roadmap Sequence

```mermaid
graph LR
  subgraph prereqs [Prerequisite]
    A["Shared source folder\n+ path aliases"]
  end

  subgraph p1 [Phase 1]
    B["Scoring Engine\n+ Constraint Evaluator"]
    B2["Zod schemas\n+ basic tests"]
  end

  subgraph parallel [Parallel Track]
    D["Mobile Logging\nRefactor"]
    DataFill["Delta Data\nCompleteness Sprint"]
  end

  subgraph p2 [Phase 2]
    C["Admin Integration\n+ New Features"]
  end

  subgraph p3 [Phase 3]
    E["Mobile Composer\n+ Logging"]
  end

  A --> B
  B --> B2
  A --> D
  B2 --> C
  B2 --> E
  C --> E
  D --> E
  B2 --> DataFill
  DataFill --> E
```



---

## Current Baseline (Honest Assessment)

- `TABLE_REGISTRY` defines all table schemas, field types, FK refs, and JSON shapes
- `equipment.modifier_constraints` uses `jsonShape: 'free'` (loose, unvalidated)
- `motions` has structured `muscle_targets` and `default_delta_configs` JSON fields
- `exerciseCategories` has `exercise_input_permissions`
- Mobile stack: Expo + SQLite + Reanimated + Gesture Handler + SVG
- **No shared packages, no workspaces, no Zod, no test files, admin and mobile are disconnected codebases reading the same JSON files**
- **Admin already has**: working TableEditor, RowEditor with specialized field renderers, Filter Matrix, Motion Delta Matrix, Relationship Graph, import/export, FK-safe delete
- **Many delta_rules cells are empty** across the 17 modifier tables -- the engine will produce flat/identical scores until this data is authored

### Scoring Computation Model

```mermaid
flowchart TD
  UserInput["User selects: Motion + Modifiers"]
  BaseScore["1. Look up base score\n(motions.muscle_targets)"]
  CollectDeltas["2. Collect delta_rules\nfrom each selected modifier row"]
  Inherit{"delta value\n== 'inherit'?"}
  ResolveParent["Resolve parent motion's\ndelta for this modifier"]
  UseDirectDelta["Use direct\nmuscle:delta map"]
  HomeBase{"delta_rules\n== {} ?"}
  SkipDelta["Skip -- Home Base\n(no adjustment)"]
  SumDeltas["3. Sum all deltas\nper muscle ID"]
  FinalScore["4. Final score =\nbase + sum-of-deltas\n(clamp/normalize)"]

  UserInput --> BaseScore
  BaseScore --> CollectDeltas
  CollectDeltas --> Inherit
  Inherit -- Yes --> ResolveParent
  Inherit -- No --> HomeBase
  HomeBase -- Yes --> SkipDelta
  HomeBase -- No --> UseDirectDelta
  ResolveParent --> SumDeltas
  UseDirectDelta --> SumDeltas
  SkipDelta --> SumDeltas
  SumDeltas --> FinalScore
```



### Data Relationship Map

```mermaid
erDiagram
  MUSCLES ||--o{ MUSCLES : "parent_ids (hierarchy)"
  MOTIONS ||--o{ MOTIONS : "parent_id (variations)"
  MOTIONS }o--|| MUSCLES : "muscle_targets references"
  MOTIONS }o--o| MOTION_PATHS : "default_delta_configs"

  MOTION_PATHS ||--o{ MOTIONS : "delta_rules keyed by motion"
  TORSO_ANGLES ||--o{ MOTIONS : "delta_rules keyed by motion"
  TORSO_ORIENTATIONS ||--o{ MOTIONS : "delta_rules keyed by motion"
  RESISTANCE_ORIGIN ||--o{ MOTIONS : "delta_rules keyed by motion"
  GRIPS ||--o{ MOTIONS : "delta_rules keyed by motion"
  GRIP_WIDTHS ||--o{ MOTIONS : "delta_rules keyed by motion"
  ELBOW_RELATIONSHIP ||--o{ MOTIONS : "delta_rules keyed by motion"
  EXECUTION_STYLES ||--o{ MOTIONS : "delta_rules keyed by motion"
  FOOT_POSITIONS ||--o{ MOTIONS : "delta_rules keyed by motion"
  STANCE_WIDTHS ||--o{ MOTIONS : "delta_rules keyed by motion"
  STANCE_TYPES ||--o{ MOTIONS : "delta_rules keyed by motion"
  LOAD_PLACEMENT ||--o{ MOTIONS : "delta_rules keyed by motion"
  SUPPORT_STRUCTURES ||--o{ MOTIONS : "delta_rules keyed by motion"
  LOADING_AIDS ||--o{ MOTIONS : "delta_rules keyed by motion"
  RANGE_OF_MOTION ||--o{ MOTIONS : "delta_rules keyed by motion"
  EQUIPMENT_CATEGORIES ||--o{ MOTIONS : "delta_rules keyed by motion"
  EQUIPMENT ||--o{ MOTIONS : "delta_rules keyed by motion"

  EQUIPMENT }o--|| EQUIPMENT_CATEGORIES : "category_id"
  EQUIPMENT ||--o{ GRIPS : "modifier_constraints"
  EQUIPMENT ||--o{ GRIP_WIDTHS : "modifier_constraints"
  EQUIPMENT ||--o{ SUPPORT_STRUCTURES : "modifier_constraints"
  EQUIPMENT ||--o{ TORSO_ANGLES : "modifier_constraints"
```



---

## Prerequisite -- Shared Source (Simplified)

**Change from original:** Instead of a full monorepo workspace setup (npm/pnpm workspaces, Turborepo) as a blocking prerequisite, start with a **shared source folder + TypeScript path aliases**. This gets code sharing working in hours, not weeks. Upgrade to proper workspaces later when the shared package stabilizes.

### Approach

- Create `shared/` at repo root with the scoring engine, constraint evaluator, types, and schemas
- Configure `tsconfig.json` path aliases (`@shared/`*) in admin and mobile
- For admin (Vite): add alias in `vite.config.ts`
- For mobile (Expo/Metro): add alias in `metro.config.js` and `tsconfig.json`
- Upgrade to full workspaces/Turborepo only after the shared code stabilizes and a proper build step is justified

```mermaid
graph TD
  subgraph root [Repo Root]
    SharedDir["shared/\n(scoring engine, evaluator,\ntypes, schemas)"]
  end

  subgraph adminApp [Admin]
    AdminServer["admin/server\nimport from @shared/*"]
    AdminFrontend["admin/src\nimport from @shared/*"]
  end

  subgraph mobileApp [Mobile]
    MobileSrc["src/\nimport from @shared/*"]
    MobileDB["src/database/\n(SQLite seeded from JSON)"]
  end

  SharedDir -->|"path alias"| AdminServer
  SharedDir -->|"path alias"| AdminFrontend
  SharedDir -->|"path alias"| MobileSrc
  AdminServer -->|"reads/writes"| JSONFiles["database/tables/*.json"]
  JSONFiles -->|"seeded into"| MobileDB
```



---

## Parallel Track -- Mobile Logging Refactor (start alongside Phase 1)

**Change from original:** This was gated as "before Phase 3." But it has zero dependency on the scoring engine -- it is purely structural. Starting it in parallel with Phase 1 means the mobile codebase is ready to receive the composer by the time Phases 1 and 2 complete, instead of creating a sequential bottleneck.

- Extract logic from `indexWorkoutTemplate.tsx` (4100+ lines) and `SetRow.tsx` (1700+ lines) into state layer + hooks
- Establish boundaries: UI = presentation only, shared evaluator = logic, cache/logging services = orchestration
- This is a large refactor; starting early prevents it from blocking Phase 3

```mermaid
graph LR
  subgraph before [Before Refactor]
    GodComp["indexWorkoutTemplate.tsx\n4100+ lines\nUI + logic + state"]
    SetRowOld["SetRow.tsx\n1700+ lines\nUI + parsing + validation"]
  end

  subgraph after [After Refactor]
    UILayer["UI Components\n(presentation only)"]
    StateLayer["State Layer\n(hooks / reducer / Zustand)"]
    SharedEval["Shared Evaluator\n(from shared/)"]
    CacheService["Cache + Logging\nServices"]
  end

  GodComp -.->|"extract"| UILayer
  GodComp -.->|"extract"| StateLayer
  SetRowOld -.->|"extract"| UILayer
  StateLayer --> SharedEval
  StateLayer --> CacheService
```



---

## Phase 1 -- Scoring Engine + Constraint Evaluator

**Goal:** Ship the two functions that everything else depends on: `resolveDeltas` + `computeActivation` (the scoring engine) and the constraint evaluator (the dead-zone logic). Get them working with basic tests. Everything else in this phase is layered on afterward.

### Tiered Deliverables

**Change from original:** The original plan listed 9 deliverables + 3 guardrails as a flat list, all equally "locked." This revision tiers them by criticality so the critical path is clear.

#### Tier 1 -- Critical Path (ship these first, in order)

1. **Scoring engine** -- the two core files:
  - `resolveDeltas.ts`: inherit recursion, `parent_id` chain traversal, circular ref protection, home-base `{}` handling
  - `computeActivation.ts`: base + sum-of-deltas + clamp/normalization + output
2. **Constraint Evaluator Core** -- shared function returning deterministic output: allowed/hidden/disabled/defaulted inputs, suppressions
3. **Basic TypeScript types** -- interfaces for delta rules, modifier constraints, muscle targets, score policy, `ConstraintEvaluatorOutput` (plain TS first, not Zod yet)
4. **Golden tests** -- 5-10 real-world lifts (e.g. flat bench, sumo deadlift, cable fly) as test fixtures; run with jest

#### Tier 2 -- Harden (after Tier 1 works end-to-end)

1. **Zod schemas** wrapping the Tier 1 types -- runtime validation for delta rules, modifier constraints, muscle targets
2. **Delta and inheritance linting** -- scan all tables for unknown IDs, invalid inherit, circular refs, suspicious empty states
3. **Validation CLI** -- `validate-all-deltas` script that runs the linter across all 17 delta tables and reports errors
4. **Score policy config** -- clamp/normalization policy, missing-key behavior, output mode (raw / normalized / both)

#### Tier 3 -- Infrastructure (after Tiers 1-2 are stable)

1. **Scoring version manifest** -- version stamp for outputs, cache invalidation
2. **Config hash + mobile reseed trigger** -- manifest-based reseed propagation for mobile SQLite
3. **Canonicalization spec doc** -- field ordering, null/default omission, array sorting rules (only needed when canonical hashing is implemented in Phase 3)
4. **Schema/data migration policy doc** -- rules for breaking changes

```mermaid
graph TD
  subgraph tier1 [Tier 1 -- Critical Path]
    ScoringEngine["resolveDeltas.ts +\ncomputeActivation.ts"]
    ConstraintEval["Constraint Evaluator"]
    BasicTypes["TypeScript types\n+ interfaces"]
    GoldenTests["Golden test fixtures\n(5-10 real lifts)"]
  end

  subgraph tier2 [Tier 2 -- Harden]
    ZodSchemas["Zod schemas\n(runtime validation)"]
    DeltaLinter["Delta + inheritance\nlinting"]
    ValidationCLI["validate-all-deltas\nCLI script"]
    ScorePolicy["Score policy config"]
  end

  subgraph tier3 [Tier 3 -- Infrastructure]
    VersionManifest["Version manifest"]
    ConfigHash["Config hash +\nmobile reseed"]
    CanonSpec["Canonicalization\nspec doc"]
    MigrationPolicy["Migration policy doc"]
  end

  BasicTypes --> ScoringEngine
  BasicTypes --> ConstraintEval
  ScoringEngine --> GoldenTests
  ConstraintEval --> GoldenTests
  GoldenTests --> ZodSchemas
  ZodSchemas --> DeltaLinter
  DeltaLinter --> ValidationCLI
  ZodSchemas --> ScorePolicy
  ValidationCLI --> VersionManifest
  ScorePolicy --> ConfigHash
  VersionManifest --> ConfigHash
```



### Constraint Evaluator Flow

```mermaid
flowchart TD
  Input["Input: motion + equipment +\nselected modifiers"]
  LoadConstraints["Load equipment.modifier_constraints"]
  LoadPermissions["Load exerciseCategories.exercise_input_permissions"]
  EvalDeadZones["Evaluate dead-zone rules\n(upper/lower isolation,\ngravity/fixed rail,\ncore support bypass,\nhardware collision)"]
  Output["Output: ConstraintEvaluatorOutput"]
  Allowed["allowed: visible + interactive"]
  Hidden["hidden: not shown at all"]
  Disabled["disabled: shown but locked"]
  Defaulted["defaulted: auto-set value"]
  Suppressed["suppressed: skip scoring bonus"]

  Input --> LoadConstraints
  Input --> LoadPermissions
  LoadConstraints --> EvalDeadZones
  LoadPermissions --> EvalDeadZones
  EvalDeadZones --> Output
  Output --> Allowed
  Output --> Hidden
  Output --> Disabled
  Output --> Defaulted
  Output --> Suppressed
```



### Delta Inheritance Resolution

```mermaid
flowchart TD
  LookupDelta["Look up delta_rules\nfor selected motion ID\nin modifier row"]
  Found{"Key found?"}
  ValueType{"Value type?"}
  DirectMap["Use direct\nmuscle:delta map"]
  InheritResolve["Resolve via parent_id\nchain traversal"]
  ParentFound{"Parent has\ndelta for\nthis modifier?"}
  UseParentDelta["Use parent's\nmuscle:delta map"]
  CircularCheck{"Circular\nref?"}
  ErrorNode["Emit lint error\n(invalid inherit)"]
  NoKey["No delta for\nthis motion\n(skip modifier)"]

  LookupDelta --> Found
  Found -- Yes --> ValueType
  Found -- No --> NoKey
  ValueType -- "object {}" --> DirectMap
  ValueType -- "'inherit'" --> InheritResolve
  InheritResolve --> CircularCheck
  CircularCheck -- Yes --> ErrorNode
  CircularCheck -- No --> ParentFound
  ParentFound -- Yes --> UseParentDelta
  ParentFound -- No --> NoKey
```



### Acceptance Criteria

- `resolveDeltas` and `computeActivation` produce correct output for all golden test fixtures
- Constraint evaluator hides/disables inputs correctly for all dead-zone rules
- All tests pass via jest
- Linter reports zero errors on current repo delta data (warnings acceptable)
- No hardcoded dead-zone/scoring logic outside shared/

---

## Parallel Track -- Delta Data Completeness Sprint

**Change from original:** This was not in the original plan at all, but it is the biggest practical risk. The scoring engine can be mathematically perfect, but if most delta_rules cells are empty, users will see flat/identical scores for different modifier choices and the "app understands kinesiology" moment will not land.

- Use the existing Motion Delta Matrix to identify coverage gaps (empty cells show as red)
- Prioritize the highest-impact modifier tables first: Grips, Grip Widths, Torso Angles, Stance Widths (these cover the most common exercise variations)
- Target: at least the top 10 most common motions should have complete delta coverage across all relevant modifier tables
- This can run in parallel with Phase 1 and Phase 2 using the existing admin tools

```mermaid
flowchart LR
  DeltaMatrix["Open Motion Delta Matrix\n(existing admin tool)"]
  IdentifyGaps["Identify red cells\n(empty/missing deltas)"]
  PrioritizeMotions["Prioritize top 10\nmost common motions"]
  PrioritizeTables["Prioritize high-impact\ntables: Grips, Angles,\nStance, Grip Widths"]
  AuthorDeltas["Author delta_rules\nvia RowEditor /\nDelta Matrix side panel"]
  ValidateCoverage["Run validate-all-deltas\n(when Tier 2 is ready)"]

  DeltaMatrix --> IdentifyGaps
  IdentifyGaps --> PrioritizeMotions
  PrioritizeMotions --> PrioritizeTables
  PrioritizeTables --> AuthorDeltas
  AuthorDeltas --> ValidateCoverage
```



---

## Phase 2 -- Admin Integration + New Features

**Goal:** Wire the existing admin tools to use the shared scoring engine from Phase 1, then build the new features (undo, dry-run, trace, QA dashboard).

**Change from original:** The original plan listed Filter Matrix, Motion Delta Matrix, and Relationship Graph as Phase 2 deliverables. These are already built and working. Phase 2 is about (a) integrating them with the shared engine and (b) adding genuinely new capabilities.

### What Already Exists vs. What Is New

```mermaid
graph TD
  subgraph existing [Already Built -- Needs Integration]
    FM["Filter Matrix\n(equipment x modifier\nconstraint grid)"]
    DM["Motion Delta Matrix\n(motions x 17 tables\nheatmap + side panel)"]
    RG["Relationship Graph\n(ReactFlow FK viz)"]
    TE["TableEditor + RowEditor\n(full CRUD + field renderers)"]
    Import["Import/Export\n(CSV/TSV)"]
    FKDelete["FK-safe delete\n(reassign / break links)"]
  end

  subgraph integrate [Integration Work]
    WireShared["Wire existing tools to\nuse shared/ scoring engine\nand constraint evaluator\ninstead of inline JSON parsing"]
    StrictConstraints["Tighten modifier_constraints\nfrom jsonShape: free\nto Zod-validated schema"]
  end

  subgraph newFeatures [New Features to Build]
    DryRun["Dry-run preview\n(zero writes, computed diff)"]
    TracePanel["Trace panel\n(compare base vs base+deltas\nfor sample motions)"]
    Undo["Hybrid undo\n(revert last operation)"]
    BatchSave["Batch transactions\n(all-or-nothing saves)"]
    QADash["QA Dashboard\n(coverage buckets,\nmissing deltas,\norphan refs, row links)"]
    DiagSchema["Error/diagnostic\nevent schema"]
  end

  existing --> WireShared
  WireShared --> StrictConstraints
  StrictConstraints --> DryRun
  StrictConstraints --> TracePanel
  DryRun --> BatchSave
  TracePanel --> QADash
  BatchSave --> Undo
  QADash --> DiagSchema
```



### Phase 2 Trainer Workflow

```mermaid
flowchart TD
  Trainer["Trainer opens Admin"]
  SelectTable["Select table\n(e.g. Grips)"]
  EditRow["Edit row via RowEditor"]
  DryRun["Dry-run preview\n(zero writes, shows diff)"]
  TracePanel["Trace panel\n(compare base vs\nbase+deltas)"]
  Approve{"Approve?"}
  BatchSave["Batch save\n(atomic)"]
  Undo["Hybrid undo"]
  QADash["QA Dashboard\n(coverage gaps)"]

  Trainer --> SelectTable
  SelectTable --> EditRow
  EditRow --> DryRun
  DryRun --> TracePanel
  TracePanel --> Approve
  Approve -- Yes --> BatchSave
  Approve -- No --> EditRow
  BatchSave --> Undo
  Trainer --> QADash
```



### Deliverables

**Integration (existing tools):**

- Wire Filter Matrix, Motion Delta Matrix, RowEditor to use shared scoring engine + constraint evaluator
- Tighten `equipment.modifier_constraints` from `jsonShape: 'free'` to Zod-validated schema

**New features:**

- Dry-run preview mode (zero writes, shows computed score diff before saving)
- Trace panel (compare base scores vs base+deltas for a sample motion, powered by shared `computeActivation`)
- Hybrid undo (revert last operation)
- Batch transactions (all-or-nothing saves)
- QA dashboard (delta coverage buckets with row links, orphan FK refs, missing data alerts)
- Error/diagnostic event schema (shared with mobile)

### Acceptance Criteria

- Trainer (zero SQL) can create/edit a motion + deltas + constraints + preview/undo/trace in less than 10 minutes
- No admin feature implements scoring/dead-zone logic outside shared/ -- all math goes through Phase 1 engine
- Dry-run performs zero writes; batch saves are all-or-nothing; file writes remain atomic
- QA dashboard exposes coverage buckets with clickable row links
- Data integrity preserved across all operations

---

## Phase 3 -- Mobile Composer + Logging Experience

**Goal:** Deliver the "the app understands kinesiology" moment -- fast, offline-capable exercise composing and logging with real-time activation feedback.

**Change from original:** Canonical hashing is deferred to a v1.1 follow-up. It only matters for progression tracking (linking "the same lift" across sessions), which is not in scope for the initial composer. The app currently tracks exercises by `exerciseId` (library item ID) which is sufficient for v1. Ship the composer without hashing; add it when building progression tracking.

### Phase 3 Mobile User Journey

```mermaid
flowchart TD
  Start["User taps 'New Exercise'"]
  SelectMotion["Select motion\n(e.g. PRESS_FLAT)"]
  ConstraintEval["Constraint Evaluator runs\n(from shared/)"]
  ShowModifiers["Show only\nallowed modifiers\n(dead zones hidden)"]
  UserPicks["User picks modifiers\n(grip, angle, stance, etc.)"]
  LiveScore["Real-time scoring engine\n(base + deltas = activation)"]
  ActivationViz["Activation visualization\n(bar chart / muscle list)\nupdates live"]
  LabelGen["Generate computed label\n(e.g. 'Wide-Grip Incline\nDumbbell Bench Press')"]
  LogSet["User logs sets\n(weight, reps, etc.)"]
  SaveLocal["Save to local storage\n(fully offline)"]

  Start --> SelectMotion
  SelectMotion --> ConstraintEval
  ConstraintEval --> ShowModifiers
  ShowModifiers --> UserPicks
  UserPicks --> LiveScore
  LiveScore --> ActivationViz
  UserPicks --> LabelGen
  LabelGen --> LogSet
  LogSet --> SaveLocal
```



### Deliverables

**v1 (ship this):**

- Dynamic exercise composer (motion + modifiers, constraint-driven UI powered by shared evaluator)
- Computed label generation (derived from selected motion + modifiers)
- Real-time activation visualization (bar chart / grouped muscle list MVP)
- Fully offline operation (SQLite-backed, seeded from JSON)
- Mobile debug panel for parity validation

**v1.1 (defer until progression tracking):**

- Canonical hashing (deterministic exercise identity)
- Canonicalization spec doc
- Computed config cache (SQLite cache keyed by canonical hash)
- Version-manifest-based cache invalidation

### Guardrails

- Performance budget: input-to-render latency under 100ms on mid-range device
- All dead-zone/constraint behavior from shared evaluator; zero duplicated scoring logic in mobile code

### Acceptance Criteria

- Composer/scoring/logging fully offline after seed
- Logging a complex lift takes less than 30 seconds
- Activation visualization updates live and matches scoring engine output exactly
- All constraint behavior comes 100% from shared evaluator output
- Zero duplicated scoring/dead-zone condition trees in mobile code
- Dev/debug panel available for internal QA

---

## Cross-Phase Architecture Guardrails

### End-to-End Data Flow

```mermaid
flowchart LR
  subgraph admin [Admin Web-App]
    Author["Trainer authors\ndata via UI"]
    Validate["Validate via\nshared schemas"]
    WriteJSON["Atomic write\nto JSON files"]
  end

  subgraph sharedPkg ["shared/"]
    Schemas["Zod Schemas"]
    Evaluator["Constraint Evaluator"]
    Scorer["Scoring Engine"]
  end

  subgraph mobile [Mobile App]
    Reseed["Reseed SQLite\nfrom JSON"]
    Compose["Exercise Composer\n(evaluator + scorer)"]
    Log["Log workout\n(offline)"]
  end

  Author --> Validate
  Validate --> WriteJSON
  WriteJSON -->|"JSON files"| Reseed
  Reseed --> Compose
  Schemas --> Validate
  Evaluator --> Compose
  Scorer --> Compose
  Compose --> Log
```



### Parity Validation Loop

```mermaid
flowchart TD
  SharedFixtures["Shared test fixtures\n(golden lifts, edge cases)"]
  AdminTrace["Admin: run fixture\nthrough trace panel"]
  MobileDebug["Mobile: run same fixture\nthrough debug panel"]
  CompareNode{"Outputs\nidentical?"}
  Pass["Parity confirmed"]
  FailNode["Investigate + fix\nin shared/"]

  SharedFixtures --> AdminTrace
  SharedFixtures --> MobileDebug
  AdminTrace --> CompareNode
  MobileDebug --> CompareNode
  CompareNode -- Yes --> Pass
  CompareNode -- No --> FailNode
  FailNode --> SharedFixtures
```



- No duplicated biomechanics logic -- math lives in `shared/` only
- UI layers consume evaluator/scoring outputs and present them; they never re-derive physics
- Atomicity and validation-first writes -- changes are never half-saved
- Parity-first debugging -- shared fixtures + admin trace panel + mobile debug panel

---

## Risks This Roadmap Prevents

- Exercise database explosion (static exercise-per-row modeling)
- Inaccurate activation scores causing plateaus or injury risk
- Admin/mobile scoring drift from duplicated logic
- Silent data-authoring errors from missing validation
- Unmaintainable authoring UX without matrix tools or QA visibility
- Offline failure from network-dependent logging
- **NEW: Flat/identical scores from empty delta data** (addressed by Data Completeness Sprint)

---

## Immediate Next Steps

1. Create `shared/` directory with TypeScript types for delta rules, muscle targets, modifier constraints, and ConstraintEvaluatorOutput
2. Implement `resolveDeltas.ts` and `computeActivation.ts` with basic tests (5-10 golden lifts)
3. Implement constraint evaluator with dead-zone rules
4. Configure path aliases in admin (`vite.config.ts`) and mobile (`metro.config.js`, `tsconfig.json`)
5. Begin mobile refactor: extract first hook/state-layer from `indexWorkoutTemplate.tsx` (parallel track)
6. Open Motion Delta Matrix, identify top 10 motions with worst delta coverage, begin authoring (parallel track)

