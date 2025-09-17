-- Phase 2 & 3: Add error taxonomy and confidence calibration tables
CREATE TABLE public.error_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address_id UUID NOT NULL,
  field TEXT NOT NULL,
  error_type TEXT NOT NULL, -- 'missing_permit', 'bad_rule', 'data_quality', 'ambiguous_imagery', 'cross_validation_failure'
  description TEXT,
  tagged_by UUID REFERENCES auth.users(id),
  tagged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT
);

-- Enable RLS for error_tags
ALTER TABLE public.error_tags ENABLE ROW LEVEL SECURITY;

-- Error tags policies
CREATE POLICY "Users can view error tags" 
ON public.error_tags 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create error tags" 
ON public.error_tags 
FOR INSERT 
WITH CHECK (auth.uid() = tagged_by);

CREATE POLICY "Users can update error tags they created" 
ON public.error_tags 
FOR UPDATE 
USING (auth.uid() = tagged_by);

-- Phase 5: Batch processing job tracking
CREATE TABLE public.batch_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  operation_type TEXT NOT NULL, -- 'enrich', 'predict'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'paused', 'completed', 'failed'
  total_properties INTEGER NOT NULL,
  processed_properties INTEGER DEFAULT 0,
  successful_properties INTEGER DEFAULT 0,
  failed_properties INTEGER DEFAULT 0,
  current_property_id UUID,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  properties_list JSONB NOT NULL -- Array of address_ids to process
);

-- Enable RLS for batch_jobs
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;

-- Batch jobs policies
CREATE POLICY "Users can view own batch jobs" 
ON public.batch_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own batch jobs" 
ON public.batch_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own batch jobs" 
ON public.batch_jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for batch_jobs updated_at
CREATE TRIGGER update_batch_jobs_updated_at
BEFORE UPDATE ON public.batch_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 2: Confidence calibration view for analysis
CREATE OR REPLACE VIEW public.v_confidence_calibration AS
SELECT 
  CASE 
    WHEN confidence_0_1 <= 0.2 THEN '0-20%'
    WHEN confidence_0_1 <= 0.4 THEN '21-40%'
    WHEN confidence_0_1 <= 0.6 THEN '41-60%'
    WHEN confidence_0_1 <= 0.8 THEN '61-80%'
    ELSE '81-100%'
  END as confidence_bucket,
  field,
  COUNT(*) as total_predictions,
  COUNT(CASE WHEN match = true THEN 1 END) as correct_predictions,
  AVG(CASE WHEN match = true THEN 1.0 ELSE 0.0 END) as accuracy,
  AVG(confidence_0_1) as avg_confidence
FROM v_scored 
WHERE match IS NOT NULL
GROUP BY 
  CASE 
    WHEN confidence_0_1 <= 0.2 THEN '0-20%'
    WHEN confidence_0_1 <= 0.4 THEN '21-40%'
    WHEN confidence_0_1 <= 0.6 THEN '41-60%'
    WHEN confidence_0_1 <= 0.8 THEN '61-80%'
    ELSE '81-100%'
  END,
  field
ORDER BY field, confidence_bucket;

-- Function to get confidence calibration data
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
STABLE
AS $function$
  SELECT * FROM v_confidence_calibration;
$function$;