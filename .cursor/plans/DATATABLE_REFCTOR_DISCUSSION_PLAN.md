# Final enterprise-grade execution plan (locked)

## Final refinements added (now part of the plan)

### A) Trigger design refinement (locked)

Use **`AFTER ... FOR EACH STATEMENT`** triggers (not row-level) on reference tables for metadata versioning updates.

**Why this is locked:**

* Prevents `reference_metadata` update storms during bulk upsert/deprecate operations
* Avoids lock contention and unnecessary `version_seq` inflation
* Preserves the monotonic invalidation semantics while keeping seed runs fast

### B) Active-row performance index refinement (locked)

Add indexes to optimize bootstrap reads over active records (in addition to FK indexes and required PKs/constraints).

**Implementation note:**
Exact index shape should be chosen per table/query pattern (e.g., indexing `is_active` and sort/filter paths). We are locking the requirement to optimize **active-row bootstrap reads** and not rely on deprecated-row scans.

---

## Final consolidated execution plan (authoritative)

## 1) Mission and scope

This project migrates **reference/config data** from the app’s current local JSON/SQLite pattern into a **PostgreSQL backend**, with a **Dockerized local runtime**, **feature-flagged app integration**, and **provable parity before cutover**.

### In scope

* Reference/config datatable backend architecture
* Postgres schema, constraints, indexes, trigger metadata versioning
* Transactional JSON → Postgres seed/import pipeline
* Backend API contracts (bootstrap / version / granular)
* App provider seam + remote provider integration
* Cache/version invalidation behavior
* Parity tests + smoke tests + rollout/rollback controls

### Out of scope

* User/workout/session backend migration
* UI redesign/refactors unrelated to compatibility
* Taxonomy semantic redesign (unless correctness bug found)
* New features unrelated to the migration

---

## 2) Locked architecture decisions

### App integration strategy

* Introduce `ReferenceDataProvider` seam
* Keep public service/hook contracts stable
* Use feature flag `USE_BACKEND_REFERENCE`
* Retain local provider for at least one release after cutover

### Backend platform

* PostgreSQL (Dockerized for local/dev)
* Backend service (Dockerized for local/dev)
* Drizzle for schema/migrations + explicit SQL migration support

### Reference schema strategy

* **Natural keys as PKs** (Logan decision)
* Explicit FKs with:

  * `ON UPDATE CASCADE`
  * `ON DELETE RESTRICT`
* All reference tables include:

  * `is_active BOOLEAN DEFAULT TRUE`
  * `source_type` constrained to `'seed' | 'admin'`

### Seed lifecycle policy

* Upsert-only (`ON CONFLICT DO UPDATE`)
* No deletes
* Missing seed-managed rows are deprecated (`is_active=false`)
* Admin-managed rows excluded from seed deactivation

### API contract shape

Bootstrap wrapper includes:

* `schemaVersion`
* `referenceVersion`
* `generatedAt`
* `tables`

### Versioning and invalidation

* Trigger-driven metadata in `reference_metadata`
* Monotonic `version_seq`
* `last_updated`
* API derives/returns `referenceVersion` token from metadata state
* **Statement-level triggers** to avoid bulk mutation overhead

---

## 3) Execution workstreams and ownership

### Workstream A — Backend data layer + API

**Primary:** Grok
**Reviewer:** Gemini
Deliverables: schema, migrations, triggers, seed pipeline, API endpoints, Docker runtime

### Workstream B — App provider integration

**Primary:** Grok
**Reviewer:** Chat
Deliverables: provider interface, local/remote providers, service facade, cache behavior, feature flag wiring

### Workstream C — Validation + release controls

**Primary:** Chat/Grok (shared)
**Reviewer:** Gemini
Deliverables: parity harness, normalization contract, smoke tests, cutover/rollback playbook

---

## 4) Phase-by-phase implementation plan

# Phase 0 — Scaffolding and delivery rails

### Goal

Set up execution rails with no behavior changes.

### Deliverables

* Root `docker-compose.yml` (Postgres + backend)
* Backend env template + startup scripts
* App flag plumbing (`USE_BACKEND_REFERENCE=false`)
* Backend health endpoint
* CI placeholder jobs

### Gates

* Containers boot cleanly
* health endpoint passes
* app behavior unchanged with flag off

---

# Phase 1 — Postgres schema, constraints, indexes, metadata triggers

### Goal

Establish production-safe relational foundation and reference versioning.

### Deliverables

* All 20 reference tables with natural PKs
* FKs (`CASCADE` on update, `RESTRICT` on delete)
* `is_active`, `source_type`, required constraints
* FK indexes + active-row read optimization indexes
* `reference_metadata` table
* Trigger function + **statement-level triggers**
* Drizzle migrations committed

### Key review gates (Gemini hard gate)

* FK correctness and dependency graph integrity
* `source_type` guardrail present everywhere
* no missing FK indexes
* trigger semantics correct under bulk transactional seed
* active-row read optimization present where bootstrap uses it

---

# Phase 2 — Seed/import pipeline (transactional + idempotent + guarded deprecation)

### Goal

Safely import JSON reference truth into Postgres.

### Deliverables

* JSON load + pre-validation
* hardcoded topological seed order
* single-transaction 20-table seed
* upsert-only logic
* guarded deactivation (`source_type='seed'`)
* empty-source safety checks
* seed observability logs (counts + timings + version)

### Non-negotiables

* Abort on malformed FK refs / duplicate PKs / missing required keys
* Never delete rows
* Roll back entire seed on any failure

