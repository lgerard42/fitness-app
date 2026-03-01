# Scoring System — Data Authoring Plan

**Status:** Architecture complete. Data authoring in progress.  
**Last reviewed:** February 2026

---

## Context

The backend architecture for the baseline + composable delta scoring model is complete and sound. The pipeline is:

1. Load `motions.muscle_targets` (absolute baseline)
2. Evaluate `combo_rules` for the active motion + modifier set
3. Apply active modifier `delta_rules` in fixed cascade order (1–15)
4. Normalize/clamp; apply any CLAMP_MUSCLE combo caps

What remains is entirely **data authoring** — no architectural changes needed. The tables that are locked and cannot be changed are `muscles` and `motions`. Everything in the Delta Modifier Tables layer is still open: rows can be added, deleted, modified, and columns can be added.

---

## What We Know Is Incomplete

| Area | Status | Notes |
|------|--------|-------|
| `NONE` anchor rows | Needs confirmation | Every modifier table must have a `NONE` row before any other work begins |
| `motions.muscle_targets` | Needs verification | Baselines must be populated for all Standard/Rehab/Mixed motions before delta work begins |
| Table Visibility (`motion_delta_table_visibility`) | Placeholder only | Every modifier is currently TRUE for every motion — this must be properly configured |
| `motions.default_delta_configs` | Needs population | Establishes the per-motion operational starting point |
| Delta Modifier Tables (`delta_rules`) | Starting point only | Values need to be authored per motion, scoped to only applicable modifiers |
| `combo_rules` | Completely empty | Must be populated to correct the additive model where it breaks down |

---

## Priority Order

Work must proceed in this sequence. Later steps depend on earlier ones being correct.

### Step 0A — NONE Row Contract (Global, Per Table)

**Why first:** Every modifier table must have a `NONE` row before any other authoring begins. This row is not a biomechanical concept — it means "the user did not log this modifier dimension." It protects historical data integrity and ensures the system never hallucinates a modifier selection that wasn't recorded.

**The contract:**
- `NONE` exists in all 15 modifier tables
- `NONE` means: **unassigned / user did not specify**
- `NONE` always produces `delta_rules: {}` for every motion
- `NONE` must **never** have real deltas authored on it — ever
- `NONE` is safe as a default for modifier dimensions where most users won't log (e.g. grip on early-stage tracking)

**Why this matters for real users:** If a user does 6 months of hammer curls without logging grip, their data must not be retroactively scored against any specific grip assumption. When they later start logging granularly, their historical data stays clean and uncommitted. `NONE` is what makes that possible.

**If a table cannot meaningfully have a `NONE` row** (rare edge case), that table must be either split or removed from the cascade entirely. Do not force a `NONE` row onto a table whose semantics break under an "unspecified" interpretation — the right answer is to restructure the table. A table cannot meaningfully support `NONE` only if the system's data model requires a value to be present to interpret the motion at all (i.e., missing is invalid, not unknown). If someone argues "`NONE` doesn't make sense for grips" — it does, because `NONE` means the user didn't log their grip, which is a completely valid and common state.

**Selectability rule:** Selecting `NONE` is always legal whenever the table is applicable for a motion, and always yields zero contribution to the score. `NONE` must not be created as a row but then excluded from allowed selections — if a table is applicable, `NONE` is selectable. No exceptions.

**Deliverable:** Confirm or create `NONE` row in all 15 modifier tables with `delta_rules: {}` locked for all motions.

---

### Step 0B — Default Row Contract (Per Motion)

**Why second:** Defaults are completely separate from the `NONE` anchor. A default is the **operationally most representative setup** for a specific motion — what the system assumes if the user picks a motion but doesn't touch modifiers. Defaults are per-motion and can legitimately point to any row, including rows with real deltas.

**The contract:**
- Each motion's `default_delta_configs` points to the most common real-world setup for that motion
- Defaults are **never** `NONE` unless you explicitly want "untracked by default" for a dimension — which should be a deliberate, documented choice per motion
- **Two layers of defaults exist and must not be conflated:**
  - **Engine `default_delta_configs` (per motion):** Should almost always represent a real setup — not `NONE`. This is what the scoring engine uses when the user doesn't specify, and it should produce a meaningful score.
  - **UI logging defaults (per user/profile):** May start at `NONE` for low-adoption dimensions where most users won't log granularly. This is a UX decision, not a scoring one.
- The default row is **not** the conceptual zero for delta authoring — `NONE` is
- When a motion's default points to a row that has real deltas (e.g. `SQUAT_BACK` defaulting to `loadPlacement.POSTERIOR_HIGH`), that is correct and expected — document it explicitly

