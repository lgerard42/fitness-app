**✅ Muscles & Motions Tables – Final Locked Summary & Implementation Notes**

**Status**  
Muscles & Motions tables are now officially **locked** with the patch we agreed on.  
These tables are the clean foundation for the entire scoring engine, UI composer, dead-zone logic, and all future delta rebuilds.

### What Changed (Summary)

**MUSCLES**  
- Added 1 brand-new row: **TIBIALIS_ANTERIOR** (fixes the reference in DORSIFLEXION motion)  
- Relabeled **THIGHS_INNER** → **Adductors** (ID unchanged for stability)  
- Expanded **ROTATOR_CUFF** common_names (no new duplicate node)  

**MOTIONS**  
- Added 5 new primitive motions:  
  - WRIST_PRONATION  
  - WRIST_SUPINATION  
  - ANTI_EXTENSION  
  - ANTI_LATERAL_FLEXION  
  - ANTI_ROTATION  
- Updated scoring on 3 core motions (PRESS_FLAT, PRESS_INCLINE, HINGE_STD) for better EMG alignment  
- Standardized all `upper_lower` values to arrays (prepares for Zod)  

No rows were deleted.

### Intended Patterns (Important Notes for the Team)

1. **Primitive Motion vs Exercise Variant**  
   - **Primitive** = fundamental joint action / physics (e.g., ANTI_EXTENSION, HINGE, PRESS).  
   - **Variant / Exercise** = convenience child or common name (e.g., “Plank” is a common_name under ANTI_EXTENSION; “Side Plank” under ANTI_LATERAL_FLEXION).  
   - Rule: Never create a new primitive motion for something that can be built with modifiers (e.g., no PRONE_ROW, no PUSH_UP, no SINGLE_LEG_THRUST yet).  

2. **Search & Autocomplete Behavior (UI Composer)**  
   - Users will type natural gym language (“side plank”, “adductor”, “wrist twist”, “OHP”, “RDL”).  
   - The composer will match against `common_names` first, then `label`.  
   - This gives instant, forgiving search while the underlying data stays clean.

3. **Dead-Zone & Filtering Logic**  
   - `upper_lower` array is the primary filter (e.g., hide all LOWER motions when user picks a BICEP CURL).  
   - CORE motions (including the new anti-movement primitives) are treated as their own category.  
   - Hierarchy (`parent_id`) drives the collapsible tree in the composer.

4. **Scoring Semantics (Locked Rule)**  
   Base motion scores are **comparative activation weights**, not normalized percentages.  
   Final normalization / clamp / output mode is handled exclusively by the Phase 1 scoring policy engine.  
   This prevents confusion when compound motions sum > 1.0.

5. **Migration & Future-Proofing**  
   - IDs that were already referenced anywhere were preserved.  
   - When we rebuild all delta tables in Phase 2, we will use this exact locked taxonomy.  
   - Short changelog note (add to ROADMAP_OVERVIEW.md or a dedicated CHANGELOG.md):  
     “Muscles & Motions foundation locked Feb 23 2026. Added anti-movement primitives, wrist actions, and Adductors relabel. All future deltas must be built against this version.”

### Recommended Next Action

You can now safely commit these tables as the new source of truth.

If you’d like, I can immediately generate:
- The full updated MUSCLES.json and MOTIONS.json files (ready to drop into your data folder)  
- A one-page “Biomechanics Foundation Guide” for the team (with search examples and dead-zone examples)  
- Or we can move straight into the next discussion topic (e.g., Equipment + Filter Matrix, or start Phase 1 code).

Just tell me what you want next and we’ll keep rolling with the same disciplined back-and-forth until everything is locked.

Great work getting the foundation this clean — this is exactly why the app is going to feel magical to users.

**Sources (double-checked live today):**  
- Repo root: https://github.com/lgerard42/fitness-app  
- TABLE_REGISTRY: https://raw.githubusercontent.com/lgerard42/fitness-app/main/admin/server/tableRegistry.ts  

Your move — what’s next? 💪