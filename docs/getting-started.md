# Getting Started

This guide covers environment setup, required services, and the order to start each application for local development.

---

## 1. Prerequisites

- **Node.js**: v18+ (LTS recommended)
- **npm**: v9+
- **PostgreSQL**: 14+ (local or Docker)
- **Expo CLI / EAS** (for mobile): `npm install -g expo-cli` optional; project uses `npx expo`
- **Android Studio** or **Xcode** (for mobile device/emulator)

---

## 2. Repository Layout

All four apps and the backend live in one repository:

```
Mobile/                 # Repo root
├── src/                # Mobile app (React Native + Expo)
├── web/                 # Web app (Next.js)
├── admin/               # Admin app (Vite + React)
├── backend/             # Backend API (Express + Prisma)
├── shared/              # Shared TypeScript library
├── docs/                # Documentation
└── package.json         # Mobile app package.json (root)
```

---

## 3. Environment Variables

### 3.1 Backend (`backend/.env`)

Create `backend/.env` from the following. Do not commit real secrets.

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://user:pass@localhost:5432/onlyfit` | PostgreSQL connection string |
| `JWT_SECRET` | Yes | (random string) | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | (random string) | Secret for refresh tokens |
| `JWT_EXPIRES_IN` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token TTL |
| `PORT` | No | `4000` | Backend listen port |

Note: After refactoring, `REFERENCE_DATA_SOURCE` and `TABLES_DIR` are no longer used; data is read from Postgres only.

### 3.2 Mobile

- Backend URL is resolved via `src/config/resolveBackendUrl.ts` (e.g. dev vs production).
- For a device/emulator pointing to your machine, use your LAN IP or `localhost` (emulator) in that config.

### 3.3 Web

- Next.js rewrites `/api/*` to `http://localhost:4000` by default (see `web/next.config.js`). No env vars required for local API.

### 3.4 Admin

- Vite proxy forwards `/api/*` to `http://localhost:4000/api/admin/*` (see `admin/vite.config.ts`). No env vars required for local.

---

## 4. One-Time Setup

### 4.1 Install Dependencies

From repo root:

```bash
# Mobile (root)
npm install

# Web
cd web && npm install && cd ..

# Admin
cd admin && npm install && cd ..

# Backend
cd backend && npm install && cd ..
```

### 4.2 Database

1. Create a PostgreSQL database (e.g. `onlyfit`).
2. From `backend/`:

```bash
cd backend
npx prisma generate
npx prisma migrate dev
# Optional: seed reference data if you have a seed script
# npm run db:seed   # or ref:seed per your package.json
```

---

## 5. Run Order (Local Development)

Start services in this order:

### Step 1: PostgreSQL

Ensure PostgreSQL is running and the database exists.

### Step 2: Backend

```bash
cd backend
npm run dev
```

Backend listens on **port 4000**. Verify: `curl http://localhost:4000/api/health`.

### Step 3: Web (optional, for dashboard)

```bash
cd web
npm run dev
```

Web runs on **port 3000**. Open `http://localhost:3000`.

### Step 4: Admin (optional, for reference data)

```bash
cd admin
npm run dev
```

Admin runs on **port 5173**. Open `http://localhost:5173`.

### Step 5: Mobile

```bash
# From repo root
npm start
# or
npm run android
# or
npm run ios
```

Expo dev server runs on **port 8081**. Ensure backend URL in mobile config points to your machine (e.g. `http://10.0.2.2:4000` for Android emulator, or your LAN IP for a physical device).

---

## 6. Quick Verification

1. **Backend**: `curl http://localhost:4000/api/health` → 200 OK.
2. **Web**: Open `http://localhost:3000`, then login and open dashboard.
3. **Admin**: Open `http://localhost:5173`, open table editor, load a table.
4. **Mobile**: Start app, login (or use auto-login if configured), open workout tab and start a workout.

---

## 7. Related Docs

- [Architecture](architecture.md)
- [API catalog](api.md)
- [Testing](testing.md)
