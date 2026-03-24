-- Add enrichment status tracking to properties_sample table
ALTER TABLE properties_sample 
ADD COLUMN enrichment_status text DEFAULT 'pending',
ADD COLUMN enrichment_started_at timestamp with time zone,
ADD COLUMN enrichment_completed_at timestamp with time zone,
ADD COLUMN enrichment_error text;

-- Add index for efficient status queries
CREATE INDEX idx_properties_sample_enrichment_status ON properties_sample(enrichment_status);

-- Update existing records to have proper status
UPDATE properties_sample 
SET enrichment_status = CASE 
  WHEN status = 'enriched' THEN 'completed'
  WHEN status = 'pending' THEN 'pending'
  ELSE 'pending'
END;