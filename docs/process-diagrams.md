# Process Diagrams Report

This document describes **processes** in the Solto ecosystem: development workflow, request handling, deployment, testing, and release. Each process is documented with a Mermaid diagram and a short explanation.

---

## 1. Development Workflow

### 1.1 Local Development Startup Process

```mermaid
flowchart TD
    Start([Developer starts work]) --> CheckPrereqs[Check: Node, PostgreSQL, env]
    CheckPrereqs --> InstallDeps[Install deps: root, web, admin, backend]
    InstallDeps --> DbSetup[Backend: prisma generate, migrate]
    DbSetup --> StartBackend[Start backend on :4000]
    StartBackend --> HealthCheck{GET /api/health OK?}
    HealthCheck -->|No| FixBackend[Fix backend / DB]
    FixBackend --> StartBackend
    HealthCheck -->|Yes| StartFrontends[Start web and/or admin and/or mobile]
    StartFrontends --> DevLoop[Develop: edit code, test in browser/app]
    DevLoop --> RunTests[Run tests before commit]
    RunTests --> Commit[Commit and push]
```

**Summary:** Install dependencies and set up the database, start the backend and verify health, then start the frontend(s) you need. Run tests before committing.

---

### 1.2 Request Handling Process (Backend)

```mermaid
flowchart LR
    Incoming[Incoming HTTP request] --> Router[Express router]
    Router --> CORS[CORS middleware]
    CORS --> AuthRoute{Auth required?}
    AuthRoute -->|Yes| AuthMW[requireAuth: verify JWT]
    AuthRoute -->|No| Parse[Parse body, params, query]
    AuthMW -->|Valid| Parse
    AuthMW -->|Invalid| Err401[401 Unauthorized]
    Parse --> RouteHandler[Route handler wrapped with wrap]
    RouteHandler --> Validate[Validate input e.g. Zod]
    Validate --> ServiceCall[Call service layer]
    ServiceCall --> ServiceLogic[Service: Prisma queries, logic]
    ServiceLogic --> Response[Send JSON response]
    Response --> Outgoing[Outgoing HTTP response]
```

**Summary:** Request passes through CORS, optional auth, parsing, validation, then the route calls a service. The service uses Prisma and returns data; the route sends the HTTP response. Errors are handled by the error-handling middleware.

---

### 1.3 Error Handling Process (Backend)

```mermaid
flowchart TD
    Error[Error thrown in route/service] --> Wrap[wrap fn catches with .catch next]
    Wrap --> Next[next err]
    Next --> ErrMiddleware[errorHandler middleware]
    ErrMiddleware --> TypeCheck{Error type?}
    TypeCheck -->|AuthError| Send401[Send 401]
    TypeCheck -->|ZodError| Send400[Send 400 validation message]
    TypeCheck -->|Other| Send500[Send 500 or generic message]
    Send401 --> Log[Log if needed]
    Send400 --> Log
    Send500 --> Log
    Log --> End([Response sent])
```

**Summary:** Async route handlers are wrapped so rejections are passed to `next`. The error handler maps known error types to status codes and sends a consistent JSON error response.

---

## 2. Build and Test Processes

### 2.1 Test Execution Process (Full Suite)

```mermaid
flowchart TD
    Trigger[Run full test suite] --> Mobile[From root: npm run test:ci]
    Mobile --> Jest[Jest: src + shared]
    Jest --> MobileResult[Mobile + Shared result]
    MobileResult --> Backend[cd backend && npm run test:ci]
    Backend --> VitestB[Vitest: backend/src]
    VitestB --> BackendResult[Backend result]
    BackendResult --> Web[cd web && npm run test:ci]
    Web --> VitestW[Vitest: web]
    VitestW --> WebResult[Web result]
    WebResult --> Aggregate{All pass?}
    Aggregate -->|Yes| Success([Success])
    Aggregate -->|No| Fail([Fix failing tests])
```

**Summary:** Run mobile/shared tests from root, then backend tests from `backend/`, then web tests from `web/`. All must pass for a green build.

---

### 2.2 Build Process (Per Application)

```mermaid
flowchart LR
    subgraph mobile [Mobile]
        M1[Install deps] --> M2[Metro/Expo bundle]
        M2 --> M3[Run on device/simulator]
    end
    subgraph web [Web]
        W1[npm install] --> W2[next build]
        W2 --> W3[Static/SSR output to .next]
    end
    subgraph admin [Admin]
        A1[npm install] --> A2[vite build]
        A2 --> A3[Static output to dist/]
    end
    subgraph backend [Backend]
        B1[npm install] --> B2[tsx/tsc]
        B2 --> B3[Run node or compile to JS]
    end
```

