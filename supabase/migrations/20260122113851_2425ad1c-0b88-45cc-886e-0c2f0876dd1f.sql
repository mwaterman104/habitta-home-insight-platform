-- Add replacement_status column (provenance vs replacement state separation)
ALTER TABLE systems ADD COLUMN IF NOT EXISTS replacement_status TEXT NOT NULL DEFAULT 'unknown';
COMMENT ON COLUMN systems.replacement_status IS 'Allowed: original | replaced | unknown';

-- Add install_month for finer granularity
ALTER TABLE systems ADD COLUMN IF NOT EXISTS install_month INTEGER;

-- Add install_metadata for structured optional data
ALTER TABLE systems ADD COLUMN IF NOT EXISTS install_metadata JSONB;
COMMENT ON COLUMN systems.install_metadata IS 'Keys: installer, knowledge_source, client_request_id, user_acknowledged_unknown';

-- Update install_source constraint comment (purely provenance)
COMMENT ON COLUMN systems.install_source IS 'Allowed: heuristic | owner_reported | inspection | permit_verified';

-- Migrate old install_source values to canonical provenance
UPDATE systems SET install_source = 'heuristic' WHERE install_source = 'inferred';
UPDATE systems SET install_source = 'owner_reported' WHERE install_source = 'user';
UPDATE systems SET install_source = 'permit_verified' WHERE install_source = 'permit';

-- Handle nulls: if install_year exists -> owner_reported, else -> heuristic
UPDATE systems 
SET install_source = CASE 
  WHEN install_year IS NOT NULL THEN 'owner_reported'
  ELSE 'heuristic'
END
WHERE install_source IS NULL;

-- Set default for install_source going forward
ALTER TABLE systems ALTER COLUMN install_source SET DEFAULT 'heuristic';

-- Create audit table for system install changes
CREATE TABLE IF NOT EXISTS system_install_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  prev_install_year INTEGER,
  new_install_year INTEGER,
  prev_install_source TEXT,
  new_install_source TEXT,
  prev_replacement_status TEXT,
  new_replacement_status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE system_install_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit events
CREATE POLICY "Users can view own system install events"
ON system_install_events FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own audit events
CREATE POLICY "Users can insert own system install events"
ON system_install_events FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_install_events_system_id ON system_install_events(system_id);
CREATE INDEX IF NOT EXISTS idx_system_install_events_home_id ON system_install_events(home_id);