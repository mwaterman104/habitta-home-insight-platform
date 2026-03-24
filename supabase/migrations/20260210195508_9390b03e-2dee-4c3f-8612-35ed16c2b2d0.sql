
-- Sprint 1.1: Add ATTOM-derived columns to homes table
-- All nullable, all additive. Written once during enrichment, read everywhere.

ALTER TABLE public.homes ADD COLUMN IF NOT EXISTS year_built_effective INTEGER;
ALTER TABLE public.homes ADD COLUMN IF NOT EXISTS build_quality TEXT;
ALTER TABLE public.homes ADD COLUMN IF NOT EXISTS arch_style TEXT;
ALTER TABLE public.homes ADD COLUMN IF NOT EXISTS data_match_confidence TEXT;
ALTER TABLE public.homes ADD COLUMN IF NOT EXISTS fips_code TEXT;
ALTER TABLE public.homes ADD COLUMN IF NOT EXISTS gross_sqft INTEGER;
ALTER TABLE public.homes ADD COLUMN IF NOT EXISTS rooms_total INTEGER;
ALTER TABLE public.homes ADD COLUMN IF NOT EXISTS ground_floor_sqft INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN public.homes.year_built_effective IS 'ATTOM yearBuiltEffective - reflects major renovations, used as primary age anchor';
COMMENT ON COLUMN public.homes.build_quality IS 'ATTOM bldgQuality normalized to A/B/C/D - used as lifespan degradation modifier';
COMMENT ON COLUMN public.homes.data_match_confidence IS 'Derived from ATTOM matchCode: high/medium/low - behavioral gating only, never displayed';
COMMENT ON COLUMN public.homes.fips_code IS 'FIPS county code from ATTOM - used for climate precision, never surfaced to users';
