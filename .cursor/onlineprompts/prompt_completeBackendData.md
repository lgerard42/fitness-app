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
| `motions.muscle_targets` | Needs verification | Baselines must be populated for all Standard/Rehab/Mixed motions before delta work begins |
| `motions.default_delta_configs` | Needs population | Establishes the neutral/home-base modifier stack per motion |
| Table Visibility (`motion_delta_table_visibility`) | Placeholder only | Every modifier is currently TRUE for every motion — this must be properly configured |
| Delta Modifier Tables (`delta_rules`) | Starting point only | Values need to be authored per motion, scoped to only applicable modifiers |
| `combo_rules` | Completely empty | Must be populated to correct the additive model where it breaks down |

---

## Priority Order

Work must proceed in this sequence. Later steps depend on earlier ones being correct.

### Step 0 — Define Semantic Anchor Rows Per Modifier Table
**Why first:** Every delta value ever authored is implicitly "compared to something." That something must be a globally stable, named row in each modifier table that means "no deviation from baseline" across every motion, forever. This is not the same as a motion's default selection — defaults are per-motion and can legitimately point to non-anchor rows for contextual reasons. The anchor row is a global data contract for the table.

**The critical rule:** The anchor row must always have `delta_rules: {}` for every motion and must never have real deltas authored on it. All other rows are defined relative to it.

**Why defaults don't substitute for this:** A motion's `default_delta_configs` can and should point to whatever row makes the most real-world sense for that motion — e.g. `SQUAT_BACK` might default to `loadPlacement.POSTERIOR_HIGH` because high-bar is the most common setup. That's correct. But `loadPlacement` still needs a separate anchor row (e.g. `BODYWEIGHT`) that means "no load placement effect," even if no motion ever defaults to it. If you skip this and later someone authors real deltas on a row that was accidentally serving as the anchor, every composed score that relied on it silently shifts.

**Anchor rows to confirm or create for each table:**

| Table Key | Expected Anchor Row | Meaning |
|-----------|--------------------|---------| 
| `motionPaths` | `MID_MID` | Level/horizontal path — baseline trajectory |
| `torsoAngles` | `DEG_0` / `FLAT` | 0° flat — no torso angle deviation |
| `torsoOrientations` | *(confirm — likely `UPRIGHT` or equivalent)* | No orientation deviation |
| `resistanceOrigin` | `GRAVITY` or `FREE_WEIGHT` | Gravity vector / barbell — no cable direction effect |
| `grips` | `NEUTRAL` or `STANDARD` | No grip deviation |
| `gripWidths` | `SHOULDER` / `SHOULDER_WIDTH` | Shoulder-width — baseline grip width |
| `elbowRelationship` | `NEUTRAL` | 45° / mid position — no elbow deviation |
| `executionStyles` | `BILATERAL` | Standard bilateral — no execution deviation |
| `footPositions` | `NEUTRAL` | Neutral foot position — no deviation |
| `stanceWidths` | `SHOULDER_WIDTH` or `HIP_WIDTH` | Baseline stance width |
| `stanceTypes` | `BILATERAL` | Standard bilateral stance |
| `loadPlacement` | *(confirm — likely `HAND_HELD` or `BODYWEIGHT`)* | No load placement bias |
| `supportStructures` | `UNSUPPORTED` | No support surface — baseline demand |
| `loadingAids` | `NONE` | No aids — baseline condition |
| `rangeOfMotion` | `FULL` / `FULL_ROM` | Full range of motion — baseline |

**Deliverable:** A confirmed, documented anchor row for all 15 tables, with `delta_rules: {}` locked in for every motion on that row.

---

### Step 1 — Verify and Complete Baselines (`muscle_targets`)
**Why before visibility:** Baselines are a data integrity dependency. Visibility is a work-planning tool. It's easier to sanity-check baselines without simultaneously thinking about 15 modifier dimensions.

- Confirm all Standard, Rehab, and Mixed motion types have populated `muscle_targets`
- Umbrella motions (CHEST_PRESS, SQUAT, HINGE, etc.) do not need baselines — their children do
- Validate that all muscle IDs in `muscle_targets` are valid `muscles.id` entries with `is_scorable = true`
- Score scale is 0–5

---

### Step 2 — Configure Table Visibility
**Why third:** Once baselines are verified, visibility scoping defines exactly which modifier × motion combinations need delta values authored. Authoring deltas before scoping visibility means wasted work and noise in the model.

- Go motion by motion and set `applicability = TRUE` only for modifier tables that are genuinely relevant to that motion
- Key principles:
  - Lower-body mechanics (`footPositions`, `stanceWidths`, `stanceTypes`) should be FALSE for pure upper-body isolation motions (e.g. CURL, WRIST_FLEXION, TRICEP_EXTENSION_PUSHDOWN)
  - Upper-body mechanics (`grips`, `gripWidths`, `elbowRelationship`) should be FALSE for pure lower-body motions (e.g. CALF_RAISE, WALL_SIT, LEG_EXTENSION)
  - `resistanceOrigin` only applies where cable/band direction actually changes muscle recruitment — not for fixed-gravity barbell movements
  - Rehab/corrective motions (HIP_ABDUCTION, SHOULDER_EXTERNAL_ROTATION, DORSIFLEXION, etc.) need tight, minimal visibility configs
  - Olympic lifts need careful scoping — many modifiers don't apply meaningfully to multi-phase explosive movements

