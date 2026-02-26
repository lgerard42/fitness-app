# Testing Guide

This document describes how tests are organized and how to run them for each part of the ecosystem.

---

## 1. Test Summary

| Project | Framework | Config | Scripts | Approx. Tests |
|---------|-----------|--------|--------|----------------|
| **Mobile** | Jest + React Testing Library | `jest.config.js`, `jest-setup.js` | `npm run test`, `npm run test:ci` | ~284 |
| **Shared** | Jest | Same as Mobile (run from root) | `npm run test:ci` (includes shared) | ~198 |
| **Backend** | Vitest | `backend/vitest.config.ts` | `cd backend && npm run test:ci` | 68 |
| **Web** | Vitest + React Testing Library | `web/vitest.config.ts`, `web/vitest-setup.ts` | `cd web && npm run test:ci` | 24 |
| **Admin** | Vitest + React Testing Library | `admin/vitest.config.ts`, `admin/vitest-setup.ts` | `cd admin && npm run test:ci` | 88 |

Mobile and Shared tests are run together from the **repo root**; Backend, Web, and Admin are run from their own directories.

---

## 2. Running Tests

### 2.1 Mobile + Shared (from repo root)

```bash
# Run all tests once (CI mode)
npm run test:ci

# Watch mode (re-run on file changes)
npm run test
```

- **Scope**: All files under `src/` and `shared/` matching Jest’s default pattern (`*.test.ts`, `*.test.tsx`, `__tests__/*`).
- **Excluded**: `backend/`, `admin/`, `web/` (see `testPathIgnorePatterns` in `jest.config.js`).
- **Timeout**: Default test timeout is 30s (see `jest.config.js`).

### 2.2 Backend

```bash
cd backend
npm run test      # watch
npm run test:ci   # single run
```

- **Scope**: `backend/src/**/*.test.ts`.
- **Setup**: `backend/src/test/setup.ts` mocks Prisma so no real database is required for unit tests.
- **Coverage**: Auth middleware, asyncHandler, and all service CRUD (workout, exercise, measurement, goal, profile, dashboard).

### 2.3 Web

```bash
cd web
npm run test      # watch
npm run test:ci   # single run
```

- **Scope**: `web/**/*.test.{ts,tsx}`.
- **Setup**: `web/vitest-setup.ts` (e.g. `@testing-library/jest-dom`).
- **Coverage**: `lib/utils.ts`, UI components (e.g. Button), and any other added unit tests.

### 2.4 Admin

```bash
cd admin
npm run test      # watch
npm run test:ci   # single run
```

- **Scope**: `admin/src/**/*.test.{ts,tsx}`.
- **Setup**: `admin/vitest-setup.ts` imports `@testing-library/jest-dom/vitest`.
- **Coverage**: API client and all API modules (tables, schema, scoring, matrixConfigs), hooks (useWorkstationState, useScoringSimulation), FieldRenderer components (StringField, NumberField, BooleanField), and workstation components (DirtyBadge).

### 2.5 Run Everything

From repo root (example; adjust if you add a root-level script):

```bash
npm run test:ci && cd backend && npm run test:ci && cd ../web && npm run test:ci && cd ../admin && npm run test:ci
```

---

## 3. What Is Tested

### 3.1 Mobile

- **Contexts**: WorkoutContext (lifecycle, start/finish/cancel, exercise library), UserSettingsContext (load, update), plus performance/memoization tests.
- **Utils**: workoutHelpers, workoutInstanceHelpers, exerciseFilters, formatting (shared).
- **Components**: Chip, ExerciseTags, and others with `*.test.tsx`.
- **Shared**: scoring, constraints, linter, schemas, policy, matrixV2, and other `shared/__tests__/*`.

### 3.2 Backend

- **Middleware**: Auth (valid/missing/expired token), asyncHandler (success and error propagation).
- **Services**: workoutService, exerciseService, measurementService, goalService, profileService, dashboardService (list/get/create/update/delete and error cases). All use mocked Prisma.

### 3.3 Web

- **Utils**: cn, formatDate, formatDuration, formatWeight, formatNumber, getExercisesFromItems, calculateTotalVolume, calculateStreak.
- **UI**: Button (variants, click, disabled).

### 3.4 Admin

- **API client**: `request()` (success, error responses, URL building, JSON parsing fallbacks). All use mocked `fetch`.
- **API modules**: tables (listTables, getTable, putTable, addRow, updateRow, deleteRow, syncTable, reorder, bulkUpdateMatrix), schema (getSchemas, getSchema, getRelationships, getFKRefs, validate), scoring (computeScoring, traceScoring, evaluateConstraints, runLinter, getManifest), matrixConfigs (full CRUD, validate, activate, clone, resolve, export, import, sync-deltas, deduplicate, ensure-drafts). All use mocked `request`.
- **Hooks**: useWorkstationState (selection, baseline dirty tracking, save/error, delta overrides, dirty domains, clearAllDirty), useScoringSimulation (debounced compute, error handling, provenance chips).
- **Components**: StringField (input/textarea, onChange), NumberField (value, step, onChange), BooleanField (toggle, onChange), DirtyBadge (visibility, count, domain labels).

---

## 4. E2E (Mobile)

The project has Maestro flows for mobile E2E:

```bash
npm run test:e2e:check   # Check Maestro version
npm run test:e2e:android # Run E2E on Android
npm run test:e2e:ios     # Run E2E on iOS
```

E2E requires the app to be running on a device/emulator and the backend to be available.

---

## 5. Adding Tests

- **Mobile/Shared**: Add `*.test.ts` or `*.test.tsx` under `src/` or `shared/`; Jest will pick them up. Use `jest.mock()` for API/AsyncStorage where needed.
- **Backend**: Add `*.test.ts` under `backend/src/` (e.g. next to the module or in `__tests__/`). Use `vi.mock()` for Prisma (see `backend/src/test/setup.ts`).
- **Web**: Add `*.test.ts` or `*.test.tsx` under `web/`; Vitest will pick them up. Use testing-library for components.
- **Admin**: Add `*.test.ts` or `*.test.tsx` under `admin/src/` (e.g. next to the module in `__tests__/`). Use `vi.mock()` for the API layer or `fetch`. Use testing-library for React components.

---

## 6. Related Docs

- [Architecture](architecture.md)
- [Getting started](getting-started.md)
