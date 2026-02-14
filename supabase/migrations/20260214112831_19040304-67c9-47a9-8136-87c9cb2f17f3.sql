-- One-time data fix: Apply ATTOM enrichment data that failed due to property_type check constraint
UPDATE public.homes SET 
  year_built = 1993,
  square_feet = 1811,
  bedrooms = 4,
  bathrooms = 2,
  property_type = 'single_family',
  folio = '3059350030070',
  folio_source = 'attom',
  year_built_effective = 1993,
  data_match_confidence = 'low',
  fips_code = '12086'
WHERE id = '715e395e-fdce-403f-aac6-78c4fc212199'
  AND year_built IS NULL;