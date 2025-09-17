-- Create views in correct order

-- 1. Latest labels view (this one works)
-- Already exists

-- 2. Latest predictions view (create first)
CREATE OR REPLACE VIEW v_latest_predictions AS
SELECT p.*
FROM predictions p
INNER JOIN (
  SELECT address_id, field, MAX(predicted_at) AS latest
  FROM predictions
  GROUP BY address_id, field
) latest_pred ON latest_pred.address_id = p.address_id 
  AND latest_pred.field = p.field 
  AND latest_pred.latest = p.predicted_at;

-- 3. Scored view (create after v_latest_predictions exists)
CREATE OR REPLACE VIEW v_scored AS
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