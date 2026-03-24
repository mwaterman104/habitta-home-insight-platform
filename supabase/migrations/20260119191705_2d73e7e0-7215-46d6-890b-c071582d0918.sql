-- Add composite index for fast risk delta lookups (Phase 0)
-- Optimizes the query pattern: WHERE home_id = ? AND event_type = 'maintenance_completed' ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS idx_system_events_home_type_date 
ON public.habitta_system_events(home_id, event_type, created_at DESC);

-- GIN index for efficient JSONB metadata queries (querying nested fields like risk_delta)
CREATE INDEX IF NOT EXISTS idx_system_events_metadata_gin 
ON public.habitta_system_events USING GIN (metadata jsonb_path_ops);