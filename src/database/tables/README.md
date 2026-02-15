# Exercise Configuration Tables

These JSON files are the **source of truth** for exercise configuration data. They are:

- **Visible** in Cursor’s file explorer
- **Editable** directly in the editor
- **Loaded** into SQLite when the app initializes

Each file maps to a SQLite table:

| File | SQLite Table |
|------|--------------|
| `exerciseCategories.json` | `exercise_categories` |
| `cardioTypes.json` | `cardio_types` |
| `muscleGroups.json` | `muscle_groups` |
| `primaryMuscles.json` | `primary_muscles` |
| `secondaryMuscles.json` | `secondary_muscles` |
| `tertiaryMuscles.json` | `tertiary_muscles` |
| `trainingFocus.json` | `training_focus` |

Edit these files to change the data. After changing them, you may need to delete the app and reinstall (or bump `DATABASE_VERSION` in `initDatabase.ts`) so the database is re-seeded.
