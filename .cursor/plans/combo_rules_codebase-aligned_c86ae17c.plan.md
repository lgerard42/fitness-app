---
name: Combo Rules Codebase-Aligned
overview: "This plan adapts the full combo_rules implementation to this repo's structure: Prisma schema + Drizzle referenceTables/triggers, admin tableRegistry + pgCrud, scoring in shared/scoring and backend admin scoring routes, and admin UI in MotionDeltaMatrix and ScoringPanel."
todos: []
isProject: false
---

# Combo Rules Implementation Plan (Codebase-Aligned)

## Architecture snapshot

**Data storage:** All reference data lives in **PostgreSQL tables** (Docker/pgAdmin). There are no JSON data tables or file-based tables—only Postgres. Some columns use **JSONB** for structured values (e.g. `trigger_conditions_json`, `action_payload_json`, `delta_rules`, `muscle_targets`); those are still columns on normal Postgres tables.

- **Schema:** Prisma at [backend/prisma/schema.prisma](backend/prisma/schema.prisma); reference table list and key→PG mapping in [backend/src/drizzle/schema/referenceTables.ts](backend/src/drizzle/schema/referenceTables.ts). Version tracking: [backend/src/drizzle/migrations/0001_triggers.sql](backend/src/drizzle/migrations/0001_triggers.sql) bumps `reference_metadata` per table (no manual insert).
- **Admin CRUD:** Registry in [backend/src/admin/tableRegistry.ts](backend/src/admin/tableRegistry.ts) (key, pgTable from `TABLE_KEY_TO_PG`, fields); routes in [backend/src/admin/routes/tables.ts](backend/src/admin/routes/tables.ts); DB layer [backend/src/admin/pgCrud.ts](backend/src/admin/pgCrud.ts). For **JSONB columns** on those Postgres tables: pgCrud stringifies on write; on read, node-pg may return parsed objects (see [docs/currentdocs/ADMIN_UI_NOTES.md](docs/currentdocs/ADMIN_UI_NOTES.md) for response shape gotcha).
- **Scoring:** Routes in [backend/src/admin/routes/scoring.ts](backend/src/admin/routes/scoring.ts) (POST `/compute`, POST `/trace`, GET `/lint`). Pipeline: `resolveAllDeltas` → `computeActivation` in [shared/scoring/resolveDeltas.ts](shared/scoring/resolveDeltas.ts) and [shared/scoring/computeActivation.ts](shared/scoring/computeActivation.ts). Modifier selection already in request body as `selectedModifiers: { tableKey, rowId }[]`. **matrixV2Resolver** is for matrix config resolution, not delta assembly.
- **Bootstrap:** [backend/src/services/referenceService.ts](backend/src/services/referenceService.ts) `getBootstrap()` iterates `ALL_REFERENCE_TABLES`, selects `WHERE is_active = true`. Table list for bootstrap = whatever is in `ALL_REFERENCE_TABLES` + `TABLE_KEY_TO_PG`.

Use **is_active** (not `enabled`) on ComboRule so it matches other reference tables and works with existing bootstrap/CRUD patterns. Index can be `@@index([motionId, is_active])` for rule lookup.

---

## Phase 1 — Database & Schema

### 1.1 — Add ComboRule to schema.prisma

- **File:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- Add model with `**id` as the primary key** (e.g. `@id @default(uuid())` or `@default(cuid())`). Admin CRUD and routes assume `id` for reads/updates/deletes and ordering; do not use a different column (e.g. `rule_id`) as the only identifier. If you need a stable business key, add it as a separate column (e.g. `rule_id`) in addition to `id`.
- Include a `**label`** column (e.g. `String`). The table registry and admin UI are label-oriented; without it, generic editors and dropdowns break or need special-case rendering. Use a short human-readable description of the rule.
- Other fields: FK to `RefMotion` (relation name, `onDelete: Restrict`), `trigger_conditions_json` (Prisma `Json` → Postgres JSONB), `action_type` (String or enum), `action_payload_json` (Json → JSONB), `expected_primary_muscles` / `expected_not_primary` (Json or String[] as per existing pattern), `priority` (Int), `sourceType SourceType @default(admin)`, `is_active Boolean @default(true)`, `sort_order`, etc. Add `@@index([motion_id, is_active])` for efficient rule lookup. Map table name (e.g. `@@map("combo_rules")`). Table is a normal Postgres table in the same Docker DB as other reference tables.
- **SourceType:** Enum already exists in schema with `seed` | `admin`; use `@default(admin)` for ComboRule.

