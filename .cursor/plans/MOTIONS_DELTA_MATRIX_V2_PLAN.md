# Final Phase 1 Plan — Motion Delta Matrix V2 Foundation (Extension of Existing Motion Delta Matrix)

## Phase 1 Objective

Build the **foundational architecture** for Motion Delta Matrix V2 inside/alongside the existing Motion Delta Matrix so we can safely author motion-family configuration rules (starting with pilot families later) **without structural rework**.

Phase 1 is about locking and implementing:

* matrix semantics
* scope/override behavior
* hybrid storage model
* strict validation
* draft/active workflow
* deterministic effective-config resolver
* minimum admin authoring controls
* import/export + testing foundations

### Explicitly not in Phase 1

* Bulk motion-family population
* Full biomechanical delta tuning
* Final row-by-row scoring values
* Advanced visual rule-builder UX
* Frontend runtime implementation details beyond backend contract outputs

---

# Phase 1 Deliverables (Required Outputs)

## 1) Matrix V2 Semantics Spec (written contract)

A concise but explicit internal spec covering:

* scope model (`motion_group` vs `motion`)
* precedence/merge rules
* 7 rule buckets
* home-base/default/no-op semantics
* draft/active lifecycle
* validation severities
* resolver output contract

## 2) Hybrid Storage Model Implemented (or existing matrix storage upgraded)

A `motion_matrix_configs` storage shape (or equivalent extension) with:

* flat/queryable metadata
* explicit scope/status/version fields
* validated JSON payload
* import/export-safe structure

## 3) JSON Schema + Validator Stack

Strict schema + app validators enforcing:

* structure
* references
* semantic coherence
* publish safety

## 4) Effective Config Resolver (non-scoring)

Given a `motion_id`, returns a deterministic, merged **effective matrix config** (group + motion override) for admin preview / frontend builder consumption later.

## 5) Minimum Authoring Support in Existing Motion Delta Matrix

Enough UI/data flow to:

* create/edit draft config
* validate
* activate/publish valid configs
* inspect errors/warnings
* target motion or motion-group scope

## 6) Test Coverage + Fixtures

Validator, resolver, scope precedence, and draft/active lifecycle tests.

---

# Phase 1 Foundational Decisions to Lock (Final)

## A) Scope Model (Required, explicit)

Every matrix config row **must** declare scope explicitly.

### Required scope fields

* `scope_type`: `motion` | `motion_group`
* `scope_id`: string identifier (canonical motion ID or family/group ID)
* `status`: `draft` | `active` (minimum)
* `schema_version`: payload schema version
* `config_version`: revision number for this scope

### Scope semantics

* `motion_group` = family/shared defaults and constraints
* `motion` = specific overrides/exception behavior
* precedence: **motion > motion_group**
* no implicit inheritance beyond this unless explicitly implemented

### Group identity policy (must be explicit in spec)

Pick one and lock it (recommended: derive from motion hierarchy conventions already in use):

* parent/root motion ID as family ID **(recommended)**
* explicit synthetic family ID
* raw `parent_id` value convention (acceptable if stable)

No ambiguity allowed here.

---

## B) Rule Category Contract (7 Buckets, final)

Every rule in Matrix V2 must be classifiable into one of these buckets:

1. **Applicability**

   * whether a modifier table is connected/used at this scope

2. **Allowed Values**

   * which row IDs are valid/selectable for that table

3. **Default / Home-Base**

   * default row ID or explicit null/no-op behavior

4. **Exclusivity / Partition**

   * row set/range partitioning, overlap prevention, “one option per group” style constraints

5. **Dependency / Conditional Visibility**

   * if X then show/hide/lock/filter Y

6. **Invalid / Dead-Zone**

   * explicit invalid combinations or blocked states (including reset behavior)

7. **Override Scope Behavior**

   * how motion-level config overrides/replaces/extends group-level config

This keeps the matrix coherent and prevents “misc rule sprawl.”

---

## C) Global Semantics Dictionary (Required before pilot authoring)

Before populating pilot families, define and lock **global semantic meaning** for each in-scope modifier table.

For each modifier table (e.g., `torsoAngles`, `motionPaths`, `resistanceOrigin`, `grips`, `gripWidths`, `executionStyles`, `stanceTypes`, `stanceWidths`, `footPositions`, `rangeOfMotion`, etc.), document:

### Required semantics metadata

* **Canonical meaning**
* **Interpretation basis** (absolute vs relative)
* **Unit/concept semantics** (angle, bias, categorical setup trait, etc.)
* **Null/no-op behavior** (implicit null allowed? explicit neutral row expected?)
* **Typical applicability domain** (upper/lower/both guidance)
* **Authoring notes** (what this table should *not* be used to represent)

### Grok’s addition (accepted; include this)

* **Common coaching cue examples** tied to major row concepts (not every row yet unless easy)

  * Example intent: preserve gym-floor language alignment for future builder labels/tooltips
  * This is documentation/support metadata, not scoring logic

### Why this matters

This prevents semantic drift (the exact issue we saw around `motionPaths`) and makes later row-level decisions consistent.

---

## D) Home-Base / Default / No-Op Resolution Policy (Critical)

Phase 1 must define exactly how home-base is represented and resolved.

For each modifier table at a given scope, the config must be able to resolve:

* applicable? yes/no
* allowed values
* default row OR null/no-op default
* whether selection is required for builder behavior

### Resolver outcomes (must be explicit)

Each table resolves to one of:

* `hidden_not_applicable`
* `applicable_with_default_row`
* `applicable_with_null_noop_default`
* `applicable_no_default` (allowed only if policy permits; generally warning/error depending on use case)

### Snap-to-default compatibility requirement

If a table participates in motion transitions where invalid states must be auto-corrected (Gemini’s point), then a default should be required for that motion/scope (policy can start as warning, then tighten later).

---

## E) Draft / Active Lifecycle Policy (Required)

Gemini is right — this must be in Phase 1.

### Minimum statuses

* `draft`
* `active`

Optional if easy:

* `archived`
* `superseded`

### Lifecycle rules

* Resolver uses **active only by default**
* Drafts can be loaded explicitly for admin preview/testing
* Activation/publish requires validation pass (no blocking `error`s)
* Prefer one active config per `scope_type + scope_id` at a time (enforce or manage via versioning)
* Activating a new config should increment `config_version` and retain history if possible

### Why this matters

Prevents half-finished matrix configs from breaking the live builder/scoring flow.

---

# Hybrid Storage Model (Final Phase 1 Version)

## Core storage concept

Use a dedicated config row per scope with:

* flat/queryable metadata
* validated structured JSON payload
* explicit scope metadata
* draft/active status
* versioning

This can be implemented as a new `motion_matrix_configs` table or as an equivalent extension of the existing matrix persistence layer.

---

## A) Flat / Queryable Fields (recommended)

### Identity & scope

* `id` (PK)
* `scope_type` (`motion` | `motion_group`)
* `scope_id`
* `status` (`draft` | `active` ...)
* `schema_version`
* `config_version`

### Admin workflow / metadata

* `name` or `label` (optional convenience)
* `notes` (optional)
* `created_at`, `updated_at`
* `created_by`, `updated_by` (if available)
* `published_at` (optional)

### Optional denormalized helper fields (nice-to-have)

* `connected_tables` (array/list cache)
* `validation_status` (`valid`/`warning`/`error`)
* `validation_summary`
* `has_dead_zones`
* `has_partitions`
* `has_motion_overrides`

These are convenience/cache fields only; authoritative truth remains in `config_json`.

---

## B) Structured JSON Payload (`config_json`) — Final Shape Guidance

### Top-level sections (final Phase 1 direction)

* `meta`
* `tables`
* `rules` (global cross-table/cross-scope rules only)
* `override_behavior` (optional if not implied)
* `extensions` (controlled future-safe area)

### Gemini refinement (accepted): table-local simple dead-zones/dependencies

**Simple dead-zones/dependencies should live inside the affected table object** for easier admin rendering and local reasoning.

That means:

* table-local hide/disable/reset conditions → inside `tables.<tableName>`
* complex cross-table partitions/invalid combinations → global `rules`

### Recommended conceptual payload organization

#### `meta`

* scope descriptors / description / optional inheritance hints
* schema metadata (if duplicated in payload)

#### `tables`

Keyed by modifier table name (e.g., `torsoAngles`, `grips`, etc.)

Each table object should support:

* `applicability`
* `allowed_row_ids`
* `default` (row ID or null/no-op declaration)
* `null_noop_allowed`
* `selection_required` (optional)
* `selection_mode` (if needed; many will be single-select)
* **table-local simple dependencies/dead-zones** (Gemini tweak)

  * e.g., hide/disable/reset based on simple conditions
* optional `ui_hints` (non-authoritative)

#### `rules` (global/cross-table only)

Reserve for:

* exclusivity/partitions (Bucket 4)
* complex dead-zones spanning multiple tables
* multi-condition invalid combinations
* cross-scope partition constraints
* advanced transition constraints (if needed later)

#### `override_behavior`

If necessary, define explicit replace/merge semantics for sections (otherwise keep in resolver spec and omit from payload initially)

#### `extensions`

Strictly controlled future escape hatch (no random keys elsewhere)

---

# Validation Architecture (Final)

Phase 1 must implement **strict validation** across three layers.

