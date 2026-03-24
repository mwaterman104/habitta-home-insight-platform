-- Add missing tables for home profile functionality

-- Link homes to properties (ensure property_id exists)
ALTER TABLE homes ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id);

-- Create maintenance_signals table for condition scoring
CREATE TABLE IF NOT EXISTS maintenance_signals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL,
  signal text NOT NULL, -- 'condition_score', 'tlc', etc.
  value numeric NOT NULL,
  confidence numeric DEFAULT 0.8,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for maintenance_signals
ALTER TABLE maintenance_signals ENABLE ROW LEVEL SECURITY;

-- Create policy for maintenance_signals (accessible via property ownership)
CREATE POLICY "Users can view signals for their properties" 
ON maintenance_signals 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM homes 
  WHERE homes.property_id = maintenance_signals.property_id 
  AND homes.user_id = auth.uid()
));

-- Create valuations table for AVM data
CREATE TABLE IF NOT EXISTS valuations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES properties(id),
  avm_value numeric NOT NULL,
  avm_low numeric,
  avm_high numeric,
  confidence numeric DEFAULT 0.8,
  forecast_12mo numeric,
  valuation_date date NOT NULL DEFAULT current_date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for valuations
ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;

-- Create policy for valuations
CREATE POLICY "Users can view valuations for their properties" 
ON valuations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM homes 
  WHERE homes.property_id = valuations.property_id 
  AND homes.user_id = auth.uid()
));

-- Create renovation_items table for system recommendations
CREATE TABLE IF NOT EXISTS renovation_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES properties(id),
  system text NOT NULL, -- 'roof', 'hvac', 'plumbing', 'electrical', 'appliances'
  item_name text NOT NULL,
  description text,
  urgency integer NOT NULL DEFAULT 1, -- 1-5 scale
  estimated_cost numeric,
  priority text DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  last_service_date date,
  next_service_due date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for renovation_items
ALTER TABLE renovation_items ENABLE ROW LEVEL SECURITY;

-- Create policy for renovation_items
CREATE POLICY "Users can view renovation items for their properties" 
ON renovation_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM homes 
  WHERE homes.property_id = renovation_items.property_id 
  AND homes.user_id = auth.uid()
));

-- Insert sample data for testing (optional, can be removed in production)
INSERT INTO maintenance_signals (property_id, signal, value, confidence)
SELECT p.id, 'condition_score', 85.0, 0.9
FROM properties p
ON CONFLICT DO NOTHING;

INSERT INTO valuations (property_id, avm_value, avm_low, avm_high, confidence, forecast_12mo)
SELECT p.id, 450000, 420000, 480000, 0.85, 465000
FROM properties p  
ON CONFLICT DO NOTHING;

INSERT INTO renovation_items (property_id, system, item_name, description, urgency, estimated_cost, last_service_date, next_service_due)
SELECT p.id, 'hvac', 'HVAC Filter Replacement', 'Replace air filter for better efficiency', 2, 25, current_date - interval '30 days', current_date + interval '60 days'
FROM properties p
UNION ALL
SELECT p.id, 'roof', 'Gutter Cleaning', 'Clean gutters and downspouts', 3, 150, current_date - interval '120 days', current_date + interval '30 days'
FROM properties p
ON CONFLICT DO NOTHING;