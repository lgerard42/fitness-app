# The Universal Biomechanical Scoring Engine (UBSE)

> **Target Audience:** Software Engineering, Data Architecture, and Product Teams
> **Subject:** Technical Documentation for the Dynamic Exercise Volume Calculation System

---

## 1. Executive Overview

The **Universal Biomechanical Scoring Engine (UBSE)** is a deterministic calculation framework that replaces traditional, static "Exercise Libraries." Instead of hard-coding every possible exercise (e.g., "Incline Close-Grip Barbell Bench Press"), the system treats an exercise as a **Primary Motion** modified by a set of **Environmental Deltas**.

By resolving these attributes through a cascading inheritance logic, the UBSE produces a hyper-granular volume score for individual muscle heads (Tertiary Muscles), allowing for the most accurate fitness tracking in the industry.

---

## 2. The Biological Destination: The Three-Tier Muscle Schema

To understand where the data goes, an engineer must understand the hierarchical "Bucket" system. Every calculation eventually results in a value being added to one or more of these buckets.

| Tier | Name | Description | Example |
|------|------|-------------|---------|
| **Primary Muscles** | The Group | Top-level categories | ARMS, LEGS |
| **Secondary Muscles** | The Muscle | Specific muscles within a group | BICEPS, QUADS |
| **Tertiary Muscles** | The Target | Individual muscle heads or regions | BICEP_INNER, QUAD_OUTER |

**Engine Logic:** Scoring is performed at the Tertiary level. The system then automatically "rolls up" these scores to the Secondary and Primary parents for user reporting.

---

## 3. The Foundation: Motions, Variations, and Planes

An exercise is first resolved into its foundational physics.

- **MOTIONS** — The 37 "Primitive" movement patterns (e.g., `SQUAT`, `PRESS`, `CURL`). Each has a `STANDARD` muscle score in a JSON object, with optional plane-specific score variants.

- **MOTION_VARIATIONS** — Specific subtypes that "inherit" from a Motion but shift the load. `PRESS_INCLINE` inherits from `PRESS` but prioritizes upper chest.

- **MOTION_PLANES** — A 3x3 spatial grid (HIGH, MID, LOW for both Start and End points). This accounts for the trajectory of resistance (e.g., a high-to-low cable crossover). Each motion/variation can specify which planes are available and which is the default.

---

## 4. The Calculation Engine: The 10 Delta Modifiers

Once the base motion is identified, the system passes the score through a pipeline of **10 Delta Modifier Tables**. Each table contains `delta_rules` — JSON objects that add or subtract from the baseline score.

| Modifier Table | Purpose | Example |
|----------------|---------|---------|
| **GRIP_TYPES** | Hand orientation | Neutral grip shifts load from Chest to Triceps |
| **GRIP_VARIATIONS** | Dynamic rotations | A "Neutral-to-Supinated" curl increases Bicep Peak |
| **GRIP_WIDTHS** | Hand spacing | Wide grip prioritizes Outer Chest; Narrow prioritizes Triceps |
| **STANCE_WIDTHS** | Foot spacing | Wide stance recruits Adductors; Narrow recruits Outer Quads |
| **FOOT_POSITIONS** | Foot angle/tilt | Heel elevation isolates Quads; Toes Out recruits Inner Thigh |
| **STANCE_TYPES** | Structural base | Single-leg work adds Stability/Core/Glute Medius scores |
| **TORSO_ANGLES** | Body tilt | Incline vs. Flat changes the muscle head under greatest stretch |
| **SUPPORT_STRUCTURES** | Stability/Bracing | Bracing the torso offloads the Core/Lower Back |
| **ELBOW_RELATIONSHIP** | Joint path | Flaring elbows hits Upper Chest; Tucking hits Lats/Triceps |
| **LOADING_AIDS** | External gear | Straps remove Grip/Forearm demand; Belts increase Core Bracing |

---

## 5. The Scoring Algorithm: Cascading Inheritance

For a software engineer, the most critical part of the code is the **Resolution Logic**. To keep the database "DRY" (Don't Repeat Yourself), the `delta_rules` JSON follows a cascading hierarchy.

When the engine calculates a modifier (like a "Neutral Grip"), it searches the JSON object in this specific order:

1. **Resolved Variation + Specific Plane** — Does this grip have a rule for `PRESS_INCLINE` + `LOW_HIGH`?
2. **Resolved Variation Overall** — If not, does it have a rule for `PRESS_INCLINE`?
3. **Primary Motion Overall** — If not, does it have a generic rule for `PRESS`?
4. **Null State** — If no rules match, the delta is `0.00`.

> **Precision Requirement:** All scores and deltas are stored as 2-decimal floats (e.g., `0.15`) to ensure mathematical consistency across multi-modifier stacks.

---

## 6. Data Integrity & System Flexibility

- **Common Names:** Every entry includes a `common_names` JSON array (e.g., `["Hammer Grip", "Palms Facing"]`). This is used for the Search Logic, allowing users to find technical motions via slang.

- **Default Variations:** The `GRIP_TYPES` table uses a `default_variation` string. If a user selects "Rotating" but doesn't specify the rotation, the engine automatically defaults to a logical child (e.g., `NEUTRAL_SUP`).

- **Equipment Constraints:** The system is "Physics-Aware." Constraints (e.g., "A Barbell cannot use a Rotating Grip") are handled via Equipment Table Roll-ups, keeping the Biomechanical Tables focused strictly on math.

---

## 7. Example Calculation Flow

**Exercise:** Lying Single-Arm Dumbbell Row (Neutral Grip)

1. **Resolve Motion:** `HORIZONTAL_ROW` (Base Score: Back/Bicep)
2. **Resolve Variation:** `ROW_MID` (Refined Score: Mid-Back Thickness)
3. **Apply Grip Delta:** `NEUTRAL` (Subtracts from Upper Back, Adds to Lats)
4. **Apply Stance Delta:** `SINGLE_LEG` (Adds to Core/Glute Medius stability)
5. **Apply Support Delta:** `TORSO_BRACED` (Subtracts from Core/Lower Back)
6. **Final Output:** A perfectly unique score for that specific execution

---

## Summary for the Developer

Your task is to build a query engine that resolves the exercise ID into its component parts, fetches the relevant JSON blocks from the Delta tables, and performs a sum-reduction of the scores.

The beauty of this system is that you never have to add a new exercise to the database again — you simply ensure the 10 modifiers are accurate, and the math handles the rest.
