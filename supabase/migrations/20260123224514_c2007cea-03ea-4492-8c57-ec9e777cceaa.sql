-- Create photo transfer sessions table for QR code photo upload
CREATE TABLE public.photo_transfer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  home_id UUID REFERENCES public.homes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'expired')),
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes')
);

-- Enable RLS
ALTER TABLE public.photo_transfer_sessions ENABLE ROW LEVEL SECURITY;

-- Users can create and view their own sessions
CREATE POLICY "Users can create own sessions" ON public.photo_transfer_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON public.photo_transfer_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.photo_transfer_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast token lookups (used by mobile upload endpoint)
CREATE INDEX idx_photo_transfer_sessions_token ON public.photo_transfer_sessions(session_token);

-- Index for cleanup queries
CREATE INDEX idx_photo_transfer_sessions_expires ON public.photo_transfer_sessions(expires_at) WHERE status = 'pending';

-- Auto-cleanup function for expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_photo_sessions()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.photo_transfer_sessions
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$;