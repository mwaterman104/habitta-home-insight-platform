-- Add field_provenance as top-level column (not nested in source)
ALTER TABLE home_systems
ADD COLUMN IF NOT EXISTS field_provenance jsonb DEFAULT '{}'::jsonb;

-- Add convenience column for overall confidence score
ALTER TABLE home_systems
ADD COLUMN IF NOT EXISTS confidence_score numeric DEFAULT 0;

-- Add last_updated_at for audit
ALTER TABLE home_systems
ADD COLUMN IF NOT EXISTS last_updated_at timestamptz DEFAULT now();

-- Comment for clarity
COMMENT ON COLUMN home_systems.field_provenance IS 
  'Canonical field-level provenance. Each key (brand, model, etc.) maps to {source, confidence, updated_at}. 
   This is the ONLY location for provenance data - do not use source.field_provenance.';