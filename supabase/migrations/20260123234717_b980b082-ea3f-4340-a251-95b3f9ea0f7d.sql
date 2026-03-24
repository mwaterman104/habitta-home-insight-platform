-- Add appliance tier columns to system_catalog
ALTER TABLE public.system_catalog
ADD COLUMN IF NOT EXISTS appliance_tier INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS health_weight_cap DECIMAL(3,2) DEFAULT 1.0;

-- Ensure existing structural systems are Tier 0
UPDATE public.system_catalog SET appliance_tier = 0, health_weight_cap = 1.0
WHERE key IN ('hvac', 'roof', 'water_heater', 'electrical', 'plumbing', 'windows', 'flooring');

-- Add Tier 1 Critical Appliances
INSERT INTO public.system_catalog 
(key, display_name, typical_lifespan_years, cost_low, cost_high, risk_weights, maintenance_checks, appliance_tier, health_weight_cap)
VALUES
('refrigerator', 'Refrigerator', 12, 1000, 4000, '{"age":0.5,"usage":0.3}', '["Clean coils annually","Check door seals"]', 1, 1.0),
('oven_range', 'Oven/Range', 15, 800, 3500, '{"age":0.6,"usage":0.3}', '["Clean regularly","Check burners annually"]', 1, 1.0),
('dishwasher', 'Dishwasher', 10, 400, 1200, '{"age":0.6}', '["Clean filter monthly","Check spray arms"]', 1, 1.0),
('washer', 'Washing Machine', 10, 500, 1500, '{"age":0.5,"usage":0.4}', '["Clean drum monthly","Check hoses"]', 1, 1.0),
('dryer', 'Dryer', 13, 400, 1200, '{"age":0.5,"usage":0.3}', '["Clean lint trap","Vent cleaning annually"]', 1, 1.0)
ON CONFLICT (key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  typical_lifespan_years = EXCLUDED.typical_lifespan_years,
  cost_low = EXCLUDED.cost_low,
  cost_high = EXCLUDED.cost_high,
  risk_weights = EXCLUDED.risk_weights,
  maintenance_checks = EXCLUDED.maintenance_checks,
  appliance_tier = EXCLUDED.appliance_tier,
  health_weight_cap = EXCLUDED.health_weight_cap;

-- Add Tier 2 Contextual Appliances (no health impact)
INSERT INTO public.system_catalog 
(key, display_name, typical_lifespan_years, cost_low, cost_high, risk_weights, maintenance_checks, appliance_tier, health_weight_cap)
VALUES
('microwave', 'Microwave', 9, 150, 600, '{"age":0.7}', '["Clean interior regularly"]', 2, 0.0),
('garbage_disposal', 'Garbage Disposal', 10, 100, 400, '{"age":0.6}', '["Run with cold water","Avoid fibrous foods"]', 2, 0.0),
('wine_cooler', 'Wine Cooler', 10, 300, 2000, '{"age":0.5}', '["Clean condenser annually"]', 2, 0.0)
ON CONFLICT (key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  typical_lifespan_years = EXCLUDED.typical_lifespan_years,
  cost_low = EXCLUDED.cost_low,
  cost_high = EXCLUDED.cost_high,
  risk_weights = EXCLUDED.risk_weights,
  maintenance_checks = EXCLUDED.maintenance_checks,
  appliance_tier = EXCLUDED.appliance_tier,
  health_weight_cap = EXCLUDED.health_weight_cap;