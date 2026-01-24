-- Add geo tracking columns to homes table for audit trail
ALTER TABLE public.homes 
ADD COLUMN IF NOT EXISTS geo_source text,
ADD COLUMN IF NOT EXISTS geo_updated_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.homes.geo_source IS 'Source of geocoding: smarty_backfill, onboarding, attom, etc.';
COMMENT ON COLUMN public.homes.geo_updated_at IS 'Timestamp when coordinates were last updated';