### 1.2 — Prisma migration

- From repo root or backend: `cd backend && npx prisma migrate dev --name add_combo_rules`

### 1.3 — Reference tracking (version + bootstrap)

- **reference_metadata / version trigger:** Do **not** forget reference version trigger coverage. Without it, edits to `combo_rules` would not bump `reference_metadata` like other reference tables. Add a trigger: create a new migration file under [backend/src/drizzle/migrations/](backend/src/drizzle/migrations/) (e.g. `0002_combo_rules_trigger.sql`) that adds `CREATE TRIGGER trg_ref_version_combo_rules AFTER INSERT OR UPDATE OR DELETE ON combo_rules FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();` (No manual insert into `reference_metadata` — the trigger handles it.)
- **Bootstrap:** Add `combo_rules` to [backend/src/drizzle/schema/referenceTables.ts](backend/src/drizzle/schema/referenceTables.ts): extend `ALL_REFERENCE_TABLES` and `TABLE_KEY_TO_PG` (e.g. `comboRules: "combo_rules"`). Then `getBootstrap()` will include it; use `WHERE is_active = true` like other tables (no change to referenceService if ComboRule has `is_active`).

---

## Phase 2 — Backend

### 2.1 — Admin table registry

- **Files:** [backend/src/drizzle/schema/referenceTables.ts](backend/src/drizzle/schema/referenceTables.ts) (already done in 1.3 for bootstrap) and [backend/src/admin/tableRegistry.ts](backend/src/admin/tableRegistry.ts).
- In **tableRegistry**: Add a `TableSchema` for the **Postgres table** `combo_rules`: key `comboRules`, pgTable from `TABLE_KEY_TO_PG`, appropriate group (e.g. "Muscles & Motions"), **idField: `id`**, **labelField: `label`**, and `fields` including: `id`, `label`, `motion_id` (type `fk`, refTable `motions`), `trigger_conditions_json` (type `json` — stored as JSONB in Postgres, jsonShape `free` or new), `action_type` (string), `action_payload_json` (json, JSONB in Postgres), `expected_primary_muscles` / `expected_not_primary` (string[] or json), `priority` (number), `is_active`, `sort_order`, etc. For the registry `**file**` field (used for display/consistency): use a placeholder like `comboRules.json` — combo_rules are not seeded from JSON; data lives only in Postgres. Add to [backend/src/admin/tableDescriptions.ts](backend/src/admin/tableDescriptions.ts) if used. Enforce action_type in validation (see 2.2 / Phase 3 validators), not as a DB enum, unless you add an enum in Prisma.
- **Do not add `comboRules` to MODIFIER_TABLE_KEYS** in [shared/types/matrixV2.ts](shared/types/matrixV2.ts). Combo rules are evaluated *against* selected modifiers; they are not a modifier the user selects. Adding combo_rules there would make it selectable as a normal modifier and break the model.

### 2.2 — Admin CRUD routes

- No route changes needed: [backend/src/admin/routes/tables.ts](backend/src/admin/routes/tables.ts) is generic; once `comboRules` is in the registry, GET/PUT/POST/DELETE under `/api/admin/tables/comboRules` work against the Postgres `combo_rules` table. Ensure **JSONB columns** are handled: pgCrud stringifies on write; on read, admin UI must tolerate both parsed object and string for those fields per [docs/currentdocs/ADMIN_UI_NOTES.md](docs/currentdocs/ADMIN_UI_NOTES.md).

### 2.3 — Scoring service extension

