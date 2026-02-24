---
name: Datatable Refactor Plan
overview: Official execution plan to migrate the 20+ reference/config data tables from local JSON/SQLite to a PostgreSQL backend, with Dockerized runtime, feature-flagged app integration, provider seam architecture, and provable data parity before cutover.
todos:
  - id: phase0-docker
    content: "Phase 0: Create root docker-compose.yml (Postgres + backend) and env templates"
    status: in_progress
  - id: phase0-flags
    content: "Phase 0: Create feature flag module (src/config/featureFlags.ts) with USE_BACKEND_REFERENCE=false"
    status: pending
  - id: phase0-ci
    content: "Phase 0: Add CI placeholder jobs for parity tests"
    status: pending
  - id: phase1-drizzle-schema
    content: "Phase 1: Create Drizzle schema for all 20 reference tables with natural PKs, FKs, is_active, source_type"
    status: pending
  - id: phase1-metadata-triggers
    content: "Phase 1: Create reference_metadata table + statement-level triggers on all 20 tables"
    status: pending
  - id: phase1-indexes
    content: "Phase 1: Add FK indexes + active-row read optimization indexes"
    status: pending
  - id: phase1-migrations
    content: "Phase 1: Generate and commit Drizzle migrations"
    status: pending
  - id: phase2-validators
    content: "Phase 2: Build seed pre-validation (FK refs, duplicate PKs, missing required fields)"
    status: pending
  - id: phase2-seed-pipeline
    content: "Phase 2: Build transactional seed pipeline with topological order and upsert-only logic"
    status: pending
  - id: phase2-deprecation
    content: "Phase 2: Implement guarded deprecation (source_type='seed' only) with empty-source safety checks"
    status: pending
  - id: phase3-version-endpoint
    content: "Phase 3: Build GET /api/v1/reference/version endpoint"
    status: pending
  - id: phase3-bootstrap-endpoint
    content: "Phase 3: Build GET /api/v1/reference/bootstrap endpoint (active-only, deterministic sort, wrapper metadata)"
    status: pending
  - id: phase3-granular-endpoint
    content: "Phase 3: Build GET /api/v1/reference/:table granular endpoint"
    status: pending
  - id: phase4-provider-interface
    content: "Phase 4: Define ReferenceDataProvider interface and factory"
    status: pending
  - id: phase4-local-provider
    content: "Phase 4: Create LocalJsonSqliteProvider wrapping current behavior"
    status: pending
  - id: phase4-remote-provider
    content: "Phase 4: Create RemotePostgresProvider with AsyncStorage warm cache and version checking"
    status: pending
  - id: phase4-service-refactor
    content: "Phase 4: Refactor exerciseConfigService to consume provider (facade pattern)"
    status: pending
  - id: phase5-parity-harness
    content: "Phase 5: Build parity harness -- normalize, compare, actionable diff output"
    status: pending
  - id: phase5-ci-integration
    content: "Phase 5: Integrate parity harness into CI"
    status: pending
  - id: phase6-smoke-tests
    content: "Phase 6: Run smoke tests (library browse, exercise edit, workout selection, scoring lookups) in flag OFF/ON/offline modes"
    status: pending
  - id: phase6-rollout-playbook
    content: "Phase 6: Document cutover/rollback playbook and execute controlled rollout"
    status: pending
isProject: false
---

# Reference Datatable Migration -- Official Execution Plan

---

## 1. Current Architecture

The app currently uses a chain of JSON files, SQLite seeding, and hooks. There is no runtime sync -- admin edits require an app restart.

```mermaid
flowchart LR
  subgraph adminPanel [Admin Panel]
    AdminUI["React UI\n:5173"]
    AdminAPI["Express API\n:3001"]
  end
  subgraph mobileApp [Mobile App]
    InitDB["initDatabase.ts\nrequire + seed"]
    SQLite["SQLite\nworkout.db"]
    Hooks["useExerciseConfig\nhooks"]
    UI["React Native\nUI Components"]
  end
  JSONFiles["20 JSON Files\nsrc/database/tables/"]
  AdminUI -->|edits| AdminAPI
  AdminAPI -->|fs.writeFile| JSONFiles
  JSONFiles -->|"require()"| InitDB
  InitDB -->|"INSERT/upsert"| SQLite
  SQLite -->|query| Hooks
  Hooks --> UI
```

