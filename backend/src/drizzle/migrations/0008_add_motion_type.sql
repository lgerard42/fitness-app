-- Add motion_type to motions: Standard, Umbrella, Mixed, Rehab.
ALTER TABLE motions ADD COLUMN IF NOT EXISTS motion_type TEXT DEFAULT 'Standard';
