# Muscles, Motions & Delta Modifier Tables — System Overview

**Purpose:** Condensed reference for professional engineers (fitness industry) to evaluate, analyze, and improve the biomechanics and scoring architecture. Use this as the shared context for discussion and adjustment.

---

## 1. Scoring System — How It Works Overall

The system uses a **composable baseline + delta** model. A configured exercise is **not** a single row; it is:

- **One base motion** (from `motions`) that supplies an **absolute baseline** muscle-engagement map (`muscle_targets`).
- **Plus a set of active modifier choices** (one row per dimension from the 15 modifier tables). Each active modifier contributes **relative adjustments** (`delta_rules`) keyed by motion and muscle.

**Scoring pipeline (conceptual):**

1. **Load baseline** — Read `motions.muscle_targets` for the selected motion (flat map: `muscleId → number`).
2. **Load active modifiers** — For each modifier dimension (e.g. torso angle, grip, stance), resolve the selected row (e.g. from user selection or motion `default_delta_configs`).
3. **Apply deltas in fixed cascade order** — Add each modifier’s motion-specific `delta_rules` (flat `muscleId → delta`) to the running score map, in a **deterministic order** (see modifier list below).
4. **Post-process** — Normalize/clamp per engine policy; output is the **composed score map** (same muscle ID keyspace as baseline).

**Design principles:**

- **Baseline only in motions** — Absolute engagement values live only in `motions.muscle_targets`. Modifier rows never store a full baseline.
- **Deltas only in modifiers** — Relative changes live only in modifier-table `delta_rules`. Motion rows never store deltas.
- **Home-base is motion-specific** — Each motion has `default_delta_configs` (modifier row IDs). There is no single “global neutral”; neutral is per motion.
- **Determinism** — Same motion + same modifier selections ⇒ same composed score. Order of application is fixed (cascade order).

---

## 2. How the Tables Work Together

- **`muscles`** — Defines the **canonical muscle taxonomy** and hierarchy (`parent_ids`). It is the **single namespace** for all keys in `muscle_targets` and in every `delta_rules` map. Only muscles with `is_scorable !== false` may receive scores in those JSON fields.
- **`motions`** — Each row is a **biomechanical base**: identity, labels, **absolute baseline** (`muscle_targets`), **default modifier selections** (`default_delta_configs`), and optional `parent_id` for motion taxonomy. A motion row is not a specific exercise variant (e.g. “incline dumbbell press”); that variant is motion + modifier stack.
- **15 modifier tables** — Each table is one **dimension** of setup/execution (e.g. torso angle, grip, stance). Rows carry `delta_rules`: per-motion, per-muscle relative adjustments. Modifier rows do **not** define baselines; they only define how that option changes the motion baseline when selected.

**Data flow:**

- `motions.muscle_targets` keys → must be valid `muscles.id`.
- `motions.default_delta_configs` keys → modifier table IDs; values → row IDs in those tables.
- Modifier `delta_rules` top-level keys → `motions.id`; each value is a flat map `muscleId → number` (keys = `muscles.id`).

**Optional layer:** Matrix V2 Config can restrict, per motion or motion family, which modifier rows are applicable and what the default selection is. It does not change the underlying contracts (`muscle_targets`, `delta_rules`, `default_delta_configs`); it configures which options are offered and how they are presented.

---

## 3. Table Summaries

### 3.1 MUSCLES

- **Role:** Single hierarchical taxonomy of muscles; canonical ID namespace for all scoring JSON.
- **Structure:** One table, recursive hierarchy via `parent_ids` (arbitrary depth). UI often labels depth 0/1/2 as primary/secondary/tertiary; deeper levels as “child.”
- **Key fields:** `id`, `label`, `parent_ids`, `common_names`, `technical_name`, `short_description`, `function`, `location`, `triggers`, `upper_lower`, `sort_order`, `icon`, `is_active`, `is_scorable`, `is_default`, `is_advanced`.
- **Scoring rule:** Only `is_scorable !== false` muscles may appear as keys in `muscle_targets` or `delta_rules`. Non-scorable muscles can appear in the tree for display but are read-only and excluded from persisted scores.
- **Does not store:** Baseline values, deltas, or motion-specific logic.

