-- ================================================================
-- PHASE 0: BACKUP (Safety first!)
-- ================================================================
CREATE TABLE IF NOT EXISTS systems_backup_20260201 AS 
SELECT * FROM systems;

-- ================================================================
-- PHASE 1: Create index for performance
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_systems_home_kind_lower 
ON systems (home_id, LOWER(kind));

-- ================================================================
-- PHASE 2: Delete all duplicates except highest-authority record
-- ================================================================
WITH ranked_systems AS (
  SELECT 
    id,
    home_id,
    LOWER(kind) as normalized_kind,
    kind,
    install_source,
    confidence,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY home_id, LOWER(kind)
      ORDER BY 
        CASE install_source 
          WHEN 'permit_verified' THEN 4 
          WHEN 'inspection' THEN 3 
          WHEN 'owner_reported' THEN 2 
          ELSE 1 
        END DESC,
        confidence DESC NULLS LAST,
        created_at DESC NULLS LAST
    ) as rank
  FROM systems
)
DELETE FROM systems
WHERE id IN (
  SELECT id FROM ranked_systems WHERE rank > 1
);

-- ================================================================
-- PHASE 3: Normalize all kind values to lowercase
-- ================================================================
UPDATE systems
SET kind = LOWER(kind)
WHERE kind != LOWER(kind);

-- ================================================================
-- PHASE 4: Fix roof install year for specific home (2010 -> 2012)
-- ================================================================
UPDATE systems 
SET 
  install_year = 2012, 
  install_source = 'owner_reported', 
  replacement_status = 'original',
  confidence = 0.7,
  updated_at = NOW()
WHERE home_id = '46ba7ab3-1682-422d-8cd4-de6ae4f40794' 
AND LOWER(kind) = 'roof';

-- ================================================================
-- PHASE 5: Add unique constraint to prevent future duplicates
-- ================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_systems_home_kind_unique
ON systems (home_id, LOWER(kind));