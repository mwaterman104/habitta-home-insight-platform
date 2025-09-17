-- Fix the v_scored view with proper column references
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
  lp.confidence_0_1,
  lp.data_provenance
FROM v_latest_predictions lp;

-- Add match calculation as a separate view
CREATE OR REPLACE VIEW v_scored_with_match AS
SELECT
  *,
  CASE WHEN actual_value IS NULL THEN NULL
       WHEN predicted_value = actual_value THEN TRUE
       ELSE FALSE END AS match
FROM v_scored;

-- Update RPC to use the new view
CREATE OR REPLACE FUNCTION rpc_accuracy_by_field()
RETURNS TABLE(field TEXT, accuracy NUMERIC)
LANGUAGE SQL STABLE AS $$
  SELECT field, AVG(CASE WHEN match THEN 1 ELSE 0 END)::NUMERIC AS accuracy
  FROM v_scored_with_match
  WHERE field IN ('roof_age_bucket','hvac_system_type','hvac_age_bucket','water_heater_type','water_heater_age_bucket')
  GROUP BY field
  ORDER BY field;
$$;