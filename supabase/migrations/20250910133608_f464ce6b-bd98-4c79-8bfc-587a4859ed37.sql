-- Create table for storing solar analysis data
CREATE TABLE public.solar_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address_id UUID,
  user_id UUID NOT NULL,
  raw_data JSONB NOT NULL,
  processed_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.solar_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own solar analysis" 
ON public.solar_analysis 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own solar analysis" 
ON public.solar_analysis 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own solar analysis" 
ON public.solar_analysis 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own solar analysis" 
ON public.solar_analysis 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_solar_analysis_updated_at
BEFORE UPDATE ON public.solar_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();