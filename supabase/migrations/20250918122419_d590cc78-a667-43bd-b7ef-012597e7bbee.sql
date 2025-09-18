-- Drop existing functions that need to be recreated with different signatures
DROP FUNCTION IF EXISTS rpc_confidence_calibration();

-- Create scoring view that joins predictions with labels
CREATE OR REPLACE VIEW v_scored AS
SELECT 
  p.address_id,
  p.field,
  p.predicted_value,
  CASE p.field
    WHEN 'roof_material' THEN l.roof_material
    WHEN 'roof_age_bucket' THEN l.roof_age_bucket
    WHEN 'hvac_system_type' THEN l.hvac_system_type
    WHEN 'hvac_age_bucket' THEN l.hvac_age_bucket
    WHEN 'water_heater_type' THEN l.water_heater_type
    WHEN 'water_heater_age_bucket' THEN l.water_heater_age_bucket
    WHEN 'windows_age_bucket' THEN l.windows_age_bucket
    WHEN 'doors_age_bucket' THEN l.doors_age_bucket
    WHEN 'basement_or_crawlspace' THEN l.basement_or_crawlspace
    WHEN 'last_roof_permit_year' THEN l.last_roof_permit_year::TEXT
    WHEN 'last_hvac_permit_year' THEN l.last_hvac_permit_year::TEXT
    WHEN 'last_water_heater_permit_year' THEN l.last_water_heater_permit_year::TEXT
    WHEN 'roof_visible_damage' THEN l.roof_visible_damage::TEXT
    WHEN 'hvac_present' THEN l.hvac_present::TEXT
    WHEN 'water_heater_present' THEN l.water_heater_present::TEXT
    WHEN 'moisture_risk' THEN l.moisture_risk::TEXT
    WHEN 'electrical_gfci_kitchen' THEN l.electrical_gfci_kitchen::TEXT
    WHEN 'electrical_gfci_bath' THEN l.electrical_gfci_bath::TEXT
    ELSE NULL
  END as actual_value,
  CASE 
    WHEN p.field = 'roof_material' AND p.predicted_value = l.roof_material THEN true
    WHEN p.field = 'roof_age_bucket' AND p.predicted_value = l.roof_age_bucket THEN true
    WHEN p.field = 'hvac_system_type' AND p.predicted_value = l.hvac_system_type THEN true
    WHEN p.field = 'hvac_age_bucket' AND p.predicted_value = l.hvac_age_bucket THEN true
    WHEN p.field = 'water_heater_type' AND p.predicted_value = l.water_heater_type THEN true
    WHEN p.field = 'water_heater_age_bucket' AND p.predicted_value = l.water_heater_age_bucket THEN true
    WHEN p.field = 'windows_age_bucket' AND p.predicted_value = l.windows_age_bucket THEN true
    WHEN p.field = 'doors_age_bucket' AND p.predicted_value = l.doors_age_bucket THEN true
    WHEN p.field = 'basement_or_crawlspace' AND p.predicted_value = l.basement_or_crawlspace THEN true
    WHEN p.field = 'last_roof_permit_year' AND p.predicted_value = l.last_roof_permit_year::TEXT THEN true
    WHEN p.field = 'last_hvac_permit_year' AND p.predicted_value = l.last_hvac_permit_year::TEXT THEN true
    WHEN p.field = 'last_water_heater_permit_year' AND p.predicted_value = l.last_water_heater_permit_year::TEXT THEN true
    WHEN p.field = 'roof_visible_damage' AND p.predicted_value = l.roof_visible_damage::TEXT THEN true
    WHEN p.field = 'hvac_present' AND p.predicted_value = l.hvac_present::TEXT THEN true
    WHEN p.field = 'water_heater_present' AND p.predicted_value = l.water_heater_present::TEXT THEN true
    WHEN p.field = 'moisture_risk' AND p.predicted_value = l.moisture_risk::TEXT THEN true
    WHEN p.field = 'electrical_gfci_kitchen' AND p.predicted_value = l.electrical_gfci_kitchen::TEXT THEN true
    WHEN p.field = 'electrical_gfci_bath' AND p.predicted_value = l.electrical_gfci_bath::TEXT THEN true
    WHEN (p.field = 'roof_material' AND l.roof_material IS NULL) OR
         (p.field = 'roof_age_bucket' AND l.roof_age_bucket IS NULL) OR
         (p.field = 'hvac_system_type' AND l.hvac_system_type IS NULL) OR
         (p.field = 'hvac_age_bucket' AND l.hvac_age_bucket IS NULL) OR
         (p.field = 'water_heater_type' AND l.water_heater_type IS NULL) OR
         (p.field = 'water_heater_age_bucket' AND l.water_heater_age_bucket IS NULL) OR
         (p.field = 'windows_age_bucket' AND l.windows_age_bucket IS NULL) OR
         (p.field = 'doors_age_bucket' AND l.doors_age_bucket IS NULL) OR
         (p.field = 'basement_or_crawlspace' AND l.basement_or_crawlspace IS NULL) OR
         (p.field = 'last_roof_permit_year' AND l.last_roof_permit_year IS NULL) OR
         (p.field = 'last_hvac_permit_year' AND l.last_hvac_permit_year IS NULL) OR
         (p.field = 'last_water_heater_permit_year' AND l.last_water_heater_permit_year IS NULL) OR
         (p.field = 'roof_visible_damage' AND l.roof_visible_damage IS NULL) OR
         (p.field = 'hvac_present' AND l.hvac_present IS NULL) OR
         (p.field = 'water_heater_present' AND l.water_heater_present IS NULL) OR
         (p.field = 'moisture_risk' AND l.moisture_risk IS NULL) OR
         (p.field = 'electrical_gfci_kitchen' AND l.electrical_gfci_kitchen IS NULL) OR
         (p.field = 'electrical_gfci_bath' AND l.electrical_gfci_bath IS NULL)
    THEN NULL
    ELSE false
  END as match,
  p.confidence_0_1,
  p.data_provenance
