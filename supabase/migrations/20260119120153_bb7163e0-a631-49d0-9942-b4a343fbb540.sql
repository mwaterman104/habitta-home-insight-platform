-- Phase 1: Risk Delta Tracking Migration

-- Add 'app' to event_source enum for user-initiated events
ALTER TYPE event_source ADD VALUE IF NOT EXISTS 'app';

-- Add 'maintenance_completed' and 'delta_capture_failed' to event_type enum
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'maintenance_completed';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'delta_capture_failed';

-- Create RPC function for safe metadata append (solves SQL syntax issue)
CREATE OR REPLACE FUNCTION append_event_metadata(
  p_home_id uuid,
  p_system_type system_category,
  p_new_data jsonb
) RETURNS void AS $$
DECLARE
  v_event_id uuid;
BEGIN
  -- Get most recent maintenance_completed event for this home/system
  SELECT id INTO v_event_id
  FROM habitta_system_events
  WHERE home_id = p_home_id
    AND system_type = p_system_type
    AND event_type = 'maintenance_completed'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Update with new metadata (appends to existing)
  IF v_event_id IS NOT NULL THEN
    UPDATE habitta_system_events
    SET metadata = COALESCE(metadata, '{}'::jsonb) || p_new_data,
        updated_at = now()
    WHERE id = v_event_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION append_event_metadata TO authenticated;