## Layer 1 — Structural Schema Validation

Validates shape/types only.

* required sections/keys exist
* enum values valid
* arrays typed correctly
* uniqueness enforced where required
* no unknown top-level keys except `extensions`

### Output

Structured validation messages with:

* severity
* path
* message
* optional fix suggestion

---

## Layer 2 — Referential Validation (App-Level FK Emulation)

Because row IDs are in JSON, app validators must enforce FK-like integrity.

Validate:

* `scope_id` points to a valid motion/group
* modifier table names exist in registry
* allowed/default row IDs exist in correct tables
* referenced rows are active (or explicitly allowed as legacy)
* local/global rules only reference connected/known tables and valid rows

This is the main hybrid-model tradeoff and is absolutely worth it.

---

## Layer 3 — Semantic / Coherence Validation (Matrix Logic)

Validate internal consistency and publish safety.

### Required checks

* table OFF but allowed/default populated
* default row not in allowed rows
* default exists while applicability false
* applicable table with empty allowed rows when selection required
* duplicate row IDs
* contradictory local vs global rules
* dead-zone references disconnected table/row
* partition overlaps within exclusivity domain
* unresolved home-base/default where policy requires it
* invalid override semantics (e.g., subtracting rows from nonexistent group set if that mode is ever supported)

### Validation severity model (required)

* `error` → blocks activation
* `warning` → can save draft / optionally activate depending on policy
* `info` → non-blocking note

This is essential for a good authoring UX.

---

## Optional High-Value Phase 1: Safe Auto-Fixes (Draft only)

If easy to implement, offer safe draft-time cleanup:

* dedupe row IDs
* prune invalid default when removed from allowed list
* clear local rules for disconnected tables
* sort IDs for stable diff/export
* normalize object key order (where practical)

This will save Logan time and improve import/export diffs.

---

# Effective Config Resolver (Phase 1 Core Engine, Non-Scoring)

## Purpose

Return a single deterministic **effective matrix config** for a selected motion, ready for frontend builder/scoring consumption later.

Frontend/admin should **not** merge group + motion configs client-side.

## Resolver inputs

* `motion_id`
* optional mode (`active_only`, `draft_preview`)
* optional explicit version/scope selection for admin preview/testing

## Resolver output (must be stable)

* resolved scope metadata (which configs were used)
* effective per-table rules

  * applicability
  * allowed rows
  * defaults/no-op semantics
  * local dependencies/dead-zones
* effective global rules (partitions, complex invalid combos)
* diagnostics (warnings/fallbacks/unresolved refs)

## Deterministic resolution steps

1. Load motion row
2. Determine group/family ID
3. Load matching **active** group config (or selected draft in preview)
4. Load matching **active** motion config (or selected draft in preview)
5. Validate freshness/status (or trust cached validation if guaranteed)
6. Merge with precedence rules
7. Return normalized effective config + diagnostics

---

## Resolver Merge Semantics (must be explicit in Phase 1 spec)

Default to simple, predictable behavior.

### Recommended default behavior

* **Applicability**: motion overrides group
* **Allowed rows**: motion replaces group (not union) by default
* **Default row**: motion overrides group
* **Table-local simple rules**: merge by rule ID/key with motion precedence
* **Global rules**: merge by rule ID/domain with motion precedence
* **Undefined motion field**: inherit group value
* **Undefined group field**: use system default/null semantics

### Recommendation

Use **replace semantics by default** for motion overrides unless an explicit merge mode is added later. This avoids hidden behavior during pilots.

---

# Admin Authoring Plan in Existing Motion Delta Matrix (Phase 1 Minimum Slice)

We are **not** building a brand new UI. We are extending the existing Motion Delta Matrix.

## Phase 1 admin objective

Allow Logan to author, validate, save, and activate matrix configs in a draft-safe way with minimal UI expansion.

## Required authoring capabilities (minimum)

### 1) Scope targeting

* choose/edit `motion_group` config
* choose/edit `motion` config
* indicate whether a related config exists at the other scope
* show status/version

### 2) Core controls (Gemini’s V2 starting set)

For each modifier table:

* applicability toggle
* allowed row selector
* default/home-base selector
* basic dead-zone/dependency editor (table-local simple rules)

These are enough to start pilots safely.

### 3) Validation panel (required)

Show:

* errors/warnings/info
* exact paths/tables
* clear messages
* publish eligibility state
* ideally inline field highlighting for common issues (great UX win)

### 4) Draft/Active workflow controls

* Save Draft
* Validate Draft
* Activate / Publish (blocked on errors)
* optionally clone active → draft

### 5) Effective preview (minimum backend-backed)

At least a simple view of “resolved effective config” for a selected motion (even raw JSON for Phase 1 is fine)

This is hugely valuable to verify precedence/merging before we populate many families.

---

## Explicitly defer from Phase 1 UI (unless trivial)

* advanced visual dependency graph editors
* matrix-wide bulk editing
* rich transition simulators
* partition conflict visual maps
* scoring preview charts
* full frontend builder emulation

Keep Phase 1 practical and safe, not feature-heavy.

---

# Rule DSL / Condition Strategy (Phase 1)

## Recommendation (lock this)

Use a **restricted declarative rule format** in JSON for dependencies/dead-zones/invalid combos.

Do **not** store arbitrary executable code in matrix configs.

### Why

* safer
* import/export stable
* diffable
* validatable
* predictable
* easier to migrate later

## Phase 1 rule capability target

Support simple conditional actions like:

* if `tableA=rowX` then hide/disable/reset `tableB` or specific rows in `tableB`
* mark a combination invalid and optionally define reset behavior
* local table rules for simple cases
* global rules for complex multi-table logic

### Defer

* arbitrary scripts
* deeply nested custom logic trees
* runtime-dependent predicates unrelated to matrix data (unless truly required later)

---

# Import / Export Contract (Phase 1)

Logan’s workflow depends on this. Lock it now.

## Export requirements

* export one config row (draft or active)
* include flat metadata + `config_json`
* include `schema_version` + `config_version`
* deterministic formatting / stable ordering where possible
* optional validation summary snapshot

## Import requirements

* validate before commit
* preview errors/warnings before save
* import modes:

  * create new draft
  * overwrite existing draft
  * create new version from active
* prevent accidental active overwrite unless explicit
* support round-trip stability (export → import should preserve meaning exactly)

---

# Auditability / Change Safety (Recommended in Phase 1)

## Minimum metadata logging

On save/activate:

* who
* when
* status
* config version
* optional change note

## Optional but high-value

Generate diff summaries:

* connected tables changed
* allowed rows added/removed
* defaults changed
* rules added/removed/modified
* validation status delta

This will help a lot during pilot iteration and later debugging.

---

# Testing Plan (Phase 1 Required)

Phase 1 is not complete without tests.

## A) Validator Tests

Cover:

* valid payload passes
* invalid schema fails
* invalid table names fail
* nonexistent row IDs fail
* default not in allowed rows fails
* disconnected table with local rules warns/errors
* duplicate row IDs handling
* invalid scope metadata
* invalid local dead-zone references
* invalid global partition overlaps

## B) Resolver Tests

Cover:

* group-only config resolution
* motion-only config resolution
* motion overrides group
* inherited values preserved
* local rules merged deterministically
* global rules merged deterministically
* active-only default behavior
* draft preview behavior

## C) Lifecycle Tests

Cover:

* draft save succeeds
* activate blocked on errors
* active config remains used when draft invalid
* activation increments version / status transitions correctly

## D) Golden Fixture Tests (strongly recommended)

Small canonical fixtures for fake motions/groups with expected resolved output JSON.
These catch accidental merge or schema regressions later.

---

# Phase 1 Execution Sequence (Practical Build Order)

This is the recommended order to minimize churn.

## Step 1 — Write/lock Phase 1 spec (short but explicit)

Lock:

* scope model
* precedence
* bucket definitions
* payload top-level structure
* local vs global rule placement (Gemini tweak)
* lifecycle/status behavior
* resolver output contract

**Why first:** prevents code/UI drift.

## Step 2 — Define payload schema + TS types/interfaces

Include:

* flat row metadata types
* `config_json` schema types
* validation message types
* resolver output types

**Why second:** shared contract for backend + admin UI.

## Step 3 — Build validator stack (structural → referential → semantic)

Return rich error objects with paths/severity.

**Why third:** everything depends on trustworthy validation.

## Step 4 — Implement storage/persistence for config rows

Add:

* scope/status/version fields
* payload persistence
* CRUD helpers/endpoints
* draft/active constraints

## Step 5 — Implement effective config resolver

* merge group + motion
* apply precedence
* return normalized effective config + diagnostics

**This is the proof the architecture works.**

## Step 6 — Extend existing Motion Delta Matrix UI (minimum authoring slice)

Add:

* scope selection
* core controls
* validation panel
* draft save + activate flow
* optional resolved preview

## Step 7 — Implement import/export for matrix config rows

Stable JSON in/out + validation preview.

## Step 8 — Add tests + fixtures + one smoke config

Create one tiny end-to-end config (not full pilot family) to verify:
save draft → validate → resolve → activate → resolve active.

---

# Risks & Mitigations (Final)

## Risk 1: Overbuilding UI before semantics are stable

**Mitigation:** spec/types/validators/resolver first.