- **Integration point:** [backend/src/admin/routes/scoring.ts](backend/src/admin/routes/scoring.ts) — not matrixV2Resolver. Flow: load motions + modifier tables from Postgres as today; **load enabled combo rules for the requested motionId** (query `combo_rules` by `motion_id` and `is_active = true`); call shared **resolveComboRules(motionId, selectedModifiers, rules)** to get `{ effectiveMotionId, deltaOverrides, clampMap, rulesFired }`; then pass overrides and clamp map into **computeActivation** (see Phase 3.2 — **final scores after clamps come from computeActivation only**; the route does not apply clamps a second time).
- Implement either a small **comboRuleService** in `backend/src/services/` that loads rules and calls shared `resolveComboRules`, or inline the query + call in the scoring route. Keep DB and request/response in backend; keep pure rule evaluation in shared.

### 2.4 — Scoring routes

- **POST /api/admin/scoring/compute** and **POST /api/admin/scoring/trace** already receive `selectedModifiers` in the body; no contract change. Extend both to: load combo rules for `motionId`, run `resolveComboRules`, then run existing pipeline with `effectiveMotionId` and overrides/clamps. **Trace response** must include **effectiveMotionId** and **rulesFired** with a **fixed “why this fired” payload schema** (see below) so the admin UI and debugging stay stable over time. Current trace shape is in [backend/src/admin/routes/scoring.ts](backend/src/admin/routes/scoring.ts) (lines ~99–111): add these two fields to the JSON.

**Trace `rulesFired` payload schema (fixed fields):** Each entry in `rulesFired` must include: **ruleId** (string, combo rule `id`), **actionType** (string, e.g. SWITCH_MOTION | REPLACE_DELTA | CLAMP_MUSCLE), **matchedConditions** (array of condition descriptors that matched the current selection), **specificity** (number or descriptor used for tie-break), **priority** (number from rule), **winnerReason** (string, e.g. "only match" | "highest specificity" | "priority tie-break" | "id tie-break"). Define this type in shared (e.g. `RuleFiredEntry`) and use it in trace response and UI.

### 2.5 — Scoring lint endpoint

- **GET /api/admin/scoring/lint** currently uses `lintAll(motions, muscles, modifierTables)` from [shared/linter/deltaLinter.ts](shared/linter/deltaLinter.ts). Extend **lintAll** to accept optional combo rules and append issues: motionId not in motions; proxy_motion_id (SWITCH_MOTION) not in motions and has muscle_targets; table_key (REPLACE_DELTA) is valid modifier table key **and** row_id exists in that modifier table; muscle IDs in CLAMP_MUSCLE exist **and** are scorable (`is_scorable !== false`); SWITCH_MOTION targeting motion with no muscle_targets (umbrella); unknown action types; empty conditions. Return same `{ issues, summary, formatted }` shape.
- **Important:** Update the scoring route callsite (the GET `/lint` handler that calls `lintAll`) in the **same PR** as the linter signature change. Otherwise you get compile drift or silent behavior where combo rules are never passed in and never linted.

### 2.6 — Reference bootstrap

- **GET /api/v1/reference/bootstrap** uses [backend/src/services/referenceService.ts](backend/src/services/referenceService.ts) `getBootstrap()`; it reads every table in `ALL_REFERENCE_TABLES` from Postgres and returns rows. Once `combo_rules` is in that list (Phase 1.3), bootstrap will include the `combo_rules` Postgres table.
- **Product decision — bootstrap filtering:** If combo rules are admin-only and mobile should not see them, **exclude combo_rules from bootstrap when building mobile payload** (filter by table key before sending). Treat this as an explicit product decision and document it so it’s not a later surprise.

---

## Phase 3 — Shared Library

### 3.1 — Types ([shared/types/index.ts](shared/types/index.ts))

- Add: **ComboRule**, **ComboRuleActionType** (e.g. `SWITCH_MOTION` | `REPLACE_DELTA` | `CLAMP_MUSCLE`), **TriggerCondition**, **SwitchMotionPayload**, **ReplaceDeltaPayload**, **ClampMusclePayload**, **ComboRuleResolutionResult** (effectiveMotionId, deltaOverrides, clampMap, rulesFired), and **RuleFiredEntry** (ruleId, actionType, matchedConditions, specificity, priority, winnerReason) for the trace “why this fired” payload. Export from shared so backend and admin (and tests) can use them.