**Key files in the current system:**

- [src/database/initDatabase.ts](src/database/initDatabase.ts) -- Seeds 20 tables from JSON into SQLite (1570 lines, v24 migration system)
- [src/database/exerciseConfigService.ts](src/database/exerciseConfigService.ts) -- 30+ typed query functions against SQLite
- [src/database/useExerciseConfig.ts](src/database/useExerciseConfig.ts) -- React hooks with module-level caching
- [admin/server/tableRegistry.ts](admin/server/tableRegistry.ts) -- Central schema registry defining all 20 tables
- [backend/src/reference/repository.ts](backend/src/reference/repository.ts) -- Existing `ReferenceDataRepository` interface
- [backend/src/reference/jsonRepository.ts](backend/src/reference/jsonRepository.ts) -- JSON file implementation of the repository

---

## 2. Target Architecture

```mermaid
flowchart LR
  subgraph adminPanel [Admin Panel]
    AdminUI["React UI\n:5173"]
    AdminAPI["Express API\n:3001"]
  end
  subgraph backend [Backend Service]
    API["Express API\n:4000"]
    Drizzle["Drizzle ORM"]
    Seed["Seed Pipeline"]
  end
  subgraph infra [Infrastructure]
    PG[("PostgreSQL\n:5432")]
    RefMeta["reference_metadata\ntrigger versioning"]
  end
  subgraph mobileApp [Mobile App]
    Flag{"USE_BACKEND\n_REFERENCE"}
    LocalProv["LocalJsonSqlite\nProvider"]
    RemoteProv["RemotePostgres\nProvider"]
    Cache["AsyncStorage\nWarm Cache"]
    Facade["exerciseConfig\nService facade"]
    Hooks["useExerciseConfig\nhooks"]
    UI["React Native\nUI Components"]
  end
  JSONFiles["20 JSON Files\nsrc/database/tables/"]
  AdminUI -->|edits| AdminAPI
  AdminAPI -->|"writes"| JSONFiles
  JSONFiles -->|"seed input"| Seed
  Seed -->|"upsert tx"| PG
  PG --- RefMeta
  Drizzle --> PG
  API -->|"bootstrap/version/granular"| RemoteProv
  Flag -->|OFF| LocalProv
  Flag -->|ON| RemoteProv
  LocalProv --> Facade
  RemoteProv --> Facade
  RemoteProv -->|"cache"| Cache
  Facade --> Hooks
  Hooks --> UI
```

---

## 3. The 20 Reference Tables and Their Dependency Graph

The seed must respect FK ordering. This is the locked topological seed order:

```mermaid
flowchart TD
  subgraph tier0 [Tier 0 -- No Dependencies]
    exerciseCategories
    cardioTypes
    trainingFocus
    muscles
  end
  subgraph tier1 [Tier 1 -- Self-Referencing]
    motions["motions\n(parent_id -> motions)"]
    grips["grips\n(parent_id -> grips)"]
    equipmentCategories["equipmentCategories\n(parent_id -> equipmentCategories)"]
  end
  subgraph tier2 [Tier 2 -- No FKs Beyond Self]
    motionPaths
    torsoAngles
    torsoOrientations
    resistanceOrigin
    gripWidths
    elbowRelationship
    executionStyles
    footPositions
    stanceWidths
    stanceTypes
    loadPlacement
    supportStructures
    loadingAids
    rangeOfMotion
  end
  subgraph tier3 [Tier 3 -- Cross-Table FKs]
    equipment["equipment\n(category_id -> equipmentCategories)"]
    equipmentIcons
  end
  tier0 --> tier1
  tier1 --> tier2
  tier2 --> tier3
```

---

## 4. Phase-by-Phase Execution

### Phase 0 -- Scaffolding and Delivery Rails

**Goal:** Set up execution rails with zero behavior changes.

```mermaid
flowchart LR
  A["Root docker-compose.yml\nPostgres + Backend"] --> B["Backend env template\n+ startup scripts"]
  B --> C["App flag plumbing\nUSE_BACKEND_REFERENCE=false"]
  C --> D["Backend health endpoint"]
  D --> E["CI placeholder jobs"]
```

**Deliverables:**

- Root-level `docker-compose.yml` with Postgres 16 + backend service
- `.env.example` with `USE_BACKEND_REFERENCE=false`
- Feature flag module in mobile app (`src/config/featureFlags.ts`)
- `GET /health` endpoint on backend
- CI placeholder for parity tests