**The critical authoring rule that follows from 0A + 0B:**

> **All deltas must be authored as deviations from `NONE` (unspecified), not deviations from the motion default.**

The default is the chosen starting selection for UX convenience. The zero point for all delta authoring is always `NONE`. If you treat the default as the implicit zero, deltas become inconsistent across motions and the model becomes unmaintainable over time.

**Guard rail — anchor visibility:** If a modifier table is applicable for a motion (`applicability = TRUE`), then that table's `NONE` row must be available and selectable for that motion. Never configure allowed rows in a way that excludes `NONE`. Authors must never be forced into a delta when the correct answer is "unspecified."

---

### Step 1 — Verify and Complete Baselines (`muscle_targets`)

**Why before visibility:** Baselines are a data integrity dependency. Visibility is a work-planning tool. It's easier to sanity-check baselines without simultaneously thinking about 15 modifier dimensions.

- Confirm all Standard, Rehab, and Mixed motion types have populated `muscle_targets`
- Umbrella motions (CHEST_PRESS, SQUAT, HINGE, etc.) do not need baselines — their children do
- Validate that all muscle IDs in `muscle_targets` are valid `muscles.id` entries with `is_scorable = true`
- Score scale is 0–5
- **Hard rule: if a baseline is wrong, fix the baseline.** Do not patch a bad baseline by authoring compensating deltas. The motions table is locked for structure but `muscle_targets` values are still being verified — fix errors there, not downstream.

---

### Step 2 — Configure Table Visibility

**Why third:** Once baselines are verified, visibility scoping defines exactly which modifier × motion combinations need delta values authored. Authoring deltas before scoping visibility means wasted work and noise in the model.

- Go motion by motion and set `applicability = TRUE` only for modifier tables that are genuinely relevant to that motion
- **Definition of applicable:** A table is applicable for a motion if (a) changing its row selection can plausibly change muscle recruitment for that motion, AND (b) the UI may allow the user to select it for that motion. If the UI will never show it, it should not be applicable — even if it could theoretically matter biomechanically. This keeps authoring workload bounded to what actually matters in practice.
- Key principles:
  - Lower-body mechanics (`footPositions`, `stanceWidths`, `stanceTypes`) should be FALSE for pure upper-body isolation motions (e.g. CURL, WRIST_FLEXION, TRICEP_EXTENSION_PUSHDOWN)
  - Upper-body mechanics (`grips`, `gripWidths`, `elbowRelationship`) should be FALSE for pure lower-body motions (e.g. CALF_RAISE, WALL_SIT, LEG_EXTENSION)
  - `resistanceOrigin` only applies where cable/band direction actually changes muscle recruitment — not for fixed-gravity barbell movements
  - Rehab/corrective motions (HIP_ABDUCTION, SHOULDER_EXTERNAL_ROTATION, DORSIFLEXION, etc.) need tight, minimal visibility configs
  - Olympic lifts need careful scoping — many modifiers don't apply meaningfully to multi-phase explosive movements
- **Guard rail:** When a table is set to `applicability = TRUE` for a motion, the `NONE` row for that table must remain available and selectable. Never configure allowed rows in a way that excludes `NONE`.

---

### Step 3 — Populate `default_delta_configs`

**Why fourth:** Defaults must be set before delta authoring begins so the operational starting point per motion is explicit and documented. This also makes it clear which combinations need the most careful delta authoring (cases where the default points to a row with real deltas).

- For each motion, identify the most common real-world setup and set `default_delta_configs` accordingly
- Defaults should almost never be `NONE` — if a user logs a motion with defaults, the system should represent a real setup, not an unspecified one
- Document every case where the default has real deltas authored on it — these are the highest-risk combinations for authoring errors
- **Important:** A motion scored with its defaults active is not the same as the raw baseline. Default-scored motion = baseline + default modifier deltas. If a motion's defaults all point to `{}` rows, the two are equivalent — but if any default points to a row with real deltas, the default-scored output will differ from the baseline. Never assume baseline == default exercise.

---

### Step 4 — Author Delta Modifier Table Values

**Why fifth:** This is the core data work. Done after `NONE` rows are locked, baselines are verified, visibility is scoped, and defaults are confirmed.

