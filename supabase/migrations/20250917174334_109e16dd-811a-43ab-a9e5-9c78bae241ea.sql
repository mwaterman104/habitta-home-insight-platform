-- Enable RLS and add policies for all new tables

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
CREATE VIEW v_latest_labels AS
SELECT DISTINCT ON (address_id) *
FROM labels
ORDER BY address_id, created_at DESC;

CREATE VIEW v_latest_predictions AS
SELECT p.*
FROM predictions p
INNER JOIN (
  SELECT address_id, field, MAX(predicted_at) AS latest
  FROM predictions
  GROUP BY address_id, field
) latest_pred ON latest_pred.address_id = p.address_id 
  AND latest_pred.field = p.field 
  AND latest_pred.latest = p.predicted_at;

CREATE VIEW v_scored AS
WITH scored_data AS (
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
    lp.confidence_0_1,
    lp.data_provenance
  FROM v_latest_predictions lp
)
SELECT
  address_id,
  field,
  predicted_value,
  actual_value,
  CASE 
    WHEN actual_value IS NULL THEN NULL
    WHEN predicted_value = actual_value THEN TRUE
    ELSE FALSE 
  END AS match,
  confidence_0_1,
  data_provenance
FROM scored_data;

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