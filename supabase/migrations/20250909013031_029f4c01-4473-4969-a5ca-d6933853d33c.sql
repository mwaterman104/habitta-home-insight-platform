-- Create systems table for tracking home systems (HVAC, ROOF, WATER_HEATER, etc.)
CREATE TABLE public.systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  home_id UUID NOT NULL,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL, -- 'ROOF', 'HVAC', 'WATER_HEATER', 'ELECTRICAL', 'PLUMBING'
  install_year INTEGER,
  install_source TEXT, -- 'permit', 'user', 'inferred'
  status TEXT NOT NULL DEFAULT 'UNKNOWN', -- 'OK', 'WATCH', 'EOL', 'UNKNOWN'
  confidence NUMERIC DEFAULT 0.5,
  material TEXT, -- roof material, HVAC type, etc.
  notes TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;

-- Create policies for systems
CREATE POLICY "Users can view their own systems" 
ON public.systems 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own systems" 
ON public.systems 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own systems" 
ON public.systems 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own systems" 
ON public.systems 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create plan_cards table for user-facing recommendations
CREATE TABLE public.plan_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  home_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'LATER', -- 'NOW', 'SOON', 'LATER'
  category TEXT, -- 'maintenance', 'upgrade', 'inspection'
  system_kind TEXT, -- links to systems.kind
  estimated_cost_min NUMERIC,
  estimated_cost_max NUMERIC,
  rationale TEXT,
  is_completed BOOLEAN DEFAULT false,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for plan_cards
CREATE POLICY "Users can view their own plan cards" 
ON public.plan_cards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plan cards" 
ON public.plan_cards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plan cards" 
ON public.plan_cards 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plan cards" 
ON public.plan_cards 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add confidence and status columns to homes table
ALTER TABLE public.homes 
ADD COLUMN IF NOT EXISTS confidence NUMERIC DEFAULT 0.3,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'enriching';

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_systems_updated_at
BEFORE UPDATE ON public.systems
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plan_cards_updated_at
BEFORE UPDATE ON public.plan_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();