-- Core tables for AI predictions (create only if not exists)

-- 1) System catalog (reference data)
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

-- 2) Home systems (user's installed systems)
CREATE TABLE IF NOT EXISTS public.home_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  system_key TEXT NOT NULL,
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

-- 3) System predictions
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

-- Enable RLS on new tables
ALTER TABLE public.system_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_systems ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.system_predictions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (create only if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_catalog' AND policyname = 'Anyone can view system catalog') THEN
    CREATE POLICY "Anyone can view system catalog" ON public.system_catalog FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'home_systems' AND policyname = 'Users can manage their own home systems') THEN
    CREATE POLICY "Users can manage their own home systems" ON public.home_systems FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.homes WHERE homes.id = home_systems.home_id AND homes.user_id = auth.uid()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_predictions' AND policyname = 'Users can view their own system predictions') THEN
    CREATE POLICY "Users can view their own system predictions" ON public.system_predictions FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.home_systems JOIN public.homes ON homes.id = home_systems.home_id
                   WHERE home_systems.id = system_predictions.home_system_id AND homes.user_id = auth.uid()));
  END IF;
END $$;

-- Insert seed data for system catalog
INSERT INTO public.system_catalog (key, display_name, typical_lifespan_years, cost_low, cost_high, risk_weights, maintenance_checks)
VALUES
('hvac','HVAC System',15,7000,12000,'{"age":0.5,"humidity":0.2,"storm":0.2}','["Change filter quarterly","Coil clean annually","Pre-summer tune-up"]'),
('water_heater','Water Heater',12,1200,2500,'{"age":0.6,"water_hardness":0.2}','["Flush tank annually","Anode check biannually"]'),
('roof','Roof',25,12000,18000,'{"age":0.5,"storm":0.3,"humidity":0.2}','["Annual visual inspect","Post-storm inspect"]'),
('windows','Windows',20,9000,15000,'{"age":0.6,"storm":0.2}','["Seal/caulk inspect annually"]'),
('flooring','Flooring',30,6000,10000,'{"age":0.7,"humidity":0.3}','["Refinish/repair as needed"]'),
('electrical','Electrical System',40,2500,4500,'{"age":0.4,"code_changes":0.3}','["Panel inspect 5y"]'),
('plumbing','Plumbing System',50,2000,4000,'{"age":0.4,"water_hardness":0.4}','["Leak check annually","Valve exercise annually"]')
ON CONFLICT (key) DO NOTHING;