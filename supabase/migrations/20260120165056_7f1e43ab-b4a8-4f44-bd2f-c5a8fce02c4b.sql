-- Add columns to homes table for Miami onboarding
ALTER TABLE homes ADD COLUMN IF NOT EXISTS place_id TEXT;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS pulse_status TEXT DEFAULT 'initializing';

-- Create property_address_source table (provenance tracking)
CREATE TABLE IF NOT EXISTS property_address_source (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID REFERENCES homes(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'google_places'
  raw_address TEXT NOT NULL,
  place_id TEXT,
  components JSONB,
  geometry JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create property_snapshot table (instant inferred data)
CREATE TABLE IF NOT EXISTS property_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID REFERENCES homes(id) ON DELETE CASCADE UNIQUE,
  year_built INTEGER,
  square_feet INTEGER,
  roof_type TEXT,
  roof_age_band TEXT, -- '0-5' | '5-10' | '10-20' | '20+'
  cooling_type TEXT DEFAULT 'central_ac',
  climate_stress TEXT DEFAULT 'high', -- Miami = high
  confidence_score INTEGER DEFAULT 35,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE property_address_source ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_snapshot ENABLE ROW LEVEL SECURITY;

-- RLS policies for property_address_source (users access their own home's data)
CREATE POLICY "Users can view their own home address source" 
ON property_address_source FOR SELECT 
USING (home_id IN (SELECT id FROM homes WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own home address source" 
ON property_address_source FOR INSERT 
WITH CHECK (home_id IN (SELECT id FROM homes WHERE user_id = auth.uid()));

-- RLS policies for property_snapshot
CREATE POLICY "Users can view their own home snapshot" 
ON property_snapshot FOR SELECT 
USING (home_id IN (SELECT id FROM homes WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own home snapshot" 
ON property_snapshot FOR INSERT 
WITH CHECK (home_id IN (SELECT id FROM homes WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own home snapshot" 
ON property_snapshot FOR UPDATE 
USING (home_id IN (SELECT id FROM homes WHERE user_id = auth.uid()));

-- Service role policies for edge functions
CREATE POLICY "Service role can manage property_address_source" 
ON property_address_source FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role can manage property_snapshot" 
ON property_snapshot FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_property_snapshot_home_id ON property_snapshot(home_id);
CREATE INDEX IF NOT EXISTS idx_property_address_source_home_id ON property_address_source(home_id);
CREATE INDEX IF NOT EXISTS idx_homes_pulse_status ON homes(pulse_status);