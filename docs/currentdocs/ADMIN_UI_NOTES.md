# Admin UI Implementation Notes

**Purpose:** Capture implementation gotchas and fixes for the admin React app so future changes avoid known failure modes.  
**Last Updated:** 2026-02-28  
**Scope:** Admin app (`admin/`) — table editors, side-panels, field renderers, muscle/motion trees, Scoring Panel, Combo Rules.

---

## React: Rules of Hooks (Critical)

**Rule:** All React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, etc.) must be called in the **same order on every render**. You must **never** call a hook after an early `return`.

### What went wrong (MUSCLES side-panel white screen)

In `MuscleHierarchyField.tsx`, early returns were added for loading state, invalid `currentRecordId`, and missing `currentRecord`. A `useMemo` hook (`otherPrimaries`) was left **after** those returns. Result:

- First render: `loading === true` → component returns early → `otherPrimaries` useMemo is **not** called.
- Second render: data loaded → early returns skipped → `otherPrimaries` useMemo **is** called.

React detected a different number of hooks between renders and threw a fatal error, producing a white screen when opening any muscle row in the MUSCLES table.

### Fix

Move **all** hooks to the top of the component, before any conditional returns. If you need a value only when not loading, compute it in a hook that always runs and returns a safe default when preconditions aren’t met (e.g. `if (!currentRecord) return [];` inside the `useMemo`).

### Takeaway

When adding early returns (loading, validation, “not found”), scan the rest of the component for any hooks below those returns and move them above.

---

## Data shape: `parent_ids` (and other JSON/array fields)

**Rule:** Backend/API may return JSON columns as either a **parsed array** or a **JSON string**. Field renderers that consume these (e.g. muscle hierarchy, tree builders) must handle both to avoid runtime errors or blank trees.

### What went wrong

`MuscleHierarchyField` (and similar tree components) assumed `parent_ids` was always an array. When the API returned it as a string (e.g. `"[]"` or `"[ \"ID1\" ]"`), code that called array methods on it could throw or behave incorrectly.

### Fix

Use a small parser helper that accepts both shapes:

- If value is already an array → use it.
- If value is a string → `JSON.parse` (with try/catch) and ensure result is an array; otherwise `[]`.
- Otherwise → `[]`.

Apply the same pattern to any field that might be stored as JSONB and consumed as an array or object in the admin UI. **Combo Rules** table uses JSONB for `trigger_conditions_json`, `action_payload_json`, `expected_primary_muscles`, and `expected_not_primary`; the Combo Rules panel and any generic row editor must parse string→object/array when displaying and serialize when saving (same as above).

---

## Combo Rules: JSONB fields and trace UI

- **Combo Rules table (`comboRules`):** Rows have `trigger_conditions_json` (array of `{ tableKey, operator, value }`) and `action_payload_json` (object; shape depends on `action_type`: SWITCH_MOTION, REPLACE_DELTA, CLAMP_MUSCLE). In the **Combo Rules** tab (Motion Delta Matrix), the modal editor uses textareas with `JSON.stringify(..., null, 2)` for display and `JSON.parse` on save; tolerate both string and parsed object from the API per the rule above.
- **Scoring Panel (Dry-Run / Trace):** The trace response includes **`effectiveMotionId`** and **`rulesFired`**. When `effectiveMotionId !== motionId`, show a clear indicator (e.g. yellow banner: "Combo rule switched motion: scoring uses X instead of Y"). **`rulesFired`** is an array of `RuleFiredEntry` (ruleId, ruleLabel, actionType, matchedConditions, specificity, priority, winnerReason); display each with action-type color coding and winner reason so authors can debug which rules fired.
- **Motion Delta Matrix tabs:** The main page has four tabs: **Delta Rules**, **Matrix V2 Config**, **Table Visibility**, **Combo Rules**. The Combo Rules tab renders `ComboRulesPanel` (motion filter, list of rules, inline lint from GET `/lint`, modal create/edit with action type picker and JSON fields).
- **Workstation simulation:** The Matrix V2 Config panel’s scoring simulation is **combo-rule-aware**: it loads combo rules for the selected motion, passes them into `useScoringSimulation`, which calls `resolveComboRules` and passes overrides/clampMap into `computeActivation`. `SimulationPreview` shows a "Combo Rules Fired" section when `rulesFired.length > 0` with action type badges and winner reason.

