# Exercise Configuration Tables

These JSON files are the **source of truth** for exercise configuration data. They are:

- **Visible** in Cursor’s file explorer
- **Editable** directly in the editor
- **Loaded** into SQLite when the app initializes

**Icons:** For any row that has an `icon` column, the icon shown in the app must be **retrieved from the table** (or from the DB seeded from these files). Do not hard-code icon lookups by label or id elsewhere; use the row’s `icon` value.

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
| `equipmentCategories.json` | `equipment_categories` |
| `supportEquipmentCategories.json` | support sub-table |
| `weightsEquipmentCategories.json` | weights sub-table |
| `cableAttachments.json` | `cable_attachments` |
| `gymEquipment.json` | `gym_equipment` |
| `equipmentIcons.json` | used to populate `gym_equipment.icon` (id → base64) |

Edit these files to change the data. After changing them, you may need to delete the app and reinstall (or bump `DATABASE_VERSION` in `initDatabase.ts`) so the database is re-seeded.
