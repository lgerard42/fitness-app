**Fitness App Scoring System Roadmap Overview**  
**Locked Roadmap + Guardrails (February 23, 2026)**

**Document Purpose**  
This document is the official overview of the locked three-phase roadmap for the fitness app’s composable scoring architecture. It is designed to align engineering, product, and data-authoring work around one core principle:  
We do not store exercises as static rows. We compute exercises from motions + modifiers + constraints + scoring rules.  

This overview is locked against the current repo baseline (Repo root: https://github.com/lgerard42/fitness-app) and the current admin schema registry (admin/server/tableRegistry.ts: https://raw.githubusercontent.com/lgerard42/fitness-app/main/admin/server/tableRegistry.ts), with mobile stack assumptions taken from the current root package.json (https://raw.githubusercontent.com/lgerard42/fitness-app/main/package.json).

**1) Core Product Principle**  
Every user-logged “exercise” is a computation, not a hardcoded database row.  
The system computes final muscle activation by combining:  
- a base motion score (from motions / muscle_targets)  
  - **Plain English:** Start with the raw muscle-activation numbers that come from the basic joint movement (e.g., flat bench press).  
- selected modifier deltas (from delta_rules)  
  - **Plain English:** Add or subtract small adjustments based on grip width, stance, bench angle, etc.  
- constraint/dead-zone logic (what inputs are allowed, hidden, disabled, or suppressed)  
  - **Plain English:** Automatically hide or disable inputs that don’t make physical sense (e.g., no foot stance on a bicep curl).  
- a score policy (clamp/normalization behavior, missing-key behavior, etc.)  
  - **Plain English:** Final cleanup rules so totals never go over 100% or look weird.  

This computation directly powers muscle-targeting accuracy, allowing users to fine-tune workouts for maximum output and goal-specific adaptations (hypertrophy, strength, power, etc.) while minimizing injury risk from mis-targeted loading.  

