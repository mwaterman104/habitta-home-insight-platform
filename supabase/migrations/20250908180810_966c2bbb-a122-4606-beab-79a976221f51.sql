-- Create addresses table for canonical address storage
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  dpv_match text,
  carrier_route text,
  congressional_district text,
  raw jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create address_geocode table for rooftop geocoding
CREATE TABLE IF NOT EXISTS address_geocode (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id uuid REFERENCES addresses(id) ON DELETE CASCADE,
  latitude double precision,
  longitude double precision,
  precision text,
  raw jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create property_enrichment table for Smarty enrichment data
CREATE TABLE IF NOT EXISTS property_enrichment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id uuid REFERENCES addresses(id) ON DELETE CASCADE,
  attributes jsonb,      -- normalized subset used in UI (year_built, sqft, beds, baths, lot_size, last_sale, etc.)
  raw jsonb,             -- full Smarty enrichment payload
  refreshed_at timestamptz DEFAULT now()
);

-- Add address_id to homes table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homes' AND column_name = 'address_id') THEN
    ALTER TABLE homes ADD COLUMN address_id uuid REFERENCES addresses(id);
  END IF;
END $$;

-- Add latitude and longitude to homes for quick map queries if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homes' AND column_name = 'latitude') THEN
    ALTER TABLE homes ADD COLUMN latitude double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homes' AND column_name = 'longitude') THEN
    ALTER TABLE homes ADD COLUMN longitude double precision;
  END IF;
END $$;

-- Enable RLS on all new tables
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE address_geocode ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_enrichment ENABLE ROW LEVEL SECURITY;

-- RLS policies for addresses
CREATE POLICY "Users can view own addresses" ON addresses
FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can insert own addresses" ON addresses
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own addresses" ON addresses
FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own addresses" ON addresses
FOR DELETE USING (created_by = auth.uid());

-- RLS policies for address_geocode
CREATE POLICY "Users can view geocode for their addresses" ON address_geocode
FOR SELECT USING (EXISTS (
  SELECT 1 FROM addresses 
  WHERE addresses.id = address_geocode.address_id 
  AND addresses.created_by = auth.uid()
));

CREATE POLICY "Users can insert geocode for their addresses" ON address_geocode
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM addresses 
  WHERE addresses.id = address_geocode.address_id 
  AND addresses.created_by = auth.uid()
));

CREATE POLICY "Users can update geocode for their addresses" ON address_geocode
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM addresses 
  WHERE addresses.id = address_geocode.address_id 
  AND addresses.created_by = auth.uid()
));

CREATE POLICY "Users can delete geocode for their addresses" ON address_geocode
FOR DELETE USING (EXISTS (
  SELECT 1 FROM addresses 
  WHERE addresses.id = address_geocode.address_id 
  AND addresses.created_by = auth.uid()
));

-- RLS policies for property_enrichment
CREATE POLICY "Users can view enrichment for their addresses" ON property_enrichment
FOR SELECT USING (EXISTS (
  SELECT 1 FROM addresses 
  WHERE addresses.id = property_enrichment.address_id 
  AND addresses.created_by = auth.uid()
));

CREATE POLICY "Users can insert enrichment for their addresses" ON property_enrichment
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM addresses 
  WHERE addresses.id = property_enrichment.address_id 
  AND addresses.created_by = auth.uid()
));

CREATE POLICY "Users can update enrichment for their addresses" ON property_enrichment
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM addresses 
  WHERE addresses.id = property_enrichment.address_id 
  AND addresses.created_by = auth.uid()
));

CREATE POLICY "Users can delete enrichment for their addresses" ON property_enrichment
FOR DELETE USING (EXISTS (
  SELECT 1 FROM addresses 
  WHERE addresses.id = property_enrichment.address_id 
  AND addresses.created_by = auth.uid()
));

-- Create trigger to update updated_at on addresses
CREATE OR REPLACE FUNCTION update_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_addresses_updated_at();