---

### Step 3 — Populate `default_delta_configs`
**Why fourth:** The default modifier stack defines the most contextually appropriate starting point per motion. It must be set before delta authoring so it's clear which row is the operational default vs. which row is the semantic anchor.

- For each motion, identify the most common real-world setup (e.g. shoulder-width grip, bilateral stance, flat torso, full ROM, no aids)
- Set `default_delta_configs` to point to those modifier row IDs
- The default row does not have to be the anchor row — it should be whatever is most biomechanically representative for that motion
- Document any cases where the default diverges from the anchor row, as these are the exact cases where delta authoring requires the most care

---

### Step 4 — Author Delta Modifier Table Values
**Why fifth:** This is the core data work. Done after anchor rows are locked, baselines are verified, visibility is scoped, and defaults are confirmed.

- Work motion by motion, modifier table by modifier table (only for applicable combinations per Step 2)
- For each applicable modifier row, define the flat `muscleId → delta` map for that motion
- Use `"inherit"` for child motions whose delta is identical to the parent (e.g. CHEST_PRESS_FLAT inheriting from CHEST_PRESS for a given modifier)
- Use `{}` explicitly when a modifier is applicable but has no effect for that motion
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
- Known problem areas to address first:
  - **Supinated grip on PULL_UP (chin-up):** Bicep involvement is qualitatively different, not just additive
  - **Sumo/wide stance on DEADLIFT/HINGE:** Hip mechanics shift fundamentally — adductor and glute medius recruitment changes are not well-modeled by adding a stance delta on top of a conventional hinge baseline
  - **Fly motions with low vs. high resistanceOrigin:** The peak tension point shifts, not just the magnitude
  - **Incline press + wide grip:** The two deltas interact in ways that aren't purely additive for upper chest vs. anterior delt balance
  - **Olympic lifts generally:** Multi-phase nature means many combo combinations will need CLAMP_MUSCLE or SWITCH_MOTION rules
- Action types available:
  - `SWITCH_MOTION` — use a different motion's baseline entirely (most powerful; use when the movement category genuinely changes)
  - `REPLACE_DELTA` — override a specific modifier's delta contribution (use when one modifier's delta is wrong given another is also active)
  - `CLAMP_MUSCLE` — cap a specific muscle's final score (use to prevent additive stacking from producing unrealistically high scores)

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
- Deltas can be negative (e.g. a modifier that de-emphasizes a muscle)
- Score scale is 0–5 for both baselines and deltas; the engine clamps at 0–5
- `muscles` and `motions` tables are **locked** — no changes to these
- Delta Modifier Tables are **fully open** — rows, columns, and values can all be changed

---

## Equipment — Handled Last, Not a Modifier Table

Equipment will **never** be a delta modifier table. It does not belong in the scoring pipeline.

What equipment actually is in this system: a **UI-friendly filter** that maps to a preset combination of modifier selections for a given motion. "Barbell Curl" is not a scoring concept — it is a human-readable label that resolves to CURL + a specific grip + a specific grip width + a specific stance type, etc. The scoring system sees only those modifier selections; it has no knowledge of what physical object the user is holding.

This is the correct design because the system cares about **what the body is doing**, not what implement is being used to do it. A curl with a barbell and a curl with a fixed-weight straight bar are biomechanically identical — same grip, same path, same muscle recruitment. Equipment labels are convenience aliases for modifier stacks, nothing more.

**Practical implications:**
- Equipment presets are authored as `motion + default_delta_configs overrides` — essentially a named modifier preset per motion
- Equipment will be the **last thing worked on**, after all delta modifier tables and combo rules are complete
- If a piece of equipment forces a modifier combination that doesn't exist yet (e.g. a specialty bar that demands a unique elbow relationship), the fix is to add that modifier row — not to create an equipment-specific scoring path
- The question to always ask when someone says "equipment X should score differently" is: **which modifier dimension captures that difference?** It will always be answerable in terms of grip, torso angle, stance, load placement, etc.

---

## Open Questions to Resolve During Authoring

1. What is the exact row set for each modifier table? (Need to review the actual delta modifier table CSVs to confirm all row IDs exist before authoring delta values against them)
2. Which Olympic lift motions warrant `SWITCH_MOTION` combo rules vs. just tight visibility scoping?
3. Should `resistanceOrigin` have a row that represents "gravity / barbell" as a true neutral/no-delta baseline row, separate from cable-direction rows?
4. For `executionStyles`, does bilateral vs. unilateral execution warrant REPLACE_DELTA combo rules for asymmetric load muscles (e.g. obliques, QL) or is an additive delta sufficient?