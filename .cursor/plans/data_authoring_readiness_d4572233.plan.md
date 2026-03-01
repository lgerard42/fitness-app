---
name: Data Authoring Readiness
overview: Code and admin UI updates needed before executing the data authoring plan in `prompt_completeBackendData.md`. Covers NONE enforcement, default_delta_configs generalization, linter upgrades, coverage tooling, and UX improvements so data authoring can proceed without code interruptions.
todos:
  - id: a1-none-lint
    content: Add NONE row enforcement checks to deltaLinter.ts (presence + empty delta_rules)
    status: completed
  - id: a2-none-validator
    content: Add NONE-in-allowed_row_ids warning to matrixV2Validator.ts semantic layer
    status: completed
  - id: a3-label-fix
    content: Rename default_delta_configs label from 'Motion paths' to 'Default Modifier Selections' in tableRegistry.ts
    status: completed
  - id: b1-defaults-ui
    content: Resolve default_delta_configs dual-source-of-truth (Option A sync or Option B new component)
    status: completed
  - id: b2-coverage-dashboard
    content: Add authoring progress banner and 'show incomplete' filter to Delta Rules tab
    status: completed
  - id: b3-motion-search
    content: Add motion search input to Delta Rules tab in MotionDeltaMatrix
    status: completed
  - id: b4-pg-coverage
    content: Add Postgres-backed coverage/checklist script
    status: completed
  - id: c1-diff-script
    content: Create diff-snapshots.js for comparing export runs
    status: completed
  - id: c2-cascade-order
    content: Sort selectedModifiers by MODIFIER_TABLE_KEYS index in resolveAllDeltas
    status: completed
  - id: c3-default-lint
    content: Add default_delta_configs row ID validation to linter
    status: completed
  - id: c4-sidepanel-summary
    content: Add 'X/Y tables authored' summary to Delta Rules side panel
    status: completed
  - id: c5-bulk-inherit
    content: Add 'Set all empty to inherit' bulk action in side panel
    status: completed
isProject: false
---

# Data Authoring Readiness — Code and UI Updates

This plan covers all code, linter, tooling, and admin UI changes needed so that executing `prompt_completeBackendData.md` (Steps 0A through 5) is seamless. No data authoring itself is included here — only the infrastructure to support it.

---

## Priority A — Blockers (must be done before data authoring begins)

### A1. NONE Row Enforcement in Linter

**Problem:** Step 0A requires every modifier table to have a `NONE` row with `delta_rules: {}`. Nothing in the codebase enforces this.

**Changes in [shared/linter/deltaLinter.ts](shared/linter/deltaLinter.ts):**

- Add a `lintNoneRows()` function called from `lintAll()`:
  - For each of the 15 modifier tables, check that a row with `id === "NONE"` exists. If missing: **error**.
  - For each NONE row, check that its `delta_rules` is `{}` or empty array (the MID_MID pattern). If any motion key has real muscle deltas: **error** ("NONE row must not have real deltas").
- This runs every time `/scoring/lint` or `validate-all-deltas.ts` is invoked.

### A2. NONE in allowed_row_ids — Matrix Validator

**Problem:** Step 0A says "if a table is applicable, NONE is selectable." Nothing enforces this in matrix config validation.

**Changes in [shared/validators/matrixV2Validator.ts](shared/validators/matrixV2Validator.ts):**

- In `validateSemantic()`, add a check: when `tc.applicability === true` and `modifierTableRows[tableKey]` contains a row with id `"NONE"`, warn if `"NONE"` is not in `tc.allowed_row_ids`.
- Severity: **warning** (not error), since some tables may legitimately exclude NONE during early setup.

### A3. Fix `default_delta_configs` Label in Table Registry

**Problem:** In [backend/src/admin/tableRegistry.ts](backend/src/admin/tableRegistry.ts) (line 91), the motions field for `default_delta_configs` is labeled `"Motion paths"`. This is misleading since the field supports all 15 table keys.

**Change:** Rename the label from `"Motion paths"` to `"Default Modifier Selections"`.

