-- Fix RLS issues: Enable RLS on tables that don't have it

-- Check which tables need RLS enabled (appliances and properties seem to be missing RLS)
ALTER TABLE appliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for appliances
CREATE POLICY "Users can view appliances for their properties" 
ON appliances 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM homes 
  WHERE homes.property_id = appliances.property_id 
  AND homes.user_id = auth.uid()
));

-- Add RLS policies for properties  
CREATE POLICY "Users can view their linked properties" 
ON properties 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM homes 
  WHERE homes.property_id = properties.id 
  AND homes.user_id = auth.uid()
));