### Gates (Gemini hard gate)

* conflict targets match natural PKs
* deactivation guardrail is correct
* transaction rollback integrity proven
* no ordering gaps causing FK failures

---

# Phase 3 — Backend API contracts (bootstrap / version / granular)

### Goal

Deliver stable, versioned endpoints for app and tooling.

### Deliverables

* `GET /health`
* `GET /api/v1/reference/version`
* `GET /api/v1/reference/bootstrap`
* `GET /api/v1/reference/:table`
* active-only bootstrap filtering
* deterministic ordering per table
* wrapper with `tables` key
* `schemaVersion` and `referenceVersion` semantics implemented
* consistent error/logging behavior

### Gates (Chat hard gate)

* wrapper shape correctness
* metadata semantics not conflated
* deterministic output shape/order
* no transport-specific leakage into app domain expectations

---

# Phase 4 — App provider seam and remote integration (flagged)

### Goal

Integrate backend source without changing UI contracts.

### Deliverables

* `ReferenceDataProvider` interface
* `LocalJsonSqliteProvider`
* `RemotePostgresProvider`
* `createReferenceProvider(config)` factory
* `exerciseConfigService` facade refactor
* AsyncStorage-backed warm cache in remote provider
* `getBootstrap(options?: { allowStaleCache?: boolean })`
* feature flag switching behavior

### Behavioral requirements

* Flag OFF = current behavior
* Flag ON = equivalent data consumption via remote provider
* first launch in remote mode may require network
* subsequent launches can use cached bootstrap offline (per `allowStaleCache` policy)

### Gates (Chat hard gate)

* provider seam cleanly isolates transport
* public service/hook API stable
* no UI file changes required beyond dependency wiring

---

# Phase 5 — Parity harness + normalization contract + CI

### Goal

Prove backend data equivalence before cutover.

### Deliverables

* shared normalization utility (documented rules)
* parity test harness:

  * source JSON → seed → bootstrap API
  * normalize both sides
  * deep compare per table
* CI integration
* actionable diff output (table/row/field)

### Normalization contract (must be codified)

* deterministic sorting (PK + defined rules)
* string trimming
* empty-string/null/missing normalization policy
* boolean/number preservation
* array normalization rules

### Gates (Gemini + Chat)

* normalization does not hide true mismatches
* parity stable and non-flaky in CI
* diff output supports fast debugging

---

# Phase 6 — Smoke validation, controlled rollout, rollback readiness

### Goal

Validate real workflows and cut over safely.

### Required smoke paths (locked)

* exercise library browse/filter
* exercise edit/create flow
* live workout exercise selection
* scoring-dependent reference lookup screen(s)

### Test modes

* Flag OFF baseline
* Flag ON remote
* Warm offline (cached remote bootstrap) where applicable

### Cutover prerequisites

* migrations applied
* seed successful
* parity green
* smoke tests green
* backend healthy
* version endpoint functioning
* local provider rollback path verified

### Rollout

* deploy backend and app with flag OFF
* enable flag in controlled environment
* monitor
* expand rollout if stable

### Rollback (locked)

* flip flag OFF
* local provider resumes source of truth path
* keep local provider for one full release post-cutover

---

## 5) Detailed engineering controls and guardrails

### Seed safety guardrails (locked)

* empty-source safety checks per table to prevent mass deactivation from bad input
* deactivation only for `source_type='seed'`
* transaction-level rollback on any failure

### Trigger/versioning guardrails (locked)

* statement-level trigger only
* single shared trigger function
* monotonic `version_seq`
* metadata updates safe under bulk mutations

### API determinism guardrails (locked)

* stable sort order in bootstrap and granular endpoints
* active-only filtering default for bootstrap
* explicit wrapper metadata fields

### App integration guardrails (locked)

* no direct API calls from UI components
* all reference reads go through service/provider seam
* feature flag default OFF until all gates pass

---

## 6) Risk register (final)

### Risk A — Natural-key rename side effects

Mitigation: `ON UPDATE CASCADE`, review discipline, future admin tooling controls

### Risk B — Seed deactivation overreach

Mitigation: `source_type` guardrail, empty-source checks, transaction rollback

### Risk C — Cache/version drift

Mitigation: metadata trigger + `version_seq`, explicit `allowStaleCache`, version endpoint

### Risk D — UI regression despite data parity

Mitigation: mandatory smoke paths in flag OFF/ON modes

### Risk E — Trigger overhead during bulk seed

Mitigation: **statement-level triggers** (locked refinement)

### Risk F — Slow bootstrap reads due to deprecated rows

Mitigation: active-row read optimization indexes (locked refinement)

### Risk G — Process drift / manual DB changes

Mitigation: migration discipline, parity harness, release gates

---

## 7) Definition of done (final)

This migration phase is complete only when:

1. All in-scope reference tables exist in Postgres with locked constraints/indexes.
2. `reference_metadata` + statement-level trigger versioning works correctly.
3. Seed pipeline is transactional, idempotent, upsert-only, and deprecates seed-managed rows safely.
4. Bootstrap/version/granular endpoints implement the locked wrapper and semantics.
5. App provider seam and local/remote providers are integrated with no public contract breakage.
6. Feature flag defaults OFF and cleanly controls source selection.
7. Parity harness passes in CI under the documented normalization contract.
8. Required UI smoke paths pass with flag OFF and ON (and warm offline where applicable).
9. Rollout and rollback playbooks are documented and executable.
10. Local provider path remains available for at least one release after cutover.

---