This design is authored in admin and consumed in mobile via shared contracts (Repo root monorepo structure: https://github.com/lgerard42/fitness-app).

**2) Current Repo Baseline (As Locked)**  
Lock date: February 23, 2026  
This roadmap was validated against the live repo and current schema registry:  
- Monorepo structure with admin + mobile code in one repository (Repo root: https://github.com/lgerard42/fitness-app)  
  - **Plain English:** All code lives in one GitHub repo so we can share files easily.  
- TABLE_REGISTRY is the central schema source for JSON tables (admin/server/tableRegistry.ts: https://raw.githubusercontent.com/lgerard42/fitness-app/main/admin/server/tableRegistry.ts)  
  - **Plain English:** One file that describes every table’s shape and special fields.  
- equipment.modifier_constraints currently uses jsonShape: 'free' and will be tightened in Phase 2 (admin/server/tableRegistry.ts: https://raw.githubusercontent.com/lgerard42/fitness-app/main/admin/server/tableRegistry.ts)  
  - **Plain English:** Right now equipment rules are loose; we’ll make them strict later.  
- motions includes structured muscle_targets and default_delta_configs JSON fields (admin/server/tableRegistry.ts: https://raw.githubusercontent.com/lgerard42/fitness-app/main/admin/server/tableRegistry.ts)  
  - **Plain English:** Each motion already stores base muscle scores and some default adjustments.  
- exerciseCategories includes exercise_input_permissions (admin/server/tableRegistry.ts: https://raw.githubusercontent.com/lgerard42/fitness-app/main/admin/server/tableRegistry.ts)  
  - **Plain English:** Categories know which inputs are allowed or required.  
- Mobile stack is based on Expo + SQLite + Reanimated + Gesture Handler + SVG capabilities (root package.json: https://raw.githubusercontent.com/lgerard42/fitness-app/main/package.json)  
  - **Plain English:** The phone app is built with modern Expo tools that already support smooth animations and charts.  

**Prerequisite / Enablement Sprint (must complete before Phase 1 execution begins)**  

**Workspace & Shared Package Enablement**  
Establish a workspace-compatible monorepo package-sharing setup (or equivalent) so /packages/shared can be consumed reliably across all targets.  
- **Plain English:** Make the repo able to share code between the admin website, admin server, and phone app without errors.  

Ensure /packages/shared is consumable by:  
- admin server (Node/Express)  
  - **Plain English:** The backend can read the shared code.  
- admin frontend  
  - **Plain English:** The admin website can read the shared code.  
- mobile (Expo/Metro)  
  - **Plain English:** The phone app can read the shared code.  

Add build/test smoke checks across all consumers.  
- **Plain English:** Add quick tests so we know the shared code works everywhere.  
Tooling decision (npm workspaces / pnpm workspaces / Turborepo) is made during the kickoff spike.  
- **Plain English:** We’ll decide the exact build tool during the first short spike.

**Phase 1 refinement (no scope expansion)**  

**Registry Validation Bridge**  
Introduce shared Zod schemas for scoring-critical JSON fields.  
- **Plain English:** Create strict validation rules for the most important scoring data.  

Add runtime validation linkage from TABLE_REGISTRY to shared schemas for scoring-related JSON fields first.  
- **Plain English:** Hook the registry so it actually checks the data when it loads.  

Retain jsonShape for editor/rendering dispatch until Phase 2 migration completes.  
- **Plain English:** Keep the old hint that tells the admin UI which editor to show.

**Phase 3 prerequisite (must complete before Dynamic Exercise Composer wiring begins)**  

**Mobile Logging Architecture Refactor**  
Extract logic from large logging UI components (e.g., indexWorkoutTemplate.tsx, SetRow.tsx) into a dedicated state layer + hooks (custom hooks + reducer/store pattern; Zustand acceptable if chosen).  
- **Plain English:** Break the huge workout-logging screen into small, clean pieces so the new scoring engine can plug in easily.  

Establish clear boundaries:  
- UI = presentation only  
  - **Plain English:** The screen only draws what it’s told.  
- shared evaluator/scorer = logic  
  - **Plain English:** All the muscle-math lives in the shared engine.  
- cache/logging services = orchestration  
  - **Plain English:** Separate services handle saving and caching.

**5) Roadmap Summary (Three Locked Phases)**  
The roadmap is intentionally sequenced to minimize rework:  
- Phase 1: Scoring Engine + Validation Core (foundation)  
  - **Plain English:** Build the core math and validation engine that everything else uses.  
- Phase 2: Admin Authoring + Data QA (authoring + observability)  
  - **Plain English:** Give trainers a powerful, safe tool to edit all the physics data.  
- Phase 3: Mobile Composer + Logging Experience (consumer magic)  
  - **Plain English:** Let users build and log any lift with perfect muscle targeting in seconds.

**Phase 1 — Scoring Engine + Validation Core (Locked)**  
**Goal**  
Deliver a mathematically bulletproof, versioned, shareable scoring + constraint engine that both admin and mobile can trust.  

**Scope (Locked)**  
Core deliverables:  
1. Shared schemas in /packages/shared (Zod schemas and shared types for delta rules, modifier constraints, muscle targets, motion config, score policy, constraint rules, ConstraintEvaluatorOutput).  
   - **Plain English:** One folder that holds all the strict rules for every piece of scoring data.  

2. Constraint Evaluator Core (shared function + types that returns deterministic output contract: allowed/hidden/disabled/defaulted inputs, suppressions, validation errors).  
   - **Plain English:** The single function that decides what fields to show or hide based on physics.  

3. Scoring engine (resolveDeltas.ts with inherit recursion, parent_id chain traversal, circular ref protection, root invalid inherit detection, home-base {} handling; computeActivation.ts with base + Σ deltas + policy application, clamp/normalization modes, output stamping).  
   - **Plain English:** The math engine that takes a base motion and all modifiers and spits out final muscle scores.  

4. Delta & inheritance linting (unknown IDs, invalid inherit usage, circular references, suspicious empty/missing states).  
   - **Plain English:** Automatic checks that catch bad or missing data before it breaks anything.  

5. Score policy config (clamp/normalization policy, missing-key behavior, output mode: raw | normalized | both).  
   - **Plain English:** Settings that control how final percentages are cleaned up and displayed.  

6. Scoring version manifest (version stamp for outputs/cache invalidation/auditability).  
   - **Plain English:** A version number so we know when the scoring rules changed.  

7. Config hash + mobile reseed trigger (manifest/config hash-based reseed propagation for mobile SQLite).  
   - **Plain English:** Automatic way for the phone app to update its local database when rules change.  

8. Validation endpoint + CLI (validate-all-deltas / equivalent machine-readable validation run).  
   - **Plain English:** Button and command-line tool that scans everything and tells us if anything is broken.  

9. Fixtures / golden tests (golden lifts, inheritance-heavy case, impossible combos rejected by constraints).  
   - **Plain English:** Real-world example lifts we can run tests against forever to prove the engine works.  

**Guardrails added to Phase 1 (Locked)**  
- Canonicalization spec doc (field ordering, null/default omission rules, array sorting rules, version salt).  
  - **Plain English:** Written rules so the hash for any lift is always the same.  
- Shared test fixture package / fixture JSONs (consumed by both admin/server and mobile tests).  
  - **Plain English:** One set of example data used by both admin and mobile tests.  
- Schema/data migration policy (every breaking data-contract or scoring-relevant table shape change triggers manifest bump + migration/fallback path).  
  - **Plain English:** Rule that says “if we change the data shape, we must update the version and provide a safe upgrade path.”

**Acceptance Criteria (Locked)**  
- All unit + fixture tests pass (including deep inheritance cases).  
  - **Plain English:** Every test passes, including complicated parent-child motion cases.  
- Validation/lint run reports zero errors with acceptable warning threshold on current repo table data.  
  - **Plain English:** The validator runs clean on today’s data.  
- Constraint evaluator output is identical across Node and React Native for same canonical config.  
  - **Plain English:** Same input always gives the exact same output on server and phone.  
- Mobile reseed triggers correctly on manifest/config version change.  
  - **Plain English:** Phone app automatically updates when rules change.  
- No hardcoded dead-zone/scoring logic outside shared contracts.  
  - **Plain English:** No one sneaks extra math into the UI code.

**Phase 2 — Admin Authoring + Data QA (Locked)**  
**Goal**  
Turn the admin into the full biomechanical authoring + QA command center: registry-driven, safe, observable, and maintainable.  

**Scope (Locked)**  
Core deliverables include registry-driven CRUD, Filter Matrix, Motion Delta Matrix, Relationship Graph, hybrid undo, batch transactions, trace panel, dry-run, QA dashboard, etc. (full list as previously locked).  

**Guardrails added to Phase 2 (Locked)**  
- Error/diagnostic event schema (structured payloads for validator failures, dry-run results, trace mismatches — shared with mobile).  
  - **Plain English:** Standard format for error messages so admin and mobile speak the same language when something goes wrong.

**Acceptance Criteria (Locked)**  
- Trainer (zero SQL) can create/edit a motion + deltas + constraints + preview/undo/trace in <10 minutes.  
  - **Plain English:** A regular trainer can fully edit a lift and test it quickly.  
- Matrices implement the same data contracts and workflows as the original PART 5/6 definitions (cosmetic layout may differ).  
  - **Plain English:** The matrices work exactly like the original design described.  
- No admin feature implements scoring/dead-zone logic outside shared Phase 1 contracts.  
  - **Plain English:** Admin never does its own math — it only uses the shared engine.  
- Dry-run performs zero writes; batch saves are all-or-nothing per operation (unless explicit partial mode selected); file writes remain atomic per file.  
  - **Plain English:** Preview mode never saves; bulk saves are safe.  
- QA dashboard exposes split coverage buckets with row links.  
  - **Plain English:** Dashboard shows exactly what’s configured vs missing.  
- Data integrity preserved across all operations (tested against the current TABLE_REGISTRY table set in repo).  
  - **Plain English:** Nothing breaks when we edit or delete data.

**Phase 3 — Mobile Composer + Logging Experience (Locked)**  
**Goal**  
Deliver the end-user “the app understands kinesiology” moment — fast, offline-capable exercise composing and logging with real-time activation feedback. Mobile consumes compiled outputs from shared contracts; it does not reinterpret biomechanics.  

**Scope (Locked)**  
Core deliverables include dynamic composer, canonical hashing + label generation, computed config cache, real-time logging + activation visualization, mobile debug panel, basic history/log list (full list as previously locked).  

**Guardrails added to Phase 3 (Locked)**  
- Performance budget + profiling checkpoints (defined thresholds for input → evaluator → render latency; checked during Reanimated flows).  
  - **Plain English:** We set speed targets so the composer always feels instant.  
- Shared error/diagnostic event schema (same schema as Phase 2 for parity).  
  - **Plain English:** Same error format as admin so debugging is consistent.

**Acceptance Criteria (Locked)**  
- All dead-zone / constraint behavior in mobile comes 100% from shared Phase 1 evaluator output.  
  - **Plain English:** Phone app never invents its own hide/show rules.  
- Zero duplicated scoring/dead-zone condition trees in mobile code.  
  - **Plain English:** No copy-paste math anywhere in the phone code.  
- Composer/scoring/naming/caching/logging operate fully offline after seed/reseed (SQLite-backed flow).  
  - **Plain English:** You can log workouts with no internet.  
- Logging a complex lift takes <30 seconds and obeys shared rules.  
  - **Plain English:** Even advanced lifts are fast and correct.  
- Canonical hash is deterministic and stable; computed labels are derived and non-canonical; cache invalidates on scoring/config version changes.  
  - **Plain English:** Same lift always gets the same ID; old cache clears when rules update.  
- Activation visualization updates live (bar chart / grouped muscle list MVP) and matches the scoring engine output exactly; SVG body heatmap is optional future polish.  
  - **Plain English:** Muscle chart updates instantly and is accurate; fancy body map is extra.  
- Dev/debug panel available for internal QA and supports admin/mobile parity validation.  
  - **Plain English:** Hidden tool that lets us compare admin vs phone results.  
- Data flows cleanly from admin JSON → mobile SQLite reseed using Phase 1 version/hash contracts.  
  - **Plain English:** Admin changes automatically reach the phone app safely.  
- Tested against current schema registry + mobile dependency baseline.  
  - **Plain English:** Everything works with today’s exact files and libraries.

**6) Cross-Phase Architecture Guardrails (Locked)**  
1. No duplicated biomechanics logic.  
   - **Plain English:** Math lives in one place only.  
2. Compiled-output consumption (UI layers consume evaluator/scoring outputs and present them).  
   - **Plain English:** Screens only draw what the engine tells them.  
3. Version-aware data evolution.  
   - **Plain English:** We can safely change data shapes over time.  
4. Atomicity and validation-first writes.  
   - **Plain English:** Changes are safe and never half-saved.  
5. Parity-first debugging (shared fixtures + shared diagnostics + admin/mobile trace parity checks).  
   - **Plain English:** We constantly prove admin and phone give identical results.

**7) Definition of Done (Applies Across All Phases)**  
[unchanged – every task must use shared contracts, update tests, handle versions, emit diagnostics, etc.]

**8) Implementation Artifact Index (Expected Outputs by Phase)**  
Phase 1 artifacts include /packages/shared schemas, Constraint evaluator core, Canonicalization spec doc, Shared fixture JSONs / fixture package, etc.  
[full list as previously locked, with canonicalization + fixtures explicitly listed]

**9) Risks This Roadmap Intentionally Prevents**  
- Exercise database explosion (static exercise-per-row modeling).  
  - **Plain English:** We avoid the old way that creates thousands of duplicate rows.  
- Suboptimal muscle targeting and training plateaus (or increased injury risk) caused by inaccurate activation scores that fail to reflect real biomechanical deltas.  
  - **Plain English:** Users get correct muscle targeting so they actually progress safely.  
- Admin/mobile scoring drift (duplicated logic).  
  - **Plain English:** No more “works on admin but not on phone” bugs.  
- Hash instability / identity drift (broken progression and cache hits).  
  - **Plain English:** Workout history always stays accurate.  
- Silent data-authoring errors (missing validation + no traceability).  
  - **Plain English:** We catch mistakes early with clear messages.  
- Unmaintainable authoring UX (no matrix tools / no QA visibility).  
  - **Plain English:** Trainers can actually maintain the system long-term.  
- Mobile cache staleness (no manifest/version invalidation).  
  - **Plain English:** Phone always has the latest rules.  
- Offline failure (network-dependent logging experience).  
  - **Plain English:** You can train in the gym with zero signal.  
- Hard-to-debug parity bugs (no shared fixtures / no diagnostic schema).  
  - **Plain English:** Debugging is fast because everything speaks the same language.

**10) Immediate Next Steps (Post-Lock)**  
- Phase 1 kickoff: create /packages/shared + Canonicalization spec doc + first Zod schemas + shared fixtures (targeting an early working evaluator prototype in the first implementation sprint).  
  - **Plain English:** Start building the shared engine this week.  
- Create a dedicated ROADMAP.md in repo root that links to this overview doc.  
  - **Plain English:** Put this doc in the repo so everyone can find it.  
- Schedule weekly parity checks (admin trace vs mobile debug panel) starting Week 2 of Phase 1, comparing the same shared fixture IDs across both.  
  - **Plain English:** Every week we prove the phone and admin give identical results on the same test lifts.

**11) Final Statement**  
This roadmap operationalizes the architecture principle:  
We don’t track exercises — we track physics.  
Admin authors the biomechanical truth.  
Shared contracts compile and validate it.  
Mobile consumes it offline and computes the result in real time.  
The system remains composable, explainable, and maintainable as the schema grows (admin/server/tableRegistry.ts: https://raw.githubusercontent.com/lgerard42/fitness-app/main/admin/server/tableRegistry.ts), and it stays aligned with the current monorepo/mobile stack foundation (Repo root, root package.json: https://github.com/lgerard42/fitness-app and https://raw.githubusercontent.com/lgerard42/fitness-app/main/package.json).

