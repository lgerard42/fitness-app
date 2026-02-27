# Admin UI Implementation Notes

**Purpose:** Capture implementation gotchas and fixes for the admin React app so future changes avoid known failure modes.  
**Last Updated:** 2026-02-26  
**Scope:** Admin app (`admin/`) — table editors, side-panels, field renderers, muscle/motion trees.

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

Apply the same pattern to any field that might be stored as JSONB and consumed as an array or object in the admin UI.

---

## Muscle / delta score trees: parent explicit + total

**Rule:** In every muscle_targets and delta_rules tree (MuscleTargetTree, MotionConfigTree, DeltaRulesField, MotionPathsField, DeltaBranchCard, InlineDeltaEditor), a **parent** muscle that has children can have an **explicit score** (editable) and a **total** (parent value + sum of children) shown to the right.

- **Display:** `[explicit] total` — e.g. parent input `0.1`, children sum `1.2` → show input `0.1` and span `1.3` (total).
- **Persistence:** The flat map includes the parent key with the user-entered value; the backend strips parent keys with score 0 on save (for both `muscle_targets` and `delta_rules`).
- **Consistency:** Use the same pattern in all tree UIs so behavior is predictable across Table Editor, Matrix V2 Config, and Delta Rules tab.

---

## Related docs

- **BIOMECHANICS_ARCHITECTURE.md** — Canonical table model, `muscles`/`motions` fields, scoring contracts, admin guardrails.
- **MATRIX_V2_CONFIG_OVERVIEW.md** — Matrix V2 config, admin components, glossary (e.g. motions/muscles row flags).