---

## Delete and FK failure messaging

When a row delete fails due to a foreign-key constraint (e.g. deleting a motion that is referenced by `combo_rules`), the backend returns **409** with a human-readable message (e.g. "Cannot delete: this row is still referenced by combo_rules. Remove or reassign the dependent rows first.") and `pgCode: "23503"`. The admin UI should display this message instead of a generic error so authors know to fix or reassign dependent combo rules (or other FKs) before retrying.

---

## Muscle / delta score trees: parent explicit + total

**Rule:** In every muscle_targets and delta_rules tree (MuscleTargetTree, MotionConfigTree, DeltaRulesField, MotionPathsField, DeltaBranchCard, InlineDeltaEditor), a **parent** muscle that has children can have an **explicit score** (editable) and a **total** (parent value + sum of children) shown to the right.

- **Display:** `[explicit] total` — e.g. parent input `0.1`, children sum `1.2` → show input `0.1` and span `1.3` (total).
- **Persistence:** The flat map includes the parent key with the user-entered value; the backend strips parent keys with score 0 on save (for both `muscle_targets` and `delta_rules`).
- **Consistency:** Use the same pattern in all tree UIs so behavior is predictable across Table Editor, Matrix V2 Config, and Delta Rules tab.

---

## Data authoring support (Motion Delta Matrix)

The following support executing the data authoring plan (e.g. `prompt_completeBackendData.md`) without code changes:

- **NONE row enforcement:** The delta linter (GET `/api/admin/scoring/lint`) errors if any modifier table is missing a `NONE` row or if a NONE row has non-empty `delta_rules`. The Matrix V2 validator warns when a table is applicable but `NONE` is not in `allowed_row_ids`.
- **Default Modifier Selections:** In the Motions table, the `default_delta_configs` field is labeled **"Default Modifier Selections"** (all 15 modifier table keys). Authors set per-table defaults in **Matrix V2 Config** (`default_row_id` per table); use **"Sync Defaults to Motion"** (when an active config is selected) to copy those into `motions.default_delta_configs` for the constraint evaluator.
- **Delta Rules tab:** **Authoring Progress** (collapsible banner) shows per-table coverage, overall % complete, and a **Show incomplete only** filter. **Motion search** filters the motion list by label or ID. The side panel shows **"X / Y tables authored"** for the selected motion and a **"Set empty to inherit"** button for child motions to queue `inherit` for tables with no entry.
- **Tooling:** `backend/src/scripts/authoring-checklist.ts` (Postgres-backed coverage and NONE status); `.cursor/onlineprompts/diff-snapshots.js` (compare two export snapshots). Run authoring checklist: `cd backend && npx tsx src/scripts/authoring-checklist.ts`.
- **Linter:** Validates `default_delta_configs` row IDs (table key and row ID must exist). Combo rules are linted when passed to `lintAll` (loaded by the scoring route).

---

## Related docs

- **BIOMECHANICS_ARCHITECTURE.md** — Canonical table model, `muscles`/`motions`/`combo_rules` fields, scoring contracts, admin guardrails, NONE row and default_delta_configs validation.
- **MATRIX_V2_CONFIG_OVERVIEW.md** — Matrix V2 config, Delta Rules tab (coverage, search, side-panel), Combo Rules tab, admin components, glossary.
- **background_ScoringSystem.md** (`.cursor/onlineprompts/`) — Scoring pipeline including combo rules, table summaries, where to edit combo rules, data authoring support.
