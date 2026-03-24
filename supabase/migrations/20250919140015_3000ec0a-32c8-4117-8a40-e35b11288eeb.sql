-- Add unique constraints to permits and code_violations tables for hash-based deduplication

-- First, remove any potential duplicate hashes in permits table
DELETE FROM permits p1 
WHERE p1.ctid < (
  SELECT max(p2.ctid) 
  FROM permits p2 
  WHERE p1.hash = p2.hash
);

-- First, remove any potential duplicate hashes in code_violations table  
DELETE FROM code_violations cv1 
WHERE cv1.ctid < (
  SELECT max(cv2.ctid) 
  FROM code_violations cv2 
  WHERE cv1.hash = cv2.hash
);

-- Add unique constraint on permits.hash column
ALTER TABLE permits ADD CONSTRAINT permits_hash_unique UNIQUE (hash);

-- Add unique constraint on code_violations.hash column  
ALTER TABLE code_violations ADD CONSTRAINT code_violations_hash_unique UNIQUE (hash);

-- Create indexes for better performance on hash lookups
CREATE INDEX IF NOT EXISTS idx_permits_hash ON permits(hash);
CREATE INDEX IF NOT EXISTS idx_code_violations_hash ON code_violations(hash);