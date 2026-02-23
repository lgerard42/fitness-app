---
name: Exercise Config Finalization
overview: Three-phase roadmap to build a shared scoring engine, upgrade admin authoring/QA, and deliver a mobile exercise composer -- all powered by composable physics (motions + modifier deltas + constraints), not static exercise rows.
todos:
  - id: prereq-workspace
    content: Establish monorepo package-sharing setup (/packages/shared consumable by admin server, admin frontend, mobile)
    status: pending
  - id: prereq-tooling
    content: Decide and configure workspace tooling (npm/pnpm workspaces or Turborepo) during kickoff spike
    status: pending
  - id: phase1-schemas
    content: "Phase 1: Create shared Zod schemas in /packages/shared (delta rules, modifier constraints, muscle targets, motion config, score policy, constraint rules)"
    status: pending
  - id: phase1-constraint-eval
    content: "Phase 1: Build Constraint Evaluator Core (deterministic allowed/hidden/disabled/defaulted output)"
    status: pending
  - id: phase1-scoring-engine
    content: "Phase 1: Build scoring engine (resolveDeltas.ts + computeActivation.ts with inherit recursion, clamp/normalize, home-base handling)"
    status: pending
  - id: phase1-linting
    content: "Phase 1: Build delta and inheritance linting (unknown IDs, invalid inherit, circular refs, empty states)"
    status: pending
  - id: phase1-policy
    content: "Phase 1: Define score policy config (clamp/normalization, missing-key behavior, output mode)"
    status: pending
  - id: phase1-versioning
    content: "Phase 1: Implement scoring version manifest + config hash + mobile reseed trigger"
    status: pending
  - id: phase1-validation
    content: "Phase 1: Build validation endpoint + CLI (validate-all-deltas)"
    status: pending
  - id: phase1-fixtures
    content: "Phase 1: Create fixtures / golden tests (golden lifts, inheritance cases, impossible combos)"
    status: pending
  - id: phase1-canon-spec
    content: "Phase 1: Write canonicalization spec doc (field ordering, null/default omission, array sorting, version salt)"
    status: pending
  - id: phase2-admin
    content: "Phase 2: Upgrade admin with registry-driven CRUD, hybrid undo, batch transactions, trace panel, dry-run, QA dashboard"
    status: pending
  - id: phase2-constraints-strict
    content: "Phase 2: Tighten equipment.modifier_constraints from jsonShape: free to strict schema"
    status: pending
  - id: prereq-mobile-refactor
    content: "Before Phase 3: Extract workout logging logic from large components into state layer + hooks"
    status: pending
  - id: phase3-composer
    content: "Phase 3: Build dynamic exercise composer + canonical hashing + computed config cache + real-time activation visualization"
    status: pending
  - id: phase3-debug
    content: "Phase 3: Build mobile debug panel for admin/mobile parity validation"
    status: pending
  - id: roadmap-md
    content: Create ROADMAP.md in repo root linking to this overview doc
    status: pending
isProject: false
---

# Exercise Config System Finalization Plan

**Core Principle:** Every user-logged "exercise" is a computation -- base motion score + modifier deltas + constraint/dead-zone logic + score policy. This is authored in admin, shared via `/packages/shared`, and consumed offline by mobile.

**Lock date:** February 23, 2026  
**Repo:** monorepo with admin + mobile; `TABLE_REGISTRY` in [admin/server/tableRegistry.ts](admin/server/tableRegistry.ts) is the central schema source.

### Roadmap Sequence Overview

```mermaid
graph LR
  subgraph prereqs [Prerequisites]
    A[Workspace Enablement]
  end

  subgraph p1 [Phase 1]
    B[Scoring Engine + Validation Core]
  end

  subgraph p2 [Phase 2]
    C[Admin Authoring + Data QA]
  end

  subgraph prereq3 [Pre-Phase-3]
    D[Mobile Logging Refactor]
  end

  subgraph p3 [Phase 3]
    E[Mobile Composer + Logging]
  end

  A --> B
  B --> C
  B --> D
  C --> E
  D --> E
```

