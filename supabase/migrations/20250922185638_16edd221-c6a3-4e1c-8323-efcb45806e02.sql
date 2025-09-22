-- Create tables for migrating mock data to real database

-- User profiles (enhanced from existing profiles table)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS house_photo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS year_purchased INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS square_feet INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bedrooms INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bathrooms NUMERIC;

-- Lifestyle metrics for users
CREATE TABLE public.lifestyle_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  home_id UUID REFERENCES public.homes(id) ON DELETE CASCADE,
  energy_wellness_score INTEGER DEFAULT 85,
  energy_neighborhood_avg INTEGER DEFAULT 73,
  monthly_savings NUMERIC DEFAULT 195,
  energy_trend TEXT DEFAULT 'improving',
  comfort_rating TEXT DEFAULT 'Excellent',
  temperature_stability TEXT DEFAULT '±2°F',
  air_quality TEXT DEFAULT 'Good',
  comfort_summary TEXT DEFAULT 'Perfect for home office',
  outdoor_readiness_status TEXT DEFAULT 'Ready',
  outdoor_systems TEXT[] DEFAULT ARRAY['roof', 'gutters', 'irrigation'],
  seasonal_note TEXT DEFAULT 'All systems optimized',
  safety_score INTEGER DEFAULT 95,
  safety_status TEXT DEFAULT 'High',
  safety_summary TEXT DEFAULT 'Full confidence',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Energy comparison data (neighborhood vs user)
CREATE TABLE public.energy_comparison (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  home_id UUID REFERENCES public.homes(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: "2024-01"
  user_usage NUMERIC NOT NULL, -- kWh or cost
  neighborhood_avg NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Partner offers and opportunities
CREATE TABLE public.partner_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_name TEXT NOT NULL,
  offer_type TEXT NOT NULL, -- 'energy_rebate', 'home_improvement', 'financing', etc.
  trigger_condition TEXT, -- What qualifies the user
  title TEXT NOT NULL,
  description TEXT,
  value NUMERIC,
  value_unit TEXT, -- 'usd', 'percent', 'consultation'
  expiry_date DATE,
  is_qualified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User partner offer eligibility
CREATE TABLE public.user_partner_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.partner_offers(id) ON DELETE CASCADE,
  is_qualified BOOLEAN DEFAULT false,
  qualified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, offer_id)
);

-- Seasonal experiences and messaging
CREATE TABLE public.seasonal_experiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season TEXT NOT NULL, -- 'spring', 'summer', 'fall', 'winter'
  trigger_conditions TEXT[], -- Array of trigger conditions
  title TEXT NOT NULL,
  message TEXT,
  bullets TEXT[],
  primary_cta_text TEXT,
  primary_cta_route TEXT,
  secondary_cta_text TEXT,
  secondary_cta_action TEXT,
  imagery TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- DIY guides and instructions
CREATE TABLE public.diy_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  match_keywords TEXT[], -- For search/categorization
  title TEXT NOT NULL,
  safety_precautions TEXT[],
  required_tools TEXT[],
  required_parts TEXT[],
  steps TEXT[], -- Array of step instructions
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Neighborhood benchmark data
CREATE TABLE public.neighborhood_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zipcode TEXT,
  region TEXT,
  metric_name TEXT NOT NULL,
  metric_unit TEXT NOT NULL, -- 'score', 'years', 'usd', 'gallons'
  neighborhood_avg NUMERIC NOT NULL,
  lower_is_better BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User benchmark comparisons
CREATE TABLE public.user_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  benchmark_id UUID NOT NULL REFERENCES public.neighborhood_benchmarks(id) ON DELETE CASCADE,
  user_value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, benchmark_id)
);

-- Cost impact model data
CREATE TABLE public.cost_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  baseline_monthly_cost NUMERIC DEFAULT 150,
  global_multiplier NUMERIC DEFAULT 0.08,
  category_multipliers JSONB, -- Store category-specific multipliers
  delay_scenarios JSONB, -- Store delay scenario data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.lifestyle_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_comparison ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_partner_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diy_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhood_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lifestyle_metrics
CREATE POLICY "Users can view own lifestyle metrics" ON public.lifestyle_metrics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lifestyle metrics" ON public.lifestyle_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lifestyle metrics" ON public.lifestyle_metrics
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for energy_comparison
CREATE POLICY "Users can view own energy comparison" ON public.energy_comparison
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own energy comparison" ON public.energy_comparison
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own energy comparison" ON public.energy_comparison
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for partner_offers (public read)
CREATE POLICY "Anyone can view partner offers" ON public.partner_offers
  FOR SELECT USING (true);

-- RLS Policies for user_partner_offers
CREATE POLICY "Users can view own partner offer eligibility" ON public.user_partner_offers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own partner offer eligibility" ON public.user_partner_offers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own partner offer eligibility" ON public.user_partner_offers
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for seasonal_experiences (public read)
CREATE POLICY "Anyone can view seasonal experiences" ON public.seasonal_experiences
  FOR SELECT USING (true);

-- RLS Policies for diy_guides (public read)
CREATE POLICY "Anyone can view DIY guides" ON public.diy_guides
  FOR SELECT USING (true);

-- RLS Policies for neighborhood_benchmarks (public read)
CREATE POLICY "Anyone can view neighborhood benchmarks" ON public.neighborhood_benchmarks
  FOR SELECT USING (true);

-- RLS Policies for user_benchmarks
CREATE POLICY "Users can view own benchmarks" ON public.user_benchmarks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own benchmarks" ON public.user_benchmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own benchmarks" ON public.user_benchmarks
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for cost_models (public read)
CREATE POLICY "Anyone can view cost models" ON public.cost_models
  FOR SELECT USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_lifestyle_metrics_updated_at
  BEFORE UPDATE ON public.lifestyle_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_benchmarks_updated_at
  BEFORE UPDATE ON public.user_benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_offers_updated_at
  BEFORE UPDATE ON public.partner_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_diy_guides_updated_at
  BEFORE UPDATE ON public.diy_guides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();