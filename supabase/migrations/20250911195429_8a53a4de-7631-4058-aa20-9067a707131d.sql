-- Create ML models tracking table
CREATE TABLE public.ml_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'lifecycle_predictor', 'recommendation_engine', 'vision_assessment'
  version TEXT NOT NULL,
  accuracy_score DECIMAL(5,4),
  training_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  model_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user feedback table for continuous learning
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID NOT NULL,
  feedback_type TEXT NOT NULL, -- 'prediction_accuracy', 'recommendation_helpful', 'repair_outcome'
  predicted_value JSONB,
  actual_value JSONB,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for ml_models (read-only for users)
CREATE POLICY "ML models are viewable by everyone" 
ON public.ml_models 
FOR SELECT 
USING (true);

-- Create policies for user_feedback
CREATE POLICY "Users can view their own feedback" 
ON public.user_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedback" 
ON public.user_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create prediction accuracy tracking table
CREATE TABLE public.prediction_accuracy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES public.ml_models(id),
  property_id UUID NOT NULL,
  prediction_type TEXT NOT NULL,
  predicted_date DATE,
  actual_date DATE,
  predicted_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  accuracy_score DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for prediction accuracy
ALTER TABLE public.prediction_accuracy ENABLE ROW LEVEL SECURITY;

-- Create policy for prediction accuracy (admin only for now)
CREATE POLICY "Prediction accuracy viewable by authenticated users" 
ON public.prediction_accuracy 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create image assessments table for computer vision
CREATE TABLE public.image_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  assessment_type TEXT NOT NULL, -- 'roof', 'hvac', 'exterior', 'general'
  condition_score INTEGER CHECK (condition_score >= 1 AND condition_score <= 100),
  detected_issues JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  confidence_score DECIMAL(5,4),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.image_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies for image assessments
CREATE POLICY "Users can view their own image assessments" 
ON public.image_assessments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own image assessments" 
ON public.image_assessments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_ml_models_active ON public.ml_models(model_type, is_active);
CREATE INDEX idx_user_feedback_property ON public.user_feedback(property_id, feedback_type);
CREATE INDEX idx_prediction_accuracy_model ON public.prediction_accuracy(model_id, prediction_type);
CREATE INDEX idx_image_assessments_property ON public.image_assessments(property_id, assessment_type);