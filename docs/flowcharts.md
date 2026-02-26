# Flowcharts Report

This document provides flowcharts for **user flows**, **data flows**, and **request flows** across the Solto ecosystem. Each diagram is in Mermaid format and can be rendered in any Markdown viewer that supports Mermaid (e.g. GitHub, VS Code with Mermaid extension).

---

## 1. User Flows

### 1.1 Mobile: Start and Finish a Workout

```mermaid
flowchart TD
    Start([User opens app]) --> LogTab[Log tab]
    LogTab --> Choice{Action?}
    Choice -->|Start new| StartEmpty[Start empty workout]
    Choice -->|Resume| Resume[Open active workout]
    StartEmpty --> LiveScreen[Live workout screen]
    Resume --> LiveScreen
    LiveScreen --> AddEx[Add / reorder exercises]
    AddEx --> FillSets[Fill sets: weight, reps, duration]
    FillSets --> FinishChoice{Finish?}
    FinishChoice -->|Cancel| CancelModal[Cancel workout modal]
    CancelModal --> ConfirmCancel{Confirm?}
    ConfirmCancel -->|Yes| ClearActive[Clear active workout]
    ConfirmCancel -->|No| LiveScreen
    FinishChoice -->|Finish| FinishModal[Finish workout modal]
    FinishModal --> OptionalBW[Optional: enter body weight]
    OptionalBW --> SaveWorkout[Save to history + sync API]
    SaveWorkout --> ClearActive
    ClearActive --> BackToLog[Back to Log tab]
```

### 1.2 Mobile: Exercise Library and Sync

```mermaid
flowchart LR
    subgraph device [Device]
        UI[Library screen]
        LocalCache[AsyncStorage cache]
        Context[WorkoutContext]
    end
    subgraph backend [Backend]
        API[/api/exercises]
        DB[(Postgres)]
    end
    UI --> Context
    Context -->|On load| LocalCache
    Context -->|Then| API
    API --> DB
    API -->|Merge with cache| Context
    Context --> LocalCache
    Context --> UI
```

### 1.3 Web: Dashboard Login and Data Load

```mermaid
flowchart TD
    Visit([User visits /dashboard]) --> Layout[Dashboard layout]
    Layout --> AuthGate{Token in localStorage?}
    AuthGate -->|No| LoginPage[Show login form]
    LoginPage --> SubmitLogin[POST /api/auth/login]
    SubmitLogin --> StoreTokens[Store accessToken, refreshToken]
    StoreTokens --> FetchDash[GET /api/dashboard]
    AuthGate -->|Yes| FetchDash
    FetchDash --> DashboardContext[Dashboard context]
    DashboardContext --> Render[Render dashboard: stats, charts, history, goals]
```

### 1.4 Admin: Edit Reference Table Row

```mermaid
flowchart TD
    OpenTable[Open table in TableEditor] --> LoadRows[GET /api/admin/tables/:key]
    LoadRows --> RenderTable[Render table grid]
    RenderTable --> UserClicks[User clicks row]
    UserClicks --> OpenSidePanel[Open RowEditor side panel]
    OpenSidePanel --> EditFields[Edit fields in form]
    EditFields --> Save[PUT /api/admin/tables/:key/rows/:id]
    Save --> Backend[Backend: pgCrud update]
    Backend --> RefreshTable[Refresh table data]
```

---

## 2. Data Flows

### 2.1 High-Level Data Flow (All Clients to Postgres)

```mermaid
flowchart LR
    subgraph clients [Clients]
        M[Mobile]
        W[Web]
        A[Admin]
    end
    subgraph backend [Backend]
        R[Routes]
        S[Services]
        P[Prisma]
    end
    DB[(Postgres)]
    M -->|REST| R
    W -->|Proxy + REST| R
    A -->|Proxy + REST| R
    R --> S
    S --> P
    P --> DB
    DB --> P
    P --> S
    S --> R
    R --> M
    R --> W
    R --> A
```

### 2.2 Mobile Offline-First Sync (WorkoutContext)

```mermaid
flowchart TD
    AppLoad[App load] --> MultiGet[AsyncStorage.multiGet: history, library, active, stats]
    MultiGet --> SetState[Set state from cache]
    SetState --> AutoLogin[autoLogin]
    AutoLogin --> FetchRemote[fetchWorkouts + fetchExercises]
    FetchRemote --> Merge{Merge logic}
    Merge -->|Remote non-empty| UseRemote[Replace history/library with remote]
    Merge -->|Remote empty/fail| KeepCache[Keep cached data]
    UseRemote --> SetStateAgain[Update state]
    KeepCache --> SetStateAgain
    SetStateAgain --> LoadingDone[Set isLoading = false]
    LoadingDone --> Persist[Debounced AsyncStorage writes on state change]
```

### 2.3 Dashboard Aggregate (Backend)