## Risk 2: Hybrid JSON turns loose/unstructured

**Mitigation:** strict schema, versioning, no unknown keys outside `extensions`.

## Risk 3: Scope precedence confusion

**Mitigation:** explicit scope metadata + resolver tests + visible effective preview.

## Risk 4: Matrix begins carrying scoring truth

**Mitigation:** matrix is constraints/applicability/defaults/rules only; baseline scoring remains in motion/scoring data structures.

## Risk 5: Draft configs affect live behavior

**Mitigation:** resolver defaults to active-only; draft preview explicit.

## Risk 6: One-off exceptions create hidden duplication

**Mitigation:** enforce scoped configs + rule buckets + semantic dictionary; prefer existing tables + scoped rows first.

## Risk 7: Semantic drift in modifier tables over time

**Mitigation:** lock Global Semantics Dictionary + add Grok’s coaching cue annotations.

---

# Phase 1 Definition of Done (Final Checklist)

## Semantics / Contracts

* [ ] Scope model + precedence locked
* [ ] 7 rule buckets locked
* [ ] Global Semantics Dictionary created (with coaching cue annotations)
* [ ] Home-base/default/no-op policy locked
* [ ] Draft/active lifecycle policy locked

## Storage / Validation

* [ ] Hybrid config storage implemented (or existing matrix extended equivalently)
* [ ] Flat metadata + scope/status/version fields implemented
* [ ] JSON payload schema versioned and enforced
* [ ] Structural/referential/semantic validators implemented
* [ ] Error/warning severity system implemented

## Resolver

* [ ] Effective config resolver implemented and deterministic
* [ ] Motion > group precedence works
* [ ] Local table rules + global rules resolve correctly
* [ ] Resolver returns diagnostics

## Admin Authoring (minimum)

* [ ] Existing Motion Delta Matrix supports motion/motion-group scope editing
* [ ] Core controls added (applicability, allowed rows, default, basic local dead-zones)
* [ ] Validation panel visible/useful
* [ ] Draft save works
* [ ] Activate/publish flow blocks on errors
* [ ] (Optional but preferred) basic resolved config preview

## Reliability / Workflow

* [ ] Import/export works for config rows
* [ ] Tests pass (validator, resolver, lifecycle)
* [ ] One smoke config authored, validated, resolved, activated successfully

---

=================================================================
=================================================================

# Phase 1 Internal Spec Document — Motion Delta Matrix V2 Foundation (Final)


This document defines the **Phase 1 internal specification** for extending the existing Motion Delta Matrix into a robust, draft-safe, validator-backed configuration layer for exercise modifier applicability, defaults, constraints, and dead-zone logic.

This spec is intentionally limited to **Phase 1 foundation architecture** and does **not** define:

* bulk motion-family content population
* final biomechanics delta tuning values
* advanced frontend builder UX flows
* full runtime scoring implementation

It provides the architecture contract required to safely begin Phase 2 execution and later pilot-family authoring.

---

## 1) Scope & Precedence

### 1.1 Purpose

Matrix configs must support both:

* shared configuration at a **motion family/group level**
* specific overrides at an individual **motion level**

This enables composability-first defaults with scoped exceptions while preserving deterministic effective config resolution for any selected motion.

---

### 1.2 Scope Types (Required)

Each matrix config row must declare:

* `scope_type`: one of

  * `motion_group`
  * `motion`

* `scope_id`:

  * canonical identifier for the selected scope
  * for `motion`: valid `motions.id`
  * for `motion_group`: canonical family/group ID per Section 1.3

---

### 1.3 Group Identity Policy (Phase 1 Locked)

**Phase 1 standard:** use the existing motion hierarchy convention as the canonical family identity.

* If a motion belongs to a parent grouping, the **family/group scope** is represented by the canonical parent/root motion ID (or equivalent hierarchy anchor already used consistently in the motions table).
* Backend resolution must be deterministic and centralized.
* No ad hoc group IDs in Phase 1 unless explicitly documented and mapped.

**Requirement:** one motion resolves to exactly one `motion_group` scope for Phase 1 effective resolution.

---

### 1.4 Scope Resolution Model

For a selected `motion_id`, the resolver may load:

* Group config (`scope_type = motion_group`, `scope_id = resolved family ID`)
* Motion config (`scope_type = motion`, `scope_id = motion_id`)

Either may exist independently. Both may exist simultaneously.

---

### 1.5 Precedence Rule (Locked)

When both group and motion configs exist:

**`motion` overrides `motion_group`**

This precedence applies to:

* table applicability
* allowed row sets
* defaults/home-base values
* local table rules
* global rules (by stable `rule_id` and/or rule domain identity; see Section 7)

---

### 1.6 Fallback Behavior

If neither group nor motion config exists for a selected motion:

* resolver returns a deterministic no-config / empty-effective-config result with diagnostics (`warning`/`info`), **or**
* resolver returns a system-defined empty matrix shape (implementation choice), but behavior must be explicit and deterministic.

No implicit enabling of tables/modifiers is allowed without config.

---

### 1.7 Required Scope Metadata (Storage Row)

Each config row must include:

* `scope_type`
* `scope_id`
* `status` (`draft` | `active`)
* `schema_version`
* `config_version`

Recommended:

* `notes`
* `created_at`, `updated_at`
* `created_by`, `updated_by`
* `published_at`

---

## 2) Rule Buckets (7)

Every matrix rule must map to one of the following seven buckets. This keeps authoring/validation/resolution coherent and prevents rule sprawl.

---

### Bucket 1 — Applicability

Defines whether a modifier table is connected/used at the current scope.

Examples:

* `torsoAngles` applicable for Incline Press
* `resistanceOrigin` not applicable for barbell free-weight pressing scenarios

**Phase 1 requirement:** applicability is explicit per table in config payload.

---

### Bucket 2 — Allowed Values

Defines which row IDs from an applicable modifier table are valid/selectable.

Examples:

* Incline Press `torsoAngles`: `[30,45,60,80]`
* Vertical Press `torsoAngles`: `[85,90]`

**Phase 1 requirement:** all referenced row IDs must validate against canonical modifier tables.

---

### Bucket 3 — Default / Home-Base

Defines the default selected row (or explicit null/no-op) for an applicable table.

Purpose:

* supports builder initialization
* supports snap-to-default transitions
* supports home-base resolution for delta interpretation

Examples:

* Incline Press `torsoAngles.default_row_id = 45`
* `footPositions.default = null_noop`

**Phase 1 requirement:** defaults must be coherent with applicability and allowed values.

---

### Bucket 4 — Exclusivity / Partition

Defines overlap prevention and partitioning constraints across motions/groups and/or row subsets.

Examples:

* Incline Press torso-angle rows partitioned away from Vertical Press torso-angle rows
* one-option-per-group style constraints

Default placement: **global `rules`** (see Section 5).

---

### Bucket 5 — Dependency / Conditional Visibility

Defines conditional render/lock/filter behavior.

Examples:

* If `stanceType = Seated`, hide/disable `footPositions`
* If `equipment = Barbell`, disable certain `grip` rows (if equipment context is available to matrix conditions)

Simple target-table behaviors should be local to the affected table (Section 5).

---

### Bucket 6 — Invalid / Dead-Zone

Defines combinations that are structurally possible but invalid/nonsensical and must be blocked or reset.

Examples:

* impossible setup combinations
* dead-zone conditions that trigger reset to default/null

Simple target-table dead-zones may be local; complex multi-table invalids belong in global `rules`.

---

### Bucket 7 — Override Scope Behavior

Defines how motion-level config interacts with group-level config (replace/merge semantics).

Phase 1 uses locked default resolver semantics (Section 7). If configurable override modes are introduced later, they must remain constrained and explicit.

---

## 3) Modifier Semantics Dictionary Format (Including Coaching Cues)

### 3.1 Purpose

The Global Semantics Dictionary prevents semantic drift by defining the canonical meaning of each modifier table before broad row-level authoring begins.

This dictionary is:

* **not scoring math**
* **not delta values**
* a semantic contract for admin authoring, validation, and future UI translation

---

### 3.2 Scope

Create one dictionary entry for every matrix-addressable modifier table in scope for Matrix V2, such as (examples, exact list may evolve):

* `motionPaths`
* `torsoAngles`
* `torsoOrientations`
* `resistanceOrigin`
* `grips`
* `gripWidths`
* `elbowRelationship`
* `executionStyles`
* `footPositions`
* `stanceWidths`
* `stanceTypes`
* `loadPlacement`
* `supportStructures`
* `loadingAids`
* `rangeOfMotion`

Every modifier table referenced by matrix configs must have a dictionary entry.

---

### 3.3 Required Dictionary Fields (Per Modifier Table)

Each entry must include:

1. **`table_name`**

   * canonical modifier table registry key (e.g., `torsoAngles`)

2. **`canonical_meaning`**

   * one clear sentence for what the table represents

3. **`interpretation_basis`**

   * controlled semantic reference frame (e.g.)
   * `absolute_in_space`
   * `relative_to_torso`
   * `categorical_setup_trait`
   * `execution_timing_style`

4. **`value_semantics`**

   * what row values represent conceptually (angles, trajectory bias, stance category, etc.)

5. **`null_noop_policy`**

   * whether implicit null is allowed
   * whether explicit neutral row is expected / optional / disallowed