- Work motion by motion, modifier table by modifier table (only for applicable combinations per Step 2)
- For each applicable modifier row, define the flat `muscleId → delta` map for that motion
- **All deltas are relative to `NONE` (unspecified), not relative to the motion default**
- Use `"inherit"` for child motions whose delta is identical to the parent (e.g. CHEST_PRESS_FLAT inheriting from CHEST_PRESS for a given modifier)
- **Hard constraint on `inherit`:** `inherit` must resolve deterministically at load time into concrete deltas. There is no runtime fallback. Any unresolved `inherit` (e.g. a child motion using `inherit` when the parent has no entry for that modifier) is a hard error and must not reach production scoring.
- Use `{}` explicitly when a modifier is applicable but has no biomechanical effect for that motion
- Key modifier tables likely to have the most meaningful deltas:
  - `torsoAngles` — incline/decline shifts chest region emphasis significantly
  - `torsoOrientations` — prone vs. supine vs. side-lying changes everything
  - `grips` — pronated/supinated/neutral grip shifts bicep head recruitment, lat fiber emphasis, etc.
  - `elbowRelationship` — flared vs. tucked changes pec vs. tricep contribution in pressing
  - `resistanceOrigin` — cable angle changes peak tension point in fly/raise patterns
  - `stanceWidths` — wide vs. narrow stance shifts quad/adductor/glute balance in squat/hinge patterns
  - `rangeOfMotion` — partial vs. full ROM affects which portion of a muscle is loaded
  - `loadPlacement` — front rack vs. high bar vs. low bar vs. belt changes spinal loading and quad/hip balance

---

### Step 5 — Populate `combo_rules`

**Why last:** Combo rules correct the additive model where stacking individual deltas produces a biomechanically wrong result. You can only identify these cases once you know what the additive model actually produces.

- Identify modifier combinations where additivity breaks down
- **Hard rule: combo rules are only for true non-linear interactions.** Do not use combo rules to paper over bad delta values. If a combo rule seems needed to fix a scoring problem, go back and fix the delta first.
- Known problem areas to address first:
  - **Supinated grip on PULL_UP (chin-up):** Bicep involvement is qualitatively different, not just additive
  - **Sumo/wide stance on DEADLIFT/HINGE:** Hip mechanics shift fundamentally — adductor and glute medius recruitment changes are not well-modeled by adding a stance delta on top of a conventional hinge baseline
  - **Fly motions with low vs. high resistanceOrigin:** The peak tension point shifts, not just the magnitude
  - **Incline press + wide grip:** The two deltas interact in ways that aren't purely additive for upper chest vs. anterior delt balance
  - **Olympic lifts generally:** Multi-phase nature means many combo combinations will need CLAMP_MUSCLE or SWITCH_MOTION rules
- Action types available, in **preferred order of intervention** — exhaust earlier options before reaching for later ones:
  - `REPLACE_DELTA` — override a specific modifier's delta contribution (use first; most surgical, easiest to audit and reverse)
  - `CLAMP_MUSCLE` — cap a specific muscle's final score (use when stacking produces unrealistically high scores and REPLACE_DELTA alone isn't sufficient)
  - `SWITCH_MOTION` — use a different motion's baseline entirely (use last resort only; most powerful but hardest to maintain — reserve for cases where the modifier combination genuinely changes the movement category, not just the emphasis)

---

## Modifier Tables — Cascade Order Reference

| # | Table Key | Category | Role |
|---|-----------|----------|------|
| 1 | `motionPaths` | Trajectory & Posture | Path/trajectory of the movement |
| 2 | `torsoAngles` | Trajectory & Posture | Torso angle (incline/decline/upright) |
| 3 | `torsoOrientations` | Trajectory & Posture | Facing/orientation (prone, supine, side-lying) |
| 4 | `resistanceOrigin` | Trajectory & Posture | Where resistance comes from (cable angle, gravity direction) |
| 5 | `grips` | Upper Body Mechanics | Hand/grip orientation |
| 6 | `gripWidths` | Upper Body Mechanics | Grip width |
| 7 | `elbowRelationship` | Upper Body Mechanics | Elbow position relative to body |
| 8 | `executionStyles` | Upper Body Mechanics | Tempo, bilateral vs. alternating |
| 9 | `footPositions` | Lower Body Mechanics | Foot position |
| 10 | `stanceWidths` | Lower Body Mechanics | Stance width |
| 11 | `stanceTypes` | Lower Body Mechanics | Bilateral, unilateral, split |
| 12 | `loadPlacement` | Lower Body Mechanics | Where load is placed on the body |
| 13 | `supportStructures` | Execution Variables | Support surface (bench, floor, unsupported) |
| 14 | `loadingAids` | Execution Variables | Belts, wraps, straps |
| 15 | `rangeOfMotion` | Execution Variables | Full vs. partial ROM |

---

## Key Rules to Maintain Throughout

