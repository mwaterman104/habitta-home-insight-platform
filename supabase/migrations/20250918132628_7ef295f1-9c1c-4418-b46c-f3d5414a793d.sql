-- Phase 1: Enhanced Prediction Engine - Lifespan Reference and Climate Factors
-- Create lifespan_reference table with climate-specific data
CREATE TABLE public.lifespan_reference (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_type TEXT NOT NULL,
  system_subtype TEXT,
  climate_zone TEXT NOT NULL DEFAULT 'default',
  min_years INTEGER NOT NULL,
  max_years INTEGER NOT NULL,
  typical_years INTEGER NOT NULL,
  quality_tier TEXT DEFAULT 'standard', -- builder-grade, standard, premium
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lifespan_reference ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing lifespan reference data
CREATE POLICY "Anyone can view lifespan reference data" 
ON public.lifespan_reference 
FOR SELECT 
USING (true);

-- Create climate_factors table for regional multipliers
CREATE TABLE public.climate_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  climate_zone TEXT NOT NULL,
  factor_type TEXT NOT NULL, -- salt_air, freeze_thaw, uv_index, humidity, wind_hail
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.climate_factors ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing climate factors
CREATE POLICY "Anyone can view climate factors" 
ON public.climate_factors 
FOR SELECT 
USING (true);

-- Insert Florida-specific lifespan data
INSERT INTO public.lifespan_reference (system_type, system_subtype, climate_zone, min_years, max_years, typical_years, quality_tier) VALUES
-- Roof systems (Florida has harsh conditions)
('roof', 'tile', 'florida', 28, 35, 30, 'standard'),
('roof', 'shingle', 'florida', 12, 18, 15, 'standard'),
('roof', 'metal', 'florida', 30, 45, 35, 'standard'),
('roof', 'tile', 'default', 35, 50, 40, 'standard'),
('roof', 'shingle', 'default', 20, 30, 25, 'standard'),
('roof', 'metal', 'default', 40, 60, 50, 'standard'),

-- HVAC systems (Florida heat stress)
('hvac', 'central_air', 'florida', 10, 14, 12, 'standard'),
('hvac', 'heat_pump', 'florida', 8, 12, 10, 'standard'),
('hvac', 'packaged_unit', 'florida', 10, 15, 12, 'standard'),
('hvac', 'central_air', 'default', 12, 17, 15, 'standard'),
('hvac', 'heat_pump', 'default', 10, 15, 12, 'standard'),
('hvac', 'packaged_unit', 'default', 15, 20, 18, 'standard'),

-- Water heaters (Florida water conditions)
('water_heater', 'tank_electric', 'florida', 8, 12, 10, 'standard'),
('water_heater', 'tank_gas', 'florida', 8, 12, 10, 'standard'),
('water_heater', 'tankless', 'florida', 18, 25, 20, 'standard'),
('water_heater', 'tank_electric', 'default', 10, 15, 12, 'standard'),
('water_heater', 'tank_gas', 'default', 10, 15, 12, 'standard'),
('water_heater', 'tankless', 'default', 20, 30, 25, 'standard'),

-- Appliances
('appliance', 'refrigerator', 'florida', 10, 15, 12, 'standard'),
('appliance', 'dishwasher', 'florida', 8, 12, 10, 'standard'),
('appliance', 'washer', 'florida', 8, 12, 10, 'standard'),
('appliance', 'dryer', 'florida', 8, 12, 10, 'standard'),
('appliance', 'refrigerator', 'default', 12, 18, 15, 'standard'),
('appliance', 'dishwasher', 'default', 10, 15, 12, 'standard'),
('appliance', 'washer', 'default', 10, 15, 12, 'standard'),
('appliance', 'dryer', 'default', 10, 15, 12, 'standard');

-- Insert climate factors for Florida
INSERT INTO public.climate_factors (climate_zone, factor_type, multiplier, description) VALUES
('florida', 'salt_air', 0.90, 'Salt air reduces lifespan by 10%'),
('florida', 'uv_index', 0.85, 'High UV exposure reduces roof/exterior lifespan by 15%'),
('florida', 'humidity', 0.95, 'High humidity slightly reduces lifespan by 5%'),
('florida', 'wind_hail', 0.90, 'Hurricane/wind damage risk reduces expected lifespan by 10%'),
('default', 'salt_air', 1.00, 'No salt air impact'),
('default', 'uv_index', 1.00, 'Standard UV exposure'),
('default', 'humidity', 1.00, 'Standard humidity'),
('default', 'wind_hail', 1.00, 'Standard wind/hail risk');

-- Create indexes for performance
CREATE INDEX idx_lifespan_reference_system_climate ON public.lifespan_reference(system_type, climate_zone);
CREATE INDEX idx_climate_factors_zone_type ON public.climate_factors(climate_zone, factor_type);