**Summary:** Each app has its own build: Mobile uses Expo/Metro, Web uses Next.js build, Admin uses Vite build, Backend uses TypeScript (tsx or tsc) and runs with Node.

---

## 3. Deployment Process

### 3.1 Containerized Deployment (Target: AWS)

```mermaid
flowchart TD
    Code[Code in repo] --> BuildImages[Build container images]
    BuildImages --> BackendImage[Backend image: Dockerfile]
    BuildImages --> WebImage[Web: build then image]
    BuildImages --> AdminImage[Admin: build then image]
    BackendImage --> Push[Push to container registry]
    WebImage --> Push
    AdminImage --> Push
    Push --> Deploy[Deploy to AWS e.g. ECS, EKS, Lambda]
    Deploy --> BackendSvc[Backend service :4000]
    Deploy --> WebSvc[Web static or SSR]
    Deploy --> AdminSvc[Admin static]
    BackendSvc --> DB[(Managed Postgres)]
    WebSvc --> BackendSvc
    AdminSvc --> BackendSvc
```

**Summary:** Backend, Web, and Admin are built into container images, pushed to a registry, then deployed to AWS. Backend connects to managed Postgres; Web and Admin call the backend API.

---

### 3.2 Mobile Release Process

```mermaid
flowchart TD
    Dev[Development branch] --> Tests[Run tests]
    Tests --> Bump[Bump version if needed]
    Bump --> BuildEAS[EAS Build or local build]
    BuildEAS --> Artifact[Android APK/AAB or iOS IPA]
    Artifact --> Store[Submit to Play Store / App Store]
    Store --> Review[Store review]
    Review --> Live[Release to users]
```

**Summary:** After tests and version bump, build the app (e.g. EAS), produce the store artifact, submit to the store, and release after review.

---

## 4. Data and Sync Processes

### 4.1 Mobile: Write Path (Create Workout)

```mermaid
flowchart TD
    UserAction[User finishes workout] --> Context[WorkoutContext.finishWorkout]
    Context --> LocalUpdate[Update state: add to history, clear active]
    LocalUpdate --> PersistLocal[Debounced AsyncStorage write]
    Context --> ApiCreate[apiCreateWorkout to backend]
    ApiCreate --> BackendRoute[POST /api/workouts]
    BackendRoute --> WorkoutService[workoutService.createWorkout]
    WorkoutService --> PrismaCreate[Prisma create]
    PrismaCreate --> DB[(Postgres)]
    PersistLocal --> Done([UI updated, cache updated]
    DB --> Done
```

**Summary:** Finishing a workout updates local state and persists to AsyncStorage (debounced), and sends the workout to the backend. Backend persists to Postgres. UI and cache are updated regardless of API success (offline-first).

---

### 4.2 Backend: Service Layer Pattern

```mermaid
flowchart LR
    Route[Route handler] --> Validate[Validate input]
    Validate --> Service[Service function]
    Service --> Prisma[Prisma client]
    Prisma --> DB[(Postgres)]
    DB --> Prisma
    Prisma --> Map[Map to API shape]
    Map --> Return[Return to route]
    Return --> Route
    Route --> Res[JSON response]
```

**Summary:** Routes validate input, call a service function with `userId` and params, and the service performs Prisma operations and mapping. The route sends the JSON response.

---

## 5. Process Index

| Section | Process | Description |
|---------|---------|-------------|
| 1.1 | Local Development Startup | Order of starting services and verifying health |
| 1.2 | Request Handling (Backend) | Path of an HTTP request through Express to response |
| 1.3 | Error Handling (Backend) | How errors are caught and turned into HTTP responses |
| 2.1 | Test Execution (Full Suite) | Running mobile, backend, and web tests |
| 2.2 | Build (Per Application) | How each app is built |
| 3.1 | Containerized Deployment | Building and deploying to AWS |
| 3.2 | Mobile Release | From dev to store submission and release |
| 4.1 | Mobile Write Path | Finishing a workout: local + API |
| 4.2 | Service Layer Pattern | Route → service → Prisma → response |

---

## 6. Related Documents

- [Architecture](architecture.md)
- [Flowcharts](flowcharts.md)
- [Getting started](getting-started.md)
- [API catalog](api.md)
