-- Fix search path for the canonical hash function
CREATE OR REPLACE FUNCTION public.compute_canonical_hash(
  line1 text,
  city text, 
  state text,
  postal_code text
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
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