-- System lifecycle predictions and data
CREATE TABLE system_lifecycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  system_type TEXT NOT NULL, -- 'hvac', 'roof', 'water_heater', 'electrical', 'plumbing', 'windows', 'flooring'
  brand TEXT,
  model TEXT,
  installation_date DATE,
  estimated_lifespan_years INTEGER, -- manufacturer expected lifespan
  last_maintenance_date DATE,
  maintenance_frequency_months INTEGER, -- how often maintenance should occur
  maintenance_quality_score DECIMAL DEFAULT 5.0, -- 1-10 scale based on maintenance history
  climate_zone TEXT DEFAULT 'florida_south',
  exposure_factors JSONB, -- {'humidity': 'high', 'salt_air': true, 'hurricane_risk': 'high'}
  predicted_replacement_date DATE,
  replacement_probability JSONB, -- {'1_year': 0.05, '2_year': 0.15, '3_year': 0.35, '5_year': 0.65}
  confidence_level DECIMAL, -- 0.0 to 1.0
  last_prediction_update TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cost predictions for repairs and replacements
CREATE TABLE cost_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  system_lifecycle_id UUID REFERENCES system_lifecycles(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL, -- 'repair', 'replacement', 'preventive_maintenance'
  estimated_cost_min INTEGER, -- in cents
  estimated_cost_max INTEGER, -- in cents
  confidence_level DECIMAL, -- 0.0 to 1.0
  market_factors JSONB, -- {'seasonal_multiplier': 1.2, 'material_cost_trend': 'rising', 'labor_availability': 'low'}
  cost_breakdown JSONB, -- {'materials': 5000, 'labor': 3000, 'permits': 200, 'disposal': 300}
  roi_score DECIMAL, -- for improvements, calculated ROI vs property value
  urgency_score INTEGER, -- 1-10, how urgent this work is
  valid_until DATE,
  data_sources TEXT[], -- ['homeadvisor', 'local_contractors', 'material_suppliers']
  created_at TIMESTAMP DEFAULT NOW()
);

-- Local market data for dynamic pricing
CREATE TABLE market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_key TEXT NOT NULL, -- 'palm_beach_county', '33414', 'wellington_fl'
  data_type TEXT NOT NULL, -- 'material_costs', 'labor_rates', 'permit_costs', 'contractor_availability'
  category TEXT, -- 'lumber', 'copper', 'hvac_tech', 'roofer', etc.
  data_values JSONB NOT NULL, -- flexible structure for different data types
  source TEXT NOT NULL, -- 'fred_api', 'bls_gov', 'local_survey', 'contractor_network'
  reliability_score DECIMAL DEFAULT 0.5, -- 0.0 to 1.0
  valid_from DATE,
  valid_until DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Local contractor network and ratings
CREATE TABLE local_contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_license TEXT,
  florida_license_number TEXT,
  license_type TEXT, -- 'general_contractor', 'electrical', 'plumbing', 'hvac'
  service_areas TEXT[], -- ['33414', '33415', '33462']
  service_radius_miles INTEGER DEFAULT 25,
  specialties TEXT[], -- ['hvac', 'roofing', 'plumbing', 'electrical', 'hurricane_prep']
  contact_info JSONB, -- {'phone': '', 'email': '', 'website': '', 'address': ''}
  business_hours JSONB, -- {'monday': '8-17', 'saturday': '8-12', 'emergency': true}
  ratings JSONB, -- {'overall': 4.5, 'response_time': 4.2, 'quality': 4.7, 'pricing': 4.0, 'communication': 4.8}
  review_count INTEGER DEFAULT 0,
  license_verified BOOLEAN DEFAULT false,
  license_expiration DATE,
  insurance_verified BOOLEAN DEFAULT false,
  emergency_services BOOLEAN DEFAULT false,
  hurricane_response BOOLEAN DEFAULT false, -- available for post-hurricane work
  typical_response_time_hours INTEGER,
  pricing_tier TEXT, -- 'budget', 'mid_range', 'premium'
  last_verified DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Weather alerts and climate data
CREATE TABLE weather_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_key TEXT NOT NULL, -- zip code or county
  alert_type TEXT NOT NULL, -- 'hurricane_watch', 'flood_warning', 'high_wind', 'heat_advisory'
  severity TEXT, -- 'minor', 'moderate', 'severe', 'extreme'
  title TEXT NOT NULL,
  description TEXT,
  maintenance_actions TEXT[], -- suggested actions: ['secure_outdoor_furniture', 'check_gutters', 'test_generator']
  starts_at TIMESTAMP,
  expires_at TIMESTAMP,
  source TEXT DEFAULT 'national_weather_service',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Property-specific climate and risk factors
