# Only Fit - Marketing Website & Web Dashboard

A modern marketing website and user dashboard for the Only Fit mobile app, built with Next.js 14, TailwindCSS, and Recharts.

## Getting Started

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the marketing site.

Navigate to [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to access the dashboard (enter any email/password to log in).

## Project Structure

```
web/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Landing page
│   ├── pricing/            # Pricing page
│   ├── privacy/            # Privacy policy
│   ├── terms/              # Terms of service
│   └── dashboard/          # Protected dashboard
│       ├── page.tsx        # Overview with stats & charts
│       ├── history/        # Workout history table
│       ├── analytics/      # Exercise analytics & charts
│       ├── measurements/   # Body measurements tracking
│       └── goals/          # Goal tracking & progress
├── components/
│   ├── marketing/          # Landing page components
│   ├── dashboard/          # Dashboard components
│   └── ui/                 # Reusable UI primitives
├── lib/
│   ├── auth-context.tsx    # Mock authentication
│   ├── mockData.ts         # Mock data layer
│   └── utils.ts            # Utility functions
├── types/
│   └── index.ts            # TypeScript types (from mobile app)
└── constants/
    └── index.ts            # Brand, navigation, features
```

## Theme System

### CSS Variables

Defined in `app/globals.css`:

```css
:root {
  --primary: #FF6B35;    /* Energetic Orange */
  --accent: #10B981;     /* Vibrant Green */
  --warning: #F59E0B;    /* Amber */
  --neutral-dark: #2D2D2D;
  --neutral-light: #F7F7F7;
  --white: #FFFFFF;
}
```

### Tailwind Integration

Colors are extended in `tailwind.config.ts` with full shade scales:
- `primary-50` through `primary-900`
- `accent-50` through `accent-900`
- `warning-50` through `warning-900`

### Usage Rules

| Color   | Use Cases                                      |
|---------|------------------------------------------------|
| Orange  | CTA buttons, hero highlights, active states    |
| Green   | Progress bars, success states, improvement      |
| Amber   | Alerts, milestone highlights, PR badges         |
| Dark    | Text, backgrounds                               |
| Light   | Page backgrounds, subtle containers             |

## Mock Data Architecture

All dashboard data comes from `lib/mockData.ts`:

```typescript
export async function getUserData(): Promise<DashboardData> {
  // Currently returns static mock data
  // Replace with: fetch('/api/user')
  return mockData;
}
```

The `DashboardData` interface includes:
- `user: UserProfile`
- `workoutHistory: Workout[]`
- `exerciseStats: ExerciseStatsMap`
- `bodyMeasurements: BodyMeasurement[]`
- `goals: UserGoal[]`
- `personalRecords: PersonalRecord[]`

### Replacing with a Real Backend

1. Create API routes in `app/api/` or use an external API
2. Replace `getUserData()` in `lib/mockData.ts` with actual `fetch()` calls
3. Update `lib/auth-context.tsx` with real authentication (NextAuth, Clerk, etc.)
4. All components already consume data through the `getUserData()` interface

## Suggested PostgreSQL Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_minutes INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Lifts', 'Cardio', 'Training')),
  muscle_groups TEXT[],
  equipment TEXT[],
  is_custom BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id)
);

CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  position INT NOT NULL,
  group_id UUID,
  group_type VARCHAR(20)
);

CREATE TABLE sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE,
  position INT NOT NULL,
  type VARCHAR(20) DEFAULT 'Working',
  weight DECIMAL(8,2),
  reps INT,
  duration_seconds INT,
  distance DECIMAL(10,2),
  completed BOOLEAN DEFAULT FALSE,
  is_warmup BOOLEAN DEFAULT FALSE,
  is_dropset BOOLEAN DEFAULT FALSE,
  is_failure BOOLEAN DEFAULT FALSE
);

CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight DECIMAL(6,2),
  body_fat_percent DECIMAL(5,2),
  neck DECIMAL(5,2),
  chest DECIMAL(5,2),
  waist DECIMAL(5,2),
  left_arm DECIMAL(5,2),
  right_arm DECIMAL(5,2),
  left_thigh DECIMAL(5,2),
  right_thigh DECIMAL(5,2),
  unit VARCHAR(3) DEFAULT 'lbs',
  circumference_unit VARCHAR(2) DEFAULT 'in'
);

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('strength', 'consistency')),
  exercise_id UUID REFERENCES exercises(id),
  target_weight DECIMAL(8,2),
  target_weight_unit VARCHAR(3),
  target_workouts_per_week INT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  weight DECIMAL(8,2) NOT NULL,
  weight_unit VARCHAR(3) DEFAULT 'lbs',
  achieved_at DATE NOT NULL
);

-- Indexes
CREATE INDEX idx_workouts_user ON workouts(user_id);
CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX idx_sets_workout_exercise ON sets(workout_exercise_id);
CREATE INDEX idx_body_measurements_user ON body_measurements(user_id);
CREATE INDEX idx_goals_user ON goals(user_id);
CREATE INDEX idx_personal_records_user ON personal_records(user_id);
```

## Build & Deploy

```bash
npm run build   # Production build
npm run start   # Start production server
npm run lint    # Run ESLint
```

Deploy to Vercel, Netlify, or any Node.js hosting platform.