6. **`typical_applicability_domain`**

   * `upper`, `lower`, `both`, or documented guidance (non-binding in Phase 1)

7. **`authoring_do_not_use_for`**

   * list/examples of concepts this table must not be used to encode
   * critical for preventing semantic misuse

8. **`admin_notes`** (optional, recommended)

   * authoring/implementation guidance

---

### 3.4 Coaching Cues Field (Required; Grok Addition)

Add:

9. **`coaching_cue_examples`**

   * array of short common coaching phrases associated with the table’s major row concepts
   * semantics/support only (not scoring logic)

Examples:

* `executionStyles`: “pause at bottom”, “control the eccentric”, “explode up”
* `rangeOfMotion`: “full depth”, “partials”, “lockout focus”

This preserves gym-floor language alignment for later UI/tooltips and helps prevent semantic drift.

---

### 3.5 Conceptual Entry Shape (Reference)

Each modifier semantics entry should conceptually include:

* `table_name`
* `canonical_meaning`
* `interpretation_basis`
* `value_semantics`
* `null_noop_policy`
* `typical_applicability_domain`
* `authoring_do_not_use_for`
* `coaching_cue_examples`
* `admin_notes`

---

## 4) Payload Top-Level Shape (`meta`, `tables`, `rules`, `extensions`)

### 4.1 Purpose

Each `motion_matrix_configs` row stores a structured JSON payload (`config_json`) containing matrix rules.

Phase 1 locks the top-level shape for:

* predictable parsing
* strict validation
* migration safety
* stable import/export

---

### 4.2 Required Top-Level Keys

`config_json` must contain exactly these top-level keys (unknown top-level keys disallowed except inside `extensions`):

1. `meta`
2. `tables`
3. `rules`
4. `extensions`

---

### 4.3 `meta` Section

Payload-local metadata and descriptors.

Recommended fields:

* `scope_type` (optional duplication for export portability)
* `scope_id` (optional duplication)
* `description`
* `inherits_from` (informational unless implemented)
* `edited_by_ui_version` / `generated_by` (optional)
* payload-level schema metadata if needed

**Authority note:** lifecycle/scope source-of-truth remains flat row fields unless explicitly overridden by implementation contract.

---

### 4.4 `tables` Section (Required)

`tables` is an object keyed by modifier table name (e.g., `torsoAngles`, `grips`).

Each value is a **table config object** and is the primary home for:

* Bucket 1 (Applicability)
* Bucket 2 (Allowed Values)
* Bucket 3 (Default/Home-Base)
* simple local Bucket 5/6 rules (per Section 5)

Each table config object must support:

* applicability
* allowed rows
* default or null/no-op semantics
* local simple dependencies/dead-zones
* optional non-authoritative UI hints

---

### 4.5 `rules` Section (Required; May Be Empty)

Global/cross-table rule container for logic that should not be embedded in one table config object.

Examples:

* partitions/exclusivity across motions/tables
* complex multi-table invalid combinations
* multi-target dependencies
* cross-scope coordination rules

In Phase 1, `rules` may be minimal but must exist to preserve schema stability.

---

### 4.6 `extensions` Section (Required but Controlled)

Reserved object for future features not yet promoted to core schema.

Rules:

* must be namespaced/structured
* must not duplicate core semantics already expressible in `meta`, `tables`, or `rules`
* unknown keys may only be tolerated inside `extensions` per validator policy

This prevents top-level schema drift while preserving a controlled expansion path.

---

## 5) Local-vs-Global Rule Placement Policy (Gemini Tweak, Final)

### 5.1 Purpose

Improve admin authoring clarity and frontend translation by placing simple target-table logic with the table it affects, while reserving global `rules` for true cross-table/cross-scope logic.

This enables reusable per-table UI components and avoids parsing large global rule arrays for simple field behavior.

---

### 5.2 Local Rule Placement (Inside `tables.<tableName>`)

Use local placement for simple rules that primarily affect **one target table**.

Examples:

* hide/disable/reset `footPositions` under a simple condition
* disable certain rows in a table
* simple conditional filtering tied to a single target table

Typical local actions may include:

* `hide_table`
* `disable_table`
* `reset_to_default`
* `reset_to_null`
* `disable_row_ids`
* `filter_row_ids` (simple cases)

**Requirement:** local rules must use a restricted declarative structure (no arbitrary code).

**Requirement:** local dependency/dead-zone rules must have stable `rule_id` (see Section 5.5 / Section 7).

---

### 5.3 Global Rule Placement (Inside top-level `rules`)

Use global placement for logic spanning multiple tables, scopes, or domains.

Examples:

* Bucket 4 partitions/exclusivity rules (default home)
* complex invalid combos involving multiple tables
* multi-table dependencies with multiple targets
* cross-scope constraints

**Requirement:** all global rules must have stable `rule_id`.

---

### 5.4 Placement Principle (Locked)

If a rule is a clean **single-table concern**, place it locally.
If a rule coordinates **multiple tables or cross-scope behavior**, place it globally.

This is a design rule (not just a UI preference).

---

### 5.5 Stable Rule IDs (Gemini Refinement — Required)

For motion-level override, replacement, or deletion of group-level rules to be deterministic and admin-editable, all dependency/dead-zone/partition rules must have stable unique identifiers.

**Requirement:** every local and global rule in these categories must include:

* `rule_id` (stable UUID or deterministic hash; implementation choice)

Applies to:

* local dependencies
* local dead-zones
* global dependencies
* global dead-zones
* global partitions/exclusivity rules
* any rule intended to be merged/overridden across scopes

Without stable `rule_id`, motion-level explicit overrides/deletions are not reliable.

---

### 5.6 Conflict Handling Between Local and Global Rules

If local and global rules create contradictory effects on the same target/state:

* validators must detect the conflict
* resolver must apply deterministic precedence **only if explicitly valid**
* ambiguous contradictory effects should produce `error` and block activation

Default Phase 1 stance: no ambiguous conflicts permitted.

---

## 6) Draft/Active Lifecycle

### 6.1 Purpose

Allow safe iterative authoring (save partial work) without affecting live builder/scoring behavior.

---

### 6.2 Required Statuses (Phase 1 Minimum)

* `draft`
* `active`

Optional later:

* `archived`
* `superseded`

---

### 6.3 Behavioral Rules (Locked)

1. **Resolver default mode uses `active` configs only**

   * production/live integrations must not consume drafts unless explicitly in preview mode

2. **Drafts are editable and savable**

   * drafts may be saved with warnings
   * drafts may also be saved with errors (recommended) to preserve iteration progress

3. **Activation requires validation pass**

   * any blocking `error` prevents activation (Section 8)

4. **One active config per (`scope_type`, `scope_id`)**

   * recommended Phase 1 rule
   * activating a new config for the same scope supersedes/deactivates the prior active config (implementation-specific handling)

5. **Versioning on activation/change**

   * `config_version` must increment predictably for traceability

---

### 6.4 Draft Preview Mode (Admin)

Admin tooling may explicitly request resolver output using draft config(s).

Requirements:

* explicit preview mode flag (never implicit)
* output must indicate draft sources used
* diagnostics must include validation status/warnings

This supports Logan’s save/test/iterate workflow safely.

---

### 6.5 Minimum Activation Flow

1. Save draft
2. Validate draft
3. Review errors/warnings
4. Activate if no blocking errors
5. Update status/version/timestamps
6. Resolver returns new active config by default

---

## 7) Resolver Merge Semantics + Output Contract

### 7.1 Purpose

Provide a deterministic backend-resolved **effective matrix config** for a selected motion.

Frontend/admin clients must not perform group+motion merge logic themselves.

This resolver is **non-scoring** in Phase 1. It resolves matrix configuration only.

---

### 7.2 Resolver Inputs

Required:

* `motion_id`

Optional:

* resolution mode (`active_only`, `draft_preview`)
* explicit config IDs or versions (admin preview/testing)
* diagnostic verbosity

---

### 7.3 Resolver Steps (Deterministic)

1. Load motion by `motion_id`
2. Resolve canonical `motion_group` scope ID
3. Load matching group config (status based on mode)
4. Load matching motion config (status based on mode)
5. Validate or verify validator cache freshness
6. Merge configs using locked semantics and `rule_id`-based rule resolution
7. Normalize output shape
8. Return effective config + diagnostics

If one scope is missing, resolver proceeds with available scope and reports diagnostics.

---

### 7.4 Merge Semantics (Phase 1 Locked Defaults)

#### A) Table Applicability

* motion-level applicability overrides group-level applicability
* if motion-level applicability absent, inherit group-level value

#### B) Allowed Rows

* motion-level `allowed_row_ids` **replace** group-level set by default
* if absent, inherit group-level set

(Replace is safer and more predictable in Phase 1 pilots.)

#### C) Default / Home-Base

* motion-level default overrides group-level default
* if absent, inherit group-level default
* resolved default must validate against resolved allowed-row set

#### D) Local Table Rules (Dependencies / Dead-Zones)

* local rules must include stable `rule_id`
* merge by `rule_id`
* motion-level rule with same `rule_id` overrides group-level rule
* motion-level rule may explicitly disable/delete a group rule using a defined tombstone/deactivation pattern (implementation detail, but must be explicit and validator-supported)
* if no matching `rule_id`, both may coexist if non-conflicting