- All keys in `muscle_targets` and `delta_rules` must be valid `muscles.id` with `is_scorable = true`
- Parent muscle IDs with value `0` are stripped on save — don't pad with zeros
- Deltas can be negative (a modifier that de-emphasizes a muscle relative to the unspecified baseline)
- Score scale is 0–5 for both baselines and deltas; the engine clamps at 0–5
- `muscles` and `motions` tables are **locked** — no changes to these
- Delta Modifier Tables are **fully open** — rows, columns, and values can all be changed
- **Don't fix baseline mistakes with deltas** — if `muscle_targets` is wrong, fix it there
- **Don't fix delta mistakes with combo rules** — combo rules are for non-linear interactions only
- **All deltas are relative to `NONE`** — never relative to a motion's default selection
- **`NONE` rows are sacred** — they must never have real deltas authored on them
- **The engine never imputes modifier selections.** If a dimension is `NONE`, it is treated as unknown — period. The engine does not infer grip from equipment labels, does not guess stance from exercise names, does not fill in any modifier from context. If it's `NONE`, it contributes `{}`. This policy is locked and must not be relaxed as a "feature" later.

---

## Equipment — Handled Last, Not a Modifier Table

Equipment will **never** be a delta modifier table. It does not belong in the scoring pipeline.

What equipment actually is in this system: a **UI-friendly filter** that maps to a preset combination of modifier selections for a given motion. "Barbell Curl" is not a scoring concept — it is a human-readable label that resolves to CURL + a specific grip + a specific grip width + a specific stance type, etc. The scoring system sees only those modifier selections; it has no knowledge of what physical object the user is holding.

This is the correct design because the system cares about **what the body is doing**, not what implement is being used to do it. A curl with a barbell and a curl with a fixed-weight straight bar are biomechanically identical — same grip, same path, same muscle recruitment. Equipment labels are convenience aliases for modifier stacks, nothing more.

**Practical implications:**
- Equipment presets are authored as named modifier stack presets per motion, built on top of `default_delta_configs`
- Equipment will be the **last thing worked on**, after all delta modifier tables and combo rules are complete
- If a piece of equipment forces a modifier combination that doesn't exist yet (e.g. a specialty bar that demands a unique elbow relationship), the fix is to add that modifier row — not to create an equipment-specific scoring path
- The question to always ask when someone says "equipment X should score differently" is: **which modifier dimension captures that difference?** It will always be answerable in terms of grip, torso angle, stance, load placement, etc.
- **Equipment presets should be versioned**, even if lightweight — UX and marketing will constantly ask to rename or adjust equipment labels, and versioning prevents those changes from destabilizing scoring configs

---

## Tooling Recommendations

The authoring process at scale requires at minimum two supporting scripts. These should be built in parallel with authoring — not as a prerequisite, but not skipped either.

**1. Authoring checklist generator:** A script that reads the current table visibility config and produces a complete list of all `motion × modifier table` combinations where `applicability = TRUE` and `delta_rules` have not yet been authored. This is the live "what's left to do" tracker.

**2. Delta diff script:** A script that compares two snapshots of the authored delta tables and highlights exactly what changed — which motions, which modifier rows, which muscle deltas. This is essential for reviewing edits and catching unintended changes before they hit production.

Without these two tools, tracking completeness and safely reviewing changes becomes unreliable at the scale of 15 modifier tables × 80+ motions.

---

## Open Questions to Resolve During Authoring

1. What is the exact row set for each modifier table? (Need to review the actual delta modifier table CSVs to confirm all row IDs and whether `NONE` already exists or needs to be created in each)
2. Which Olympic lift motions warrant `SWITCH_MOTION` combo rules vs. just tight visibility scoping?
3. For `executionStyles`, does bilateral vs. unilateral execution warrant REPLACE_DELTA combo rules for asymmetric load muscles (e.g. obliques, QL) or is an additive delta sufficient?
4. For any motion where the operational default points to a row with real deltas, should that be explicitly flagged in the admin UI to warn authors?

---

## Technical overview: Preparing data for re-import into the admin

After you complete data authoring (e.g. in spreadsheets, CSVs, or standard tables), you will need to load the finished motion rows, modifier-table rows, and combo_rules back into the admin UI so they persist in Postgres. The following is a concise guide to formats and import paths. It does not replace the plan above; it describes how to bring authored data back into the system.

### Where the data lives

- **Reference data:** Postgres tables such as `motions`, `muscles`, the 15 modifier tables (e.g. `grips`, `motion_paths`, `torso_angles`), and `combo_rules`. All are exposed via the admin Table Editor and backend table API.
- **Matrix V2 config:** The `motion_matrix_configs` table stores per-motion config (applicability, allowed_row_ids, default_row_id, etc.) and is edited via the Motion Delta Matrix (Matrix V2 Config and Table Visibility tabs). Baseline and delta values themselves live in `motions.muscle_targets` and modifier `delta_rules`, not in config JSON.

