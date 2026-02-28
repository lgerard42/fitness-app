# Muscles, Motions & Delta Modifier Tables — System Overview and Authoring Guide

**Purpose:** Condensed reference for professional engineers (fitness industry) to evaluate, analyze, and improve the biomechanics and scoring architecture. This document covers both **how the system works** and **how to author robust `muscle_targets` (baselines) and `delta_rules` (modifier deltas)** so scoring data is correct, consistent, and durable. Use as the shared context for discussion and adjustment.

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

**Parent vs. child muscles when calculating total scores:**

The composed score map is **flat**: each key is a muscle ID and each value is that muscle’s score (baseline + deltas for that ID only). Both a **parent** muscle and its **children** can appear as separate keys; their values are **independent** — the pipeline does not roll child scores up into the parent or sum parent + children.

- **When a parent has a score and its children have scores:** All entries coexist. The parent’s value is whatever was stored (or added by deltas) for that parent ID; each child’s value is for that child ID. There is no automatic “parent total = sum of children” during scoring.
- **Calculated score (for display/grouping):** When the system needs a **single number** for a muscle (e.g. for the Muscle Grouping dropdown or tree display), it uses **calculated score**: if that muscle ID has an **explicit** value in the flat map, that value is used; otherwise the value is the **sum of its children’s calculated scores** (recursive). So a parent with no explicit score gets a derived total from its children at display time; a parent with an explicit score keeps that value and does not replace it with the sum of children.
- **Persistence:** On save, parent muscle IDs with score **0** are stripped from `muscle_targets` and `delta_rules` (redundant, since parent total would be computed from children when absent). Parent IDs with **non-zero** scores are kept.

**How parent totals are computed: scorable vs non-scorable (`is_scorable`):**

This applies to **calculated score** and to the **"total"** shown in the admin UI (e.g. muscle target tree, Muscle Grouping). It does **not** change the raw scoring pipeline (baseline + deltas per key).