This directly supports Gemini’s admin override requirement.

#### E) Global Rules (Partitions / Complex Rules)

* all global rules must include stable `rule_id`
* merge by `rule_id` and/or rule domain identity
* motion-level rule with same `rule_id` overrides group-level rule
* explicit deactivation/deletion of inherited global rules must be supported deterministically
* unresolved ambiguity/conflicts → validation `error` (activation blocked)

#### F) Unspecified Values

* inherit from lower-precedence scope where available
* otherwise resolve using system default/null semantics (documented, not implicit guessing)

---

### 7.5 Resolver Output Contract (Phase 1)

Resolver must return a normalized object containing at least:

#### 1) Resolved Metadata

* `motion_id`
* `resolved_group_id`
* source config IDs/versions/statuses used
* schema versions used
* mode (`active_only` / `draft_preview`)

#### 2) Effective Table Configs

Per modifier table:

* applicability
* allowed rows
* default / null-noop behavior
* local dependencies/dead-zones (with stable `rule_id`)
* optional table-level diagnostics

#### 3) Effective Global Rules

* partitions/exclusivity
* complex invalid/dependency rules
* all with stable `rule_id`

#### 4) Diagnostics

* `errors` / `warnings` / `info`
* missing scope config notes
* fallback behavior notes
* conflict notes
* unsupported feature notes (if any)

Frontend/admin consumers must be able to render from this without additional merge logic.

---

### 7.6 Resolver Safety Principle

Resolver must not silently invent or infer missing config meaning beyond explicit fallback policy.

If required values are missing/conflicting:

* return diagnostics
* follow explicit fallback behavior
* do not assume hidden defaults

---

## 8) Validation Severities and Publish Blocking Policy

### 8.1 Purpose

Support safe authoring by distinguishing:

* blocking errors (must fix before activation)
* warnings (surface to user, non-blocking by default)
* informational notices

This preserves integrity while maintaining a practical admin workflow.

---

### 8.2 Validation Layers (Severity Applies Across All)

Validation runs across:

1. **Structural schema validation**
2. **Referential validation**
3. **Semantic/coherence validation**

All layers emit standardized validation messages.

---

### 8.3 Severity Levels (Locked)

* **`error`**

  * blocks activation/publish
  * should still allow draft save (recommended)

* **`warning`**

  * non-blocking by default
  * visible in admin UI and resolver diagnostics

* **`info`**

  * advisory only

---

### 8.4 Publish Blocking Policy (Phase 1)

A config may be activated only if:

* no validation messages with severity `error` remain
* lifecycle and uniqueness constraints are satisfied (e.g., active uniqueness for scope)

Warnings do **not** block activation in Phase 1 unless policy is tightened later.

---

### 8.5 Common `error` Cases (Examples)

Examples that should block activation:

* invalid/missing `scope_type` or `scope_id`
* unknown modifier table name in `tables`
* referenced row ID does not exist in target table
* default row not in resolved `allowed_row_ids`
* malformed payload shape or unsupported `schema_version`
* contradictory applicability/default/local-rule state
* malformed or conflicting partition/exclusivity rule
* missing `rule_id` on any dependency/dead-zone/partition rule
* duplicate `rule_id` in same applicable merge domain when ambiguity results
* resolver-merge ambiguity that cannot be deterministically resolved

---

### 8.6 Common `warning` Cases (Examples)

Examples typically non-blocking:

* applicable table has no default where default is recommended but not yet mandatory
* motion config exists without group config (architecture note)
* local rule branch is currently unreachable under current applicability
* inactive-row references in explicitly permitted legacy mode (if supported)

---

### 8.7 Validation Message Contract (Recommended)

Each validation message should include:

* `severity` (`error` | `warning` | `info`)
* `code` (stable machine-readable code)
* `path` (JSON path / field path)
* `message` (human-readable)
* `suggested_fix` (optional)
* `scope_context` (optional, recommended)
* `rule_id` (when applicable)

This supports inline admin UX and automated tests.

---

### 8.8 Draft Save Policy

Draft saves should:

* run validation
* persist draft + validation results (or recomputable status)
* show errors/warnings inline
* never auto-activate
* never alter default active resolver behavior

This is central to Logan’s iterative workflow.

---

### 8.9 Activation Policy Summary (Locked)

**Draft may be incomplete; active may not be invalid.**

That is the Phase 1 lifecycle safety rule.

---

# Additional Implementation Notes (Non-Sectional, Clarifying)

These do not change the 8-section spec but clarify accepted implementation expectations:

* **Stable `rule_id` generation**

  * UUID or deterministic hash are both acceptable
  * choice must be consistent and documented
  * deterministic hashes may aid import/export diffing if rule bodies are normalized before hashing

* **Rule tombstone/deactivation semantics**

  * motion-level overrides must support explicit suppression/removal of inherited group rules
  * exact encoding can be implementation-specific, but must be:

    * declarative
    * validator-supported
    * resolver-deterministic

* **No arbitrary executable rule code in payload**

  * rules remain declarative for validation, import/export, and migration safety

=================================================
=================================================


# Final Compressed Execution Plan (Phases 2–5)

## Motion Delta Matrix V2 — Build, Pilot, Scale, Harden

## Purpose of This Final Doc

This document is the **execution blueprint** for the remaining work after Phase 1 spec lock. It compresses the original Phases 2–5 into one coordinated delivery plan so we can move fast without repeating micro-loops.

This plan assumes:

* **Phase 1 Internal Spec is locked**
* Motion Delta Matrix V2 will be built by **extending the existing Motion Delta Matrix**
* We are preserving the composable architecture and motion-first authoring model

---

# 0) Locked Execution Decisions (Operational Locks)

These are now locked and should be treated as execution constraints unless a blocker forces reconsideration.

## 0.1 Rule ID Strategy (Locked)

* **Deterministic hash** for `rule_id` generation

### Why this is locked

* supports stable export/import round-trips
* supports explicit override/deletion of inherited rules
* prevents duplicate logical rules being treated as new records after re-import
* improves diffs/debugging across versions

---

## 0.2 Tombstone / Inherited Rule Disable Syntax (UI Contract Locked)

To disable an inherited group-level rule at motion scope, admin UI sends the inherited rule reference with:

* **`_tombstoned: true`**

### Notes

* This is the **UI-facing contract**
* Backend may normalize/internalize the tombstone representation, but must preserve deterministic semantics
* Validator + resolver must explicitly support this behavior

---

## 0.3 Active Config Uniqueness Enforcement (Locked)

* **App-level enforcement** (not DB-level strictness required in initial implementation)

### UX behavior

* If activating a new config for a scope that already has an active config:

  * prompt to supersede existing active config
  * proceed via confirmation flow

---

## 0.4 Pilot Families / Pilot Motion IDs (Locked Intent, Repo Verification Required)

### Pilot A — Pressing Family (Grok-selected target set)

* Group/parent intent: `PRESS` (and `PRESS_VERTICAL`)
* Key children intent:

  * `PRESS_FLAT`
  * `PRESS_INCLINE`
  * `PRESS_DECLINE`
  * `PRESS_HIGH_INCLINE`
  * `PRESS_OVERHEAD`
  * `DIP`
  * `DIP_CHEST`
  * `DIP_TRICEPS`

### Pilot B — Horizontal Pull Family (Grok-selected target set)

* Group/parent intent: `HORIZONTAL_ROW`
* Key children intent:

  * `ROW_HIGH`
  * `ROW_MID`
  * `ROW_LOW`
  * `FACE_PULL`
  * `REVERSE_FLY`
  * `REVERSE_FLY_FLAT`
  * `REVERSE_FLY_INCLINE`
  * `REVERSE_FLY_DECLINE`

### Implementation note (locked)

These are accepted as the **pilot target set**, with a **required quick repo verification pass** against current `motions.json` before implementation binding (to prevent typo/rename drift).
If any ID differs in repo, preserve the same biomechanical intent and family coverage.

---

## 0.5 Phase 4 Coverage Target (Locked)

* **90% of all in-scope motions** receive active Matrix V2 coverage

### Coverage strategy

* prioritize high-frequency gym patterns first
* remaining ~10% may use:

  * broad group configs
  * scoped one-offs
  * deferred specialized configs (documented)

---

## 0.6 Schema Change Policy After Phase 2 Starts (Locked)

* **Blocker-only** schema/spec changes once Phase 2 implementation begins

### Preferred alternatives before schema change

1. add rows in existing tables
2. add scoped/specialized rows
3. add rule patterns
4. improve UI authoring controls
5. improve validation messages

Schema/spec rewrites are last resort.

---

## 0.7 Resolver Draft Preview Requirement (Locked)

Backend resolver must support explicit **draft preview mode** for admin preview functionality.

### Minimum requirement

* Resolver endpoint/function supports explicit mode flag (e.g. `?mode=draft` or equivalent)
* Admin can preview how builder would render using draft config before activation

---

# 1) Program Strategy (Compressed Phases 2–5)

## 1.1 Execution Philosophy

We are **not** doing “configure one family, overfit UI, re-architect, repeat.”

We are doing:

* **build core infrastructure once**
* **prove it with two deliberately stressful pilots**
* **batch-roll out to 90%**
* **harden/document for sustained use**

---

