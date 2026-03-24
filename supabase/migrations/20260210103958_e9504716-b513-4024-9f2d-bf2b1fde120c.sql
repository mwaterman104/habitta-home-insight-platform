
-- Add system_type column to maintenance_tasks for system-level linking
ALTER TABLE public.maintenance_tasks ADD COLUMN IF NOT EXISTS system_type text;

-- Backfill from existing category column
UPDATE public.maintenance_tasks SET system_type = CASE
  WHEN LOWER(category) IN ('hvac') THEN 'hvac'
  WHEN LOWER(category) IN ('plumbing') THEN 'plumbing'
  WHEN LOWER(category) IN ('electrical') THEN 'electrical'
  WHEN LOWER(category) IN ('exterior', 'roofing') THEN 'roof'
  WHEN LOWER(category) IN ('appliances') THEN 'appliance'
  WHEN LOWER(category) IN ('windows & doors') THEN 'exterior'
  WHEN LOWER(category) IN ('safety') THEN 'safety'
  ELSE NULL
END
WHERE system_type IS NULL AND category IS NOT NULL;

-- Index for filtering by system_type
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_system_type ON public.maintenance_tasks (system_type);
