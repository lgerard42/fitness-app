-- Flatten nested muscle_targets JSON from { GROUP: { _score: N, CHILD: { _score: M } } }
-- to flat { muscleId: score } storing only leaf-level scores.
-- Parent/grandparent scores are now computed dynamically at display time.
--
-- The function walks the JSON tree, collecting leaf nodes (nodes with no
-- children other than _score) and emitting { muscleId: _score } pairs.

DO $$
DECLARE
  r RECORD;
  old_json JSONB;
  new_json JSONB;
  p_key TEXT;
  p_val JSONB;
  s_key TEXT;
  s_val JSONB;
  t_key TEXT;
  t_val JSONB;
  p_children TEXT[];
  s_children TEXT[];
BEGIN
  FOR r IN SELECT id, muscle_targets FROM motions WHERE muscle_targets IS NOT NULL AND muscle_targets != '{}' AND muscle_targets != 'null'
  LOOP
    old_json := r.muscle_targets::JSONB;
    new_json := '{}'::JSONB;

    -- Walk primary keys (top-level)
    FOR p_key IN SELECT jsonb_object_keys(old_json)
    LOOP
      IF p_key = '_score' THEN CONTINUE; END IF;
      p_val := old_json -> p_key;

      -- Check if p_val is an object
      IF jsonb_typeof(p_val) != 'object' THEN
        -- Scalar at top level (already flat) - keep as-is
        new_json := new_json || jsonb_build_object(p_key, p_val);
        CONTINUE;
      END IF;

      -- Collect non-_score children of this primary
      SELECT ARRAY_AGG(k) INTO p_children
      FROM jsonb_object_keys(p_val) k
      WHERE k != '_score';

      IF p_children IS NULL OR array_length(p_children, 1) = 0 THEN
        -- Primary is a leaf (has _score but no children)
        IF p_val ? '_score' THEN
          new_json := new_json || jsonb_build_object(p_key, p_val -> '_score');
        END IF;
        CONTINUE;
      END IF;

      -- Walk secondary keys
      FOREACH s_key IN ARRAY p_children
      LOOP
        s_val := p_val -> s_key;

        IF jsonb_typeof(s_val) != 'object' THEN
          CONTINUE;
        END IF;

        -- Collect non-_score children of this secondary
        SELECT ARRAY_AGG(k) INTO s_children
        FROM jsonb_object_keys(s_val) k
        WHERE k != '_score';

        IF s_children IS NULL OR array_length(s_children, 1) = 0 THEN
          -- Secondary is a leaf
          IF s_val ? '_score' THEN
            new_json := new_json || jsonb_build_object(s_key, s_val -> '_score');
          END IF;
          CONTINUE;
        END IF;

        -- Walk tertiary keys
        FOREACH t_key IN ARRAY s_children
        LOOP
          t_val := s_val -> t_key;

          IF jsonb_typeof(t_val) = 'object' AND t_val ? '_score' THEN
            new_json := new_json || jsonb_build_object(t_key, t_val -> '_score');
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;

    -- Update the row if data changed
    IF new_json IS DISTINCT FROM old_json THEN
      UPDATE motions SET muscle_targets = new_json WHERE id = r.id;
      RAISE NOTICE 'Flattened motions.% : % → %', r.id, old_json, new_json;
    END IF;
  END LOOP;
END $$;