## 1.2 Parallelizable Workstreams

The compressed plan should run through parallel workstreams where practical:

### Workstream A — Core Infrastructure

* storage
* schema/types
* validators
* resolver
* existing matrix UI extensions
* import/export

### Workstream B — Authoring Governance

* semantics dictionary
* rule pattern library
* deterministic hash policy
* tombstone authoring conventions

### Workstream C — Pilot Family Authoring Prep

* verify pilot IDs in repo
* pre-map modifier tables for pilots
* pre-map expected partitions/dead-zones

---

## 1.3 Core Change-Control Rule

No foundational contract changes (payload shape, scope precedence, severity model, lifecycle) unless:

* blocker-level issue
* documented deviation
* versioned impact assessed

This preserves momentum and prevents architecture churn.

---

# 2) Phase 2 — Build the Matrix V2 Infrastructure

## 2.1 Phase 2 Goal

Implement the Matrix V2 architecture from Phase 1 into the codebase so Logan can safely author configs in the **existing Motion Delta Matrix**.

This phase delivers the executable backbone:

* persistence
* typed contract
* validator stack
* resolver
* admin matrix extension
* import/export

---

## 2.2 Phase 2.1 — Codebase Integration Mapping (Mandatory First Pass)

Before coding, perform a targeted integration review of the current repo (admin/web/backend) for:

* existing Motion Delta Matrix UI code
* matrix persistence/current config storage
* JSON validation utilities
* motion hierarchy utilities (`motions.json` usage, parent/root resolution)
* table registry / row metadata access
* import/export flows for table-like data
* shared type definitions (if any)
* API routes/services that should be extended vs new

### Required output

A short internal integration map documenting:

* extension points
* modules to reuse
* modules to replace/augment
* endpoint strategy
* import/export conventions
* current matrix assumptions to preserve or retire

### Purpose

Prevents duplicate tooling and aligns implementation to Logan’s existing admin architecture.

---

## 2.3 Phase 2.2 — Storage Model Implementation (`motion_matrix_configs`)

Implement the hybrid storage row model (flat metadata + JSON payload).

### Required fields (minimum)

* `id`
* `scope_type` (`motion_group` | `motion`)
* `scope_id`
* `status` (`draft` | `active`)
* `schema_version`
* `config_version`
* `config_json`
* `created_at`
* `updated_at`

### Recommended fields

* `published_at`
* `notes`
* `created_by`
* `updated_by`
* `validation_status`
* `validation_summary`
* optional cached `connected_tables` (optimization only)

### Constraints / indexing

* index: (`scope_type`, `scope_id`, `status`)
* index: (`scope_type`, `scope_id`, `updated_at`) (recommended)
* app-level active uniqueness enforcement:

  * only one `active` row per (`scope_type`, `scope_id`) at a time

### Deliverables

* migration(s)
* data access/repository layer
* CRUD service methods
* active/draft query helpers
* supersede activation service logic

---

## 2.4 Phase 2.3 — Shared Types + Runtime Schema (Contract Layer)

Implement strict runtime validation schema and shared types for Matrix V2.

### Must cover

* config row metadata
* `config_json` top-level shape:

  * `meta`
  * `tables`
  * `rules`
  * `extensions`
* table config object shape
* local rule shape(s)
* global rule shape(s)
* validation message shape
* resolver output shape
* tombstone/deactivation representation (`_tombstoned: true` UI contract support)
* `rule_id` deterministic-hash requirement
* schema versioning constants

### Design constraints

* strict enough to block invalid configs
* modular enough to support new modifier tables without touching unrelated rule logic
* no arbitrary executable code in rule payloads (declarative only)

### Deliverables

* runtime schema definitions
* shared TS types/interfaces (or equivalent)
* schema version registry/constants
* contract tests (schema accept/reject)

---

## 2.5 Phase 2.4 — Validator Stack (Structural → Referential → Semantic)

Implement the full validator pipeline from Phase 1 spec.

## Layer A — Structural Validation

Checks:

* required top-level keys present
* unknown top-level keys rejected outside `extensions`
* enum correctness (`scope_type`, `status`, etc.)
* table config shape validity
* rule object shape validity
* `rule_id` presence where required
* `_tombstoned` shape validity (where used)

## Layer B — Referential Validation

Checks:

* valid `scope_id` for `scope_type`
* modifier table names exist in canonical registry
* `allowed_row_ids` exist in target table
* defaults exist and target correct table
* local/global rules reference valid tables/rows/fields
* pilot and production scope references resolve correctly
* motion → group resolution integrity where relevant

## Layer C — Semantic / Coherence Validation

Checks:

* default row not in allowed rows
* non-applicable table with populated defaults/rules
* contradictory local/global rules
* duplicate/conflicting `rule_id` in same merge domain
* malformed partition rules
* invalid tombstone use (e.g., tombstoning non-existent inherited rule if policy disallows)
* ambiguous resolver outcomes
* unsupported rule actions or conditions
* dead-zone definitions with impossible targets

### Severity model (required)

All messages must emit:

* `severity` (`error` | `warning` | `info`)
* `code`
* `path`
* `message`
* optional `rule_id`
* optional `suggested_fix`
* optional `scope_context`

### Deliverables

* validator service/module
* UI adapter for field/rule-linked validation messages
* unit/integration tests for all three layers

---

## 2.6 Phase 2.5 — Resolver Engine (Effective Matrix Config Resolver)

Implement the Phase 1 non-scoring resolver for effective matrix config.

### Core responsibilities

* accept `motion_id`
* resolve canonical `motion_group`
* load configs by mode:

  * `active_only` (default)
  * `draft_preview` (required for admin preview)
* merge group + motion deterministically
* merge rules by deterministic `rule_id`
* apply motion-level tombstones to inherited rules
* return normalized effective config + diagnostics

### Locked merge behavior (must match Phase 1)

* motion overrides group
* motion allowed rows replace group allowed rows by default
* defaults override if present
* local/global rules merge by `rule_id`
* ambiguities produce validation/resolver diagnostics (not silent guessing)

### Draft preview mode (locked requirement)

Support admin preview mode (e.g., `?mode=draft`) so the existing matrix UI can request:

* effective config using draft(s)
* diagnostics included
* source status/version metadata included

### Deliverables

* resolver service/module
* resolver endpoint/helper(s)
* resolver tests:

  * group-only
  * motion-only
  * both present
  * tombstoned inherited rule
  * conflicting rule ids
  * fallback/no-config behavior
  * draft preview mode

---

## 2.7 Phase 2.6 — Extend Existing Motion Delta Matrix UI (Matrix V2 Authoring)

Do **not** create a new “Exercise Configurator.” Extend the existing Motion Delta Matrix with Matrix V2 authoring capabilities.

### A) Scope Context Controls

* edit mode for `motion_group` or `motion`
* scope picker (motion/group)
* display linked counterpart config (group while editing motion, etc.)
* status/version display (`draft`/`active`)
* source metadata summary

### B) Per-Modifier Table Authoring Panels (Core Controls)

For each modifier table:

* applicability toggle
* allowed rows multi-select (search/filterable)
* default/home-base selector
* null/no-op handling control (if applicable)
* local dependency/dead-zone rule editor (minimal declarative UI)
* visible `rule_id` for local rules
* inherited vs local rule visibility state (helpful, recommended)

### C) Global Rules Panel

Minimal but functional support for:

* partition/exclusivity rules
* complex invalid/dependency rules
* visible deterministic `rule_id`
* inherited rule display
* motion-level override/tombstone toggle (`_tombstoned: true`)
* clear indication of scope and effect

### D) Validation UX

* “Validate” action
* structured error/warning/info list
* clickable path-based focus (table/rule panel jump if practical)
* publish eligibility indicator
* unresolved error count

### E) Lifecycle UX

* Save Draft
* Activate (blocked on errors)
* Supersede active confirmation modal (app-level uniqueness)
* Clone active → draft (recommended)
* optional compare draft vs active (high value, not blocker)

### F) Effective Resolved Preview (Required)

At minimum:

* JSON preview of resolver output for selected motion in current context
* support preview using draft via resolver `mode=draft`

This is critical for Logan to test authoring outcomes before activation.

### Deliverables

* UI extension inside existing matrix
* backend wiring (CRUD + validate + resolve preview + activate)
* safe error states and minimal UX polish

---

## 2.8 Phase 2.7 — Import / Export (Round-Trip Safe)

Implement robust import/export for matrix config rows.

### Export requirements

* include flat metadata
* include `config_json`
* include `schema_version` + `config_version`
* deterministic ordering where possible (important with deterministic hash IDs)
* optional validation snapshot metadata (nice-to-have)

### Import requirements

* validate before commit
* preview errors/warnings before save
* support:

  * create new draft
  * overwrite draft
  * clone from import into new version
* protect actives from silent overwrite
* preserve deterministic `rule_id` values

### Deliverables

* import/export service
* UI actions in existing matrix
* round-trip tests
* malformed import test cases

---

## 2.9 Phase 2 Exit Gate (Must Pass)

Before broader authoring begins, all of the following must be true:

* storage model working
* runtime schema + shared types implemented
* validator stack working (3 layers)
* resolver deterministic and spec-compliant
* draft preview mode supported
* existing Motion Delta Matrix can author/save/validate/activate configs
* `rule_id` overrides and tombstones work
* import/export round-trip safe
* one end-to-end smoke config passes:

  * draft save → validate → activate → resolve → preview

