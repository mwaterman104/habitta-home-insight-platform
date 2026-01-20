-- Add install_source column to systems table
ALTER TABLE public.systems ADD COLUMN IF NOT EXISTS install_source TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.systems.install_source IS 'Source of install data: inferred, user, or permit';