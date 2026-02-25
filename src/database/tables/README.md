# Exercise Configuration Tables

> **Canonical architecture reference has moved.**
> See [`BIOMECHANICS_ARCHITECTURE.md`](../../../BIOMECHANICS_ARCHITECTURE.md) for the single-source architecture doc covering the full biomechanics table model, JSON contracts, scoring system, and admin authoring guardrails.

---

## Local Folder Notes

These remaining JSON files are used for direct imports by specific components:

- `equipmentIcons.json` -- equipment icon (base64) lookup by ID, used by `configFacade.ts`
- `muscles.json` -- muscle data, directly imported by `MotionPickerModal.tsx`
- `equipment.json` -- equipment data, used by `constants/data.js` for legacy migration
- `motions.json` -- motion data, directly imported by `EditExercise.tsx`
- `motionPaths.json` -- motion path data, directly imported by `EditExercise.tsx`

All reference data is primarily served from the PostgreSQL backend via `configFacade.ts` and the `RemotePostgresProvider`.