---

# 3) Phase 3 — Authoring Governance + Dual Pilot Families

## 3.1 Phase 3 Goal

Establish the authoring discipline and prove Matrix V2 on two high-value, high-stress pilot families:

* Pressing family
* Horizontal pull family

This phase validates the **authoring model** and **matrix rule semantics**, not full scoring tuning for every motion.

---

## 3.2 Phase 3.1 — Authoring Governance Layer (Required Before Broad Rollout)

### 3.2.1 Global Semantics Dictionary (Required)

Complete the modifier semantics dictionary for all matrix-addressable modifier tables in scope.

Each table entry must include (per Phase 1):

* canonical meaning
* interpretation basis
* value semantics
* null/no-op policy
* typical applicability domain
* do-not-use-for guidance
* coaching cue examples
* admin notes (recommended)

#### Purpose

Prevents semantic drift and misuse (especially for overlapping concepts like `motionPaths` vs `resistanceOrigin` vs `torsoAngles`).

---

### 3.2.2 Rule Pattern Library (Required)

Define a compact set of canonical rule patterns for authoring consistency.

Examples (pattern families, not exact syntax):

* local hide table on condition
* local disable row IDs on condition
* local reset to default/null on invalidation
* global partition row ranges across sibling motions
* tombstone inherited rule at motion scope
* motion override of group rule by same `rule_id`

#### Purpose

Speeds authoring, improves consistency, reduces one-off rule shapes.

---

### 3.2.3 Deterministic `rule_id` Policy (Required)

Lock and document:

* canonical field ordering before hash
* normalization rules (e.g., sort condition arrays)
* hash algorithm choice
* which fields contribute to hash (must include semantics, not transient UI state)
* what changes intentionally produce a new hash
* tombstone hash behavior (hash of original rule remains reference target)

#### Purpose

Ensures stable import/export and deterministic override targeting.

---

### 3.2.4 Authoring Conventions Cheat Sheet (Required)

Create a short internal guide covering:

* local vs global rule placement
* when to add rows vs one-off tables
* how to structure defaults/home-base
* how to use tombstones safely
* common validation failures and fixes

---

## 3.3 Phase 3.2 — Pilot A: Pressing Family (Primary Pilot)

Pressing is the first pilot because it stress-tests:

* torso-angle partitions
* snap-to-default transitions
* home-base defaults
* overlap/exclusivity boundaries
* redundant modifier suppression (to avoid double-counting semantics)

### 3.3.1 Pilot setup steps

1. Repo-verify exact motion IDs for pilot set (preserve Grok’s intent)
2. Map family/group scope(s)
3. Identify relevant modifier tables (initially)
4. Configure group-level defaults and allowed rows
5. Add motion-specific overrides
6. Add partitions/exclusivity rules
7. Add local dead-zones/dependencies
8. Validate + preview effective configs
9. Activate pilot configs

### 3.3.2 What we are proving (not all scoring tuning)

* matrix can represent realistic pressing transitions
* partitions prevent invalid overlaps
* defaults support snap-to-default
* UI authoring workflow is usable
* local/global rule placement is sufficient
* no semantic double-counting in matrix config design

### 3.3.3 Outputs

* active pressing pilot configs (group + motion overrides as needed)
* validation-clean configs
* effective preview outputs for representative motions
* issue list categorized by:

  * semantics dictionary gap
  * missing row/table
  * rule pattern gap
  * validator gap
  * UI authoring gap
  * true schema blocker (if any)

---

## 3.4 Phase 3.3 — Pilot B: Horizontal Pull Family (Secondary Pilot)

Horizontal pull is the second pilot because it stress-tests the exact semantics that prompted earlier discussion:

* `resistanceOrigin` + `torsoAngles` + `motionPaths` composition
* face pull vs row family differentiation
* dead-zones and scoped rules
* motion-specific overrides via `rule_id` + tombstones

### 3.4.1 Pilot setup steps

Same structure as Pressing pilot:

1. repo-verify exact IDs
2. map group scope
3. select connected modifier tables
4. configure group-level matrix
5. add motion-specific overrides
6. add global partitions/complex rules
7. validate + preview
8. activate

### 3.4.2 What we are proving

* `motionPaths` can remain semantically narrow (relative trajectory)
* composition with anchor/orientation variables is sufficient
* no table explosion required
* rule override model is practical
* dead-zones block nonsense combos without killing real variants

### 3.4.3 Outputs

* active horizontal pull pilot configs
* validation-clean configs
* effective previews
* categorized issue list (same taxonomy as pressing)

---

## 3.5 Phase 3.4 — Dual-Pilot Consolidated Retrospective (Single Pass)

Instead of endlessly iterating one pilot at a time, do one consolidated retrospective after both pilots are active.

### Required retrospective outcomes

### A) Proven elements

Document what is now proven:

* matrix schema sufficiency
* resolver + validator behavior
* local vs global rule placement policy
* deterministic hash + tombstone workflow
* authoring UX sufficiency in existing matrix

### B) Gaps / Adjustments (Allowed categories only)

Allowed adjustment categories:

1. authoring UX improvements (preferred)
2. rule pattern additions (backward-compatible)
3. modifier row additions (preferred)
4. scoped/specialized rows in existing tables
5. one-off tables (justified only)
6. schema/spec change (blocker-only)

### C) Lock decisions post-pilot

Explicitly lock:

* new rows/tables (if any)
* added rule patterns
* validation tightening (if any)
* authoring UI improvements for scaled rollout
* any deferred items to Phase 5 hardening

---

## 3.6 Phase 3 Exit Gate (Must Pass)

Before scaled rollout begins:

* Pressing pilot active and validated
* Horizontal pull pilot active and validated
* resolver preview behaves correctly in draft and active modes
* deterministic `rule_id` override/tombstone flows proven
* retrospective completed and decisions documented
* no unresolved blocker-level schema issue remains

---

# 4) Phase 4 — Scaled Motion Family Rollout (Coverage to 90%)

## 4.1 Phase 4 Goal

Roll Matrix V2 coverage across **90% of in-scope motions** using a batch family strategy that preserves realism and composability while avoiding slow one-motion-at-a-time churn.

This phase focuses on:

* coverage
* valid matrix constraints
* defaults/home-base correctness
* dead-zone correctness

It is **not** the phase for exhaustive final delta-scoring tuning.

---

## 4.2 Phase 4.1 — Family Rollout Sequencing (Batch Order)

Create a rollout board and process families in batches that maximize reuse.

### Recommended sequence (adjust to current motion table reality)

1. **Upper-body pushes**

   * pressing (already pilot)
   * fly/scoop
   * raises
   * dips/pullover (if not fully handled in pilot)
2. **Upper-body pulls**

   * horizontal pull (already pilot)
   * vertical pull
   * curls/elbow flexion families
   * scap/rear-delt patterns
3. **Lower-body knee-dominant**

   * squat/lunge/split squat patterns
4. **Lower-body hip-dominant**

   * hinge/RDL/deadlift patterns
   * bridges/thrusts
5. **Lower-body isolation**

   * leg extension/curl
   * abduction/adduction
   * calf/ankle
6. **Core/trunk**

   * flexion/extension/rotation/anti-rotation/lateral
7. **Unique/full-body/special/Olympic**

   * scoped rules and one-offs allowed as needed

### Rollout board fields (recommended)

* family name
* group scope ID(s)
* child motion IDs
* expected modifier tables
* complexity rating
* status (not started / draft / active / blocked)
* blocker notes
* one-off row/table notes

---

## 4.3 Phase 4.2 — Standardized Family Configuration Workflow

Use a repeatable workflow per family to maintain speed and consistency.

### Per-family steps (standard)

1. Resolve family scope and child motions
2. Configure group-level matrix:

   * applicability
   * allowed rows
   * defaults/home-base
   * local simple rules
3. Add global partitions/exclusivity / complex invalid rules
4. Add motion-specific overrides/tombstones
5. Validate
6. Resolver preview on representative child motions
7. Quick realism pass (Grok criteria)
8. Activate
9. Optional export snapshot (recommended for milestones)

### Compression rule (important)

Do not get stuck fine-tuning every scoring delta value here.
Focus on:

* matrix rule correctness
* allowed variation space
* valid transitions
* home-base/default correctness
* dead-zone logic

---

## 4.4 Phase 4.3 — Gap Handling Policy During Rollout (Rows First)

When a family needs something the current modifier schema does not cleanly represent:

### Decision order (locked for rollout)

1. Use existing rows
2. Add rows to existing table (**preferred**)
3. Add scoped/specialized rows in existing table (**allowed**)
4. Add one-off table (**allowed but justified**)
5. Change spec/schema (**blocker-only**)

### Required documentation for every new row/table added

* semantic justification
* intended scope (shared vs family-specific)
* semantics dictionary impact
* matrix authoring impact
* import/export/migration note (brief)

This is the anti-drift control.

---

## 4.5 Phase 4.4 — Batch QA + Coverage Tracking

Track rollout progress and quality explicitly so the compressed plan remains controlled.

### Coverage metrics (recommended)