**Key files to create/modify:**

- `docker-compose.yml` (repo root -- new)
- `src/config/featureFlags.ts` (new)
- [backend/src/index.ts](backend/src/index.ts) (health endpoint already exists)

**Gates:** Containers boot cleanly; health endpoint returns 200; app behavior unchanged with flag OFF.

---

### Phase 1 -- PostgreSQL Schema, Constraints, Indexes, Metadata Triggers

**Goal:** Establish the relational foundation and reference versioning system.

```mermaid
erDiagram
  reference_metadata {
    text table_name PK
    bigint version_seq
    timestamp last_updated
  }
  muscles {
    text id PK
    text label
    text[] parent_ids
    text[] upper_lower
    boolean is_active
    text source_type
  }
  motions {
    text id PK
    text label
    text parent_id FK
    text[] upper_lower
    jsonb muscle_targets
    jsonb default_delta_configs
    boolean is_active
    text source_type
  }
  equipment {
    text id PK
    text label
    text category_id FK
    jsonb modifier_constraints
    boolean is_active
    text source_type
  }
  equipmentCategories {
    text id PK
    text label
    text parent_id FK
    boolean is_active
    text source_type
  }
  motions ||--o{ motions : "parent_id"
  equipmentCategories ||--o{ equipmentCategories : "parent_id"
  equipmentCategories ||--o{ equipment : "category_id"
```

**Deliverables:**

- Drizzle schema for all 20 reference tables with natural PKs (`text` primary keys)
- FKs with `ON UPDATE CASCADE`, `ON DELETE RESTRICT`
- All tables include `is_active BOOLEAN DEFAULT TRUE` and `source_type` constrained to `'seed' | 'admin'`
- FK indexes + active-row read optimization indexes
- `reference_metadata` table with `version_seq` (monotonic) and `last_updated`
- Single shared trigger function + **statement-level** `AFTER INSERT OR UPDATE OR DELETE FOR EACH STATEMENT` triggers on all 20 tables
- Drizzle migrations committed

**Key files to create:**

- `backend/src/drizzle/schema/referenceMetadata.ts` (new)
- `backend/src/drizzle/schema/muscles.ts` (new, one per table)
- `backend/src/drizzle/migrations/` (generated)

**Review gates:** FK graph integrity; `source_type` guardrail everywhere; no missing FK indexes; trigger semantics correct under bulk seed.

---

### Phase 2 -- Seed/Import Pipeline

**Goal:** Safely import JSON reference truth into Postgres, transactionally and idempotently.

```mermaid
flowchart TD
  Start["Load 20 JSON files"] --> Validate["Pre-validation\nFK refs, duplicate PKs,\nmissing required fields"]
  Validate -->|FAIL| Abort["Abort with\nactionable error"]
  Validate -->|PASS| BeginTx["BEGIN TRANSACTION"]
  BeginTx --> SeedT0["Tier 0: exerciseCategories,\ncardioTypes, trainingFocus, muscles"]
  SeedT0 --> SeedT1["Tier 1: motions, grips,\nequipmentCategories\n(self-referencing upsert)"]
  SeedT1 --> SeedT2["Tier 2: motionPaths, torsoAngles,\ngripWidths, stanceWidths,\n... (12 tables)"]
  SeedT2 --> SeedT3["Tier 3: equipment, equipmentIcons"]
  SeedT3 --> Deprecate["Deprecate stale seed rows\n(is_active=false WHERE\nsource_type='seed'\nAND id NOT IN seed_ids)"]
  Deprecate --> EmptyCheck{"Empty-source\nsafety check\n(per table)"}
  EmptyCheck -->|"JSON array empty"| SkipDeprecate["Skip deprecation\nfor that table"]
  EmptyCheck -->|OK| Commit["COMMIT"]
  Commit --> LogOutput["Log counts +\ntimings + version_seq"]
```

**Non-negotiables:**

- Upsert-only (`ON CONFLICT (id) DO UPDATE`)
- Never delete rows -- only deprecate (`is_active=false`)
- Deactivation guarded: only for `source_type='seed'` rows
- Empty-source safety: if a JSON file is empty/missing, skip deprecation for that table
- Full transaction rollback on any failure

