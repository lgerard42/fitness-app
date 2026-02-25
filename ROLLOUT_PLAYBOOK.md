# Reference Data Migration -- Rollout & Rollback Playbook

## Prerequisites Checklist

Before enabling the remote provider in production:

- [ ] All Drizzle migrations applied (`npm run drizzle:migrate`)
- [ ] Seed pipeline succeeds (`npm run ref:seed`)
- [ ] Parity harness passes 23/23 (`npm run ref:parity`)
- [ ] Smoke tests pass 7/7 (`npx tsx src/smoke/smokeTest.ts`)
- [ ] Backend health endpoint returns 200 (`GET /api/health`)
- [ ] Version endpoint returns valid response (`GET /api/v1/reference/version`)
- [ ] Local provider retained and functional (flag OFF baseline verified)

---

## Cutover Sequence

### Step 1: Deploy backend with flag OFF

```bash
# Ensure migrations and seed are current
cd backend
npm run drizzle:migrate
npm run ref:seed
npm run ref:parity

# Start backend
npm run dev
```

App continues using local provider (zero risk).

### Step 2: Enable flag in controlled environment

Edit `src/config/featureFlags.ts`:

```typescript
export const FEATURE_FLAGS = {
  USE_BACKEND_REFERENCE: true,    // <-- flip to true
  REFERENCE_API_BASE_URL: "http://your-backend-host:4000",
};
```

### Step 3: Verify remote mode

1. Launch app in dev mode with flag ON
2. Check that exercise library loads (browse + filter)
3. Check that exercise edit flow has all modifier data
4. Start a workout and verify exercise selection works
5. Check scoring-dependent screens render correctly

### Step 4: Monitor for regressions

Watch for:
- Missing reference data in UI (empty dropdowns, missing options)
- Scoring calculation errors
- Network timeout errors in console
- AsyncStorage cache misses on app restart

### Step 5: Expand rollout

Once stable in controlled environment:
- Deploy to staging
- Run smoke tests in staging
- Deploy to production with flag ON

---

## Rollback Plan

### Instant rollback (< 1 minute)

1. Flip the feature flag OFF:

```typescript
export const FEATURE_FLAGS = {
  USE_BACKEND_REFERENCE: false,   // <-- flip back
};
```

2. The local provider resumes instantly
3. No data loss -- local JSON/SQLite is always the source of truth
4. No backend dependency -- app works fully offline

### Why rollback is safe

- The local provider (`LocalJsonSqliteProvider`) is always retained
- The feature flag is a compile-time constant -- no remote config needed
- Local JSON files are never modified by the remote pipeline
- SQLite database is rebuilt from JSON on each app install/update
- The facade (`configFacade.ts`) transparently routes based on the flag

---

## Post-Cutover Cleanup (After 1 Full Release)

Only after the remote provider has been stable for one full release cycle:

1. Remove `LocalJsonSqliteProvider` (optional -- keeping it as fallback is cheap)
2. Remove the feature flag check from `configFacade.ts`
3. Update `createReferenceProvider()` to always return `RemotePostgresProvider`
4. Keep local JSON files as seed source (they're still needed by the admin panel)

---

## Operational Commands

| Task | Command |
|------|---------|
| Apply migrations | `cd backend && npm run drizzle:migrate` |
| Run seed | `cd backend && npm run ref:seed` |
| Run parity check | `cd backend && npm run ref:parity` |
| Run smoke tests | `cd backend && npx tsx src/smoke/smokeTest.ts` |
| Start backend (dev) | `cd backend && npm run dev` |
| Check version | `curl http://localhost:4000/api/v1/reference/version` |
| Check health | `curl http://localhost:4000/api/health` |
| Full bootstrap | `curl http://localhost:4000/api/v1/reference/bootstrap` |
| Single table | `curl http://localhost:4000/api/v1/reference/motions` |

---

## Emergency Contacts

- **Data issues**: Run `npm run ref:parity` to diagnose JSON/Postgres drift
- **Schema issues**: Check `backend/src/drizzle/migrations/` for applied SQL
- **Seed failures**: Check seed pipeline logs for FK or validation errors
- **Cache issues**: Clear AsyncStorage keys `@ref:bootstrap` and `@ref:version`
