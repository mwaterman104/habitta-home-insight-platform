-- Phase 1: Core Property and System Infrastructure

-- 1) Canonical properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  county TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  year_built INTEGER,
  lot_size_sqft INTEGER,
  livable_sqft INTEGER,
  parcel_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Properties RLS policies
CREATE POLICY "Users can view their linked properties" 
ON public.properties 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.homes 
  WHERE homes.property_id = properties.id 
  AND homes.user_id = auth.uid()
));

-- 2) System catalog (reference data)
CREATE TABLE IF NOT EXISTS public.system_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  typical_lifespan_years INTEGER NOT NULL,
  cost_low INTEGER,
  cost_high INTEGER,
  risk_weights JSONB DEFAULT '{}'::jsonb,
  maintenance_checks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for system catalog (public read)
ALTER TABLE public.system_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view system catalog" 
ON public.system_catalog 
FOR SELECT 
USING (true);

-- 3) Home systems (user's installed systems)
CREATE TABLE IF NOT EXISTS public.home_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  system_key TEXT NOT NULL REFERENCES public.system_catalog(key),
  brand TEXT,
  model TEXT,
  install_date DATE,
  last_service_date DATE,
  expected_lifespan_years INTEGER,
  notes TEXT,
  source JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(home_id, system_key)
);

-- Enable RLS
ALTER TABLE public.home_systems ENABLE ROW LEVEL SECURITY;

-- Home systems RLS policies
CREATE POLICY "Users can view their own home systems" 
ON public.home_systems 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.homes 
  WHERE homes.id = home_systems.home_id 
  AND homes.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own home systems" 
ON public.home_systems 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.homes 
  WHERE homes.id = home_systems.home_id 
  AND homes.user_id = auth.uid()
));

CREATE POLICY "Users can update their own home systems" 
ON public.home_systems 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.homes 
  WHERE homes.id = home_systems.home_id 
  AND homes.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own home systems" 
ON public.home_systems 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.homes 
  WHERE homes.id = home_systems.home_id 
  AND homes.user_id = auth.uid()
));

-- 4) System predictions
CREATE TABLE IF NOT EXISTS public.system_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_system_id UUID NOT NULL REFERENCES public.home_systems(id) ON DELETE CASCADE,
  forecast_run_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  predicted_replace_date DATE,
  predicted_cost_mean INTEGER,
  predicted_cost_low INTEGER,
  predicted_cost_high INTEGER,
  confidence NUMERIC,
  risk_factors JSONB,
  maintenance_actions JSONB,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.system_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own system predictions" 
ON public.system_predictions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.home_systems 
  JOIN public.homes ON homes.id = home_systems.home_id
  WHERE home_systems.id = system_predictions.home_system_id 
  AND homes.user_id = auth.uid()
));

-- 5) Maintenance events
CREATE TABLE IF NOT EXISTS public.maintenance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_system_id UUID NOT NULL REFERENCES public.home_systems(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL,
  vendor TEXT,
  cost INTEGER,
  description TEXT,
  source JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own maintenance events" 
ON public.maintenance_events 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.home_systems 
  JOIN public.homes ON homes.id = home_systems.home_id
  WHERE home_systems.id = maintenance_events.home_system_id 
  AND homes.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own maintenance events" 
ON public.maintenance_events 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.home_systems 
  JOIN public.homes ON homes.id = home_systems.home_id
  WHERE home_systems.id = maintenance_events.home_system_id 
  AND homes.user_id = auth.uid()
));

-- 6) Appliance catalog
CREATE TABLE IF NOT EXISTS public.appliance_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  typical_lifespan_years INTEGER NOT NULL,
  cost_low INTEGER,
  cost_high INTEGER,
  maintenance_checks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appliance_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view appliance catalog" 
ON public.appliance_catalog 
FOR SELECT 
USING (true);

-- Insert seed data for system catalog
INSERT INTO public.system_catalog (key, display_name, typical_lifespan_years, cost_low, cost_high, risk_weights, maintenance_checks)
VALUES
('hvac','HVAC System',15,7000,12000,'{"age":0.5,"humidity":0.2,"storm":0.2,"permit_absence":0.1}','["Change filter quarterly","Coil clean annually","Pre-summer tune-up"]'),
('water_heater','Water Heater',12,1200,2500,'{"age":0.6,"water_hardness":0.2,"permit_absence":0.2}','["Flush tank annually","Anode check biannually"]'),
('roof','Roof',25,12000,18000,'{"age":0.5,"storm":0.3,"humidity":0.2}','["Annual visual inspect","Post-storm inspect"]'),
('windows','Windows',20,9000,15000,'{"age":0.6,"storm":0.2,"salt_air":0.2}','["Seal/caulk inspect annually"]'),
('flooring','Flooring',30,6000,10000,'{"age":0.7,"humidity":0.3}','["Refinish/repair as needed"]'),
('appliances','Major Appliances',11,4000,7000,'{"age":0.7,"usage":0.3}','["Clean lint/vents","Gasket care"]'),
('electrical','Electrical System',40,2500,4500,'{"age":0.4,"code_changes":0.3,"storm":0.3}','["Panel inspect 5y"]'),
('plumbing','Plumbing System',50,2000,4000,'{"age":0.4,"water_hardness":0.4,"freeze":0.2}','["Leak check annually","Valve exercise annually"]')
ON CONFLICT (key) DO NOTHING;

-- Insert seed data for appliance catalog
INSERT INTO public.appliance_catalog (type_key, display_name, typical_lifespan_years, cost_low, cost_high, maintenance_checks)
VALUES
('refrigerator','Refrigerator',13,900,2500,'["Clean condenser coils annually","Replace water filter every 6 months"]'),
('dishwasher','Dishwasher',10,500,1200,'["Clean filter monthly","Run descaler quarterly in hard water"]'),
('range','Range / Oven',15,700,2200,'["Inspect seals annually","Clean burners"]'),
('microwave','Microwave',9,150,500,'["Clean grease filter quarterly"]'),
('washer','Washing Machine',11,600,1200,'["Clean drain filter quarterly","Descale quarterly in hard water"]'),
('dryer','Dryer',12,600,1200,'["Clean lint after each use","Deep clean vent annually"]'),
('water_softener','Water Softener',12,800,1800,'["Salt level checks monthly","Resin clean annually"]')
ON CONFLICT (type_key) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_home_systems_home_id ON public.home_systems(home_id);
CREATE INDEX IF NOT EXISTS idx_system_predictions_home_system_id ON public.system_predictions(home_system_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_events_home_system_id ON public.maintenance_events(home_system_id);

-- Add property_id to homes table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='homes' AND column_name='property_id') THEN
    ALTER TABLE public.homes ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;
    CREATE INDEX idx_homes_property_id ON public.homes(property_id);
  END IF;
END $$;