---

## Current Baseline

- `TABLE_REGISTRY` defines all table schemas, field types, FK refs, and JSON shapes
- `equipment.modifier_constraints` uses `jsonShape: 'free'` (to be tightened in Phase 2)
- `motions` has structured `muscle_targets` and `default_delta_configs` JSON fields
- `exerciseCategories` has `exercise_input_permissions`
- Mobile stack: Expo + SQLite + Reanimated + Gesture Handler + SVG

### Scoring Computation Model (how it works today)

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

### Data Relationship Map (tables involved in scoring)

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

## Prerequisites (before Phase 1 execution)

### Workspace and Shared Package Enablement

- Establish monorepo package-sharing (`/packages/shared` consumable by admin server, admin frontend, and mobile/Expo/Metro)
- Tooling decision: npm workspaces / pnpm workspaces / Turborepo (decided during kickoff spike)
- Add build/test smoke checks across all consumers

### Target Monorepo Structure

```mermaid
graph TD
  subgraph root [Monorepo Root]
    PkgShared["/packages/shared\n(Zod schemas, evaluator,\nscoring engine, types,\nfixtures)"]
  end

  subgraph adminApp [Admin]
    AdminServer["admin/server\n(Express API)"]
    AdminFrontend["admin/src\n(React UI)"]
  end

  subgraph mobileApp [Mobile]
    MobileSrc["src/\n(Expo + React Native)"]
    MobileDB["src/database/\n(SQLite seeded from JSON)"]
  end

  PkgShared --> AdminServer
  PkgShared --> AdminFrontend
  PkgShared --> MobileSrc
  AdminServer -->|"reads/writes"| JSONFiles["database/tables/*.json"]
  JSONFiles -->|"seeded into"| MobileDB
```

### Mobile Logging Architecture Refactor (before Phase 3)

- Extract logic from large components (`indexWorkoutTemplate.tsx`, `SetRow.tsx`) into state layer + hooks (reducer/store/Zustand)
- Establish boundaries: UI = presentation, shared evaluator = logic, cache/logging services = orchestration

### Mobile Refactor: Before and After

```mermaid
graph LR
  subgraph before [Before Refactor]
    GodComp["indexWorkoutTemplate.tsx\n(4100+ lines)\nUI + logic + state"]
    SetRowOld["SetRow.tsx\n(1700+ lines)\nUI + parsing + validation"]
  end

  subgraph after [After Refactor]
    UILayer["UI Components\n(presentation only)"]
    StateLayer["State Layer\n(hooks / reducer / Zustand)"]
    SharedEval["Shared Evaluator\n(/packages/shared)"]
    CacheService["Cache + Logging\nServices"]
  end

  GodComp -.->|"extract"| UILayer
  GodComp -.->|"extract"| StateLayer
  SetRowOld -.->|"extract"| UILayer
  StateLayer --> SharedEval
  StateLayer --> CacheService
```

---

## Phase 1 -- Scoring Engine + Validation Core

**Goal:** Deliver a mathematically bulletproof, versioned, shareable scoring + constraint engine trusted by both admin and mobile.

### Phase 1 Architecture

```mermaid
graph TD
  subgraph shared ["/packages/shared"]
    ZodSchemas["Zod Schemas\n(delta_rules, modifier_constraints,\nmuscle_targets, score_policy,\nConstraintEvaluatorOutput)"]
    ConstraintEval["Constraint Evaluator\n(allowed / hidden /\ndisabled / defaulted)"]
    ResolveDeltas["resolveDeltas.ts\n(inherit recursion,\nparent_id traversal,\ncircular ref guard,\nhome-base {} handling)"]
    ComputeActivation["computeActivation.ts\n(base + sum-deltas +\npolicy + clamp/normalize +\noutput stamp)"]
    DeltaLinter["Delta Linter\n(unknown IDs, invalid inherit,\ncircular refs, empty states)"]
    ScorePolicy["Score Policy Config\n(clamp / normalize /\nmissing-key / output mode)"]
    VersionManifest["Version Manifest\n(version stamp,\nconfig hash)"]
    Fixtures["Fixtures + Golden Tests"]
  end

  ZodSchemas --> ConstraintEval
  ZodSchemas --> ResolveDeltas
  ResolveDeltas --> ComputeActivation
  ScorePolicy --> ComputeActivation
  ZodSchemas --> DeltaLinter
  VersionManifest -->|"cache invalidation"| MobileReseed["Mobile SQLite Reseed"]
  Fixtures -->|"consumed by"| AdminTests["Admin Tests"]
  Fixtures -->|"consumed by"| MobileTests["Mobile Tests"]
```

