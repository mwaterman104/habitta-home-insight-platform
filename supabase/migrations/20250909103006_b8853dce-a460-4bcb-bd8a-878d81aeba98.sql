-- Check current RLS policies for homes table
-- Enable RLS if not already enabled
ALTER TABLE homes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own homes" ON homes;
DROP POLICY IF EXISTS "Users can insert their own homes" ON homes;
DROP POLICY IF EXISTS "Users can update their own homes" ON homes;
DROP POLICY IF EXISTS "Users can delete their own homes" ON homes;

-- Create comprehensive RLS policies for homes table
CREATE POLICY "Users can view their own homes" 
ON homes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own homes" 
ON homes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own homes" 
ON homes FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own homes" 
ON homes FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for addresses table as well since homes references it
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view addresses" ON addresses;
DROP POLICY IF EXISTS "Users can insert addresses" ON addresses;
DROP POLICY IF EXISTS "Users can update addresses" ON addresses;

CREATE POLICY "Users can view addresses" 
ON addresses FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can insert addresses" 
ON addresses FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update addresses" 
ON addresses FOR UPDATE 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);