### 3.2 — Scoring engine ([shared/scoring/](shared/scoring/))

- **New:** [shared/scoring/resolveComboRules.ts](shared/scoring/resolveComboRules.ts) — pure function `resolveComboRules(motionId, activeModifierSelections, rules: ComboRule[])` returning `{ effectiveMotionId, deltaOverrides, clampMap, rulesFired }`. **Combo-rule matching is explicitly order-independent:** `selectedModifiers` order must *not* affect match outcome. Treat the selection as a set (condition content only); only **condition content + tie-break** (specificity → priority → rule id) determine the winner. Delta summation is effectively set-based; combo resolution must be too. Implement match by trigger conditions (AND-only; operators: `eq`, `in`, `not_eq`, `not_in`), then winner by specificity → priority → rule id. No DB or I/O.
- **Update:** [shared/scoring/computeActivation.ts](shared/scoring/computeActivation.ts) — **Frozen decision: final scores after clamps come from computeActivation only.** Add optional params to `computeActivation` for delta overrides (apply REPLACE_DELTA before sum) and clamp map (apply CLAMP_MUSCLE after applyDeltas). Shared owns the full pipeline including policy clamp/normalize; the route must not apply clamps again. This avoids double-clamp bugs (computeActivation already applies clamp/normalize today; mixed ownership would duplicate or conflict).

### 3.3 — Constraints ([shared/constraints/](shared/constraints/))

- If any evaluator uses motion id (e.g. motion-specific dead zones), pass **effectiveMotionId** when calling from the scoring flow so constraint logic uses the resolved motion.

### 3.4 — Validators ([shared/validators/](shared/validators/))

- Add **comboRuleValidator** (new file or in [shared/validators/matrixV2Validator.ts](shared/validators/matrixV2Validator.ts)): validate shape of the JSONB payloads stored in `trigger_conditions_json` and `action_payload_json` (AND-only conditions, required fields per action type for SWITCH_MOTION, REPLACE_DELTA, CLAMP_MUSCLE). Use at author time (admin save) and optionally in lint.

### 3.5 — Linter ([shared/linter/deltaLinter.ts](shared/linter/deltaLinter.ts))

- Extend **lintAll** to accept optional combo rules (rows from the Postgres `combo_rules` table) and motions/muscles/modifier tables. Add checks: motionId exists in motions; SWITCH_MOTION proxy_motion_id exists and has muscle_targets (umbrella warning); REPLACE_DELTA table_key is a valid modifier table key **and** row_id exists as a row in that table; CLAMP_MUSCLE muscle IDs exist **and** are scorable (`is_scorable !== false` — warns if a clamped muscle is not scorable since the clamp will have no effect); unknown action types; empty trigger conditions. Emit same **LintIssue** shape (table `combo_rules`, rowId, field, message). **Ship the lintAll signature change and the scoring route update (load combo rules, pass into lintAll) in the same PR** to avoid compile or runtime drift.

### 3.6 — Tests ([shared/**tests**/](shared/__tests__/))

- **resolveComboRules.test.ts**: no rules → passthrough; SWITCH_MOTION → correct effectiveMotionId; tie-breaking (specificity, priority, rule `id`); REPLACE_DELTA replaces correct contribution; CLAMP_MUSCLE caps; multiple actions in one pass.
- **computeActivation** or [shared/**tests**/scoring.test.ts](shared/__tests__/scoring.test.ts): at least one smoke test that runs the full pipeline with a combo rule fired (effectiveMotionId or overrides/clamps applied).

---

## Phase 4 — Admin UI

### 4.1 — Table registry (admin side)