**Key file to create:**

- `backend/src/seed/seedPipeline.ts` (new)
- `backend/src/seed/topologicalOrder.ts` (new)
- `backend/src/seed/validators.ts` (new)

---

### Phase 3 -- Backend API Contracts

**Goal:** Deliver stable, versioned endpoints for app and tooling consumption.

```mermaid
sequenceDiagram
  participant App as Mobile App
  participant API as Backend API
  participant DB as PostgreSQL
  
  App->>API: GET /api/v1/reference/version
  API->>DB: SELECT version_seq, last_updated FROM reference_metadata
  API-->>App: { schemaVersion, referenceVersion }
  
  Note over App: Compare with cached version
  
  App->>API: GET /api/v1/reference/bootstrap
  API->>DB: SELECT * FROM each table WHERE is_active=true ORDER BY sort_order
  API-->>App: { schemaVersion, referenceVersion, generatedAt, tables: { muscles: [...], motions: [...], ... } }
  
  App->>API: GET /api/v1/reference/motions
  API->>DB: SELECT * FROM motions WHERE is_active=true ORDER BY sort_order
  API-->>App: { table: "motions", rows: [...] }
```

**Endpoints:**

- `GET /health` -- already exists
- `GET /api/v1/reference/version` -- returns `{ schemaVersion, referenceVersion }`
- `GET /api/v1/reference/bootstrap` -- full active-only snapshot of all 20 tables with wrapper metadata
- `GET /api/v1/reference/:table` -- single table, active-only, deterministic sort

**Key files to create/modify:**

- `backend/src/routes/referenceV1.ts` (new)
- `backend/src/services/referenceService.ts` (new)

---

### Phase 4 -- App Provider Seam and Remote Integration

**Goal:** Integrate the backend source without changing any UI contracts.

```mermaid
flowchart TD
  subgraph providerLayer [Provider Layer]
    Interface["ReferenceDataProvider\ninterface"]
    Local["LocalJsonSqliteProvider\n(current behavior)"]
    Remote["RemotePostgresProvider\n(new)"]
    Factory["createReferenceProvider\n(config)"]
  end
  subgraph cacheLayer [Cache Layer]
    AsyncCache["AsyncStorage\nwarm cache"]
    VersionCheck["Version check\non startup"]
  end
  subgraph serviceLayer [Service Layer]
    Facade["exerciseConfigService\nfacade refactor"]
    Hooks["useExerciseConfig\nhooks unchanged"]
  end
  Factory -->|"flag OFF"| Local
  Factory -->|"flag ON"| Remote
  Remote --> VersionCheck
  VersionCheck -->|"stale"| FetchBootstrap["Fetch bootstrap\nfrom API"]
  VersionCheck -->|"fresh"| AsyncCache
  FetchBootstrap --> AsyncCache
  Local --> Facade
  Remote --> Facade
  Facade --> Hooks
```

**Provider interface (new `src/database/providers/types.ts`):**

```typescript
interface ReferenceDataProvider {
  getBootstrap(options?: { allowStaleCache?: boolean }): Promise<BootstrapData>;
  getVersion(): Promise<{ schemaVersion: string; referenceVersion: string }>;
  getTable(key: string): Promise<unknown[]>;
}
```

**Key files to create:**

- `src/database/providers/types.ts` (new)
- `src/database/providers/localProvider.ts` (wraps current behavior)
- `src/database/providers/remoteProvider.ts` (new -- API + AsyncStorage cache)
- `src/database/providers/factory.ts` (new)
- Refactor [src/database/exerciseConfigService.ts](src/database/exerciseConfigService.ts) to consume provider

**Behavioral requirements:**

- Flag OFF = identical to current behavior (zero regression risk)
- Flag ON = data fetched via remote provider, cached in AsyncStorage
- First launch in remote mode requires network
- Subsequent launches can use warm cache offline (per `allowStaleCache` policy)

---

### Phase 5 -- Parity Harness and Normalization Contract

**Goal:** Prove the PostgreSQL pipeline produces identical data to the JSON source.

