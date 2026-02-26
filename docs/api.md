# API Catalog

Backend API endpoints and shared types. Base URL for local dev: `http://localhost:4000`.

---

## Authentication

Protected routes use: `Authorization: Bearer <accessToken>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register |
| POST | `/api/auth/login` | No | Login; returns accessToken, refreshToken, user |
| POST | `/api/auth/refresh` | No | Refresh token → new access token |
| POST | `/api/auth/logout` | Yes | Invalidate refresh token |

---

## Health & User

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/users/me` | Yes | Current user profile |
| PUT | `/api/users/me` | Yes | Update profile |
| GET | `/api/users/me/settings` | Yes | User settings |
| PUT | `/api/users/me/settings` | Yes | Update settings |

---

## Workouts, Exercises, Measurements, Goals, PRs

| Resource | GET | POST | PUT | DELETE |
|----------|-----|------|-----|--------|
| Workouts | `/api/workouts` (list), `/:id` | `/api/workouts` | — | `/:id` |
| Exercises | `/api/exercises` | `/api/exercises` | `/:id` | `/:id` |
| Measurements | `/api/measurements` | `/api/measurements` | — | `/:id` |
| Goals | `/api/goals` | `/api/goals` | `/:id` | `/:id` |
| Personal records | `/api/personal-records` | `/api/personal-records` (upsert) | — | — |

All require auth.

---

## Dashboard & Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard` | Yes | Aggregate: user, workoutHistory, exerciseStats, bodyMeasurements, goals, personalRecords |
| GET | `/api/v1/reference/version` | No | Version info |
| GET | `/api/v1/reference/bootstrap` | No | All reference tables |
| GET | `/api/v1/reference/:table` | No | Single table |

---

## Admin (`/api/admin/*`)

No JWT. Proxied by Admin (Vite) and optionally Web.

- **Tables**: GET/PUT `/tables`, GET/PUT/DELETE `/tables/:key`, POST `/tables/:key/rows`, PUT `/tables/:key/rows/:id`, DELETE `/tables/:key/rows/:id`, POST `/:key/reorder`, POST `/bulk-matrix`, POST `/:key/sync`.
- **Schema**: GET `/schema`, GET `/schema/:key`, GET `/schema/meta/relationships`, POST `/schema/:key/validate`, GET `/schema/meta/fk-refs/:key/:id`.
- **Scoring**: POST `/scoring/compute`, `/scoring/trace`, `/scoring/constraints`, GET `/scoring/lint`, `/scoring/manifest`.
- **Matrix configs**: Full CRUD, validate, activate, clone, resolve, export, import, sync-deltas, ensure-drafts, deduplicate.

---

## Shared Types and Contracts

- **App types**: `shared/types/workout.ts` (Workout, Exercise, Set, UserProfile, DashboardData, etc.). Mobile and Web import via `@shared/types/workout`.
- **Scoring/reference**: `shared/types/index.ts` (Motion, ModifierRow, Equipment, etc.). Used by Backend and Admin.
- **Formatting/calculations**: `shared/utils/formatting.ts`, `shared/utils/calculations.ts`. Used by Mobile and Web. Do not duplicate; import from `shared/`.
