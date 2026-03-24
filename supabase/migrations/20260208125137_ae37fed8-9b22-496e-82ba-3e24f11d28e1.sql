-- Create home_chat_sessions table for persistent home advisor chat history
CREATE TABLE public.home_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  message_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, home_id)
);

-- Enable RLS
ALTER TABLE public.home_chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own chat sessions
CREATE POLICY "Users can view their own home chat sessions"
  ON public.home_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own home chat sessions"
  ON public.home_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own home chat sessions"
  ON public.home_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own home chat sessions"
  ON public.home_chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER home_chat_sessions_updated_at
  BEFORE UPDATE ON public.home_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();