---

### 3.2 MOTIONS

- **Role:** Baseline biomechanical anchor; defines identity, baseline engagement, default modifier stack, and (optionally) parent for taxonomy.
- **Structure:** Flat table with optional `parent_id` (single parent) for motion families (e.g. Press → Press Flat, Press Incline).
- **Key fields:** `id`, `label`, `parent_id`, `upper_lower`, **`muscle_targets`** (absolute baseline map), **`muscle_grouping_id`** (FK to `muscles` for admin grouping), **`default_delta_configs`** (home-base modifier row IDs), `common_names`, `short_description`, `sort_order`, `icon`, `is_active`, `is_scorable`, `is_default`, `is_advanced`.
- **`muscle_targets`:** Flat `Record<muscleId, number>`. No nested groups; parent totals are derived at display time from hierarchy.
- **`default_delta_configs`:** Map of modifier dimension → default row ID(s). Motion-specific “neutral” setup; not a global default.
- **Does not store:** Deltas or modifier-only logic; it is the baseline + defaults only.

---

### 3.3 Delta Modifier Tables (15)

Each table models **one dimension** of exercise setup or execution. Rows share a common pattern: `id`, `label`, metadata, and **`delta_rules`**.  
**`delta_rules`** = object keyed by `motionId`, each value = flat `Record<muscleId, number>` (deltas for that motion when this row is selected).

**Cascade order** (application order is fixed; implemented as `MODIFIER_TABLE_KEYS` in code):

| # | Table Key | Typical role |
|---|-----------|----------------|
| 1 | `motionPaths` | Trajectory / path of movement |
| 2 | `torsoAngles` | Torso angle (e.g. incline/decline) |
| 3 | `torsoOrientations` | Facing / orientation |
| 4 | `resistanceOrigin` | Where resistance comes from |
| 5 | `grips` | Hand/grip orientation (e.g. pronated, neutral) |
| 6 | `gripWidths` | Grip width |
| 7 | `elbowRelationship` | Elbow position relative to body |
| 8 | `executionStyles` | Tempo, pause, etc. |
| 9 | `footPositions` | Foot position (e.g. flat, elevated) |
| 10 | `stanceWidths` | Stance width |
| 11 | `stanceTypes` | Bilateral, unilateral, etc. |
| 12 | `loadPlacement` | Where load is placed (e.g. front/back); may allow secondary |
| 13 | `supportStructures` | Support surface (bench, floor, etc.) |
| 14 | `loadingAids` | Belts, wraps, etc. |
| 15 | `rangeOfMotion` | Full vs partial ROM |

**Categories (for admin/UI grouping):**

- **Trajectory & Posture:** motionPaths, torsoAngles, torsoOrientations, resistanceOrigin  
- **Upper Body Mechanics:** grips, gripWidths, elbowRelationship, executionStyles  
- **Lower Body Mechanics:** footPositions, stanceWidths, stanceTypes, loadPlacement  
- **Execution Variables:** supportStructures, loadingAids, rangeOfMotion  

**Important:** Modifier rows never define a full baseline; they only define **relative** effects when applied on top of a motion baseline. All keys in `delta_rules` must be valid `motions.id` (top level) and `muscles.id` (inside each motion’s map).

---

## 4. Discussion Hooks for Evaluation & Improvement

- **Scaling:** Adding a new modifier dimension = new table + `delta_rules` + one new slot in cascade order. No change to baseline contract.
- **Tuning:** Baseline and deltas are data; engine behavior (order, normalization, clamping) is code. Improvements can target data, policy, or both.
- **Consistency:** Home-base is per motion (`default_delta_configs`). Any “standard setup” in docs or UX should align with this field.
- **Validation:** All scoring JSON should be validated for shape (flat maps, correct keys) and referential integrity (IDs exist in `muscles` / `motions` / modifier tables).
- **Authority:** Registry and table definitions are the structural source of truth; architecture docs describe and constrain usage and contracts.

For full contracts, cascade details, and admin guardrails, see `docs/currentdocs/BIOMECHANICS_ARCHITECTURE.md` and `docs/currentdocs/MATRIX_V2_CONFIG_OVERVIEW.md`.
