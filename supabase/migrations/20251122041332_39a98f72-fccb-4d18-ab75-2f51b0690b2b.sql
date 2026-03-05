-- Create chat_mood table for AI mood tracking
CREATE TABLE IF NOT EXISTS public.chat_mood (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  mood_level INTEGER NOT NULL DEFAULT 100 CHECK (mood_level >= 0 AND mood_level <= 100),
  negative_interactions INTEGER DEFAULT 0,
  positive_interactions INTEGER DEFAULT 0,
  last_negative_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, conversation_id)
);

-- Enable RLS
ALTER TABLE public.chat_mood ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own mood"
  ON public.chat_mood FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mood"
  ON public.chat_mood FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood"
  ON public.chat_mood FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_chat_mood_user_conversation ON public.chat_mood(user_id, conversation_id);
CREATE INDEX idx_chat_mood_updated ON public.chat_mood(updated_at DESC);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_chat_mood_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_mood_updated_at
  BEFORE UPDATE ON public.chat_mood
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_mood_updated_at();