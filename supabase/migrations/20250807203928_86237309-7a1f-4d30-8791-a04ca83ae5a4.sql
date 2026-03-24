-- Create homes table
CREATE TABLE public.homes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  year_built integer,
  square_feet integer,
  bedrooms integer,
  bathrooms decimal,
  property_type text CHECK (property_type IN ('single_family', 'condo', 'townhouse', 'multi_family')),
  photo_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create maintenance_tasks table
CREATE TABLE public.maintenance_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  home_id uuid REFERENCES public.homes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  category text CHECK (category IN ('hvac', 'plumbing', 'electrical', 'appliance', 'exterior', 'interior')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  due_date date,
  completed_date timestamp with time zone,
  cost decimal,
  recurring boolean DEFAULT false,
  recurrence_interval text CHECK (recurrence_interval IN ('monthly', 'quarterly', 'annually')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create documents table
CREATE TABLE public.documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  home_id uuid REFERENCES public.homes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('warranty', 'insurance', 'permit', 'receipt', 'manual', 'other')),
  file_url text NOT NULL,
  file_size integer,
  expiry_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create diagnoses table
CREATE TABLE public.diagnoses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  home_id uuid REFERENCES public.homes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  issue_description text,
  ai_diagnosis text,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  estimated_cost_min decimal,
  estimated_cost_max decimal,
  diy_possible boolean,
  diy_instructions jsonb,
  pro_recommended boolean,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create storage bucket for home photos
INSERT INTO storage.buckets (id, name, public) VALUES ('home-photos', 'home-photos', true);

-- Create storage bucket for diagnosis photos
INSERT INTO storage.buckets (id, name, public) VALUES ('diagnosis-photos', 'diagnosis-photos', false);

-- Enable Row Level Security
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for homes table
CREATE POLICY "Users can view own homes" ON public.homes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own homes" ON public.homes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own homes" ON public.homes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own homes" ON public.homes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for maintenance_tasks table
CREATE POLICY "Users can view own maintenance tasks" ON public.maintenance_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own maintenance tasks" ON public.maintenance_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maintenance tasks" ON public.maintenance_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own maintenance tasks" ON public.maintenance_tasks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for documents table
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for diagnoses table
CREATE POLICY "Users can view own diagnoses" ON public.diagnoses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own diagnoses" ON public.diagnoses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own diagnoses" ON public.diagnoses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own diagnoses" ON public.diagnoses FOR DELETE USING (auth.uid() = user_id);

-- Storage policies for documents bucket
CREATE POLICY "Users can view their own documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own documents" ON storage.objects FOR UPDATE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own documents" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for home-photos bucket
CREATE POLICY "Anyone can view home photos" ON storage.objects FOR SELECT USING (bucket_id = 'home-photos');
CREATE POLICY "Users can upload their own home photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'home-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own home photos" ON storage.objects FOR UPDATE USING (bucket_id = 'home-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own home photos" ON storage.objects FOR DELETE USING (bucket_id = 'home-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for diagnosis-photos bucket
CREATE POLICY "Users can view their own diagnosis photos" ON storage.objects FOR SELECT USING (bucket_id = 'diagnosis-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own diagnosis photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'diagnosis-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own diagnosis photos" ON storage.objects FOR UPDATE USING (bucket_id = 'diagnosis-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own diagnosis photos" ON storage.objects FOR DELETE USING (bucket_id = 'diagnosis-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_homes_updated_at BEFORE UPDATE ON public.homes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenance_tasks_updated_at BEFORE UPDATE ON public.maintenance_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();