* % in-scope motions with active matrix config
* % motion groups with active group config
* % motions using group-only config vs motion override
* unresolved warnings count (by family)
* number of new rows added during rollout
* number of one-off tables added
* repeated rule patterns usage frequency

### QA checks per batch

* all configs validate with no errors
* resolver previews work on sampled motions
* no partition overlap regressions
* no duplicate/ambiguous `rule_id` merge conflicts
* tombstones correctly disable inherited rules
* import/export round-trip passes on at least one config per batch (recommended)

---

## 4.6 Phase 4.5 — Coverage Completion Strategy (90% Target)

To hit 90% coverage without bogging down:

* prioritize high-frequency commercial gym patterns first
* allow broad group configs to cover low-frequency variants initially
* document deferred specialized motions in remaining 10%
* treat one-offs as acceptable where needed, but scoped and documented

### Definition of “covered” for Phase 4 target

A motion counts toward coverage if:

* it resolves to an active effective matrix config (via group and/or motion scope)
* no blocking validation errors exist in the active config(s) used
* defaults/home-base and allowed rows are coherent

---

## 4.7 Phase 4 Exit Gate (Must Pass)

Before entering hardening/operationalization:

* **90% in-scope motion coverage reached**
* all active configs are validation-error-free
* unresolved warnings are triaged (acceptable vs must-fix)
* one-off additions documented
* no known blocker-level schema gap remains
* resolver performance acceptable for admin preview workflows

---

# 5) Phase 5 — Hardening, Operationalization, and Rollout Readiness

## 5.1 Phase 5 Goal

Turn Matrix V2 from a functioning internal system into a stable, maintainable, production-ready subsystem that supports:

* continued authoring
* future frontend builder integration
* later scoring integration work
* team handoff / long-term maintainability

---

## 5.2 Phase 5.1 — Validation + Resolver Hardening

Expand test coverage and edge-case protection beyond pilot confidence.

### Must add/complete

* broad fixture suite across multiple families
* duplicate deterministic `rule_id` collision cases
* tombstone edge cases (valid/invalid targets)
* local/global conflict cases
* schema-version compatibility tests
* no-config fallback behavior tests
* draft preview vs active mode behavior tests

### High-value additions

* snapshot/golden resolver outputs for representative motions
* deterministic export ordering tests
* import → validate → resolve parity tests

---

## 5.3 Phase 5.2 — Authoring UX Hardening (Inside Existing Matrix)

Improve speed and safety for ongoing authoring while keeping the architecture and tool location unchanged.

### High-value upgrades

* clone config:

  * active → draft
  * motion → motion
  * group → motion template
* compare draft vs active
* compare group rules vs motion overrides
* inline inherited rule + tombstone visualization
* rule template insertion from rule pattern library
* bulk row selection tools
* row search/filter in large tables
* better validation message focus/jump

### Constraint

These are workflow enhancements, not a new configurator tool.

---

## 5.4 Phase 5.3 — Operational Docs & Playbooks (Required)

Create durable docs so the system remains maintainable.

### Required documents

#### 1) Matrix V2 Authoring Guide

* creating group configs
* adding motion overrides
* local vs global rules
* defaults/home-base conventions
* tombstone usage (`_tombstoned: true`)
* validation and activation workflow

#### 2) Modifier Semantics Dictionary (Current Version)

* finalized dictionary entries
* coaching cue examples included
* do-not-use-for guidance

#### 3) Rule Pattern Library

* canonical rule patterns
* deterministic hash generation policy
* examples of override + tombstone patterns

#### 4) Troubleshooting Guide

* resolver mismatch debugging
* partition conflicts
* tombstone not taking effect
* validation failures
* import/export issues
* draft preview discrepancies

#### 5) Change Log / Migration Notes

* schema version changes
* row/table additions
* one-off table introductions
* semantics revisions
* deferred items

---

## 5.5 Phase 5.4 — Frontend Builder + Scoring Integration Readiness (Bridge Prep)

We are not implementing full runtime builder/scoring integration in this phase, but we must make the handoff production-usable.

### Deliverables

* resolver endpoint/contract docs
* draft preview mode docs for admin
* active-only consumption docs for frontend/mobile
* response examples for representative motions
* versioning strategy for consumer compatibility
* snap-to-default consumption notes (how frontend should use resolved defaults)
* boundary docs clarifying:

  * Matrix V2 controls constraints/defaults/invalid states
  * matrix is not the baseline muscle-target source-of-truth

---

## 5.6 Phase 5.5 — Performance / Reliability Pass

Do a practical reliability pass before declaring foundation complete.

### Check

* resolver latency for common preview requests
* validator performance on complex configs
* admin matrix responsiveness with large row sets
* import/export performance on batch configs
* query performance on scope/status/version lookups
* deterministic hash generation cost (should be negligible, but verify)

### Add if needed

* cached registry maps for rows/tables
* memoized group resolution helpers
* validation result caching for unchanged drafts
* normalized sorting helpers for deterministic exports/resolver outputs

---

## 5.7 Phase 5.6 — Final Readiness Review & Lock

Conduct one consolidated review before declaring Matrix V2 foundation complete.

### Required review outputs

### A) Architecture Status

* adherence to Phase 1 + compressed Phases 2–5 plan
* documented deviations (if any)
* accepted technical debt (if any)

### B) Coverage Status

* actual % coverage achieved
* which motions remain in deferred 10%
* which rely on broad group configs vs detailed motion overrides
* one-off tables/rows inventory

### C) Risk Register (Remaining)

* unresolved semantic ambiguities
* future rule DSL expansions
* scoring-alignment work deferred
* frontend integration risks
* migration/versioning risks

### D) Foundation Lock Decision

* declare Matrix V2 foundation stable (yes/no)
* define next major workstream:

  * matrix coverage completion to 100%
  * delta scoring tuning pass
  * frontend builder integration
  * scoring engine integration
  * authoring productivity pass

---

# 6) Master Execution Sequence (Compressed Phases 2–5)

This is the end-to-end execution order to follow.

## Stage 1 — Core Infrastructure (Phase 2)

1. Codebase integration mapping
2. Storage model + migrations
3. Shared types + runtime schema
4. Validator stack (3 layers)
5. Resolver engine (include draft preview mode)
6. Extend existing Motion Delta Matrix UI
7. Import/export support
8. End-to-end smoke test + Phase 2 exit gate

---

## Stage 2 — Governance + Dual Pilots (Phase 3)

9. Global semantics dictionary
10. Rule pattern library + deterministic hash policy
11. Authoring conventions cheat sheet
12. Repo-verify pilot motion IDs
13. Pressing family pilot configs
14. Horizontal pull family pilot configs
15. Dual-pilot retrospective
16. Lock minor adjustments (rows/patterns/UI, blocker-only schema changes)

---

## Stage 3 — Scaled Rollout to 90% (Phase 4)

17. Family rollout sequencing board
18. Batch family authoring + validation + activation
19. Batch QA + coverage tracking
20. Gap handling (rows-first policy)
21. Reach 90% coverage target
22. Phase 4 exit gate

---

## Stage 4 — Hardening + Operationalization (Phase 5)

23. Validator/resolver hardening tests
24. Authoring UX hardening inside existing matrix
25. Operational docs + playbooks
26. Frontend/scoring integration readiness docs
27. Performance/reliability pass
28. Final readiness review + foundation lock

---

# 7) Success Criteria for This Compressed Plan (Final)

The compressed Phases 2–5 plan is considered successfully completed when all of the following are true:

## 7.1 Infrastructure Success

* Matrix V2 architecture is implemented in codebase
* existing Motion Delta Matrix supports authoring Matrix V2 configs
* validator + resolver + draft/active lifecycle + import/export are working
* deterministic `rule_id` + `_tombstoned: true` flows are operational

## 7.2 Pilot Success

* Pressing pilot and Horizontal Pull pilot are active, validated, and resolvable
* dual-pilot retrospective completed
* no blocker-level architecture issue remains unresolved

## 7.3 Coverage Success

* **90% of in-scope motions covered** by active effective matrix configs
* remaining ~10% documented with explicit rationale/plan

## 7.4 Operational Readiness Success

* authoring docs/playbooks exist
* semantics dictionary and rule pattern library maintained
* frontend/scoring handoff contracts documented
* performance/reliability acceptable for ongoing use

## 7.5 Governance Success

* schema/spec changes after Phase 2 were blocker-only (or deviations documented)
* one-offs and row additions are documented and semantically governed
* no silent drift in rule semantics or modifier-table meaning

---

# 8) Execution Notes / Guardrails (Final)

## 8.1 What to Do When a Family Gets Messy

Do not jump to schema rewrite.

Use this decision ladder:

1. existing rows
2. new row in existing table
3. scoped/specialized row
4. rule pattern addition
5. one-off table
6. blocker-level schema change

---

## 8.2 What Not to Over-Optimize Early

Avoid spending early time on:

* perfect visual rule editors
* final scoring math for every motion
* overly generalized rule DSL beyond pilot needs
* DB-level strictness that slows progress when app-level is sufficient

Focus first on correct contracts, safe authoring, and deterministic resolution.

---

## 8.3 What Must Stay Deterministic

To protect integrity and import/export safety:

* `rule_id` generation (deterministic hash)
* resolver merge behavior
* tombstone handling
* export ordering (as much as practical)
* validation severity behavior
* draft vs active resolver mode behavior