```
{ name: 'default_delta_configs', type: 'json', jsonShape: 'default_delta_configs', label: 'Default Modifier Selections', defaultValue: {} },
```

---

## Priority B — High Value (should be done before Step 3-4 authoring)

### B1. Generalize `default_delta_configs` UI for All 15 Tables

**Problem:** `MotionPathsField` only edits the `motionPaths` key. The engine and constraint evaluator support all 15 keys in `motions.default_delta_configs`, but there is no UI to set the other 14. Step 3 requires setting defaults for every applicable modifier per motion.

**Two sources of truth exist for defaults:**

- `motions.default_delta_configs` — used by constraint evaluator
- `motion_matrix_configs.config_json.tables[key].default_row_id` — used by simulation, resolver, Matrix V2 UI

**Recommended approach (option chosen matters — see question below):**

- **Option A (Minimal — recommended):** Keep the canonical defaults in Matrix V2 Config (`default_row_id`). The existing Matrix V2 Config panel already has per-table default dropdowns for all 15 tables. Authors use that panel for Step 3 work. Add a one-way sync button or auto-sync that copies `default_row_id` values from the active matrix config into `motions.default_delta_configs` so the constraint evaluator stays aligned. `MotionPathsField` stays as-is for backward compat.
- **Option B (Full generalization):** Replace `MotionPathsField` with a new `DefaultDeltaConfigsField` component that renders a section per modifier table (only applicable tables based on the motion's matrix config) with a row dropdown per table. This would require:
  - New component in `admin/src/components/FieldRenderers/`
  - Update the `jsonShape === 'default_delta_configs'` branch in [admin/src/components/RowEditor.tsx](admin/src/components/RowEditor.tsx) (~line 499) to render the new component
  - Loading all 15 modifier tables' rows for dropdown options
  - Reading `motion_matrix_configs` to know which tables are applicable

### B2. Coverage Dashboard in Admin UI (Delta Rules Tab)

**Problem:** Authors have no way to see which motion x table combos are done vs. missing. They must visually scan the matrix cell-by-cell. The plan's "authoring checklist generator" asks for exactly this.

**Changes in [admin/src/pages/MotionDeltaMatrix/index.tsx](admin/src/pages/MotionDeltaMatrix/index.tsx):**

- Add a collapsible **"Authoring Progress"** banner at the top of the Delta Rules tab:
  - Per-table: "X / Y motions have delta_rules" (Y = motions where that table is applicable per matrix config)
  - Per-motion: "X / Y applicable tables have delta_rules"
  - Overall: "Z% complete"
- Add a **"Show incomplete only"** toggle/filter that hides motions or tables that are fully authored
- Data source: already available (`modifierTableData` + matrix configs are loaded); just needs a summary computation

### B3. Motion Search in Delta Rules Tab

**Problem:** The Delta Rules tab has no search bar for motions. The Matrix V2 Config panel has `motionSearch` but the main Delta Rules matrix does not. With 80+ motions, finding a specific one requires scrolling.

**Change:** Add a search input above the matrix in the Delta Rules tab that filters the motion list by label or ID. Mirror the pattern from `MatrixV2ConfigPanel.tsx` line 138.

### B4. Postgres-Backed Coverage Report Script

**Problem:** [shared/linter/coverage-report.ts](shared/linter/coverage-report.ts) reads from JSON files (`src/database/tables/`), not from Postgres. Once data is authored in the admin UI and saved to Postgres, the JSON-based report won't reflect current state.

**Change:** Add a Postgres-backed variant alongside the existing script. Two options:

- Add a `--db` flag to `coverage-report.ts` that loads from Postgres via the pool (same as scoring routes do), or
- Add a new `backend/src/scripts/authoring-checklist.ts` that connects to Postgres, loads motions + modifier tables + matrix configs, and produces the same coverage output plus a "still to do" checklist (motion x table combos where `applicability === true` but no delta_rules entry exists)

---

## Priority C — Nice to Have (can be done during authoring)

### C1. Delta Diff Script

**Problem:** No tool to compare before/after snapshots of delta data. The plan calls for a "delta diff script" to safely review edits.

**Location:** `.cursor/onlineprompts/diff-snapshots.js` (next to `export-key-tables.js`).

**Behavior:**

- Takes two directory paths (two runs of `export-key-tables`)
- For each modifier table CSV, diffs rows and reports: added/removed motions in delta_rules, changed muscle deltas with old vs new values
- Output: human-readable summary to stdout

### C2. Cascade Order Enforcement

**Problem:** The plan says deltas apply in "fixed cascade order (1–15)." `resolveAllDeltas` iterates `selectedModifiers` in whatever order the caller provides. Since deltas are summed (commutative), order does not affect the math today. But if combo rules or future features depend on order, it matters for consistency.

**Recommended:** Sort `selectedModifiers` by `MODIFIER_TABLE_KEYS` index inside `resolveAllDeltas` in [shared/scoring/resolveDeltas.ts](shared/scoring/resolveDeltas.ts). This is a one-line change:

```typescript
const sortedModifiers = [...selectedModifiers].sort(
  (a, b) => MODIFIER_TABLE_KEYS.indexOf(a.tableKey as any) - MODIFIER_TABLE_KEYS.indexOf(b.tableKey as any)
);
```

Low risk since math is commutative; purely for trace/debug readability and future-proofing.

### C3. Validate `default_delta_configs` Row IDs in Linter

**Problem:** Nothing checks that row IDs in `motions.default_delta_configs` actually exist in their respective modifier tables.

**Change in [shared/linter/deltaLinter.ts](shared/linter/deltaLinter.ts):**

- In the motions loop inside `lintAll()`, if `motion.default_delta_configs` exists, check each `[tableKey, rowId]` entry:
  - `tableKey` must be a valid modifier table key
  - `rowId` must exist as a row ID in that table
  - If either fails: **warning**

### C4. Side-Panel Summary for Selected Motion

**Problem:** When a motion is selected in the Delta Rules tab, the side panel shows all 17 tables but no summary of how many are authored vs. empty.

**Change:** Add a small summary line at the top of the side panel: "8 / 12 applicable tables have delta_rules" (where 12 is the count of applicable tables for this motion).

### C5. "Copy Deltas from Parent" / "Set Inherit" Bulk Action

**Problem:** For child motions that should inherit most deltas from a parent, the author must manually set `"inherit"` on each modifier row one at a time.

**Change:** Add a "Set all empty to inherit" button in the Delta Rules side panel (per motion). For each applicable table where the motion has no entry in any row's `delta_rules`, automatically add `"inherit"` for that motion.

---

## Scope Boundary — Not in This Plan

- Actual data authoring (NONE rows, baselines, visibility, defaults, deltas, combo rules) — that is `prompt_completeBackendData.md`
- Rule authoring UI for local/global rules (documented as future phase)
- Equipment presets (explicitly last in the authoring plan)
- The `motions` and `muscles` table structure (locked)

---

## File Map


| File                                             | Changes                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| `shared/linter/deltaLinter.ts`                   | A1 (NONE lint), C3 (default_delta_configs validation)                         |
| `shared/validators/matrixV2Validator.ts`         | A2 (NONE in allowed_row_ids)                                                  |
| `backend/src/admin/tableRegistry.ts`             | A3 (label fix)                                                                |
| `admin/src/components/RowEditor.tsx`             | B1 (if Option B)                                                              |
| `admin/src/components/FieldRenderers/`           | B1 (new or updated component, if Option B)                                    |
| `admin/src/pages/MotionDeltaMatrix/index.tsx`    | B2 (coverage banner), B3 (search), C4 (side-panel summary), C5 (bulk inherit) |
| `shared/linter/coverage-report.ts` or new script | B4 (Postgres-backed coverage)                                                 |
| `.cursor/onlineprompts/diff-snapshots.js`        | C1 (new file)                                                                 |
| `shared/scoring/resolveDeltas.ts`                | C2 (cascade sort)                                                             |


