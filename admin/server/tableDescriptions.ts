/**
 * Human-readable descriptions for each admin table.
 * Shown in a collapsible panel at the top of each table view.
 * Explains purpose, dependencies, dependents, and column-level relationships.
 */
export const TABLE_DESCRIPTIONS: Record<string, string> = {
  exerciseCategories: `**What this table is for:** Exercise Categories define the high-level types of exercises (e.g. Strength, Cardio). Each category controls which inputs are allowed when users create or edit exercises in the main app (e.g. whether cardio type, muscles, or training focus can be set).

**Depends on:** Nothing—this table is standalone.

**Other tables that depend on this one:** Exercises (in the main app) are linked to a category. The category’s \`exercise_input_permissions\` setting then determines which other tables (Cardio Types, Training Focus, Muscles) are available for that exercise.

**Columns with dependencies:** \`exercise_input_permissions\` is a JSON object that specifies, for each of Cardio Types, Muscle Groups, and Training Focus, whether that input is required, allowed, or forbidden for exercises in this category.`,

  cardioTypes: `**What this table is for:** Cardio Types describe kinds of cardiovascular exercise (e.g. Running, Cycling). They are used when an exercise is marked as cardio so users can filter and categorize.

**Depends on:** Nothing—this table is standalone.

**Other tables that depend on this one:** Exercises (in the main app) may reference a cardio type if their category allows it. The Exercise Categories table controls whether cardio type is required, allowed, or forbidden via \`exercise_input_permissions\`.

**Columns with dependencies:** None. \`id\` and \`label\` are the main identifiers; other columns are descriptive.`,

  trainingFocus: `**What this table is for:** Training Focus options (e.g. Hypertrophy, Strength, Endurance) let users tag what an exercise is best used for. They support filtering and program design in the main app.

**Depends on:** Nothing—this table is standalone.

**Other tables that depend on this one:** Exercises may reference one or more training focus options when their category allows it. Exercise Categories control this via \`exercise_input_permissions\`.

**Columns with dependencies:** None. Rows are referenced by \`id\` from exercises.`,

  muscles: `**What this table is for:** Muscles is a single hierarchy of all muscles used for scoring and display. A row can be a primary muscle (no parent), a secondary muscle (parent is primary), or a tertiary muscle (parent is secondary). The app uses this to show “Primary / Secondary / Tertiary” and to compute muscle targets for motions.

**Depends on:** This table references itself. The \`parent_ids\` column stores which muscle(s) this one belongs under (e.g. Bicep might have parent “Arms”).

**Other tables that depend on this one:** Motions reference muscles indirectly through their \`muscle_targets\` JSON (which uses muscle IDs). Exercises link to muscles for primary/secondary/tertiary targeting. The main app and scoring logic rely on this hierarchy.

**Columns with dependencies:** \`parent_ids\` is a self-referencing list of muscle IDs that define the hierarchy. \`upper_lower\` is used for filtering (e.g. “Upper Body” vs “Lower Body”) in the exercise and motion pickers.`,

  motions: `**What this table is for:** Motions describe how the body moves during an exercise (e.g. Press, Curl, Squat). Rows can be parent motions (e.g. Press) or variations (e.g. Flat Press, Incline Press) linked by \`parent_id\`. Each motion has muscle targets and a default motion plane; which planes apply to a motion is defined by the Motion Planes table’s \`delta_rules\` (keyed by motion ID).

**Depends on:** \`parent_id\` references this same table (parent motion). \`default_delta_configs\` is a JSON object keyed by table name (e.g. \`motionPlanes\`) storing the default ID for that table—e.g. \`{ "motionPlanes": "MID_MID" }\` for the default plane.

**Other tables that depend on this one:** Exercises in the main app reference a primary motion and optionally a variation. Motion Planes reference motions via \`delta_rules\` keys. Scoring uses motion + plane + muscle targets.

**Columns with dependencies:** \`parent_id\` → Motions (self). \`default_delta_configs.motionPlanes\` → Motion Planes (by ID). \`muscle_targets\` is a JSON tree keyed by muscle group/muscle IDs (conceptually references Muscles).`,

  motionPlanes: `**What this table is for:** Motion Planes describe the path or angle of movement (e.g. Low to High, Standard Level). Which motions use which planes is defined here: \`delta_rules\` is keyed by motion ID. Each motion’s default plane is stored in Motions.\`default_delta_configs.motionPlanes\`.

**Depends on:** Nothing—this table is standalone.

**Other tables that depend on this one:** Motions store a default plane in \`default_delta_configs.motionPlanes\`; the relationship (which planes apply to which motion) is defined by this table’s \`delta_rules\` keys. When a user picks a motion and plane for an exercise, the app uses these IDs.

**Columns with dependencies:** None. \`id\` is referenced from Motions.\`default_delta_configs.motionPlanes\`. \`delta_rules\` keys are motion IDs; the scoring system uses them to adjust muscle scores per motion type.`,

  grips: `**What this table is for:** Grips define how the hands (or body) hold equipment or position (e.g. Overhand, Underhand, Neutral). Rows can be top-level grip types or variations linked by \`parent_id\`. Used in exercise configuration and in equipment modifier constraints.

**Depends on:** \`parent_id\` references this same table (parent grip type).

**Other tables that depend on this one:** Equipment rows can list allowed grips in their \`modifier_constraints\` JSON. Exercises store selected grip type (and optionally width from the Grip Widths table) for scoring and display.

**Columns with dependencies:** \`parent_id\` → Grips (self). \`delta_rules\` applies per-motion scoring deltas. Equipment table’s \`modifier_constraints\` may reference grip IDs.`,

  gripWidths: `**What this table is for:** Grip Widths describe hand spacing (e.g. Narrow, Shoulder-Width, Wide). They apply scoring deltas per motion (e.g. narrow grip shifts emphasis to triceps on a press). Used alongside grip type when configuring an exercise.

**Depends on:** Nothing—this table is standalone.

**Other tables that depend on this one:** Exercises in the main app can store a selected grip width. Scoring uses both grip type (Grips table) and grip width to apply deltas. Equipment \`modifier_constraints\` may reference allowed grip widths.

**Columns with dependencies:** None. \`id\` is referenced from exercises and possibly from equipment constraints. \`delta_rules\` keys are motion IDs from the Motions table.`,

  footPositions: `**What this table is for:** Foot Positions describe where or how the feet are placed (e.g. Heels Elevated, Stance Width). They are score modifiers: selecting one applies the \`delta_rules\` to adjust muscle emphasis for an exercise.

**Depends on:** Nothing—this table is standalone.

**Other tables that depend on this one:** Exercises can store a selected foot position. Scoring reads \`delta_rules\` keyed by motion ID to apply deltas.

**Columns with dependencies:** \`delta_rules\` is keyed by motion IDs (Motions table). No FK columns.`,

  stanceTypes: `**What this table is for:** Stance Types describe the style of stance (e.g. Sumo, Conventional). Used as a score modifier so that choosing a stance type applies the appropriate \`delta_rules\` to muscle scoring.

**Depends on:** Nothing—this table is standalone.

**Other tables that depend on this one:** Exercises may reference a stance type. Scoring uses \`delta_rules\` keyed by motion ID.

**Columns with dependencies:** \`delta_rules\` keys are motion IDs. No FK columns.`,

  stanceWidths: `**What this table is for:** Stance Widths describe how wide the feet are (e.g. Narrow, Wide). They act as score modifiers: the chosen width’s \`delta_rules\` are applied when scoring an exercise.

**Depends on:** Nothing—this table is standalone.

**Other tables that depend on this one:** Exercises can store a selected stance width. Scoring uses \`delta_rules\` by motion ID.

**Columns with dependencies:** \`delta_rules\` is keyed by motion IDs. No FK columns.`,

  torsoAngles: `**What this table is for:** Torso Angles describe the inclination of the torso (e.g. Incline, Decline, Horizontal). They are score modifiers and can optionally link to Torso Orientations (e.g. face-up vs face-down) for more precise configuration.

**Depends on:** Nothing—this table is standalone.

**Other tables that depend on this one:** Torso Orientations can be grouped under an angle. Exercises reference a torso angle (and optionally a torso orientation). Scoring uses \`delta_rules\` and \`angle_range\`.

**Columns with dependencies:** \`delta_rules\` keys are motion IDs. \`allow_torso_orientations\` controls whether Torso Orientations are shown for this angle. Torso Orientations table is logically dependent on this table (often filtered or grouped by angle).`,

  torsoOrientations: `**What this table is for:** Torso Orientations describe how the body is oriented (e.g. Prone, Supine). They refine the Torso Angle choice and apply their own \`delta_rules\` for scoring.

**Depends on:** Nothing in the schema (no FK). In the UI and logic, orientations are often grouped or filtered by Torso Angle.

**Other tables that depend on this one:** Exercises may store a torso orientation. Scoring uses \`delta_rules\` keyed by motion ID.

**Columns with dependencies:** \`delta_rules\` is keyed by motion IDs. No FK columns.`,

  supportStructures: `**What this table is for:** Support Structures describe what supports the body during the exercise (e.g. Bench, Wall, Unsupported). They are score modifiers: the selected support’s \`delta_rules\` adjust muscle emphasis.

**Depends on:** Nothing—this table is standalone.

**Other tables that depend on this one:** Exercises can reference a support structure. Scoring uses \`delta_rules\` by motion ID.

**Columns with dependencies:** \`delta_rules\` keys are motion IDs. No FK columns.`,

  elbowRelationship: `**What this table is for:** Elbow Relationship describes how the elbows relate to the body or bar (e.g. Flared, Tucked). Used as a score modifier so the chosen option’s \`delta_rules\` are applied when scoring.

**Depends on:** Nothing—this table is standalone.

**Other tables that depend on this one:** Exercises may store an elbow relationship. Scoring uses \`delta_rules\` keyed by motion ID.

**Columns with dependencies:** \`delta_rules\` is keyed by motion IDs. No FK columns.`,

  loadingAids: `**What this table is for:** Loading Aids describe tools or methods used to load the body (e.g. Belt, Bands). They are score modifiers with \`delta_rules\` applied per motion when selected for an exercise.

**Depends on:** Nothing—this table is standalone.

**Other tables that depend on this one:** Exercises can reference a loading aid. Scoring uses \`delta_rules\` by motion ID.

**Columns with dependencies:** \`delta_rules\` keys are motion IDs. No FK columns.`,

  rangeOfMotion: `**What this table is for:** Range of Motion options (e.g. Full ROM, Partial Bottom, Deficit) describe how much of the movement is performed. They are score modifiers: the chosen ROM’s \`delta_rules\` adjust muscle emphasis per motion.

**Depends on:** Nothing—this table is standalone.

**Other tables that depend on this one:** Exercises may store a range-of-motion choice. Scoring uses \`delta_rules\` keyed by motion ID (and optionally variation IDs within).

**Columns with dependencies:** \`delta_rules\` is keyed by motion IDs from the Motions table; nested keys can be variation IDs. No FK columns.`,

  equipmentCategories: `**What this table is for:** Equipment Categories organize equipment into a hierarchy (e.g. Weights > Bars, Weights > Free-Weights, Support > Stability). Top-level rows have no \`parent_id\`; others point to a parent category. Used to group equipment in pickers and admin.

**Depends on:** \`parent_id\` references this same table (parent category).

**Other tables that depend on this one:** Equipment rows reference a category via \`category_id\`. The main app uses categories to show equipment in sections (e.g. “Bars”, “Cable Attachments”).

**Columns with dependencies:** \`parent_id\` → Equipment Categories (self). No other FK columns.`,

  equipment: `**What this table is for:** Equipment lists all gym equipment and cable attachments (barbells, dumbbells, cables, attachments, etc.). Each row can be a standalone piece (e.g. Barbell) or an attachment (e.g. V-Bar) that requires a cable or similar. \`modifier_constraints\` can restrict which grips, stance types, and similar modifiers are allowed when this equipment is selected.

**Depends on:** \`category_id\` references Equipment Categories. No other FK columns; \`modifier_constraints\` is JSON that may reference IDs from Grips, Grip Widths, Stance Types, and other modifier tables.

**Other tables that depend on this one:** Exercises reference equipment (and optionally cable attachments). The app uses equipment for filtering and display and enforces \`modifier_constraints\` when configuring an exercise. Equipment Icons (by label) are used for display.

**Columns with dependencies:** \`category_id\` → Equipment Categories. \`modifier_constraints\` references (by ID) rows in Grips, Grip Widths, Support Structures, Torso Angles, and other score-modifier tables as configured.`,

  equipmentIcons: `**What this table is for:** Equipment Icons is a key-value map: each key is an equipment label (or identifier), and the value is the image data (e.g. base64) used to show an icon for that equipment in the app. It does not define the list of equipment—that’s in the Equipment table.

**Depends on:** Nothing—keys are matched to Equipment labels by convention, but there is no formal FK.

**Other tables that depend on this one:** The main app looks up icons by equipment label when displaying the equipment picker or exercise cards. Adding or renaming equipment may require adding or updating a corresponding key here.

**Columns with dependencies:** \`id\` matches Equipment.\`label\` by convention. \`value\` is the icon data (no dependency).`,
};