### Deliverables

1. **Shared Zod schemas** in `/packages/shared` -- delta rules, modifier constraints, muscle targets, motion config, score policy, constraint rules, `ConstraintEvaluatorOutput`
2. **Constraint Evaluator Core** -- shared function returning deterministic output: allowed/hidden/disabled/defaulted inputs, suppressions, validation errors
3. **Scoring engine**
  - `resolveDeltas.ts`: inherit recursion, `parent_id` chain traversal, circular ref protection, home-base `{}` handling
  - `computeActivation.ts`: base + sum-of-deltas + policy application, clamp/normalization modes, output stamping
4. **Delta and inheritance linting** -- unknown IDs, invalid inherit, circular refs, suspicious empty/missing states
5. **Score policy config** -- clamp/normalization policy, missing-key behavior, output mode (raw / normalized / both)
6. **Scoring version manifest** -- version stamp for outputs, cache invalidation, auditability
7. **Config hash + mobile reseed trigger** -- manifest/config hash-based reseed propagation for mobile SQLite
8. **Validation endpoint + CLI** -- `validate-all-deltas` or equivalent machine-readable validation run
9. **Fixtures / golden tests** -- golden lifts, inheritance-heavy cases, impossible combos rejected by constraints

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
  Errors["validation errors"]

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
  Output --> Errors
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
  Error["Emit lint error\n(invalid inherit)"]
  NoKey["No delta for\nthis motion\n(skip modifier)"]

  LookupDelta --> Found
  Found -- Yes --> ValueType
  Found -- No --> NoKey
  ValueType -- "object {}" --> DirectMap
  ValueType -- "'inherit'" --> InheritResolve
  InheritResolve --> CircularCheck
  CircularCheck -- Yes --> Error
  CircularCheck -- No --> ParentFound
  ParentFound -- Yes --> UseParentDelta
  ParentFound -- No --> NoKey
```

### Guardrails

- Canonicalization spec doc (field ordering, null/default omission, array sorting, version salt)
- Shared test fixture package / fixture JSONs consumed by admin server and mobile tests
- Schema/data migration policy: breaking data-contract or scoring-relevant shape change triggers manifest bump + migration/fallback path

### Acceptance Criteria

- All unit + fixture tests pass (including deep inheritance cases)
- Validation/lint run reports zero errors on current repo table data
- Constraint evaluator output identical across Node and React Native for same canonical config
- Mobile reseed triggers correctly on manifest/config version change
- No hardcoded dead-zone/scoring logic outside shared contracts

---

## Phase 2 -- Admin Authoring + Data QA

**Goal:** Turn admin into the full biomechanical authoring + QA command center: registry-driven, safe, observable, maintainable.

### Phase 2 Admin Authoring Workflow

```mermaid
flowchart TD
  Trainer["Trainer opens Admin"]
  SelectTable["Select table\n(e.g. Grips)"]
  EditRow["Edit row via RowEditor\n(field renderers dispatch\nby type)"]
  DryRun["Dry-run preview\n(zero writes,\nshows computed diff)"]
  TracePanel["Trace panel\n(compare base vs\nbase+deltas for\na sample motion)"]
  Approve{"Approve?"}
  BatchSave["Batch save\n(atomic, all-or-nothing)"]
  Undo["Hybrid undo\n(revert last operation)"]
  QADash["QA Dashboard\n(coverage buckets,\nmissing deltas,\norphan refs)"]
  FilterMatrix["Filter Matrix\n(equipment x modifier\nconstraint grid)"]
  DeltaMatrix["Motion Delta Matrix\n(motions x 17 tables\nheatmap)"]
  RelGraph["Relationship Graph\n(FK visualization)"]

  Trainer --> SelectTable
  SelectTable --> EditRow
  EditRow --> DryRun
  DryRun --> TracePanel
  TracePanel --> Approve
  Approve -- Yes --> BatchSave
  Approve -- No --> EditRow
  BatchSave --> Undo
  Trainer --> FilterMatrix
  Trainer --> DeltaMatrix
  Trainer --> RelGraph
  Trainer --> QADash