```mermaid
flowchart TD
    Req[GET /api/dashboard] --> Auth[requireAuth]
    Auth --> DashboardSvc[dashboardService.getDashboard]
    DashboardSvc --> Q1[Prisma: workouts with includes]
    DashboardSvc --> Q2[Prisma: goals]
    DashboardSvc --> Q3[Prisma: bodyMeasurements]
    DashboardSvc --> Q4[Prisma: personalRecords]
    Q1 --> Map[Map to API shape]
    Q2 --> Map
    Q3 --> Map
    Q4 --> Map
    Map --> Response[Return JSON]
```

---

## 3. Request Flows

### 3.1 Authenticated Request (e.g. GET /api/workouts)

```mermaid
sequenceDiagram
    participant Client
    participant Route
    participant AuthMW as Auth middleware
    participant Service
    participant Prisma
    participant DB as Postgres

    Client->>Route: GET /api/workouts, Authorization: Bearer <token>
    Route->>AuthMW: next()
    AuthMW->>AuthMW: Verify JWT, set req.userId
    AuthMW->>Route: next()
    Route->>Service: listWorkouts(userId, page, limit)
    Service->>Prisma: findMany where userId, include exercises/sets
    Prisma->>DB: SQL
    DB-->>Prisma: rows
    Prisma-->>Service: data
    Service-->>Route: workouts[]
    Route-->>Client: 200 JSON
```

### 3.2 Admin Table CRUD (No Auth)

```mermaid
sequenceDiagram
    participant AdminUI
    participant ViteProxy
    participant BackendRoute
    participant PgCrud
    participant DB as Postgres

    AdminUI->>ViteProxy: PUT /api/tables/muscles/rows/bicep
    ViteProxy->>BackendRoute: PUT /api/admin/tables/muscles/rows/bicep
    BackendRoute->>PgCrud: updateRow('muscles', 'bicep', body)
    PgCrud->>DB: UPDATE ref_muscle SET ...
    DB-->>PgCrud: OK
    PgCrud-->>BackendRoute: row
    BackendRoute-->>ViteProxy: 200 JSON
    ViteProxy-->>AdminUI: 200 JSON
```

### 3.3 Web Dashboard Request (Proxy)

```mermaid
sequenceDiagram
    participant Browser
    participant NextJS
    participant Backend

    Browser->>NextJS: GET /api/dashboard, Cookie/Authorization
    NextJS->>Backend: GET http://localhost:4000/api/dashboard (forward headers)
    Backend->>Backend: requireAuth, dashboardService.getDashboard
    Backend-->>NextJS: 200 JSON
    NextJS-->>Browser: 200 JSON
```

---

## 4. Scoring and Reference Data Flow (Admin / Backend)

### 4.1 Scoring Compute Request

```mermaid
flowchart LR
    Admin[Admin ScoringPanel] --> Post[POST /api/admin/scoring/compute]
    Post --> Route[admin/routes/scoring]
    Route --> Shared[shared/scoring: computeActivation]
    Shared --> Resolve[resolveAllDeltas]
    Resolve --> Apply[applyDeltas, flattenMuscleTargets]
    Apply --> Response[JSON: baseScores, appliedDeltas, finalScores]
```

### 4.2 Reference Data: Mobile Bootstrap

```mermaid
flowchart TD
    Mobile[Mobile app] --> GetBootstrap[GET /api/v1/reference/bootstrap]
    GetBootstrap --> RefService[referenceService]
    RefService --> Prisma[Prisma / raw SQL]
    Prisma --> Postgres[(Postgres reference tables)]
    Postgres --> Prisma
    Prisma --> RefService
    RefService --> Mobile
    Mobile --> Cache[Cache in provider / AsyncStorage]
```

---

## 5. Diagram Index

| Section | Diagram | Description |
|---------|---------|-------------|
| 1.1 | Mobile: Start and Finish a Workout | User path from Log tab to finishing or canceling a workout |
| 1.2 | Mobile: Exercise Library and Sync | How library data is loaded from cache and API |
| 1.3 | Web: Dashboard Login and Data Load | Auth check and dashboard fetch |
| 1.4 | Admin: Edit Reference Table Row | Table editor → row edit → save |
| 2.1 | High-Level Data Flow | All clients → backend → Postgres |
| 2.2 | Mobile Offline-First Sync | WorkoutContext load and merge |
| 2.3 | Dashboard Aggregate | Backend building dashboard response |
| 3.1 | Authenticated Request | JWT → route → service → Prisma → response |
| 3.2 | Admin Table CRUD | Admin → Vite proxy → backend → pgCrud |
| 3.3 | Web Dashboard Request | Browser → Next.js proxy → backend |
| 4.1 | Scoring Compute | Admin scoring panel → shared scoring engine |
| 4.2 | Reference Data Bootstrap | Mobile bootstrap from Postgres |

---

## 6. Related Documents

- [Architecture](architecture.md)
- [Process diagrams](process-diagrams.md)
- [API catalog](api.md)