FROM predictions p
LEFT JOIN (
  SELECT DISTINCT ON (address_id) *
  FROM labels
  ORDER BY address_id, created_at DESC
) l ON p.address_id = l.address_id;

-- Create RPC function to calculate accuracy by field
CREATE OR REPLACE FUNCTION rpc_accuracy_by_field()
RETURNS TABLE(field TEXT, accuracy NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.field,
    CASE 
      WHEN COUNT(*) FILTER (WHERE v.match IS NOT NULL) = 0 THEN 0::NUMERIC
      ELSE ROUND(
        COUNT(*) FILTER (WHERE v.match = true)::NUMERIC / 
        COUNT(*) FILTER (WHERE v.match IS NOT NULL)::NUMERIC, 3
      )
    END as accuracy
  FROM v_scored v
  GROUP BY v.field
  ORDER BY accuracy DESC;
END;
$$ LANGUAGE plpgsql;

-- Create RPC function for confidence calibration analysis
CREATE OR REPLACE FUNCTION rpc_confidence_calibration()
RETURNS TABLE(
  confidence_bucket TEXT,
  field TEXT,
  total_predictions INTEGER,
  correct_predictions INTEGER,
  accuracy NUMERIC,
  avg_confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN v.confidence_0_1 <= 0.5 THEN '0-50%'
      WHEN v.confidence_0_1 <= 0.7 THEN '50-70%'
      WHEN v.confidence_0_1 <= 0.85 THEN '70-85%'
      WHEN v.confidence_0_1 <= 0.95 THEN '85-95%'
      ELSE '95-100%'
    END as confidence_bucket,
    v.field,
    COUNT(*)::INTEGER as total_predictions,
    COUNT(*) FILTER (WHERE v.match = true)::INTEGER as correct_predictions,
    CASE 
      WHEN COUNT(*) FILTER (WHERE v.match IS NOT NULL) = 0 THEN 0::NUMERIC
      ELSE ROUND(
        COUNT(*) FILTER (WHERE v.match = true)::NUMERIC / 
        COUNT(*) FILTER (WHERE v.match IS NOT NULL)::NUMERIC, 3
      )
    END as accuracy,
    ROUND(AVG(v.confidence_0_1), 3) as avg_confidence
  FROM v_scored v
  WHERE v.match IS NOT NULL
  GROUP BY 
    CASE 
      WHEN v.confidence_0_1 <= 0.5 THEN '0-50%'
      WHEN v.confidence_0_1 <= 0.7 THEN '50-70%'
      WHEN v.confidence_0_1 <= 0.85 THEN '70-85%'
      WHEN v.confidence_0_1 <= 0.95 THEN '85-95%'
      ELSE '95-100%'
    END,
    v.field
  ORDER BY confidence_bucket, v.field;
END;
$$ LANGUAGE plpgsql;