### Export format (source of truth for column shape)

Use **export-key-tables.js** to dump the current DB to CSV under `keyTables/`. The resulting CSVs define the expected columns and shapes:

- **Muscles_MotionsTables/motions.csv** — Columns include `id`, `label`, `parent_id`, `muscle_targets` (JSON string: flat `Record<muscleId, number>`), `default_delta_configs` (JSON string: `Record<tableKey, rowId>` for the 15 modifier table keys), plus other motion fields.
- **Muscles_MotionsTables/combo_rules.csv** — Columns include `id`, `label`, `motion_id`, `trigger_conditions_json` (JSON array of `{ tableKey, operator, value }`), `action_type`, `action_payload_json` (JSON object; shape depends on action type), `priority`, `is_active`, etc.
- **DeltaModifierTables/<table>.csv** (e.g. `grips.csv`, `motion_paths.csv`) — Columns include `id`, `label`, `delta_rules` (JSON: `Record<motionId, DeltaEntry>` where each value is a flat `Record<muscleId, number>`, `"inherit"`, or `{}`), plus any table-specific columns.

Producing data that matches these column names and JSON shapes ensures the admin can accept it without schema surprises.

### JSON field rules

- **muscle_targets:** Flat object only; keys = `muscles.id` (scorable); values = numbers. No nesting. Parent keys with value 0 are stripped on save.
- **default_delta_configs:** Flat object; keys = modifier table keys (e.g. `motionPaths`, `grips`); values = single row ID string (or array if the schema allows multi-select for that key). All keys must be valid modifier table keys; row IDs must exist in the corresponding table.
- **delta_rules:** Keys = `motions.id`. Each value is either a flat `Record<muscleId, number>`, the literal string `"inherit"` (child motions only), or `{}`. Only scorable muscle IDs in maps.
- **trigger_conditions_json:** Array of `{ tableKey: string, operator: "eq" | "in" | "not_eq" | "not_in", value: string | string[] }`.
- **action_payload_json:** For SWITCH_MOTION: `{ proxy_motion_id: string }`. For REPLACE_DELTA: `{ table_key: string, row_id: string, deltas?: Record<muscleId, number> }`. For CLAMP_MUSCLE: `{ clamps: Record<muscleId, number> }`.

IDs (motion, muscle, modifier row) must already exist in the DB or be created in dependency order (e.g. motions before combo_rules that reference them).

### Import paths

1. **Table Editor (generic CRUD)** — Use the admin Table Editor to add or update rows table by table. Paste or upload data that matches the table's columns. JSONB columns accept JSON strings; the UI and backend parse them. Best for targeted updates and small batches (e.g. a few motion rows, a few combo_rules).
2. **Matrix V2 Config import** — For bulk motion-level data (baseline + per-modifier config): use the Matrix V2 Workstation → Matrix V2 Config tab → Import. Provide CSV/TSV with columns such as `MOTION_ID`, `PARENT_MOTION_ID`, `MUSCLE_TARGETS`, and one column per modifier table key with JSON `{ "config": { "applicability", "allowed_row_ids", "default_row_id", ... }, "deltas": ... }`. Only `config` is written to `motion_matrix_configs`; baseline in `MUSCLE_TARGETS` is applied in the workstation and must be saved to the motion (e.g. via Baseline card / save motion) to persist to `motions.muscle_targets`.
3. **Table Visibility import** — For bulk applicability only: use the Table Visibility panel import. Rows = motions; columns = modifier table keys; values = TRUE/FALSE. Writes to `config_json.tables[tableKey].applicability` in `motion_matrix_configs`.
4. **Direct DB or API** — If you have scripts or ETL, you can write to the backend table API (POST/PUT rows) or to Postgres, respecting the same JSON contracts and FK constraints. Use export-key-tables output as the column/format reference.

### Practical workflow for "finished motion rows + combo_rules"

1. Author motions, modifier rows, and combo_rules in your chosen tool (spreadsheet, CSV, etc.), using the export CSVs as the schema reference.
2. Ensure JSON fields are valid and IDs reference existing rows (or create dependencies first).
3. Re-import via Table Editor (row-by-row or small batch) and/or Matrix V2 Config import for motion-level config and baselines. Run GET `/api/admin/scoring/lint` after import to confirm NONE rows, default_delta_configs, and combo_rule referential integrity.
4. Use **Sync Defaults to Motion** in the Matrix V2 Workstation when you want to copy `default_row_id` from config into `motions.default_delta_configs` for the constraint evaluator.