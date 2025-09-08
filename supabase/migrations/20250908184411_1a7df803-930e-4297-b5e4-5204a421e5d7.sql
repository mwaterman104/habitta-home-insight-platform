-- Add canonical hash column and constraints for address deduplication
ALTER TABLE public.addresses 
ADD COLUMN IF NOT EXISTS canonical_hash text;

-- Create unique constraint on user + canonical hash
CREATE UNIQUE INDEX IF NOT EXISTS addresses_user_hash_unique 
ON public.addresses(created_by, canonical_hash) 
WHERE canonical_hash IS NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enrichment_address_id 
ON public.property_enrichment(address_id);

CREATE INDEX IF NOT EXISTS idx_geocode_address_id 
ON public.address_geocode(address_id);

-- Create function to compute canonical hash
CREATE OR REPLACE FUNCTION public.compute_canonical_hash(
  line1 text,
  city text, 
  state text,
  postal_code text
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN encode(sha256(
    (COALESCE(UPPER(TRIM(line1)), '') || '|' ||
     COALESCE(UPPER(TRIM(city)), '') || '|' ||
     COALESCE(UPPER(TRIM(state)), '') || '|' ||
     COALESCE(TRIM(split_part(postal_code, '-', 1)), ''))::bytea
  ), 'hex');
END;
$$;