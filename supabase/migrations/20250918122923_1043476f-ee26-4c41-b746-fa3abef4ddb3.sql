-- Fix security issues for the newly created functions
-- Add proper search_path settings to make functions secure

CREATE OR REPLACE FUNCTION rpc_accuracy_by_field()
RETURNS TABLE(field TEXT, accuracy NUMERIC) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION rpc_confidence_calibration()
RETURNS TABLE(
  confidence_bucket TEXT,
  field TEXT,
  total_predictions INTEGER,
  correct_predictions INTEGER,
  accuracy NUMERIC,
  avg_confidence NUMERIC
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
$$;