| | **Parent has `is_scorable = true`** | **Parent has `is_scorable = false`** |
|---|-------------------------------------|--------------------------------------|
| **Stored data** | The parent **can** appear as a key in `muscle_targets` or `delta_rules`. If it does, that value is its **explicit** score. | The parent **cannot** appear as a key. Admin UI and backend **exclude** non-scorable muscles from persisted maps (`filterScorableOnly`). So it **never** has an explicit score in the data. |
| **Calculated score / total** | If the parent has an **explicit** value in the flat map → that value **is** its calculated score (the system does **not** replace it with the sum of children). If the parent has **no** explicit value → calculated score = **sum of its children's calculated scores** (recursive). | The parent has no key in the flat map, so it **always** gets calculated score = **sum of its children's calculated scores** (recursive). There is no other source for its total. |
| **In the admin UI** | Editable: user can set an explicit score for the parent. When the parent has children, the UI may show a second number (e.g. "total" = explicit + sum of children's totals) for display. **Calculated score** (used for grouping and logic) uses **only** the explicit value when present, **not** explicit + children. | Read-only: no input field; the UI shows a derived total (sum of children) and typically a "Not scorable" label. The parent appears in the tree for hierarchy/display only. |

**Summary:** A **scorable** parent can have either an explicit score (then **calculated score** = that value) or no explicit score (then calculated score = sum of children). A **non-scorable** parent never has an explicit score in the data, so its total is **always** the sum of its children's calculated scores.

**Score scale and motion types:**

- Baseline and deltas use a **numeric scale** (typically **0–5** in the default policy). The engine can clamp (e.g. 0–5) and optionally normalize (e.g. to 0–1) for output. **Muscle Grouping** (admin): the motion’s `muscle_grouping_id` options are built from muscles whose **calculated score** is ≥ 0.5 and that have at least one child.
- **Motion types:** **Umbrella** = grouping-only, typically no baseline; **Standard / Rehab / Mixed** = have baseline `muscle_targets`. Author baselines for Standard/Rehab/Mixed.

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
- **Scoring rule:** Only `is_scorable !== false` muscles may appear as keys in `muscle_targets` or `delta_rules`. Non-scorable muscles can appear in the tree for display but are read-only and excluded from persisted scores. A non-scorable parent's total is always the sum of its children's calculated scores (see section 1, "How parent totals are computed: scorable vs non-scorable").
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
**`delta_rules`** = object keyed by `motionId`; each value = flat `Record<muscleId, number>` (deltas for that motion when this row is selected), or the literal **`"inherit"`** (use parent motion’s deltas; child motions only), or **`{}`** (no delta from this modifier).

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

**Grouping of Delta Modifier Tables**

The 15 modifier tables are grouped into **four categories** for admin UI (e.g. Matrix V2 workstation tabs or sections) and for conceptual clarity. Cascade order is global (1–15 above); within each group, tables keep the same order as in `MODIFIER_TABLE_KEYS`.

| Category | Table keys (in cascade order) | Purpose |
|----------|-------------------------------|--------|
| **Trajectory & Posture** | `motionPaths`, `torsoAngles`, `torsoOrientations`, `resistanceOrigin` | Path of movement, torso angle/orientation, and where resistance comes from. |
| **Upper Body Mechanics** | `grips`, `gripWidths`, `elbowRelationship`, `executionStyles` | Hand/grip setup, elbow position, and execution style (tempo, bilateral, etc.). |
| **Lower Body Mechanics** | `footPositions`, `stanceWidths`, `stanceTypes`, `loadPlacement` | Foot position, stance width/type, and where load is placed on the body. |
| **Execution Variables** | `supportStructures`, `loadingAids`, `rangeOfMotion` | Support surface, aids (belts/wraps), and range of motion. |

**Important:** Modifier rows never define a full baseline; they only define **relative** effects when applied on top of a motion baseline. All keys in `delta_rules` must be valid `motions.id` (top level) and `muscles.id` (inside each motion’s map).

**Per-table notes and example rows:**

| Table Key | Special columns / rules | Example row (id, label, notable fields) |
|-----------|-------------------------|------------------------------------------|
| **motionPaths** | Standard: `id`, `label`, `common_names`, `delta_rules`, `short_description`. No extra columns. | `MID_MID`, "Mid to Mid (Level)", `delta_rules: {}` (baseline horizontal path). |
| **torsoAngles** | **`angle_range`** (JSON: `min`, `max`, `step`, `default` for angle in degrees). **`allow_torso_orientations`** (boolean): when true, child rows in `torsoOrientations` can be selected. | `DEG_0`, "0° Flat", `angle_range: { "min": 0, "max": 0, "step": 0, "default": 0 }`, `allow_torso_orientations: true`. |
| **torsoOrientations** | **Parent table:** `torsoAngles` (optional `parentTableKey`). Rows are orientations under an angle (e.g. Prone, Supine, Side-Lying). No extra columns. | `PRONE`, "Prone", `delta_rules` with motion-specific deltas. |
| **resistanceOrigin** | Standard. No extra columns. | `MED`, "Medium", `delta_rules: {}` (chest height, baseline). |
| **grips** | **`parent_id`** (self-FK): optional parent grip (e.g. rotating grips under a "ROTATING" parent). **`is_dynamic`** (boolean): true for rotating/twist grips. **`grip_category`** (string): e.g. Vertical, Horizontal, Dynamic. **`rotation_path`** (JSON): for dynamic grips, `{ "start": "gripId", "end": "gripId" }`. | `PRONATED`, "Pronated", `parent_id: null`, `is_dynamic: false`, `grip_category: "Horizontal"`. |
| **gripWidths** | Standard. No extra columns. | `SHOULDER`, "Shoulder-Width", `delta_rules: {}` (baseline). |
| **elbowRelationship** | Standard. No extra columns. | `NEUTRAL`, "Neutral (45 degrees)", `delta_rules` with motion-specific deltas. |
| **executionStyles** | Standard. No extra columns. | `BILATERAL`, "Bilateral", `delta_rules: {}`. |
| **footPositions** | Standard. No extra columns. | `NEUTRAL`, "Neutral", `delta_rules: {}`. |
| **stanceWidths** | Standard. No extra columns. | `HIP_WIDTH`, "Hip-Width", or `SHOULDER_WIDTH`, "Shoulder-Width", with motion-specific deltas. |
| **stanceTypes** | Standard. No extra columns. | `BILATERAL`, "Bilateral", `delta_rules: {}`. |
| **loadPlacement** | **`load_category`** (string): e.g. BODY_SUPPORTED, HAND_HELD. **`allows_secondary`**, **`is_valid_secondary`** (boolean): for belt squat / secondary load logic. | `POSTERIOR_HIGH`, "Upper Back", `load_category: "BODY_SUPPORTED"`, `allows_secondary: false`, `is_valid_secondary: false`. |
| **supportStructures** | Standard. No extra columns. | `UNSUPPORTED`, "Unsupported", or `TORSO_BRACED`, "Torso Braced", with motion-specific deltas. |
| **loadingAids** | Standard. No extra columns. | `NONE`, "No Aids", `delta_rules: {}`. |
| **rangeOfMotion** | Standard. No extra columns. | `FULL`, "Full ROM", `delta_rules: {}` (baseline). |

---

## 4. Contracts for `muscle_targets` and `delta_rules`

### 4.1 `muscle_targets` (motions table)

- **Type:** Flat object: `Record<muscleId, number>`. No nesting.
- **Keys:** Valid **`muscles.id`**; only **`is_scorable !== false`**. Values: numeric baseline (same scale as pipeline, e.g. 0–5). Parent IDs with value **0** are removed on save.

### 4.2 `delta_rules` (Delta Modifier tables)

- **Type:** `Record<motionId, DeltaEntry>`. Top-level keys = valid **`motions.id`**.
- **Per-motion value (`DeltaEntry`):**  
  - **Flat map** `Record<muscleId, number>` — deltas to add (same scale; can be negative). Same inner contract as `muscle_targets` (scorable only, flat, parent 0 stripped on save).  
  - **`"inherit"`** (literal string) — use parent motion’s deltas; **child motions only** (motion must have `parent_id`).  
  - **`{}`** — no delta from this modifier.  
- **Omit** a motion key: resolver tries the motion’s **parent** (for child motions); for root motions, omit = no delta. Prefer **`{}`** when you want no effect.

---

## 5. Where to Edit in the Admin

### 5.1 `muscle_targets`

- **Motions table → row side panel:** Open a motion row; the **“Motion & Muscle Config”** block (anchor for parent_id + muscle_targets) shows the motion hierarchy and a **muscle target tree**. Edit baseline scores there; it is the primary place for baselines (and variations have their own targets).
- **Motion Delta Matrix / V2 Config:** Baseline can also be viewed/edited for the selected motion; same contract and normalization apply.

For the motions table, `muscle_targets` is not shown as a separate field; all baseline editing is inside Motion & Muscle Config.

### 5.2 `delta_rules`

- **Modifier table → row side panel:** Open any Delta Modifier table (e.g. Grips, Motion Paths, Torso Angles), click a row; **`delta_rules`** is a per-motion editor (muscle-delta tree or **“Inherit”** for child motions).
- **Motion Delta Matrix / V2 Config → Delta Scoring:** Same per-motion editing; same backend (strip parent zeros, sync to Matrix V2 configs).

---

## 6. How to Prepare Robust `muscle_targets`

- **Scorable only** — Every key must be a muscle ID with `is_scorable !== false`. Admin UI filters to scorable-only on save.
- **Prefer leaf/secondary muscles** — Assign scores to the most specific muscles the motion targets; leave parents without an explicit score to get derived totals at display time. Use an explicit parent score only when you need a roll-up.
- **Flat map only** — No nested objects or arrays. Parent with score **0** is stripped on save; omit parent key for “total from children.”
- **Consistent scale (e.g. 0–5)** — Same as pipeline. **Umbrella** motions: empty or minimal targets; **Standard/Rehab/Mixed**: meaningful baselines.
- **Muscle Grouping** — Options use calculated score ≥ 0.5 and “has children”; leaf-only scores still give parents a calculated total.

**Checklist:** Scorable IDs only; flat `{ [muscleId]: number }`; appropriate level (prefer leaves); no parent 0; scale 0–5; Umbrella vs Standard/Rehab/Mixed; verify grouping/totals after save.

---

## 7. How to Prepare Robust `delta_rules`

- **Scorable only** — Every key in each per-motion map must be a scorable muscle ID. Admin uses **filterScorableOnly** on save.
- **Per-motion: flat map or `"inherit"` or `{}`** — No nesting. Use **`"inherit"`** for child motions when the effect is identical to the parent; **do not** use `"inherit"` for root motions (no `parent_id`).
- **Parent with delta 0** — Stripped on save; omit for clarity.
- **Same scale as baseline (e.g. 0–5); negative deltas allowed.** Use **`{}`** for “no change”; omitting a motion key means resolver uses parent for children.
- **Include only motions this modifier affects** — Fewer keys keep data lean.

**Checklist:** Valid `motions.id`; each value is `"inherit"`, flat `{ [muscleId]: number }`, or `{}`; scorable only in flat maps; `"inherit"` only for child motions; no parent 0; scale consistent; use `{}` for no change when needed.

---

## 8. Admin Implementation Notes (for reference)

- **MuscleTargetTree** — Renders muscle hierarchy, explicit score + “total” (explicit + sum of children), emits flat map; uses **filterScorableOnly**.
- **MotionConfigTree** — “Motion & Muscle Config” for motions table: hierarchy + per-motion **MuscleTargetsSubtree** (flat + scorable); backend **normalizeMuscleTargets** (strip parent zeros).
- **DeltaRulesField** — Per-motion delta_rules editor (tree or “Inherit”); **filterScorableOnly** + **flattenMuscleTree** on save; backend **normalizeDeltaRules** (strip parent zeros per motion).
- **Muscle Grouping dropdown** — **getSelectableMuscleIds** (calculated score ≥ 0.5, has children).

Using these contracts and practices keeps **motion baselines** (`muscle_targets`) and **modifier deltas** (`delta_rules`) consistent and valid for the scoring pipeline and admin UI.

---

## 9. Discussion Hooks for Evaluation & Improvement

- **Scaling:** Adding a new modifier dimension = new table + `delta_rules` + one new slot in cascade order. No change to baseline contract.
- **Tuning:** Baseline and deltas are data; engine behavior (order, normalization, clamping) is code. Improvements can target data, policy, or both.
- **Consistency:** Home-base is per motion (`default_delta_configs`). Any “standard setup” in docs or UX should align with this field.
- **Validation:** All scoring JSON should be validated for shape (flat maps, correct keys) and referential integrity (IDs exist in `muscles` / `motions` / modifier tables).
- **Authority:** Registry and table definitions are the structural source of truth; architecture docs describe and constrain usage and contracts.

---

## 10. Motion V2 Config Import (CSV / TSV / Paste)

The **Matrix V2 Workstation** supports importing config data from a delimited table (CSV, TSV, or pasted text). Each **row** in the import corresponds to one **motion** (or motion family when applying to a config). The importer expects the following columns; column headers are matched case-insensitively for reserved names.

**Reserved columns (order in file is flexible):**

| Column | Required | How to build the value | Where it is routed / mapped |
|--------|----------|-------------------------|-----------------------------|
| **MOTION_ID** | Yes | Plain text: the **motion ID** (e.g. `PRESS_FLAT`, `CURL`). Must match an existing row in the **motions** table. | Identifies which motion (or motion group) the row applies to. Rows with invalid or missing MOTION_ID are skipped. |
| **MUSCLE_TARGETS** | No | **JSON object**: a flat `Record<muscleId, number>` (same contract as `motions.muscle_targets`). Example: `{"CHEST_MID":0.8,"TRICEP_OUTER":0.4}`. Only scorable muscle IDs; flat map; parent 0 stripped on save. | Loaded into the workstation’s **baseline** for that motion when you apply the import. To persist to the DB, apply via the **Baseline** card (or save motion) after import. Not written directly to `motions.muscle_targets` by the import step itself. |
| **VERSION** | No | Integer: the **config version** number. Used when you want to target a specific saved config (draft or active) for that motion. | If present, the importer finds the Matrix config whose `scope_id` = MOTION_ID and `config_version` = VERSION, and updates that config. If omitted, you map each row to a target config in the review step. |
| **motionPaths** | No | **JSON object**: `{ "config": <TableConfig>, "deltas": <optional per-row deltas> }`. See below for `config` shape. | **`config`** is written to the Matrix config’s **`config_json.tables.motionPaths`** (postgres: `matrix_configs` row, `config_json` JSONB). `deltas` is used for export round-trip; on import only `config` is applied. |
| **torsoAngles** | No | Same JSON shape: `{ "config": <TableConfig>, "deltas": ... }`. | Routed to **`config_json.tables.torsoAngles`**. TableConfig may include **`angle_range`** (min, max, step, default) for angle UI. |
| **torsoOrientations** | No | Same: `{ "config": <TableConfig>, "deltas": ... }`. | **`config_json.tables.torsoOrientations`**. |
| **resistanceOrigin** | No | Same: `{ "config": <TableConfig>, "deltas": ... }`. | **`config_json.tables.resistanceOrigin`**. |
| **grips** | No | Same: `{ "config": <TableConfig>, "deltas": ... }`. | **`config_json.tables.grips`**. |
| **gripWidths** | No | Same: `{ "config": <TableConfig>, "deltas": ... }`. | **`config_json.tables.gripWidths`**. |
| **elbowRelationship** | No | Same: `{ "config": <TableConfig>, "deltas": ... }`. | **`config_json.tables.elbowRelationship`**. |
| **executionStyles** | No | Same: `{ "config": <TableConfig>, "deltas": ... }`. | **`config_json.tables.executionStyles`**. |
| **footPositions** | No | Same: `{ "config": <TableConfig>, "deltas": ... }`. | **`config_json.tables.footPositions`**. |
| **stanceWidths** | No | Same: `{ "config": <TableConfig>, "deltas": ... }`. | **`config_json.tables.stanceWidths`**. |
| **stanceTypes** | No | Same: `{ "config": <TableConfig>, "deltas": ... }`. | **`config_json.tables.stanceTypes`**. |
| **loadPlacement** | No | Same: `{ "config": <TableConfig>, "deltas": ... }`. TableConfig may include **`secondary_overrides`**, **`valid_secondary_ids`** for load placement options. | **`config_json.tables.loadPlacement`**. |
| **supportStructures** | No | Same: `{ "config": <TableConfig>, "deltas": ... }`. | **`config_json.tables.supportStructures`**. |
| **loadingAids** | No | Same: `{ "config": <TableConfig>, "deltas": ... }`. | **`config_json.tables.loadingAids`**. |
| **rangeOfMotion** | No | Same: `{ "config": <TableConfig>, "deltas": ... }`. | **`config_json.tables.rangeOfMotion`**. |

**Building the modifier column JSON (each modifier table column):**

- The cell value must be valid **JSON**. The importer parses it with `JSON.parse(cell)`.
- **Shape:** `{ "config": <TableConfig>, "deltas": <optional> }`. On import, only **`config`** is written to the Matrix config; **`deltas`** is optional (used when exporting from the workstation for round-trip).
- **TableConfig** (for each modifier dimension) is the same structure used in Matrix V2 config JSON:
  - **`applicability`** (boolean): whether this modifier dimension is enabled for this motion/config.
  - **`allowed_row_ids`** (string[]): row IDs from that modifier table that are allowed (e.g. `["MID_MID","LOW_HIGH"]` for motionPaths).
  - **`default_row_id`** (string | null): the default selected row ID for this dimension.
  - **`null_noop_allowed`** (boolean), **`one_per_group`** (boolean), **`row_motion_assignments`** (Record<string, string>), etc. as needed.
  - **torsoAngles:** **`angle_range`** optional: `{ "min": number, "max": number, "step": number, "default": number }`.
  - **loadPlacement:** **`secondary_overrides`**, **`valid_secondary_ids`** optional for secondary load options.
- Example (motionPaths):  
  `{"config":{"applicability":true,"allowed_row_ids":["MID_MID","LOW_HIGH"],"default_row_id":"MID_MID","null_noop_allowed":false},"deltas":{"MID_MID":null,"LOW_HIGH":{"CHEST_UPPER":0.1}}}`

**Routing summary:**

- **MOTION_ID** → identifies the motion; row is skipped if not found in `motions`.
- **MUSCLE_TARGETS** → baseline for that motion in the workstation; user applies to DB via Baseline card / save motion.
- **VERSION** → optional; selects which Matrix config row (same motion + version) to update.
- **Modifier columns** (motionPaths … rangeOfMotion) → each cell’s **`config`** is merged into the target Matrix config’s **`config_json.tables[<tableKey>]`**. The underlying modifier **table rows** (e.g. `motion_paths`, `grips`) are **not** updated by the import; only the **Matrix V2 config** (which rows are allowed, default, etc.) is updated.

For full contracts, cascade details, and admin guardrails, see `docs/currentdocs/BIOMECHANICS_ARCHITECTURE.md` and `docs/currentdocs/MATRIX_V2_CONFIG_OVERVIEW.md`.
