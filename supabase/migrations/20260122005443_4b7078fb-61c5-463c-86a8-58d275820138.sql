-- Add folio columns to homes table for parcel-based permit discovery
ALTER TABLE homes ADD COLUMN IF NOT EXISTS folio TEXT;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS folio_source TEXT;

-- Index for efficient folio lookups
CREATE INDEX IF NOT EXISTS idx_homes_folio ON homes(folio) WHERE folio IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN homes.folio IS 'Normalized parcel identifier (digits only, no dashes/spaces)';
COMMENT ON COLUMN homes.folio_source IS 'Origin of folio data: attom, user, or county';