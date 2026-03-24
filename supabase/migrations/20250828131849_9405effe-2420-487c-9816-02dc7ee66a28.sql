-- Homesage raw cache + enhanced existing tables
CREATE TABLE if not exists public.homesage_raw (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  property_key text not null,
  endpoint text not null,
  payload jsonb not null,
  sha256 text not null,
  created_at timestamptz not null default now(),
  unique (user_id, property_key, sha256)
);

-- Enable RLS on homesage_raw table
ALTER TABLE public.homesage_raw ENABLE ROW LEVEL SECURITY;

-- Policies for homesage_raw table
CREATE POLICY "Users can view their own homesage data" 
ON public.homesage_raw 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own homesage data" 
ON public.homesage_raw 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update existing properties table to ensure all needed columns exist
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS address_std text;

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS zipcode text;

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS apn text;

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS source_latest text;

-- Ensure properties table has proper unique constraint
ALTER TABLE public.properties 
DROP CONSTRAINT IF EXISTS properties_address_std_zipcode_key;

-- Only add constraint if both columns exist and have data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' 
    AND column_name IN ('address_std', 'zipcode')
  ) THEN
    ALTER TABLE public.properties 
    ADD CONSTRAINT properties_address_std_zipcode_key 
    UNIQUE (address_std, zipcode);
  END IF;
END $$;

-- Update homes table to ensure property_id foreign key exists
ALTER TABLE public.homes 
ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_homesage_raw_user_property 
ON public.homesage_raw (user_id, property_key);

CREATE INDEX IF NOT EXISTS idx_homesage_raw_created 
ON public.homesage_raw (created_at desc);

CREATE INDEX IF NOT EXISTS idx_properties_address 
ON public.properties (address_std, zipcode) 
WHERE address_std IS NOT NULL;