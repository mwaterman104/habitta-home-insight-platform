-- Fix function search path issue
CREATE OR REPLACE FUNCTION public.rpc_confidence_calibration()
RETURNS TABLE(
  confidence_bucket TEXT,
  field TEXT,
  total_predictions BIGINT,
  correct_predictions BIGINT,
  accuracy NUMERIC,
  avg_confidence NUMERIC
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT * FROM v_confidence_calibration;
$function$;