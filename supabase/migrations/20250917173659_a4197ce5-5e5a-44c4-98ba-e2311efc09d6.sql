-- Habitta Validation Cockpit Database Schema

-- 1) Properties sampled for this sprint
CREATE TABLE IF NOT EXISTS properties_sample (
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
CREATE TABLE IF NOT EXISTS enrichment_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id UUID REFERENCES properties_sample(address_id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'estated'|'attom'|'shovels'|'imagery'|'smarty'|'manual'
  payload JSONB NOT NULL,
  retrieved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(address_id, provider, retrieved_at)
);

-- 3) Model predictions (one row per field)
CREATE TABLE IF NOT EXISTS predictions (
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
CREATE TABLE IF NOT EXISTS labels (
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

-- Enable RLS on all tables
ALTER TABLE properties_sample ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;

-- Development RLS policies (allow authenticated users access to all rows)
CREATE POLICY "dev read properties_sample" ON properties_sample FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dev write properties_sample" ON properties_sample FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "dev update properties_sample" ON properties_sample FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "dev delete properties_sample" ON properties_sample FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "dev read enrichment_snapshots" ON enrichment_snapshots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dev write enrichment_snapshots" ON enrichment_snapshots FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "dev update enrichment_snapshots" ON enrichment_snapshots FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "dev delete enrichment_snapshots" ON enrichment_snapshots FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "dev read predictions" ON predictions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dev write predictions" ON predictions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "dev update predictions" ON predictions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "dev delete predictions" ON predictions FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "dev read labels" ON labels FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dev write labels" ON labels FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "dev update labels" ON labels FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "dev delete labels" ON labels FOR DELETE USING (auth.role() = 'authenticated');

-- Views for scoring
CREATE OR REPLACE VIEW v_latest_labels AS
SELECT DISTINCT ON (address_id) *
FROM labels
ORDER BY address_id, created_at DESC;

CREATE OR REPLACE VIEW v_latest_predictions AS
SELECT p.*
FROM predictions p
JOIN (
  SELECT address_id, field, MAX(predicted_at) AS latest
  FROM predictions
  GROUP BY address_id, field
) t ON t.address_id = p.address_id AND t.field = p.field AND t.latest = p.predicted_at;

CREATE OR REPLACE VIEW v_scored AS
SELECT
  lp.address_id,
  lp.field,
  lp.predicted_value,
  CASE lp.field
    WHEN 'roof_age_bucket' THEN (SELECT roof_age_bucket FROM v_latest_labels l2 WHERE l2.address_id = lp.address_id)
    WHEN 'hvac_system_type' THEN (SELECT hvac_system_type FROM v_latest_labels l2 WHERE l2.address_id = lp.address_id)
    WHEN 'hvac_age_bucket' THEN (SELECT hvac_age_bucket FROM v_latest_labels l2 WHERE l2.address_id = lp.address_id)
    WHEN 'water_heater_type' THEN (SELECT water_heater_type FROM v_latest_labels l2 WHERE l2.address_id = lp.address_id)
    WHEN 'water_heater_age_bucket' THEN (SELECT water_heater_age_bucket FROM v_latest_labels l2 WHERE l2.address_id = lp.address_id)
    WHEN 'last_roof_permit_year' THEN (SELECT last_roof_permit_year::TEXT FROM v_latest_labels l2 WHERE l2.address_id = lp.address_id)
    WHEN 'last_hvac_permit_year' THEN (SELECT last_hvac_permit_year::TEXT FROM v_latest_labels l2 WHERE l2.address_id = lp.address_id)
    WHEN 'last_water_heater_permit_year' THEN (SELECT last_water_heater_permit_year::TEXT FROM v_latest_labels l2 WHERE l2.address_id = lp.address_id)
    ELSE NULL
  END AS actual_value,
  CASE WHEN actual_value IS NULL THEN NULL
       WHEN lp.predicted_value = actual_value THEN TRUE
       ELSE FALSE END AS match,
  lp.confidence_0_1,
  lp.data_provenance
FROM v_latest_predictions lp;

-- RPC: accuracy by field
CREATE OR REPLACE FUNCTION rpc_accuracy_by_field()
RETURNS TABLE(field TEXT, accuracy NUMERIC)
LANGUAGE SQL STABLE AS $$
  SELECT field, AVG(CASE WHEN match THEN 1 ELSE 0 END)::NUMERIC AS accuracy
  FROM v_scored
  WHERE field IN ('roof_age_bucket','hvac_system_type','hvac_age_bucket','water_heater_type','water_heater_age_bucket')
  GROUP BY field
  ORDER BY field;
$$;