```

### Deliverables

- Registry-driven CRUD, Filter Matrix, Motion Delta Matrix, Relationship Graph
- Hybrid undo, batch transactions, trace panel, dry-run mode
- QA dashboard with split coverage buckets and row links
- Tighten `equipment.modifier_constraints` from `jsonShape: 'free'` to strict schema

### Guardrails

- Error/diagnostic event schema (structured payloads for validator failures, dry-run results, trace mismatches) shared with mobile

### Acceptance Criteria

- Trainer (zero SQL) can create/edit a motion + deltas + constraints + preview/undo/trace in less than 10 minutes
- Matrices match the original PART 5/6 data contracts and workflows
- No admin feature implements scoring/dead-zone logic outside shared Phase 1 contracts
- Dry-run performs zero writes; batch saves are all-or-nothing; file writes remain atomic
- QA dashboard exposes split coverage buckets with row links
- Data integrity preserved across all operations

---

## Phase 3 -- Mobile Composer + Logging Experience

**Goal:** Deliver the "the app understands kinesiology" moment -- fast, offline-capable exercise composing and logging with real-time activation feedback.

### Phase 3 Mobile User Journey

```mermaid
flowchart TD
  Start["User taps 'New Exercise'"]
  SelectMotion["Select motion\n(e.g. PRESS_FLAT)"]
  ConstraintEval["Constraint Evaluator runs\n(shared /packages/shared)"]
  ShowModifiers["Show only\nallowed modifiers\n(dead zones hidden)"]
  UserPicks["User picks modifiers\n(grip, angle, stance, etc.)"]
  LiveScore["Real-time scoring engine\n(base + deltas = activation)"]
  ActivationViz["Activation visualization\n(bar chart / muscle list)\nupdates live"]
  CanonHash["Generate canonical hash\n(deterministic exercise ID)"]
  LabelGen["Generate computed label\n(e.g. 'Wide-Grip Incline\nDumbbell Bench Press')"]
  CacheCheck{"Cached?"}
  CacheHit["Load from SQLite cache"]
  CacheMiss["Compute + cache result"]
  LogSet["User logs sets\n(weight, reps, etc.)"]
  SaveLocal["Save to local storage\n(fully offline)"]

  Start --> SelectMotion
  SelectMotion --> ConstraintEval
  ConstraintEval --> ShowModifiers
  ShowModifiers --> UserPicks
  UserPicks --> LiveScore
  LiveScore --> ActivationViz
  UserPicks --> CanonHash
  CanonHash --> CacheCheck
  CacheCheck -- Yes --> CacheHit
  CacheCheck -- No --> CacheMiss
  CacheMiss --> CacheHit
  CanonHash --> LabelGen
  CacheHit --> LogSet
  LogSet --> SaveLocal
