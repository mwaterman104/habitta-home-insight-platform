-- Add missing fields to home_systems table for enhanced data model
ALTER TABLE public.home_systems ADD COLUMN IF NOT EXISTS serial text;
ALTER TABLE public.home_systems ADD COLUMN IF NOT EXISTS manufacture_year integer;
ALTER TABLE public.home_systems ADD COLUMN IF NOT EXISTS manufacture_date date;
ALTER TABLE public.home_systems ADD COLUMN IF NOT EXISTS purchase_date date;
ALTER TABLE public.home_systems ADD COLUMN IF NOT EXISTS capacity_rating text;
ALTER TABLE public.home_systems ADD COLUMN IF NOT EXISTS fuel_type text;
ALTER TABLE public.home_systems ADD COLUMN IF NOT EXISTS location_detail text;
ALTER TABLE public.home_systems ADD COLUMN IF NOT EXISTS confidence_scores jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.home_systems ADD COLUMN IF NOT EXISTS data_sources text[] DEFAULT '{}'::text[];
ALTER TABLE public.home_systems ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.home_systems ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;

-- Create system_images table for photo storage
CREATE TABLE IF NOT EXISTS public.system_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid REFERENCES public.home_systems(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_type text DEFAULT 'device_photo',
  ocr_data jsonb DEFAULT '{}'::jsonb,
  confidence_score numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on system_images
ALTER TABLE public.system_images ENABLE ROW LEVEL SECURITY;

-- Create policies for system_images
CREATE POLICY "Users can view images of their systems" 
ON public.system_images FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.home_systems hs 
  JOIN public.homes h ON h.id = hs.home_id 
  WHERE hs.id = system_images.system_id AND h.user_id = auth.uid()
));

CREATE POLICY "Users can insert images for their systems" 
ON public.system_images FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.home_systems hs 
  JOIN public.homes h ON h.id = hs.home_id 
  WHERE hs.id = system_images.system_id AND h.user_id = auth.uid()
));

CREATE POLICY "Users can update images of their systems" 
ON public.system_images FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.home_systems hs 
  JOIN public.homes h ON h.id = hs.home_id 
  WHERE hs.id = system_images.system_id AND h.user_id = auth.uid()
));

CREATE POLICY "Users can delete images of their systems" 
ON public.system_images FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.home_systems hs 
  JOIN public.homes h ON h.id = hs.home_id 
  WHERE hs.id = system_images.system_id AND h.user_id = auth.uid()
));