- Table list comes from backend **GET /api/admin/tables** (listTables), which returns the Postgres-backed tables from the registry. Once backend registry includes `comboRules`, the `combo_rules` Postgres table appears in the table editor; no change needed in [admin/src/api/tables.ts](admin/src/api/tables.ts) unless you hardcode a table list anywhere. [admin/src/pages/ScoringPanel/index.tsx](admin/src/pages/ScoringPanel/index.tsx) uses a local modifier table list; ensure any combo-rules UI uses the same pattern or the backend list.

### 4.2 — Field renderers

- The Postgres JSONB-backed fields (`trigger_conditions_json`, `action_payload_json`) and muscle arrays (`expected_primary_muscles`, `expected_not_primary`) need safe handling: parse string to object/array in UI per ADMIN_UI_NOTES. For v1, **raw JSON textarea** is acceptable; flag structured condition-builder and typed action form as UX debt. Validator on save (comboRuleValidator) is required.

### 4.3 — MotionDeltaMatrix workstation

- Add a **Combo Rules** tab or collapsible section to [admin/src/pages/MotionDeltaMatrix/MatrixV2ConfigPanel.tsx](admin/src/pages/MotionDeltaMatrix/MatrixV2ConfigPanel.tsx) (or [admin/src/pages/MotionDeltaMatrix/index.tsx](admin/src/pages/MotionDeltaMatrix/index.tsx)) scoped to the selected motion so authors see baseline, deltas, and combo rules together.
- **Combo-rule-aware workstation simulation (PR2 scope):** The workstation simulation that builds selected modifiers and runs scoring previews currently resolves deltas directly and does *not* account for combo rules. **Include combo-rule-aware simulation in PR2** — hook `resolveComboRules` into that preview (same as backend: load rules for motion, resolve, use effectiveMotionId + overrides + clamps). Otherwise authors will see a mismatch between workstation preview and backend scoring. Do not defer this to “later”; it is part of PR2 scope.

### 4.4 — Scoring trace UI

- [admin/src/pages/ScoringPanel/index.tsx](admin/src/pages/ScoringPanel/index.tsx) displays trace from POST `/scoring/trace`. Update to show **effectiveMotionId** (with a clear indicator when it differs from the selected motion) and **rulesFired** (rule id, action type, which conditions matched) so rule debugging is possible.

### 4.5 — useWorkstationState

- [admin/src/hooks/useWorkstationState.ts](admin/src/hooks/useWorkstationState.ts): Ensure the **full modifier selection** (e.g. array of `{ tableKey, rowId }`) is passed into the scoring compute/trace API calls so combo rules have correct input to evaluate.

---

## Phase 5 — Data Authoring

- Unchanged: motion group sessions produce motion_delta_table_visibility, allowed_row_ids, delta_rules, and combo_rules rows (all stored in Postgres) where the additive model is wrong.

---

## Phase 6 — Validation Test Runner

- Add an integration test: load fixture (motion + full modifier config + combo rules—**in-memory objects with the same shapes as Postgres rows**, no test DB required unless you prefer seeded data), run full computeActivation pipeline, assert top muscles match **expected_primary_muscles** and **expected_not_primary** are not primary. Run as part of `npm run test:ci` in backend or shared.

---

## Things that are easy to miss