```mermaid
flowchart LR
  subgraph sourceA [Source A -- JSON Truth]
    JSON["20 JSON files"] --> NormA["Normalize"]
  end
  subgraph sourceB [Source B -- Postgres Pipeline]
    JSONSeed["20 JSON files"] --> Seed["Seed Pipeline"]
    Seed --> PG[("PostgreSQL")]
    PG --> Bootstrap["Bootstrap API"]
    Bootstrap --> NormB["Normalize"]
  end
  NormA --> Compare["Deep Compare\nper table / row / field"]
  NormB --> Compare
  Compare -->|MATCH| Pass["PARITY PASS"]
  Compare -->|DIFF| Fail["PARITY FAIL\nactionable diff output"]
```

**Normalization contract (codified rules):**

- Deterministic sort by PK + `sort_order`
- String trimming
- Empty string / null / missing field normalization
- Boolean and number type preservation
- Array sort normalization (where order is not semantic)

**Key files to create:**

- `backend/src/parity/normalize.ts` (new)
- `backend/src/parity/compare.ts` (new)
- `backend/src/parity/parityHarness.ts` (new -- orchestrator)

---

### Phase 6 -- Smoke Validation, Cutover, and Rollback

**Goal:** Validate real workflows and cut over safely.

```mermaid
flowchart TD
  subgraph prerequisites [Cutover Prerequisites]
    Migrations["Migrations applied"]
    SeedOK["Seed successful"]
    Parity["Parity green"]
    Smoke["Smoke tests green"]
    Health["Backend healthy"]
    Version["Version endpoint OK"]
    Rollback["Rollback path verified"]
  end
  subgraph rollout [Rollout Sequence]
    Deploy["Deploy backend + app\nflag=OFF"]
    Enable["Enable flag in\ncontrolled environment"]
    Monitor["Monitor for regressions"]
    Expand["Expand rollout"]
  end
  subgraph rollbackPlan [Rollback Plan]
    FlipOff["Flip flag OFF"]
    LocalResumes["Local provider\nresumes instantly"]
    Keep["Keep local provider\nfor 1 release"]
  end
  prerequisites --> Deploy
  Deploy --> Enable
  Enable --> Monitor
  Monitor -->|stable| Expand
  Monitor -->|issues| FlipOff
  FlipOff --> LocalResumes
  LocalResumes --> Keep
```

**Required smoke paths:**

- Exercise library browse/filter
- Exercise edit/create flow
- Live workout exercise selection
- Scoring-dependent reference lookup screens

**Test modes:** Flag OFF baseline, Flag ON remote, Warm offline (cached bootstrap)

---

## 5. Engineering Guardrails Summary

```mermaid
mindmap
  root["Guardrails"]
    Seed_Safety
      Upsert only
      No deletes
      source_type guard
      Empty source check
      Transaction rollback
    Trigger_Versioning
      Statement level only
      Monotonic version_seq
      Single shared function
      Bulk safe
    API_Determinism
      Stable sort order
      Active only default
      Explicit wrapper metadata
    App_Integration
      No direct API from UI
      All reads via provider
      Flag default OFF
      Local provider retained
```

---

## 6. Risk Register

- **Risk A -- Natural-key rename side effects:** Mitigated by `ON UPDATE CASCADE` and review discipline
- **Risk B -- Seed deactivation overreach:** Mitigated by `source_type` guardrail + empty-source checks + tx rollback
- **Risk C -- Cache/version drift:** Mitigated by metadata trigger + `version_seq` + explicit `allowStaleCache`
- **Risk D -- UI regression despite data parity:** Mitigated by mandatory smoke paths in flag OFF/ON modes
- **Risk E -- Trigger overhead during bulk seed:** Mitigated by statement-level triggers (not row-level)
- **Risk F -- Slow bootstrap reads:** Mitigated by active-row read optimization indexes
- **Risk G -- Process drift:** Mitigated by migration discipline + parity harness + release gates

---

## 7. Definition of Done

1. All 20 reference tables exist in PostgreSQL with locked constraints/indexes
2. `reference_metadata` + statement-level trigger versioning works correctly
3. Seed pipeline is transactional, idempotent, upsert-only, with guarded deprecation
4. Bootstrap/version/granular endpoints implement the locked wrapper semantics
5. App provider seam and local/remote providers integrated with no public contract breakage
6. Feature flag defaults OFF and cleanly controls source selection
7. Parity harness passes in CI under the normalization contract
8. UI smoke paths pass with flag OFF and ON (and warm offline)
9. Rollout and rollback playbooks are documented and executable
10. Local provider retained for at least one full release after cutover
