# Changelog

Notable changes to the Solto fitness ecosystem (Mobile, Web, Admin, Backend, Shared).

---

## [Unreleased]

- Documentation: architecture, API catalog, getting started, testing, flowcharts, process diagrams.

---

## Post-refactor (baseline: `baseline-before-refactor`)

### Added

- **Shared library:** Consolidated types (`workout.ts`), formatting utils, scoring, constraints, validators, schemas; single source of truth for Mobile, Web, Admin, Backend.
- **Backend:** Service layer (workout, exercise, measurement, goal, personalRecord, dashboard); 68 new tests; admin split into `/api/admin/*` (tables, schema, scoring, matrixConfigs).
- **Web:** 24 new tests; dashboard memoization and performance improvements.
- **Mobile:** 22 new tests; performance optimizations; offline-first sync via WorkoutContext.
- **Tests:** 160 new tests total; 352 tests across mobile, shared, backend, web.

### Changed

- **Backend:** Removed legacy JSON file support; reference and table data served from Postgres only.
- **Types:** Eliminated ~387 lines of duplicated types; all apps consume shared types.
- **Admin:** API and page structure reorganized (page folders, dedicated admin routes).

### Removed

- **Dead code:** 15 files removed (~1,500 lines); unused JSON loaders, duplicate types, obsolete helpers.

### Commits (refactor phases)

| Commit     | Phase    | Description |
|-----------|----------|-------------|
| `55e25d02` | Phase 1  | Consolidate types and formatting utils into shared |
| `b055e03d` | Phase 2  | Backend cleanup: remove JSON, extract services, add indexes |
| `10f5d9b2` | Phase 3+4 | Backend tests, dead code removal, JS-to-TS conversion |
| `039bd2bd` | Phase 5A+6 | Split admin API, web tests, dashboard memoization |
| `d6fc9a6d` | Phase 5B+7 | Admin page folders, mobile performance optimization |

---

## Format

Entries are grouped by **Added**, **Changed**, **Removed**, and **Fixed**. Versioned releases will be listed above with dates when adopted.