- **Primary key:** Use `**id`** as the table PK (not `rule_id` alone). Admin CRUD assumes `id`; use a separate column for a stable business key if needed.
- **Label:** Include a `**label`** column so the generic table editor and label-oriented flows work without special-case rendering.
- **comboRules is not a modifier table:** Do **not** add `comboRules` to **MODIFIER_TABLE_KEYS** in [shared/types/matrixV2.ts](shared/types/matrixV2.ts). Combo rules are evaluated *after* selectedModifiers; they are not selectable as a modifier.
- **SourceType:** ComboRule uses `sourceType @default(admin)`; enum already has `admin` in [backend/prisma/schema.prisma](backend/prisma/schema.prisma).
- **RefMotion delete / FK failure messaging:** FK `onDelete: Restrict` — admin delete of a motion that has combo rules will fail. **Standardize FK failure messaging in the delete flow:** enforce backend error mapping so that when motion delete fails due to combo_rule (or other FK) dependencies, the API always returns a **human-readable message** (e.g. "Cannot delete motion: N combo rules reference it") instead of a generic 500. The delete UI may already show references; ensure the backend maps FK violations to this message consistently so the experience is user-friendly.
- **SWITCH_MOTION to umbrella motion:** Add an explicit lint rule and validator check: proxy_motion_id must have non-empty muscle_targets.
- **CSV export:** If you use [.cursor/onlineprompts/export-key-tables.js](.cursor/onlineprompts/export-key-tables.js) to export from Postgres to CSV for bulk editing, add **combo_rules** to the export list (table key + pg table + subfolder/filename) when you want it included.
- **Drizzle trigger:** New table = new migration file adding the trigger; Prisma migration does not add it.
- **Trace rulesFired schema:** Use the fixed **RuleFiredEntry** shape (ruleId, actionType, matchedConditions, specificity, priority, winnerReason) for every entry in `rulesFired`; do not return ad-hoc objects so UI and debugging stay stable.
- **Reference version trigger:** When you add `combo_rules` as a reference table, add the version trigger (Phase 1.3); otherwise edits won’t bump `reference_metadata` like other tables.
- **Linter + route in one PR:** When extending `lintAll` for combo rules, update the scoring route callsite ([backend/src/admin/routes/scoring.ts](backend/src/admin/routes/scoring.ts) GET `/lint`) in the **same PR** — load combo rules from Postgres and pass them in. Otherwise you get compile drift or silent “lint doesn’t check combo rules yet.”

---

## Implementation notes and decisions

**Frozen / decided**

- **Clamping ownership:** **Final scores after clamps come from `computeActivation` only.** REPLACE_DELTA overrides and CLAMP_MUSCLE clamp map are applied inside shared `computeActivation` (optional params). The route must not apply clamps again; mixed ownership would create double-clamp bugs since `computeActivation` already does clamp/normalize.
- **Combo-rule matching is order-independent:** `selectedModifiers` order must *not* affect match outcome. Only **condition content** (the set of selected tableKey+rowId pairs) and **tie-break** (specificity → priority → id) determine the winner. Spell this in `resolveComboRules` and in tests so behavior is stable and set-based.

**Optional / product**

- **Bootstrap filtering:** If combo rules are admin-only, **exclude combo_rules from bootstrap when building mobile payload**; document as an explicit product decision.
- **TableSchema `file`:** Combo rules have no seed JSON file. Use a placeholder (e.g. `comboRules.json`) in the registry for display/consistency only; data lives only in Postgres (see Phase 2.1).
- **Phase 6 fixture source:** Use in-memory objects shaped like Postgres rows (no test DB required unless you prefer seeded data). If you later want a test DB for integration tests, add a short note in the test or plan.

---

## Recommended sequencing (two-PR strategy)

Ship in **two PRs** to isolate schema/CRUD/UI from scoring behavior and simplify regression debugging.

**PR1 — Data model + admin CRUD + trace visibility**

- Phase 1 (schema with `id` + `label`, migration, referenceTables, trigger).
- Phase 2.1 + 2.2 (tableRegistry for combo_rules, no change to MODIFIER_TABLE_KEYS).
- Phase 2.4 (trace response extended: `effectiveMotionId`, `rulesFired` — can return `effectiveMotionId: motionId`, `rulesFired: []` until PR2).
- Phase 4.1, 4.4 (table editor shows combo_rules; ScoringPanel shows new trace fields).
- Phase 2.6 (bootstrap includes combo_rules; add filtering for mobile here if desired).

Result: table exists, you can author and edit rules, trace UI shows the new fields. No scoring behavior change yet.

**PR2 — Scoring resolution + lint + tests**

