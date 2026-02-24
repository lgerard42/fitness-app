# Exercise Configuration Tables

> **Canonical architecture reference has moved.**
> See [`BIOMECHANICS_ARCHITECTURE.md`](../../../BIOMECHANICS_ARCHITECTURE.md) for the single-source architecture doc covering the full biomechanics table model, JSON contracts, scoring system, and admin authoring guardrails.

---

## Local Folder Notes

These JSON files are the **source of truth** for exercise configuration data. They are:

- **Visible** in Cursor's file explorer
- **Editable** directly in the editor
- **Loaded** into SQLite when the app initializes

**Icons:** For any row that has an `icon` column, the icon shown in the app must be **retrieved from the table** (or from the DB seeded from these files). Do not hard-code icon lookups by label or id elsewhere; use the row's `icon` value.

Edit these files to change the data. After changing them, you may need to delete the app and reinstall (or bump `DATABASE_VERSION` in `initDatabase.ts`) so the database is re-seeded.
