-- Add muscle_grouping_id to motions: which muscle to use when grouping by muscles (e.g. in MOTIONS table and Motion Delta Matrix).
ALTER TABLE motions ADD COLUMN IF NOT EXISTS muscle_grouping_id TEXT;

-- Backfill: set muscle_grouping_id to the muscle ID with highest score in muscle_targets (flat Record<id, number>).
DO $$
DECLARE
  rec RECORD;
  best_key TEXT;
  best_score NUMERIC;
  jkey TEXT;
  jval TEXT;
BEGIN
  FOR rec IN
    SELECT id, muscle_targets
    FROM motions
    WHERE is_active = true
      AND muscle_targets IS NOT NULL
      AND muscle_targets != '{}'::jsonb
      AND muscle_targets != 'null'::jsonb
  LOOP
    best_key := NULL;
    best_score := -1;
    FOR jkey, jval IN SELECT * FROM jsonb_each_text(rec.muscle_targets)
    LOOP
      BEGIN
        IF jval ~ '^-?[0-9]+\.?[0-9]*$' AND jval::numeric > best_score THEN
          best_score := jval::numeric;
          best_key := jkey;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END LOOP;
    IF best_key IS NOT NULL THEN
      UPDATE motions SET muscle_grouping_id = best_key WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;