```

### Deliverables

- Dynamic exercise composer (motion + modifiers, constraint-driven UI)
- Canonical hashing + label generation
- Computed config cache (SQLite-backed, offline)
- Real-time logging + activation visualization (bar chart / grouped muscle list MVP; SVG body heatmap optional)
- Mobile debug panel for parity validation
- Basic history/log list

### Guardrails

- Performance budget + profiling checkpoints (input to evaluator to render latency thresholds, checked during Reanimated flows)
- Shared error/diagnostic event schema (same as Phase 2)

### Acceptance Criteria

- All dead-zone/constraint behavior from shared Phase 1 evaluator output; zero duplicated scoring logic
- Composer/scoring/naming/caching/logging fully offline after seed/reseed
- Logging a complex lift takes less than 30 seconds
- Canonical hash is deterministic and stable; cache invalidates on version changes
- Activation visualization updates live and matches scoring engine output exactly
- Dev/debug panel supports admin/mobile parity validation
- Data flows cleanly: admin JSON to mobile SQLite reseed via Phase 1 version/hash contracts

---

## Cross-Phase Architecture Guardrails

### End-to-End Data Flow (Admin to Mobile)

```mermaid
flowchart LR
  subgraph admin [Admin Web-App]
    Author["Trainer authors\ndata via UI"]
    Validate["Validate via\nshared schemas"]
    WriteJSON["Atomic write\nto JSON files"]
  end

  subgraph shared ["/packages/shared"]
    Schemas["Zod Schemas"]
    Evaluator["Constraint Evaluator"]
    Scorer["Scoring Engine"]
    Manifest["Version Manifest\n+ Config Hash"]
  end

  subgraph mobile [Mobile App]
    CheckHash{"Config hash\nchanged?"}
    Reseed["Reseed SQLite\nfrom JSON"]
    UseCache["Use existing\nSQLite cache"]
    Compose["Exercise Composer\n(evaluator + scorer)"]
    Log["Log workout\n(offline)"]
  end

  Author --> Validate
  Validate --> WriteJSON
  WriteJSON -->|"JSON files"| CheckHash
  Manifest --> CheckHash
  CheckHash -- Yes --> Reseed
  CheckHash -- No --> UseCache
  Reseed --> Compose
  UseCache --> Compose
  Schemas --> Validate
  Evaluator --> Compose
  Scorer --> Compose
  Compose --> Log
```

### Parity Validation Loop

```mermaid
flowchart TD
  SharedFixtures["Shared Fixture JSONs\n(golden lifts, edge cases)"]
  AdminTrace["Admin: run fixture\nthrough trace panel"]
  MobileDebug["Mobile: run same fixture\nthrough debug panel"]
  Compare{"Outputs\nidentical?"}
  Pass["Parity confirmed"]
  Fail["Diagnostic event\nemitted (shared schema)"]
  Fix["Investigate + fix\nin /packages/shared"]

  SharedFixtures --> AdminTrace
  SharedFixtures --> MobileDebug
  AdminTrace --> Compare
  MobileDebug --> Compare
  Compare -- Yes --> Pass
  Compare -- No --> Fail
  Fail --> Fix
  Fix --> SharedFixtures
```

- No duplicated biomechanics logic -- math lives in one place only
- Compiled-output consumption -- UI layers consume evaluator/scoring outputs and present them
- Version-aware data evolution -- safe data shape changes over time
- Atomicity and validation-first writes -- changes are never half-saved
- Parity-first debugging -- shared fixtures + shared diagnostics + admin/mobile trace parity checks

---

## Risks This Roadmap Prevents

- Exercise database explosion (static exercise-per-row modeling)
- Inaccurate activation scores causing plateaus or injury risk
- Admin/mobile scoring drift from duplicated logic
- Hash instability / identity drift breaking progression and cache
- Silent data-authoring errors from missing validation
- Unmaintainable authoring UX without matrix tools or QA visibility
- Mobile cache staleness without manifest/version invalidation
- Offline failure from network-dependent logging
- Hard-to-debug parity bugs without shared fixtures or diagnostic schema

---

## Immediate Next Steps

- Phase 1 kickoff: create `/packages/shared` + canonicalization spec doc + first Zod schemas + shared fixtures (targeting early working evaluator prototype in first sprint)
- Create a dedicated `ROADMAP.md` in repo root linking to this overview
- Schedule weekly parity checks (admin trace vs mobile debug panel) starting Week 2 of Phase 1

