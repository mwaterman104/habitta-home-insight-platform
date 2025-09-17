-- Habitta Validation Cockpit Database Schema - Complete Setup

-- 1) Properties sampled for this sprint
CREATE TABLE properties_sample (
  address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  street_address TEXT NOT NULL,
  unit TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  apn TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  source_list TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) External enrichment snapshots (immutable)
CREATE TABLE enrichment_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id UUID REFERENCES properties_sample(address_id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'estated'|'attom'|'shovels'|'imagery'|'smarty'|'manual'
  payload JSONB NOT NULL,
  retrieved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(address_id, provider, retrieved_at)
);

-- 3) Model predictions (one row per field)
CREATE TABLE predictions (
  prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id UUID REFERENCES properties_sample(address_id) ON DELETE CASCADE,
  prediction_run_id UUID NOT NULL,
  field TEXT NOT NULL,              -- e.g., 'roof_age_bucket'
  predicted_value TEXT NOT NULL,    -- e.g., '16-20y'
  confidence_0_1 NUMERIC CHECK (confidence_0_1 BETWEEN 0 AND 1),
  data_provenance JSONB,            -- pointers to snapshots used
  model_version TEXT NOT NULL,
  predicted_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Human labels (ground truth)
CREATE TABLE labels (
  label_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id UUID REFERENCES properties_sample(address_id) ON DELETE CASCADE,
  labeler TEXT NOT NULL,
  label_date DATE DEFAULT CURRENT_DATE,

  roof_material TEXT,
  roof_age_bucket TEXT,
  roof_visible_damage BOOLEAN,
  roof_estimated_remaining_years INT,

  hvac_present BOOLEAN,
  hvac_system_type TEXT,
  hvac_age_bucket TEXT,
  hvac_estimated_remaining_years INT,

  water_heater_present BOOLEAN,
  water_heater_type TEXT,
  water_heater_age_bucket TEXT,

  windows_age_bucket TEXT,
  doors_age_bucket TEXT,

  last_roof_permit_year INT,
  last_hvac_permit_year INT,
  last_water_heater_permit_year INT,

  basement_or_crawlspace TEXT,
  moisture_risk BOOLEAN,
  electrical_gfci_kitchen BOOLEAN,
  electrical_gfci_bath BOOLEAN,

  evidence_photo_urls TEXT,
  labeler_confidence_0_1 NUMERIC CHECK (labeler_confidence_0_1 BETWEEN 0 AND 1),
  labeler_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);