CREATE TABLE property_climate_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  climate_zone TEXT, -- 'florida_south', 'subtropical_humid'
  hurricane_risk_level TEXT, -- 'low', 'moderate', 'high', 'extreme'
  flood_zone TEXT, -- FEMA flood zone designation
  soil_type TEXT,
  average_humidity DECIMAL,
  salt_air_exposure BOOLEAN DEFAULT false,
  prevailing_wind_direction TEXT,
  microclimate_factors JSONB, -- {'near_water': true, 'tree_coverage': 'heavy', 'sun_exposure': 'full'}
  historical_weather_events JSONB, -- record of past hurricanes, floods, etc.
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance recommendations and scheduling
CREATE TABLE smart_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  system_lifecycle_id UUID REFERENCES system_lifecycles(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL, -- 'preventive', 'seasonal', 'weather_triggered', 'cost_optimization'
  title TEXT NOT NULL,
  description TEXT,
  urgency_score INTEGER, -- 1-10
  estimated_cost_min INTEGER,
  estimated_cost_max INTEGER,
  estimated_time_hours DECIMAL,
  seasonal_timing TEXT, -- 'spring', 'before_hurricane_season', 'winter'
  weather_dependent BOOLEAN DEFAULT false,
  diy_difficulty TEXT, -- 'easy', 'moderate', 'difficult', 'professional_only'
  roi_potential DECIMAL, -- estimated return on investment
  energy_savings_potential DECIMAL, -- monthly savings estimate
  triggers JSONB, -- what caused this recommendation
  valid_until DATE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contractor project history and performance
CREATE TABLE contractor_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES local_contractors(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL,
  start_date DATE,
  completion_date DATE,
  estimated_cost INTEGER,
  actual_cost INTEGER,
  quality_rating DECIMAL, -- 1-10
  timeliness_rating DECIMAL, -- 1-10
  communication_rating DECIMAL, -- 1-10
  would_recommend BOOLEAN,
  project_notes TEXT,
  permit_required BOOLEAN,
  permit_obtained BOOLEAN,
  warranty_length_months INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_system_lifecycles_property ON system_lifecycles(property_id);
CREATE INDEX idx_system_lifecycles_type ON system_lifecycles(system_type);
CREATE INDEX idx_cost_predictions_property ON cost_predictions(property_id);
CREATE INDEX idx_market_data_location ON market_data(location_key, data_type);
CREATE INDEX idx_contractors_location ON local_contractors USING GIN(service_areas);
CREATE INDEX idx_contractors_specialty ON local_contractors USING GIN(specialties);
CREATE INDEX idx_weather_alerts_location ON weather_alerts(location_key, is_active);

-- Add RLS policies
ALTER TABLE system_lifecycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_climate_data ENABLE ROW LEVEL SECURITY;

-- RLS policies for user data access
CREATE POLICY "Users can view their own property systems" ON system_lifecycles
  FOR SELECT USING (property_id IN (
    SELECT id FROM properties WHERE id IN (
      SELECT property_id FROM homes WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can view their own cost predictions" ON cost_predictions
  FOR SELECT USING (property_id IN (
    SELECT id FROM properties WHERE id IN (
      SELECT property_id FROM homes WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can view their own recommendations" ON smart_recommendations
  FOR SELECT USING (property_id IN (
    SELECT id FROM properties WHERE id IN (
      SELECT property_id FROM homes WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can view their own contractor projects" ON contractor_projects
  FOR SELECT USING (property_id IN (
    SELECT id FROM properties WHERE id IN (
      SELECT property_id FROM homes WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can view their own climate data" ON property_climate_data
  FOR SELECT USING (property_id IN (
    SELECT id FROM properties WHERE id IN (
      SELECT property_id FROM homes WHERE user_id = auth.uid()
    )
  ));

-- Public access for market data, contractor listings, and weather alerts
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view market data" ON market_data FOR SELECT USING (true);

ALTER TABLE local_contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view contractor listings" ON local_contractors FOR SELECT USING (true);

ALTER TABLE weather_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view weather alerts" ON weather_alerts FOR SELECT USING (true);