- Phase 3.1 (shared types, including **RuleFiredEntry** for trace payload).
- Phase 3.2 + 2.3 (resolveComboRules, scoring route integration; overrides/clamps applied only in computeActivation).
- Phase 2.4 (trace returns **rulesFired** with fixed schema: ruleId, actionType, matchedConditions, specificity, priority, winnerReason).
- Phase 2.5 + 3.5 (extend lintAll, update scoring route callsite in the same PR).
- Phase 3.3, 3.4, 3.6 (constraints, validators, tests).
- Phase 4.2, 4.3, 4.5 (field renderers, Combo Rules tab, useWorkstationState; **combo-rule-aware workstation simulation** so preview matches backend).
- Phases 5 + 6 (data authoring, validation runner) as follow-up.

Result: rules fire, lint checks them, tests cover resolution and pipeline, and workstation preview matches backend scoring.

---

## Enhancements for easier management

Post–MVP improvements to reduce authoring errors, speed up iteration, and make rule lifecycle and dependencies visible. Prioritize based on impact vs effort.

### Best enhancements (high impact)

**1) Typed Combo Rule Builder (instead of raw JSON-only)**

- Create a dedicated editor component for `trigger_conditions_json` and `action_payload_json` with:
  - **Action-type picker** (SWITCH_MOTION | REPLACE_DELTA | CLAMP_MUSCLE).
  - **Condition rows** (tableKey, operator [`eq` | `in` | `not_eq` | `not_in`], value) instead of freeform JSON.
  - **Payload form per action type** (e.g. proxy_motion_id for SWITCH_MOTION; table_key + row_id + deltas for REPLACE_DELTA; muscle caps for CLAMP_MUSCLE).
  - **Inline validator messages** (shape and referential errors as the user edits).
- **Why:** Reduces malformed JSON and authoring fatigue dramatically vs freeform JSON.
- Keep a **raw JSON “advanced mode” toggle** for power users.

**2) Rule Fire Preview inside MotionDeltaMatrix workstation**

- You already have simulation mechanics that build selected modifiers and run scoring previews. Hook combo resolution into that preview so authors can see:
  - **Matched rules** (which rules’ conditions matched the current selection).
  - **Winning tie-break path** (specificity → priority → id).
  - **effectiveMotionId switch** (when it differs from the selected motion).
  - **Before/after top muscles** (baseline vs post-rule).
- The simulation hook already computes selected modifiers and resolved deltas; this is a natural extension so authors validate rules in context without leaving the workstation.

**3) Inline lint panel in Combo Rules editor**

- Don’t make authors leave context for GET `/lint`. Show **per-row issues** right where they edit, e.g.:
  - Unknown motion ID.
  - Invalid tableKey/rowId (REPLACE_DELTA).
  - Clamp muscles not scorable (CLAMP_MUSCLE).
  - SWITCH_MOTION to umbrella / no baseline.
- The linter already emits the issue shape (table, rowId, field, message) needed for this UX; surface it in the combo rules tab or row detail (e.g. collapsible “Issues” panel or inline badges).

**4) “Dependencies” side panel for motion delete safety**

- You already expose FK references in the delete UX. Extend this to **explicitly list combo rules referencing a motion** before delete attempts.
- Keeps `onDelete: Restrict` failures user-friendly: authors see “This motion is referenced by N combo rules” and can fix or reassign before hitting a 500.

**5) Status workflow for combo rules (draft / active)**

- Matrix configs already have a draft/active lifecycle; combo rules would benefit from the same **promotion flow** so new/edited rules don’t instantly impact scoring.
- Options: add a `status` (e.g. `draft` | `active`) and only evaluate `active` rules at score time; or reuse `is_active` with a separate “promote” action and audit. Document the choice so it aligns with matrix config UX.

### Additional enhancements

- **Bulk clone rules across motion families** (e.g. press variants) with find/replace motion IDs so authors don’t re-enter the same rule for every motion.
- **Conflict scanner in UI:** Surfaces multiple SWITCH_MOTION candidates with near-equal specificity so authors can adjust priority or conditions.
- **Rule analytics:** “Fire frequency” in trace logs (or a small analytics view) to identify dead or over-broad rules.
- **Saved test cases tied to expected outcomes** to support the Phase 6 validation runner (store fixture + expected top muscles / expected_not_primary and run on demand or in CI).

